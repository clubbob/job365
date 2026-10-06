import type { Browser } from 'playwright';
import { chromium } from 'playwright';

import { BROWSER_USER_AGENT } from '@/lib/crawler/browser-headers';

export type BrowserPageCrawlResult = {
  html: string;
  jsonPayloads: unknown[];
  htmlFragments: Array<{ url: string; html: string }>;
};

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

export async function closeBrowserCrawlSession(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = null;
  await browser.close();
}

/** JavaScript로 채용 목록을 불러오는 페이지를 렌더링하고 XHR 응답 JSON을 수집합니다. */
export async function crawlPageWithBrowser(careersUrl: string): Promise<BrowserPageCrawlResult> {
  const browser = await getBrowser();
  const page = await browser.newPage({ userAgent: BROWSER_USER_AGENT });
  const jsonPayloads: unknown[] = [];
  const htmlFragments: Array<{ url: string; html: string }> = [];

  page.on('response', (response) => {
    void (async () => {
      const type = response.request().resourceType();
      if (type !== 'xhr' && type !== 'fetch') return;
      if (!/recruit|job|notice|career|position|\/hr\/|list\.data|detail\.data|\/api\//i.test(response.url())) return;

      const contentType = response.headers()['content-type'] ?? '';
      try {
        if (contentType.includes('json')) {
          jsonPayloads.push(await response.json());
          return;
        }
        if (contentType.includes('html') || contentType.includes('text')) {
          const html = await response.text();
          if (/<(?:h3|div)[^>]*class="[^"]*title|btnShare|list-item/i.test(html)) {
            htmlFragments.push({ url: response.url(), html });
          }
        }
      } catch {
        // ignore parse errors
      }
    })();
  });

  try {
    await page.goto(careersUrl, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.waitForTimeout(1_500);
    return { html: await page.content(), jsonPayloads, htmlFragments };
  } finally {
    await page.close();
  }
}
