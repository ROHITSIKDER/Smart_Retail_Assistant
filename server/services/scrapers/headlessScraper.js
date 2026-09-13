import * as cheerio from 'cheerio';
import { ProxyManager } from './proxyManager.js';
import { BrowserPool } from './browserPool.js';
import { isPrivateIp } from '../../utils/ipValidator.js';

export class HeadlessScraper {
  static async fetchRenderedHtml(url, options = {}) {
    const {
      waitForSelector = null,
      proxyEntry = null,
      navTimeout = 10000,
      selectorTimeout = 4000,
      signal = null
    } = options;

    if (signal?.aborted) {
      throw new Error('Operation aborted by client');
    }

    let context;
    let abortListener;
    try {
      const headers = ProxyManager.getRandomHeaders();
      const browser = await BrowserPool.acquire();
      const playwrightProxy = ProxyManager.getPlaywrightProxy(proxyEntry);

      const contextOptions = {
        userAgent: headers['User-Agent'],
        viewport: { width: 1280, height: 800 },
        locale: 'en-US'
      };

      if (playwrightProxy) {
        contextOptions.proxy = playwrightProxy.config;
      }

      context = await browser.newContext(contextOptions);

      if (signal) {
        abortListener = () => {
          context.close().catch(() => {});
        };
        signal.addEventListener('abort', abortListener, { once: true });
      }

      const page = await context.newPage();

      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      // SSRF Route Interception
      await page.route('**/*', (route) => {
        try {
          const reqUrl = new URL(route.request().url());
          const host = reqUrl.hostname.toLowerCase();
          if (
            host === 'localhost' ||
            host.endsWith('.localhost') ||
            host.endsWith('.local') ||
            host.endsWith('.internal') ||
            isPrivateIp(host)
          ) {
            return route.abort();
          }
        } catch {
          return route.abort();
        }
        return route.continue();
      });

      console.log(`[Headless Engine] Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navTimeout });

      if (waitForSelector && !signal?.aborted) {
        await page.waitForSelector(waitForSelector, { timeout: selectorTimeout }).catch(() => {
          console.warn(`[Headless Engine Warning] Selector "${waitForSelector}" timeout reached.`);
        });
      }

      const html = await page.content();
      return cheerio.load(html);
    } catch (err) {
      console.warn(`[Headless Engine Warning] Playwright rendering failed (${err.message}).`);
      if (proxyEntry?.url) {
        ProxyManager.markProxyFailed(proxyEntry.url);
      }
      return null;
    } finally {
      if (signal && abortListener) {
        signal.removeEventListener('abort', abortListener);
      }
      if (context) {
        await context.close().catch(() => {});
      }
      await BrowserPool.release();
    }
  }
}
