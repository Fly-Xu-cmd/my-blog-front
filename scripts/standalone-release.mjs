import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const hash = (file) => {
  const digest = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.alloc(1024 * 1024);
  try {
    let size;
    while ((size = fs.readSync(fd, buffer)) > 0) digest.update(buffer.subarray(0, size));
    return digest.digest('hex');
  } finally { fs.closeSync(fd); }
};
const fail = (code) => { throw new Error(code); };

export function createReceipt(root, releaseId, archiveRoot = root) {
  return {
    version: 1, releaseId, platform: process.platform, arch: process.arch, nodeMajor: 24,
    archive: hash(path.join(archiveRoot, 'standalone-release.tar.gz')),
    package: hash(path.join(root, 'package.json')), lockfile: hash(path.join(root, 'pnpm-lock.yaml')),
    buildId: fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8').trim(),
  };
}

export function validateArchive(root, releaseId) {
  const receipt = JSON.parse(fs.readFileSync(path.join(root, 'standalone-release.json'), 'utf8'));
  if (receipt.version !== 1 || receipt.releaseId !== releaseId || receipt.nodeMajor !== 24 ||
      receipt.platform !== 'linux' || receipt.arch !== 'x64' || process.platform !== 'linux' || process.arch !== 'x64' ||
      !process.report.getReport().header.glibcVersionRuntime || Number(process.versions.node.split('.')[0]) !== 24)
    fail('RELEASE_OR_RUNTIME_MISMATCH');
  if (receipt.archive !== hash(path.join(root, 'standalone-release.tar.gz'))) fail('RELEASE_CHECKSUM_MISMATCH');
  return receipt;
}

export function validateFiles(root, releaseId) {
  const receipt = validateArchive(root, releaseId);
  const expected = createReceipt(root, releaseId);
  if (Object.keys(expected).some((key) => receipt[key] !== expected[key])) fail('RELEASE_FILES_MISMATCH');
  for (const file of ['server.js', 'ecosystem.config.cjs', 'deployment/node_modules/prisma/build/index.js',
    'deployment/scripts/deployment-db.mjs', 'prisma/schema.prisma', 'public/deploy-version.txt']) {
    if (!fs.existsSync(path.join(root, file))) fail('INCOMPLETE_STANDALONE_RELEASE');
  }
}

export function auditFiles(root) {
  const resolvedRoot = fs.realpathSync(root);
  function visit(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isSymbolicLink()) {
        const target = fs.realpathSync(file);
        if (!target.startsWith(resolvedRoot + path.sep)) fail('EXTERNAL_RELEASE_SYMLINK');
      } else if (item.isDirectory()) visit(file);
      else if (item.name === 'package.json' && file.includes(path.sep + 'node_modules' + path.sep)) {
        const name = JSON.parse(fs.readFileSync(file, 'utf8')).name;
        if (['@playwright/test', 'playwright', 'playwright-core', 'vitest', 'eslint', 'typescript', 'tsx'].includes(name))
          fail('DEVELOPMENT_PACKAGE_IN_RELEASE');
      }
    }
  }
  for (const name of fs.readdirSync(root)) if (name.startsWith('.env')) fail('ENV_FILE_IN_RELEASE');
  visit(root);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [command, releaseId, root] = process.argv.slice(2);
    if (command === 'create') fs.writeFileSync('standalone-release.json', JSON.stringify(createReceipt(root, releaseId, process.cwd())));
    else if (command === 'validate-archive') validateArchive(process.cwd(), releaseId);
    else if (command === 'validate-files') validateFiles(process.cwd(), releaseId);
    else if (command === 'audit') auditFiles(releaseId);
    else fail('INVALID_RELEASE_COMMAND');
  } catch (error) { console.error(`Standalone release stopped: ${error.message}`); process.exitCode = 1; }
}
