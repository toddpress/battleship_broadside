import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:8791',
    channel: 'chromium',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'PORT=8791 node server/index.ts',
    url: 'http://127.0.0.1:8791/api/v1/health',
    reuseExistingServer: false,
  },
});
