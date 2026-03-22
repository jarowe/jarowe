import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  use: {
    headless: true,
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npx vite --port 5179',
    port: 5179,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
