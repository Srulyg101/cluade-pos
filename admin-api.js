const http = require('http');
const { exec } = require('child_process');

const SECRET = process.env.ADMIN_SECRET || 'claude-admin-Solsolrox123';
const PORT = process.env.ADMIN_PORT || 4000;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.headers['x-admin-secret'] !== SECRET) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
  }

  if (req.method === 'POST' && req.url === '/run') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let cmd;
      try { cmd = JSON.parse(body).cmd; } catch { cmd = null; }
      if (!cmd) { res.writeHead(400); return res.end(JSON.stringify({ error: 'Missing cmd' })); }

      exec(cmd, { timeout: 30000, cwd: '/opt/cluade-pos' }, (err, stdout, stderr) => {
        res.writeHead(200);
        res.end(JSON.stringify({ stdout, stderr, exitCode: err?.code ?? 0 }));
      });
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => console.log(`Admin API running on port ${PORT}`));
