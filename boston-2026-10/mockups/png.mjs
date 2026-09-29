// A PNG of a static mock-up's sheet, rendered by headless Chrome (`--screenshot`) from the file on disk.
// Chrome runs with a throwaway profile and its background networking off; the page loads only files beside it.
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
const SETTLE_MS = 5000;
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
      if (err.code !== "ESRCH") throw err; // ESRCH: the group has already gone
    }
  }
  await Promise.race([exited, sleep(EXIT_WAIT_MS)]);
}

export async function screenshot({ chrome = CHROME_DEFAULT, html, png, width, height, scale = DEVICE_SCALE }) {
  if (!existsSync(chrome)) {
    throw new Error(`Chrome not found at ${chrome}: set CHROME=<path to the Chrome binary>, or run with --no-png`);
  }
  rmSync(png, { force: true });
  const profile = mkdtempSync(join(tmpdir(), "boston-mockup-chrome-"));
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--disable-extensions",
    `--user-data-dir=${profile}`,
    `--force-device-scale-factor=${scale}`,
    `--window-size=${width},${height}`,
    `--virtual-time-budget=${SETTLE_MS}`,
    `--screenshot=${png}`,
    pathToFileURL(html).href,
  ];
  const child = spawn(chrome, args, { detached: true, stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  const exited = new Promise((resolve) => child.once("exit", resolve));
  const failed = new Promise((_, reject) => child.once("error", reject));
  try {
    const deadline = Date.now() + CHROME_TIMEOUT_MS;
    let bytes = completePng(png);
    while (!bytes) {
      if (Date.now() > deadline) throw new Error(`Chrome did not write ${png} within ${CHROME_TIMEOUT_MS} ms: ${stderr}`);
      if (child.exitCode !== null && !completePng(png)) throw new Error(`Chrome exited ${child.exitCode} without writing ${png}: ${stderr}`);
      await Promise.race([sleep(POLL_MS), failed]);
      bytes = completePng(png);
    }
    const [w, h] = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    if (w !== width * scale || h !== height * scale) {
      throw new Error(`${png} is ${w}×${h}, expected ${width * scale}×${height * scale}`);
    }
  } finally {
    await stop(child, exited);
    rmSync(profile, { recursive: true, force: true });
  }
  return png;
}
