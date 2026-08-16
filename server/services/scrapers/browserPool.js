import { chromium } from 'playwright';

let sharedBrowser = null;
let browserRefCount = 0;

export class BrowserPool {
  static async acquire() {
    if (!sharedBrowser || !sharedBrowser.isConnected()) {
      sharedBrowser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });
    }
    browserRefCount += 1;
    return sharedBrowser;
  }

  static async release() {
    browserRefCount = Math.max(0, browserRefCount - 1);
    if (browserRefCount === 0 && sharedBrowser) {
      await sharedBrowser.close().catch(() => {});
      sharedBrowser = null;
    }
  }

  static async resetForTests() {
    if (sharedBrowser) {
      await sharedBrowser.close().catch(() => {});
      sharedBrowser = null;
    }
    browserRefCount = 0;
  }
}
