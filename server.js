const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const ANH_DIR = path.resolve(__dirname, 'public', 'anh');
const apiHandler = require('./api/index.js');

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Serve Static File Helper
function serveStatic(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stats.size,
      'Cache-Control': 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. API Routes
  if (pathname.startsWith('/api/')) {
    return apiHandler(req, res);
  }

  // 2. Traffic Sign Images
  if (pathname.startsWith('/anh/')) {
    const fileName = pathname.substring(5);
    const filePath = path.join(ANH_DIR, fileName);
    if (fs.existsSync(filePath)) {
      return serveStatic(req, res, filePath);
    } else {
      // Fallback to apiHandler
      return apiHandler(req, res);
    }
  }

  // 3. Static Assets from public/
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      return serveStatic(req, res, filePath);
    }
    // SPA fallback
    const indexHtml = path.join(PUBLIC_DIR, 'index.html');
    return serveStatic(req, res, indexHtml);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 VNEXPRESS CMS - QUẢN LÝ NHÓM BIỂN BÁO GIAO THÔNG`);
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📂 Static assets served from: ${PUBLIC_DIR}`);
  console.log(`🖼️ Sign images served from: ${ANH_DIR}`);
  console.log(`=======================================================`);
});
