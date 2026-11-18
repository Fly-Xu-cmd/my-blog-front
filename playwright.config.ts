import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:3197', locale: 'zh-CN', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'pnpm exec tsx tests/e2e/seed.ts && pnpm start',
      url: 'http://127.0.0.1:3197',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        HOSTNAME: '127.0.0.1',
        PORT: '3197',
        DATABASE_URL: 'mysql://root:local-test-only@127.0.0.1:13316/blog_test',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '16386',
        REDIS_PASSWORD: 'local-test-only',
        JWT_SECRET: 'local-jwt-test-secret',
        ADMIN_USERNAME: 'test-admin',
        ADMIN_PASSWORD: 'test-only',
        SYNC_API_TOKEN: 'local-sync-test-secret',
        NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3197',
        TRUST_PROXY: 'false',
      },
    },
    ...(process.env.ADMIN_E2E_DIR
      ? [
          {
            command: 'node tests/e2e/admin-server.mjs',
            url: 'http://127.0.0.1:8000',
            reuseExistingServer: false,
          },
        ]
      : []),
  ],
});
