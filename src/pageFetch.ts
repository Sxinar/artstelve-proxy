import type { Page } from 'playwright';

export async function gotoWithRetries(page: Page, url: string, opts?: { signal?: AbortSignal }): Promise<void> {
  const maxAttempts = 2;
  let lastErr: unknown;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      if (opts?.signal?.aborted) throw new Error('aborted');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      return;
    } catch (e) {
      lastErr = e;
      try {
        await page.waitForTimeout(800);
      } catch {
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('navigation failed');
}
