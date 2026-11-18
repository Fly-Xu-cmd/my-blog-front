import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

test('real OpenSSH rejects a TCP peer that never completes SSH handshake within its deadline', {
  skip: process.platform !== 'linux' || !fs.existsSync('/usr/bin/ssh'), timeout: 30000,
}, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-ssh-blackhole-'));
  const sockets = new Set();
  const server = net.createServer((socket) => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  let connected = false;
  server.on('connection', () => { connected = true; });
  let child;
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const started = Date.now();
    let output = '';
    child = spawn('bash', ['scripts/deploy-ssh.sh', 'test-connect', '2'], {
      env: { ...process.env, PATH: '/usr/bin:/bin', DEPLOY_HOST: '127.0.0.1', SSH_USER: 'appuser',
        DEPLOY_PORT: String(server.address().port), DEPLOY_KEY: 'test-only-key', RUNNER_TEMP: root,
        GITHUB_STEP_SUMMARY: path.join(root, 'summary') },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { output += data; });
    const done = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
    child.stdin.end(`touch '${path.join(root, 'mutation')}'\n`);
    assert.equal(await done, 255);
    assert.ok(connected, 'The TCP connection must actually succeed before the handshake stalls');
    assert.ok(Date.now() - started < 25000);
    assert.match(output, /SSH_FAILED: ssh-readiness/);
    assert.match(output, /timed out/i);
    assert.equal(fs.existsSync(path.join(root, 'mutation')), false);
    assert.equal(fs.readdirSync(root).some((name) => name.startsWith('blog-transport.')), false);
  } finally {
    if (child?.exitCode === null) child.kill('SIGKILL');
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
