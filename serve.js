/*
 * Local static server for the TeamTrack build.
 *
 * The build in ./ftcteamtrack.org is a Vite/React SPA:
 *   - its entry document is active.html (there is no index.html)
 *   - it references its bundle with absolute paths ("/assets/..."),
 *     so it must be served from the folder root, not opened as a file
 *   - it routes with the History API ("/active", "/sessions", "/login", ...),
 *     so unknown extension-less paths fall back to the app shell
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'ftcteamtrack.org');
const SHELL = 'active.html';
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, filePath, status = 200) {
  const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Internal Server Error');
  });
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-cache',
  });
  stream.pipe(res);
}

function resolve(requestPath) {
  const target = path.join(ROOT, requestPath);
  // Never let a crafted URL escape the build folder.
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;

  let stat = null;
  try {
    stat = fs.statSync(target);
  } catch (e) {
    stat = null;
  }

  if (stat && stat.isFile()) return target;

  if (stat && stat.isDirectory()) {
    const index = path.join(target, 'index.html');
    if (fs.existsSync(index)) return index;
  }

  // Extension-less routes are SPA routes -> hand back the app shell.
  if (!path.extname(requestPath)) return path.join(ROOT, SHELL);

  return null;
}

http
  .createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    let requestPath;
    try {
      requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('400 Bad Request');
      return;
    }

    const filePath = resolve(requestPath);
    if (filePath) {
      send(res, filePath);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found: ' + requestPath);
  })
  .listen(PORT, () => {
    console.log('TeamTrack is running at http://localhost:' + PORT + '/active');
    console.log('Serving: ' + ROOT);
  });
