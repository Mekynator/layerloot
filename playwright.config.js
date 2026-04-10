<<<<<<< HEAD
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', headless: true },
    },
  ],
});
=======
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', headless: true },
    },
  ],
});
>>>>>>> 3b886fd (fix: resolve merge conflicts in EditorPreviewOverlay and stabilize render keys)
