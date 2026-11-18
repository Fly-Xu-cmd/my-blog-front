import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(process.env.ADMIN_E2E_DIR, 'dist');
http
  .createServer(async (req, res) => {
    try {
      if (req.url.startsWith('/api/')) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const response = await fetch('http://127.0.0.1:3197' + req.url, {
          method: req.method,
          headers: {
            'content-type': req.headers['content-type'] || 'application/json',
            authorization: req.headers.authorization || '',
            'idempotency-key': req.headers['idempotency-key'] || '',
          },
          ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}),
        });
        const headers = Object.fromEntries(response.headers);
        delete headers['content-length'];
        delete headers['content-encoding'];
        res.writeHead(response.status, headers);
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      const requested = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
      if (!requested.startsWith(root + path.sep) && requested !== root) {
        res.writeHead(403);
        res.end();
        return;
      }
      let file = requested;
      const stat = await fs.stat(file).catch(() => null);
      if (!stat?.isFile()) file = path.join(root, 'index.html');
      const ext = path.extname(file);
      res.setHeader(
        'Content-Type',
        {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.json': 'application/json',
        }[ext] || 'application/octet-stream',
      );
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(503);
      res.end('unavailable');
    }
  })
  .listen(8000, '127.0.0.1');
