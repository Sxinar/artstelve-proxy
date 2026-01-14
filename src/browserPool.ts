import { chromium, type Browser, type LaunchOptions } from 'playwright';

let browserPromise: Promise<Browser> | null = null;

const defaultUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const opts: LaunchOptions = {
      headless: true
    };
    browserPromise = chromium.launch(opts);
  }
  return browserPromise;
}

export async function newContext() {
  const browser = await getBrowser();
  const ctx = await browser.newContext({ userAgent: defaultUserAgent });
  await ctx.route('**/*', async (route) => {
    const req = route.request();
    const type = req.resourceType();
    if (type === 'image' || type === 'media' || type === 'font' || type === 'stylesheet') {
      await route.abort();
      return;
    }
    await route.continue();
  });
  return ctx;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const b = await browserPromise;
  browserPromise = null;
  await b.close();
}
