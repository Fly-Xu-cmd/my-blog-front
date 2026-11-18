/* eslint-disable @typescript-eslint/no-require-imports -- PM2 loads this .cjs config synchronously. */
const path = require('node:path');
const os = require('node:os');

module.exports = {
  apps: [
    {
      name: 'my-blog',
      cwd: __dirname,
      script: path.join(
        os.homedir(),
        '.local/share/blog-tools/node_modules/pnpm/pnpm',
      ),
      args: ['start'],
      // pnpm 12 的 npm 包入口是原生可执行文件，不能交给 Node 解释。
      interpreter: 'none',
      env: { NODE_ENV: 'production' },
    },
  ],
};
