/**
 * Custom Playwright fixtures — auto-captures failure artifacts per project constitution.
 *
 * On any test failure:
 *   - Full-page screenshot → ./artifacts/screenshots/<timestamp>-failure.png
 *   - Browser console log  → ./artifacts/console/<timestamp>.log
 *
 * Import `test` and `expect` from this file instead of '@playwright/test' in all e2e specs.
 */

import { test as base, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = './artifacts/screenshots';
const CONSOLE_DIR = './artifacts/console';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const logs = [];

    page.on('console', (msg) => {
      logs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      logs.push(`[PAGEERROR] ${err.message}`);
    });

    await use(page);

    if (testInfo.status !== testInfo.expectedStatus) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');

      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${ts}-failure.png`),
        fullPage: true,
      });

      fs.mkdirSync(CONSOLE_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(CONSOLE_DIR, `${ts}.log`),
        logs.join('\n') || '(no console output)',
      );
    }
  },
});

export { expect };
