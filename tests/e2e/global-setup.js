import { execFileSync } from 'child_process';

/**
 * Kill any Chrome process that is using the Playwright MCP user-data-dir,
 * preventing "Opening in existing browser session" launch failures.
 *
 * On macOS this uses `pkill`; on Linux it falls back to `pkill` as well.
 * On Windows it uses `taskkill`. Errors are silently ignored — Chrome may
 * simply not be running.
 */
export default async function globalSetup() {
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/F', '/IM', 'chrome.exe'], { stdio: 'ignore' });
    } else {
      // Target only Chrome instances holding the Playwright MCP profile dir
      execFileSync('pkill', ['-f', 'ms-playwright/mcp-chrome'], { stdio: 'ignore' });
    }
  } catch {
    // Chrome was not running — nothing to kill
  }
}
