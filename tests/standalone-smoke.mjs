import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { validateFiles } from '../scripts/standalone-release.mjs';

const url = new URL(process.env.DATABASE_URL);
if (!['127.0.0.1', 'host.docker.internal'].includes(url.hostname) || url.port !== '13316' || url.pathname !== '/blog_test')
  throw new Error('Standalone smoke test requires the isolated blog_test database');
const archiveRoot = process.cwd();
const receipt = JSON.parse(fs.readFileSync('standalone-release.json', 'utf8'));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-standalone-smoke-'));
const app = path.join(root, 'release');
fs.mkdirSync(app);
let server;
let log = '';
try {
  fs.copyFileSync('standalone-release.tar.gz', path.join(app, 'standalone-release.tar.gz'));
  fs.copyFileSync('standalone-release.json', path.join(app, 'standalone-release.json'));
  const extraction = spawnSync('tar', ['-xzf', path.join(app, 'standalone-release.tar.gz'), '-C', app]);
  if (extraction.status !== 0) throw new Error('Archive extraction failed');
  validateFiles(app, receipt.releaseId);
  fs.symlinkSync(app, path.join(root, 'current'), 'dir');
  const listener = net.createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const env = { ...process.env, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port), NODE_PATH: '',
    BLOG_DEPLOY_ROOT: root, JWT_SECRET: 'smoke-test-only', ADMIN_USERNAME: 'test-admin', ADMIN_PASSWORD: 'test-only' };
  server = spawn(process.execPath, ['server.js'], { cwd: app, env, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', (data) => { log = (log + data).slice(-6000); });
  const base = `http://127.0.0.1:${port}`;
  async function get(route) {
    const response = await fetch(base + route, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Standalone ${route} returned ${response.status}`);
    return response;
  }
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await get('/deploy-version.txt');
      if ((await response.text()).trim() !== receipt.releaseId) throw new Error('Release marker mismatch');
      ready = true; break;
    } catch {
      if (server.exitCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!ready) throw new Error('Relocated standalone server did not start');
  const posts = await (await get('/api/posts?pageSize=1')).json();
  if (!posts.ok || !Array.isArray(posts.data)) throw new Error('Public API failed');
  const html = await (await get('/archive')).text();
  if (!/<h1[^>]*>文章归档<\/h1>/.test(html)) throw new Error('Server rendered archive missing');
  const assets = [...new Set([...html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g)].map((match) => match[1]))];
  const selectedAssets = ['.js', '.css'].map((extension) => assets.find((asset) => new URL(asset.replaceAll('&amp;', '&'), base).pathname.endsWith(extension)));
  if (selectedAssets.some((asset) => !asset)) throw new Error('SSR page must reference both JavaScript and CSS');
  for (const asset of selectedAssets) {
    const assetUrl = new URL(asset.replaceAll('&amp;', '&'), base);
    const response = await get(assetUrl.pathname + assetUrl.search);
    if (!/(javascript|css)/.test(response.headers.get('content-type') ?? '')) throw new Error('Invalid static asset MIME');
  }
  await get('/subscribe');
  const upload = await fetch(base + '/api/upload-qiniu', { method: 'POST', signal: AbortSignal.timeout(10000) });
  if (upload.status !== 401) throw new Error('Upload SDK route did not load or rejected authorization incorrectly');
  if (!(await (await get('/feed.xml')).text()).includes('<rss')) throw new Error('RSS failed');
  const readiness = await (await get('/api/deployment/readiness')).json();
  if (!readiness.ok) throw new Error('Deployment readiness failed');
  const cli = spawnSync(process.execPath, ['deployment/node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    { cwd: app, env, encoding: 'utf8', timeout: 60000 });
  if (cli.status !== 0) throw new Error('Relocated Prisma migration CLI failed');
  console.log('Relocated standalone: public API, SSR, JS/CSS, RSS, subscription, readiness and Prisma migrate deploy passed');
} catch (error) {
  console.error(log);
  throw error;
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => server.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 10000))]);
    if (server.exitCode === null) { server.kill('SIGKILL'); await new Promise((resolve) => server.once('exit', resolve)); }
  }
  if (!path.resolve(root).startsWith(path.join(os.tmpdir(), 'blog-standalone-smoke-'))) throw new Error('Invalid cleanup path');
  fs.rmSync(root, { recursive: true, force: true });
  process.chdir(archiveRoot);
}
