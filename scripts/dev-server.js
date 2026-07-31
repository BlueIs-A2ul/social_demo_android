const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const WWW_DIR = path.resolve(__dirname, '..', 'www');
const START_PAGE = '/login.html';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const RELOAD_SNIPPET =
  '<script>new EventSource("/__reload").onmessage=function(){location.reload()}</script>';

let reloadClients = new Set();

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function serve(req, res) {
  if (req.url === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 1000\n\n');
    reloadClients.add(res);
    req.on('close', () => reloadClients.delete(res));
    return;
  }

  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = START_PAGE;

  const filePath = path.normalize(path.join(WWW_DIR, urlPath));
  if (!filePath.startsWith(WWW_DIR)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    fs.readFile(filePath, (readErr, buf) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
        return;
      }
      let body = buf;
      if (path.extname(filePath).toLowerCase() === '.html') {
        body = Buffer.concat([buf, Buffer.from(RELOAD_SNIPPET)]);
      }
      res.writeHead(200, { 'Content-Type': type });
      res.end(body);
    });
  });
}

const server = http.createServer(serve);

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}${START_PAGE}`;
  console.log(`开发服务器已启动：${url}`);
  console.log(`静态目录：${WWW_DIR}`);
  console.log('按 Ctrl+C 停止');
  if (process.platform === 'win32') {
    require('child_process').exec(`start "" "${url}"`);
  }
});

fs.watch(WWW_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  console.log(`[变更] ${filename} → 通知浏览器刷新`);
  for (const client of reloadClients) {
    client.write('data: reload\n\n');
  }
});
