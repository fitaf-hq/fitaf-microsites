// Puppeteer's configuration for this package. Puppeteer comes in only as the browser driver of
// @mermaid-js/mermaid-cli (`npm run render:flows`), and it drives the Chrome already installed on the
// machine: it never downloads one, at install or at launch.
//
// Another machine: set PUPPETEER_EXECUTABLE_PATH to its Chrome (puppeteer reads it over this file).
module.exports = {
  skipDownload: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
};
