import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    env: {
      DATABASE_URL: 'mysql://root:local-test-only@127.0.0.1:13316/blog_test',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '16386',
      REDIS_PASSWORD: 'local-test-only',
      ADMIN_USERNAME: 'test-admin',
      ADMIN_PASSWORD: 'test-only',
      JWT_SECRET: 'local-jwt-test-secret',
      SYNC_API_TOKEN: 'local-sync-test-secret',
      TRUST_PROXY: 'false',
    },
  },
});

