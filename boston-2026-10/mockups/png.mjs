// A PNG of a static mock-up's sheet, rendered by headless Chrome (`--screenshot`) from the file on disk.
// Chrome runs with a throwaway profile and its background networking off; the page loads only files beside it.
// `runChrome` is that run, for any output: the printed pieces (print/, SPEC-print-pieces.md) use it for their PDFs
// (`--print-to-pdf`) and their measuring pass (`--dump-dom`), so there is one way to run Chrome here.
//
// ⚠ Chrome 154 on macOS writes the screenshot and then does not exit (measured 2026-09-29: the PNG complete
// in seconds, the process still running at 40 s). So Chrome runs in its own process group; once the PNG on
// disk is complete (it ends with the IEND chunk) the whole group is stopped, and the PNG's size is checked
// against the window asked for. A Chrome that writes nothing still fails, after CHROME_TIMEOUT_MS.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";

export const CHROME_DEFAULT = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
/** The sheet's layout (mockups.css): a 24 px gutter around and between the piece and a 300 px aside. */
const GUTTER_PX = 24;
const ASIDE_PX = 300;
const DEVICE_SCALE = 2;
export const SETTLE_MS = 5000;
const CHROME_TIMEOUT_MS = 90_000;
const POLL_MS = 200;
const EXIT_WAIT_MS = 5000;
const PNG_IEND = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

/** The window that shows a piece at full size beside its legend (so the sheet's fit leaves it at zoom 1). */
export const sheetWindow = (piece) => ({ width: piece.w + ASIDE_PX + 3 * GUTTER_PX, height: piece.h + 2 * GUTTER_PX });

function completePng(path) {
  if (!existsSync(path)) return null;
  const bytes = readFileSync(path);
  return bytes.length > PNG_IEND.length && bytes.subarray(-PNG_IEND.length).equals(PNG_IEND) ? bytes : null;
}

/** Stop Chrome and its helpers (one process group), and wait for the main process to go. */
async function stop(child, exited) {
  if (child.exitCode === null && child.signalCode === null) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch (err) {
      // ESRCH: the group has already gone. EPERM: on macOS, a group whose only member is Chrome's main process after it
      // exited but before Node reaped it (a zombie); `--print-to-pdf` exits by itself, so it meets this (2026-10-17).
      if (err.code !== "ESRCH" && err.code !== "EPERM") throw err;
    }
  }
  await Promise.race([exited, sleep(EXIT_WAIT_MS)]);
}

/** The flags every run here starts with: headless, a throwaway profile (added per run), nothing fetched in the background. */
const BASE_FLAGS = [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-sync",
  "--disable-extensions",
];

/**
 * Run headless Chrome on a file with `args`, in its own process group, until `ready({ stdout })` gives a value (polled);
 * then stop the group and return that value. `what` completes "Chrome did not ..." in a failure. A Chrome that exits
 * without the value, or never gives it, fails (after `timeoutMs`).
 */
export async function runChrome({ chrome = CHROME_DEFAULT, html, args, ready, what, timeoutMs = CHROME_TIMEOUT_MS }) {
  if (!existsSync(chrome)) throw new Error(`Chrome not found at ${chrome}: set CHROME=<path to the Chrome binary>`);
  const profile = mkdtempSync(join(tmpdir(), "boston-mockup-chrome-"));
  const child = spawn(chrome, [...BASE_FLAGS, `--user-data-dir=${profile}`, ...args, pathToFileURL(html).href], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d) => (stdout += d));
  child.stderr.on("data", (d) => (stderr += d));
  const exited = new Promise((resolve) => child.once("exit", resolve));
  const failed = new Promise((_, reject) => child.once("error", reject));
  const look = () => ready({ stdout });
  try {
    const deadline = Date.now() + timeoutMs;
    let value = look();
    while (!value) {
      if (Date.now() > deadline) throw new Error(`Chrome did not ${what} within ${timeoutMs} ms: ${stderr}`);
      const gone = child.exitCode !== null;
      await Promise.race([sleep(POLL_MS), failed]);
      value = look();
      if (!value && gone) throw new Error(`Chrome exited ${child.exitCode} and did not ${what}: ${stderr}`);
    }
    return value;
  } finally {
    await stop(child, exited);
    rmSync(profile, { recursive: true, force: true });
  }
}

export async function screenshot({ chrome = CHROME_DEFAULT, html, png, width, height, scale = DEVICE_SCALE }) {
  if (!existsSync(chrome)) {
    throw new Error(`Chrome not found at ${chrome}: set CHROME=<path to the Chrome binary>, or run with --no-png`);
  }
  rmSync(png, { force: true });
  const bytes = await runChrome({
    chrome,
    html,
    args: [`--force-device-scale-factor=${scale}`, `--window-size=${width},${height}`, `--virtual-time-budget=${SETTLE_MS}`, `--screenshot=${png}`],
    ready: () => completePng(png),
    what: `write ${png}`,
  });
  const [w, h] = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (w !== width * scale || h !== height * scale) {
    throw new Error(`${png} is ${w}×${h}, expected ${width * scale}×${height * scale}`);
  }
  return png;
}
