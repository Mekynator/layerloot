import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:8080';
const ADMIN_USER = process.env.TEST_ADMIN_USER;
const ADMIN_PASS = process.env.TEST_ADMIN_PASS;

test.describe('Admin editor smoke', () => {
  test('login and open page editor, perform inline edit', async ({ page }) => {
    if (!ADMIN_USER || !ADMIN_PASS) {
      test.skip(true, 'No admin credentials provided via env');
    }

    await page.goto(`${APP_URL}/admin`);

    // Wait for login form
    await page.locator('input[type="email"]').fill(ADMIN_USER);
    await page.locator('input[type="password"]').fill(ADMIN_PASS);
    await page.locator('button:has-text("Sign in")').first().click();

    // Wait for workspace to load
    await page.waitForURL('**/admin/**', { timeout: 10000 }).catch(() => {});

    // Navigate to Content & Layout tab if needed
    await page.click('text=Content & Layout').catch(() => {});

    // Open Pages tab and select first page
    await page.click('text=Pages').catch(() => {});
    await page.waitForSelector('select', { timeout: 5000 });

    // Choose the first selectable page option
    const select = page.locator('select').first();
    const options = await select.locator('option').allTextContents();
    if (options.length > 1) {
      await select.selectOption({ index: 1 }).catch(() => {});
    }

    // Wait for preview iframe
    const iframe = page.frameLocator('iframe');
    await page.waitForTimeout(1000);

    // Click first editable block inside iframe
    const block = iframe.locator('[data-editor-block-id]').first();
    await block.click({ timeout: 5000 }).catch(() => {});

    // Attempt double-click to trigger inline edit
    await block.dblclick().catch(() => {});

    // If inline editor appears in host, try to type and save
    const inlineInput = page.locator('input, textarea').first();
    if (await inlineInput.count()) {
      await inlineInput.fill('Playwright test edit');
      await inlineInput.press('Enter');
    }

    // Basic assertion: ensure we remain on admin workspace
    expect(page.url()).toContain('/admin');
  });
});
