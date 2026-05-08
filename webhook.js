const http = require('http');
const { exec } = require('child_process');

const PORT = 4001;
const APP_DIR = '/opt/cluade-pos';
const BRANCH = 'claude/build-pos-system-v7SBY';

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: APP_DIR, timeout: 120000 }, (err, stdout, stderr) => {
      console.log('[cmd]', cmd);
      if (stdout) console.log('[out]', stdout.trim());
      if (stderr) console.log('[err]', stderr.trim());
      err ? reject(err) : resolve(stdout);
    });
  });
}

async function deploy() {
  console.log('🚀 Deploy triggered...');
  try {
    await run(`git fetch origin ${BRANCH}`);
    await run(`git reset --hard origin/${BRANCH}`);
    await run('npm install --production');
    await run('pm2 restart pos --update-env');
    await run('pm2 restart admin-api --update-env');
    console.log('✅ Deploy complete!');
  } catch (e) {
    console.error('❌ Deploy failed:', e.message);
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      res.writeHead(200);
      res.end('ok');
      deploy();
    });
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    return res.end('webhook server ok');
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => console.log(`Webhook server on port ${PORT}`));

// Auto-deploy on startup
deploy();
