/* eslint-disable @typescript-eslint/no-require-imports -- PM2 loads this .cjs config synchronously. */
const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'my-blog',
      cwd: __dirname,
      script: path.join(__dirname, 'server.js'),
      interpreter: process.execPath,
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
        ...(process.env.UPLOAD_DIR ? { UPLOAD_DIR: process.env.UPLOAD_DIR } : {}),
      },
    },
  ],
};
