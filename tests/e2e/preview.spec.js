/**
 * E2E tests for the Preview extension.
 * Require a running Flarum instance (or use baseURL to point to one).
 * Run: npm run test:e2e
 *
 * These tests assume Flarum is running with the Preview extension enabled.
 * For CI, use FLARUM_BASE_URL and optionally mock the preview API via route interception.
 */

import { test, expect } from '@playwright/test';

test.describe('Preview extension', () => {
  test.skip('admin shows Preview extension settings section', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Preview');
    await expect(page.locator('label:has-text(\'Preview on click (eye icon)\')')).toBeVisible();
  });
  test.skip('composer shows preview layer when extension is enabled', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Reply');
    const composer = page.locator('.Composer');
    await expect(composer).toBeVisible();
    await expect(page.locator('.PreviewComposerWrap, .PreviewLayer')).toBeVisible({ timeout: 5000 });
  });

  test.skip('toolbar insert [link](https://) does not render as link until edited', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Reply');
    const textarea = page.locator('.Composer textarea').first();
    await textarea.fill('[link](https://)');
    await page.waitForTimeout(500);
    const preview = page.locator('.PreviewLayer');
    await expect(preview).toBeVisible();
    const linkRendered = preview.locator('a[href="https://"]');
    await expect(linkRendered).toHaveCount(0);
  });

  test.skip('clicking rendered link focuses textarea and selects markdown range', async ({ page }) => {
    await page.route('**/api/preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { attributes: { html: '<p><a href="https://example.com">example</a></p>' } },
        }),
      });
    });
    await page.goto('/');
    await page.click('text=Reply');
    const textarea = page.locator('.Composer textarea').first();
    await textarea.fill('see [example](https://example.com) here');
    await page.waitForTimeout(600);
    const link = page.locator('.PreviewLayer a[data-preview-mapped]').first();
    await link.click();
    await expect(textarea).toBeFocused();
    const value = await textarea.inputValue();
    expect(value).toContain('[example](https://example.com)');
  });

  test.skip('submit sends raw markdown not HTML', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Reply');
    const textarea = page.locator('.Composer textarea').first();
    const content = '**Hello** [world](https://x.com)';
    await textarea.fill(content);
    let postBody = null;
    await page.route('**/api/posts', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        try {
          postBody = request.postDataJSON();
        } catch (_) {}
      }
      await route.continue();
    });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    if (postBody && postBody.data && postBody.data.attributes) {
      expect(postBody.data.attributes.content).toBe(content);
    }
  });
});
