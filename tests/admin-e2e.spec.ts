import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const APP_URL = process.env.APP_URL || 'http://localhost:8080';
const ADMIN_USER = process.env.TEST_ADMIN_USER;
const ADMIN_PASS = process.env.TEST_ADMIN_PASS;

const ARTIFACTS = path.resolve(process.cwd(), 'tests', 'artifacts');
if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });

const writeLog = (name: string, data: string) => fs.writeFileSync(path.join(ARTIFACTS, name), data, 'utf8');

if (!ADMIN_USER || !ADMIN_PASS) {
  console.error('Missing TEST_ADMIN_USER / TEST_ADMIN_PASS environment variables');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();

const consoleMessages: string[] = [];
page.on('console', (msg) => {
  const text = `[console:${msg.type()}] ${msg.text()}`;
  consoleMessages.push(text);
  console.log(text);
});
page.on('pageerror', (err) => {
  const text = `[pageerror] ${String(err)}`;
  consoleMessages.push(text);
  console.error(text);
});

let failed = false;
try {
  await page.goto(`${APP_URL}/admin`, { waitUntil: 'networkidle' });

  // Login
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  await page.fill('input[type="email"]', ADMIN_USER);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await Promise.all([
    page.click('button:has-text("Sign in")'),
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 8000 }).catch(() => {}),
  ]);

  // Ensure workspace loaded
  await page.waitForTimeout(1000);
  writeLog('console_before_tabs.log', consoleMessages.join('\n'));

  // Check Editor workspace tabs under Content & Layout
  try {
    await page.click('text=Content & Layout', { timeout: 3000 }).catch(() => {});
  } catch {}

  const tabs = [
    { label: 'Pages', waitFor: 'Live preview' },
    { label: 'Blocks & Content', waitFor: 'Add Section' },
    { label: 'Policies', waitFor: 'Policies' },
    { label: 'Site Settings', waitFor: 'Site Settings' },
  ];

  for (const t of tabs) {
    try {
      await page.click(`text=${t.label}`, { timeout: 4000 });
      await page.waitForTimeout(800);
      await page.waitForSelector(`text=${t.waitFor}`, { timeout: 8000 });
      await page.screenshot({ path: path.join(ARTIFACTS, `${t.label.replace(/\s+/g,'-')}.png`) });
    } catch (err) {
      failed = true;
      writeLog(`${t.label.replace(/\s+/g,'-')}-error.log`, String(err));
      await page.screenshot({ path: path.join(ARTIFACTS, `${t.label.replace(/\s+/g,'-')}-error.png`) });
      console.error(`Error loading tab ${t.label}:`, err);
    }
  }

  // Switch to Pages tab
  try {
    await page.click('text=Pages');
    // Wait for PageEditor preview to load (non-native select is used)
    await page.waitForSelector('text=Live preview', { timeout: 15000 });
  } catch (err) {
    failed = true;
    writeLog('pages-tab-error.log', String(err));
    await page.screenshot({ path: path.join(ARTIFACTS, 'pages-tab-error.png') });
    // continue to gather more artifacts rather than throwing
  }

  // Select first page option (if exists)
  const sel = await page.$('select');
  if (sel) {
    const options = await sel.$$('option');
    if (options.length > 1) await sel.selectOption({ index: 1 });
  }

  // Wait for iframe preview and overlay
  const iframeLocator = page.frameLocator('iframe');
  await page.waitForTimeout(1000);

  // Try selecting a block in the iframe and verify attribute set
  const blockHandle = iframeLocator.locator('[data-editor-block-id]').first();
  const count = await blockHandle.count();
  if (count === 0) {
    writeLog('no-blocks.log', 'No editor blocks found in preview iframe');
  } else {
    await blockHandle.click();
    // wait for parent to mark selected attribute
    await page.waitForTimeout(500);
    const selected = await iframeLocator.locator('[data-editor-selected="true"]').count();
    writeLog('selection-count.log', `selectedCount=${selected}`);
    if (selected === 0) {
      failed = true;
      writeLog('selection-failure.log', 'Click in iframe did not result in selection attribute');
      await page.screenshot({ path: path.join(ARTIFACTS, 'selection-failure.png') });
    }

    // Attempt inline edit by double-clicking the same element
    try {
      await blockHandle.dblclick();
      // Inline editor should appear in host: look for input or textarea that's visible
      const inlineInput = page.locator('input, textarea').filter({ hasText: '' }).first();
      await page.waitForTimeout(300);
      if (await inlineInput.count()) {
        await inlineInput.fill('Automated inline edit');
        await inlineInput.press('Enter');
        await page.waitForTimeout(800);

        // Verify iframe element text updated (best-effort)
        const updatedText = await blockHandle.textContent();
        writeLog('inline-edit-result.log', `after=${String(updatedText)}`);
        if (!String(updatedText).includes('Automated inline edit')) {
          failed = true;
          writeLog('inline-edit-failure.log', `expected text not found: ${String(updatedText)}`);
          await page.screenshot({ path: path.join(ARTIFACTS, 'inline-edit-failure.png') });
        }
      } else {
        writeLog('inline-editor-not-found.log', 'No inline input/textarea found after dblclick');
        failed = true;
        await page.screenshot({ path: path.join(ARTIFACTS, 'inline-editor-missing.png') });
      }
    } catch (err) {
      failed = true;
      writeLog('inline-edit-exception.log', String(err));
      await page.screenshot({ path: path.join(ARTIFACTS, 'inline-edit-exception.png') });
    }
  }

  // Try Add first section button on empty canvas or inline add
  try {
    const addBtn = page.locator('text=Add first section, button, text=Add first section').first();
    if (await addBtn.count()) {
      await addBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(ARTIFACTS, 'add-first-clicked.png') });
    } else {
      // Try inline + Add Section buttons
      const pluses = page.locator('text=+ Add Section').first();
      if (await pluses.count()) {
        await pluses.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(ARTIFACTS, 'inline-add-clicked.png') });
      } else {
        writeLog('add-section-missing.log', 'No add-section controls found');
      }
    }
  } catch (err) {
    failed = true;
    writeLog('add-section-error.log', String(err));
    await page.screenshot({ path: path.join(ARTIFACTS, 'add-section-error.png') });
  }

  // Save console messages
  writeLog('console_after_run.log', consoleMessages.join('\n'));

  if (failed) {
    console.error('One or more checks failed — see tests/artifacts for logs/screenshots');
    await browser.close();
    process.exit(3);
  }

  console.log('All checks passed (best-effort)');
} catch (err) {
  console.error('Top-level error during automated run:', err);
  writeLog('top-level-error.log', String(err));
  await page.screenshot({ path: path.join(ARTIFACTS, 'top-level-error.png') }).catch(() => {});
  await browser.close();
  process.exit(2);
}
await browser.close();
process.exit(0);
