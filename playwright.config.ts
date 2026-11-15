import { defineConfig } from '@playwright/test';

const previewUrl = process.env.BMM_E2E_BASE_URL;
const chromeExecutable = process.env.BMM_CHROME_EXECUTABLE;
const localUrl = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.browser.ts',
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL: previewUrl || localUrl,
    browserName: 'chromium',
    launchOptions: chromeExecutable ? { executablePath: chromeExecutable } : undefined,
  },
  webServer: previewUrl
    ? undefined
    : {
        command: 'npm run build && vite preview --host 127.0.0.1 --port 4173 --strictPort',
        url: localUrl,
        reuseExistingServer: false,
      },
});
