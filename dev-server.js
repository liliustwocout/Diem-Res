// Chạy cục bộ: node server.js (dùng chung lõi API với bản Vercel, dữ liệu trong file data.db)
const http = require('http');
const fs = require('fs');
const path = require('path');
const handler = require('./lib/app.js');
const PORT = process.env.PORT || 3000;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const root = path.join(__dirname, 'public');
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return handler(req, res);
  const full = path.join(root, path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
  let file = full;
  // Đường dẫn của giao diện (/tong-quan, /thuc-don...) đều trả về index.html, như rewrite trên Vercel
  if (!path.extname(url.pathname)) file = path.join(root, 'index.html');
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Chạy tại http://localhost:${PORT}`));
