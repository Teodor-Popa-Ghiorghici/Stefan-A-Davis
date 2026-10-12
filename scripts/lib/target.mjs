/* Where the browser-driven scripts run the machine: the real Electron shell
   (templeos://app/), from source, or - with HOLYTRON_EXE=<binary> - the packaged app.
   launchTarget() returns { kind, url, newPage(opts), close() } shaped like the slice of
   Playwright's browser API those scripts use. On Linux run under xvfb-run with a big screen:
     xvfb-run -a -s "-screen 0 1920x1080x24" node scripts/<script>.mjs */
import { _electron as electron } from 'playwright';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const noSandbox = process.platform === 'linux' && (process.getuid?.() === 0 || process.env.CI);

/* HOLYTRON_URL=http://127.0.0.1:8099/index.html (a static server on the repo root) runs the same script in plain Chromium, for a machine that has no Electron (a CI-less sandbox, a cloud session). Only what the page itself does is
   tested that way: the templeos:// origin, the sandbox and the CSP are the shell's, and the scripts that check them (check-shell) always want the real thing. Chromium is found by PLAYWRIGHT_BROWSERS_PATH or
   HOLYTRON_CHROME. */
async function launchPlain(url) {
  const { chromium } = await import('playwright');
  const exe = process.env.HOLYTRON_CHROME || undefined;
  const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox'] });
  console.log('[target] plain chromium at ' + url + ' (no Electron shell)');
  return {
    kind: 'chromium',
    url,
    async newPage(opts = {}) { return browser.newPage({ viewport: opts.viewport || { width: 1400, height: 900 } }); },
    async close() { await browser.close().catch(() => {}); },
  };
}

export async function launchTarget() {
  if (process.env.HOLYTRON_URL) return launchPlain(process.env.HOLYTRON_URL);
  const kind = 'electron';
  console.log('[target] ' + (process.env.HOLYTRON_EXE ? 'electron (packaged: ' + process.env.HOLYTRON_EXE + ')' : 'electron (source)'));

  const launched = [];                       /* { app, profile } - one per window asked for */
  return {
    kind,
    url: 'templeos://app/index.html',
    /* Electron has one window per app instance, so each newPage() is a fresh
       instance with its own throwaway profile (= its own empty storage). */
    async newPage(opts = {}) {
      const profile = mkdtempSync(join(tmpdir(), 'holytron-run-'));
      const app = await electron.launch({
        ...(process.env.HOLYTRON_EXE ? { executablePath: process.env.HOLYTRON_EXE } : {}),
        args: [...(process.env.HOLYTRON_EXE ? [] : [ROOT]), ...(noSandbox ? ['--no-sandbox'] : [])],
        env: { ...process.env, HOLYTRON_USER_DATA: profile },
      });
      launched.push({ app, profile });
      const page = await app.firstWindow();
      const { width, height } = opts.viewport || {};
      if (width && height) {
        await app.evaluate(({ BrowserWindow }, [w, h]) => {
          const win = BrowserWindow.getAllWindows()[0];
          win.setMinimumSize(1, 1);
          win.setContentSize(w, h);
        }, [width, height]);
        await page.waitForFunction(([w, h]) => innerWidth === w && innerHeight === h, [width, height], { timeout: 10000 });
      }
      return page;
    },
    async close() {
      for (const { app, profile } of launched) {
        await app.close().catch(() => {});
        rmSync(profile, { recursive: true, force: true });
      }
    },
  };
}
