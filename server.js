// Website quản lý nhà hàng - MVP. Không phụ thuộc thư viện ngoài (Node >= 22.13).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const db = new DatabaseSync(path.join(__dirname, 'data.db'));
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE, name TEXT, role TEXT, salt TEXT, hash TEXT, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS menu(id INTEGER PRIMARY KEY, name TEXT, price INTEGER, category TEXT DEFAULT '', available INTEGER DEFAULT 1, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS tables_(id INTEGER PRIMARY KEY, name TEXT, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, table_id INTEGER, status TEXT DEFAULT 'open', created_at TEXT, paid_at TEXT, total INTEGER DEFAULT 0, method TEXT, user_id INTEGER);
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY, order_id INTEGER, menu_id INTEGER, name TEXT, price INTEGER, qty INTEGER, note TEXT DEFAULT '', status TEXT DEFAULT 'draft', sent_at TEXT);
CREATE TABLE IF NOT EXISTS expenses(id INTEGER PRIMARY KEY, date TEXT, title TEXT, amount INTEGER, user_id INTEGER);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER);
`);

// ---------- helpers ----------
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
function addUser(username, name, role, pw) {
  const salt = crypto.randomBytes(8).toString('hex');
  db.prepare('INSERT INTO users(username,name,role,salt,hash) VALUES(?,?,?,?,?)').run(username, name, role, salt, hashPw(pw, salt));
}
const now = () => new Date().toISOString();
const q = (sql, ...a) => db.prepare(sql).all(...a);
const q1 = (sql, ...a) => db.prepare(sql).get(...a);
const run = (sql, ...a) => db.prepare(sql).run(...a);

if (!q1('SELECT 1 x FROM users')) {
  addUser('admin', 'Quản trị', 'admin', 'admin123');
  addUser('nhanvien', 'Nhân viên', 'staff', '123456');
  addUser('bep', 'Bếp', 'kitchen', '123456');
  addUser('ketoan', 'Kế toán', 'accountant', '123456');
  [['Phở bò', 55000, 'Món chính'], ['Bún chả', 50000, 'Món chính'], ['Cơm tấm sườn', 60000, 'Món chính'],
   ['Gỏi cuốn', 35000, 'Khai vị'], ['Chả giò', 40000, 'Khai vị'], ['Trà đá', 5000, 'Đồ uống'],
   ['Cà phê sữa', 25000, 'Đồ uống'], ['Nước cam', 30000, 'Đồ uống']]
    .forEach(m => run('INSERT INTO menu(name,price,category) VALUES(?,?,?)', ...m));
  for (let i = 1; i <= 8; i++) run('INSERT INTO tables_(name) VALUES(?)', 'Bàn ' + i);
}

// SSE
const clients = new Set();
function broadcast(type) { for (const r of clients) r.write(`data: ${type}\n\n`); }

const ROLES = ['admin', 'staff', 'kitchen', 'accountant'];
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise(r => { let s = ''; req.on('data', c => (s += c)); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(c => c[0]));
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function orderFull(o) {
  o.items = q("SELECT * FROM order_items WHERE order_id=? ORDER BY id", o.id);
  return o;
}
const openOrderOf = tid => q1("SELECT * FROM orders WHERE table_id=? AND status='open'", tid);
const recalc = id => run('UPDATE orders SET total=(SELECT COALESCE(SUM(price*qty),0) FROM order_items WHERE order_id=?) WHERE id=?', id, id);

// ---------- routes: [method, path, roles|null, handler(ctx)] ----------
const A = ['admin'], S = ['admin', 'staff'], K = ['admin', 'kitchen'], C = ['admin', 'accountant'];
const routes = [
  ['GET', '/api/menu', ['admin', 'staff', 'kitchen', 'accountant'], () => q('SELECT * FROM menu WHERE active=1 ORDER BY category,id')],
  ['POST', '/api/menu', A, ({ b }) => { if (!b.name || !(b.price >= 0)) throw 'Thiếu tên/giá'; run('INSERT INTO menu(name,price,category) VALUES(?,?,?)', b.name, +b.price, b.category || ''); broadcast('menu'); return { ok: 1 }; }],
  ['PUT', '/api/menu/:id', ['admin', 'kitchen'], ({ b, p, user }) => {
    if (user.role === 'kitchen') { run('UPDATE menu SET available=? WHERE id=?', b.available ? 1 : 0, p.id); }
    else run('UPDATE menu SET name=COALESCE(?,name),price=COALESCE(?,price),category=COALESCE(?,category),available=COALESCE(?,available) WHERE id=?', b.name ?? null, b.price ?? null, b.category ?? null, b.available == null ? null : (b.available ? 1 : 0), p.id);
    broadcast('menu'); return { ok: 1 };
  }],
  ['DELETE', '/api/menu/:id', A, ({ p }) => { run('UPDATE menu SET active=0 WHERE id=?', p.id); broadcast('menu'); return { ok: 1 }; }],

  ['GET', '/api/tables', ['admin', 'staff', 'kitchen', 'accountant'], () => q('SELECT * FROM tables_ WHERE active=1 ORDER BY id').map(t => ({ ...t, order: (o => o && orderFull(o))(openOrderOf(t.id)) }))],
  ['POST', '/api/tables', A, ({ b }) => { if (!b.name) throw 'Thiếu tên bàn'; run('INSERT INTO tables_(name) VALUES(?)', b.name); broadcast('tables'); return { ok: 1 }; }],
  ['PUT', '/api/tables/:id', A, ({ b, p }) => { if (!b.name) throw 'Thiếu tên bàn'; run('UPDATE tables_ SET name=? WHERE id=?', b.name, p.id); broadcast('tables'); return { ok: 1 }; }],
  ['DELETE', '/api/tables/:id', A, ({ p }) => { if (openOrderOf(p.id)) throw 'Bàn đang có đơn'; run('UPDATE tables_ SET active=0 WHERE id=?', p.id); broadcast('tables'); return { ok: 1 }; }],

  ['GET', '/api/users', A, () => q('SELECT id,username,name,role,active FROM users ORDER BY id')],
  ['POST', '/api/users', A, ({ b }) => {
    if (!b.username || !b.password || !ROLES.includes(b.role)) throw 'Thiếu thông tin';
    if (q1('SELECT 1 x FROM users WHERE username=?', b.username)) throw 'Tên đăng nhập đã tồn tại';
    addUser(b.username, b.name || b.username, b.role, b.password); return { ok: 1 };
  }],
  ['PUT', '/api/users/:id', A, ({ b, p, user }) => {
    if (b.password) { const salt = crypto.randomBytes(8).toString('hex'); run('UPDATE users SET salt=?,hash=? WHERE id=?', salt, hashPw(b.password, salt), p.id); }
    if (b.active != null) { if (+p.id === user.id) throw 'Không thể khoá chính mình'; run('UPDATE users SET active=? WHERE id=?', b.active ? 1 : 0, p.id); if (!b.active) run('DELETE FROM sessions WHERE user_id=?', p.id); }
    return { ok: 1 };
  }],

  // Nhân viên: thêm món vào bàn
  ['POST', '/api/tables/:id/items', S, ({ b, p, user }) => {
    const m = q1('SELECT * FROM menu WHERE id=? AND active=1', b.menu_id);
    if (!m) throw 'Món không tồn tại';
    if (!m.available) throw m.name + ' đã hết';
    let o = openOrderOf(p.id);
    if (!o) { const r = run('INSERT INTO orders(table_id,created_at,user_id) VALUES(?,?,?)', p.id, now(), user.id); o = { id: Number(r.lastInsertRowid) }; }
    const qty = Math.max(1, +b.qty || 1);
    // Cộng dồn vào dòng cùng món chưa gửi bếp; nếu đã gửi thì tạo dòng mới để bếp thấy phần thêm
    const same = q1("SELECT id FROM order_items WHERE order_id=? AND menu_id=? AND note=? AND status='draft'", o.id, m.id, b.note || '');
    if (same) run('UPDATE order_items SET qty=qty+? WHERE id=?', qty, same.id);
    else run('INSERT INTO order_items(order_id,menu_id,name,price,qty,note) VALUES(?,?,?,?,?,?)', o.id, m.id, m.name, m.price, qty, b.note || '');
    recalc(o.id); broadcast('tables'); return { ok: 1 };
  }],
  ['DELETE', '/api/items/:id', S, ({ p }) => {
    const it = q1('SELECT * FROM order_items WHERE id=?', p.id);
    if (!it) throw 'Không tìm thấy';
    if (it.status !== 'draft') throw 'Món đã gửi bếp, không xoá được';
    run('DELETE FROM order_items WHERE id=?', p.id); recalc(it.order_id); broadcast('tables'); return { ok: 1 };
  }],
  ['POST', '/api/items/:id/dec', S, ({ p }) => {
    const it = q1('SELECT * FROM order_items WHERE id=?', p.id);
    if (!it || it.status !== 'draft') throw 'Món đã gửi bếp, không giảm được';
    if (it.qty > 1) run('UPDATE order_items SET qty=qty-1 WHERE id=?', p.id); else run('DELETE FROM order_items WHERE id=?', p.id);
    recalc(it.order_id); broadcast('tables'); return { ok: 1 };
  }],
  ['POST', '/api/tables/:id/send', S, ({ p }) => {
    const o = openOrderOf(p.id); if (!o) throw 'Bàn chưa có đơn';
    const n = run("UPDATE order_items SET status='new',sent_at=? WHERE order_id=? AND status='draft'", now(), o.id).changes;
    if (!n) throw 'Không có món mới để gửi';
    broadcast('kitchen'); broadcast('tables'); return { ok: 1, sent: n };
  }],
  ['POST', '/api/tables/:id/pay', S, ({ b, p }) => {
    const o = openOrderOf(p.id); if (!o) throw 'Bàn chưa có đơn';
    if (q1("SELECT 1 x FROM order_items WHERE order_id=? AND status='draft'", o.id)) throw 'Còn món chưa gửi bếp';
    if (q1("SELECT 1 x FROM order_items WHERE order_id=? AND status IN('new','cooking')", o.id) && !b.force) throw 'Bếp chưa làm xong hết món';
    recalc(o.id);
    run("UPDATE orders SET status='paid',paid_at=?,method=? WHERE id=?", now(), b.method === 'transfer' ? 'transfer' : 'cash', o.id);
    broadcast('tables'); broadcast('kitchen'); broadcast('report');
    const paid = orderFull(q1('SELECT * FROM orders WHERE id=?', o.id));
    paid.table_name = q1('SELECT name FROM tables_ WHERE id=?', p.id).name;
    return { ok: 1, order: paid };
  }],

  // Bếp
  ['GET', '/api/kitchen', K, () => q("SELECT i.*, t.name AS table_name FROM order_items i JOIN orders o ON o.id=i.order_id JOIN tables_ t ON t.id=o.table_id WHERE o.status='open' AND i.status IN('new','cooking','done') AND i.sent_at IS NOT NULL AND (i.status!='done' OR i.sent_at > ?) ORDER BY i.sent_at,i.id", new Date(Date.now() - 3600e3).toISOString())],
  ['PUT', '/api/kitchen/:id', K, ({ b, p }) => {
    if (!['cooking', 'done'].includes(b.status)) throw 'Trạng thái sai';
    run('UPDATE order_items SET status=? WHERE id=? AND status!=?', b.status, p.id, 'draft'); broadcast('kitchen'); broadcast('tables'); return { ok: 1 };
  }],

  ['PUT', '/api/kitchen/order/:oid', K, ({ b, p }) => {
    if (b.status === 'cooking') run("UPDATE order_items SET status='cooking' WHERE order_id=? AND status='new'", p.oid);
    else if (b.status === 'done') run("UPDATE order_items SET status='done' WHERE order_id=? AND status IN('new','cooking')", p.oid);
    else throw 'Trạng thái sai';
    broadcast('kitchen'); broadcast('tables'); return { ok: 1 };
  }],

  // Kế toán / admin
  ['GET', '/api/report', C, ({ url }) => {
    const from = url.searchParams.get('from') || today(), to = url.searchParams.get('to') || today();
    const lo = new Date(from + 'T00:00:00').toISOString(), hi = new Date(to + 'T23:59:59.999').toISOString();
    const rev = q1("SELECT COALESCE(SUM(total),0) s, COUNT(*) c FROM orders WHERE status='paid' AND paid_at BETWEEN ? AND ?", lo, hi);
    const exp = q1('SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE date BETWEEN ? AND ?', from, to);
    const byDay = q("SELECT substr(datetime(paid_at,'localtime'),1,10) d, SUM(total) s, COUNT(*) c FROM orders WHERE status='paid' AND paid_at BETWEEN ? AND ? GROUP BY d ORDER BY d", lo, hi);
    const top = q("SELECT i.name, SUM(i.qty) q, SUM(i.qty*i.price) s FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.status='paid' AND o.paid_at BETWEEN ? AND ? GROUP BY i.name ORDER BY q DESC LIMIT 5", lo, hi);
    return { from, to, revenue: rev.s, orders: rev.c, expense: exp.s, profit: rev.s - exp.s, byDay, top };
  }],
  ['GET', '/api/expenses', C, ({ url }) => q('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC,id DESC', url.searchParams.get('from') || '0000', url.searchParams.get('to') || '9999')],
  ['POST', '/api/expenses', C, ({ b, user }) => {
    if (!b.title || !(+b.amount > 0)) throw 'Thiếu nội dung/số tiền';
    run('INSERT INTO expenses(date,title,amount,user_id) VALUES(?,?,?,?)', b.date || today(), b.title, +b.amount, user.id); broadcast('report'); return { ok: 1 };
  }],
  ['DELETE', '/api/expenses/:id', C, ({ p }) => { run('DELETE FROM expenses WHERE id=?', p.id); broadcast('report'); return { ok: 1 }; }],
  ['GET', '/api/export', C, ({ url }) => {
    const from = url.searchParams.get('from') || today(), to = url.searchParams.get('to') || today();
    const lo = new Date(from + 'T00:00:00').toISOString(), hi = new Date(to + 'T23:59:59.999').toISOString();
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['Loại', 'Ngày', 'Nội dung', 'Số tiền']];
    q("SELECT o.id,o.paid_at,o.total,o.method,t.name tn FROM orders o JOIN tables_ t ON t.id=o.table_id WHERE o.status='paid' AND o.paid_at BETWEEN ? AND ? ORDER BY o.paid_at", lo, hi)
      .forEach(o => rows.push(['Thu', o.paid_at.slice(0, 10), `Đơn #${o.id} - ${o.tn} (${o.method === 'transfer' ? 'CK' : 'Tiền mặt'})`, o.total]));
    q('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date', from, to).forEach(e => rows.push(['Chi', e.date, e.title, -e.amount]));
    return { csv: '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n'), name: `bao-cao_${from}_${to}.csv` };
  }],
];

const matchers = routes.map(([m, p, roles, h]) => ({ m, roles, h, re: new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$') }));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (!url.pathname.startsWith('/api/')) {
      let f = url.pathname === '/' ? '/index.html' : url.pathname;
      const full = path.join(__dirname, 'public', path.normalize(f));
      if (!full.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
      return fs.createReadStream(full).pipe(res);
    }
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const b = await body(req);
      const u = q1('SELECT * FROM users WHERE username=? AND active=1', String(b.username || '').trim().toLowerCase());
      if (!u || !crypto.timingSafeEqual(Buffer.from(hashPw(String(b.password || ''), u.salt)), Buffer.from(u.hash))) return json(res, 401, { error: 'Sai tên đăng nhập hoặc mật khẩu' });
      const token = crypto.randomBytes(24).toString('hex');
      run('INSERT INTO sessions VALUES(?,?)', token, u.id);
      res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);
      return json(res, 200, { id: u.id, name: u.name, role: u.role });
    }
    const s = q1('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND u.active=1', cookie(req).sid || '');
    if (url.pathname === '/api/logout') { run('DELETE FROM sessions WHERE token=?', cookie(req).sid || ''); return json(res, 200, { ok: 1 }); }
    if (!s) return json(res, 401, { error: 'Chưa đăng nhập' });
    const user = { id: s.id, name: s.name, role: s.role };
    if (url.pathname === '/api/me') return json(res, 200, user);
    if (url.pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write('retry: 2000\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
    }
    for (const r of matchers) {
      if (r.m !== req.method) continue;
      const mt = r.re.exec(url.pathname); if (!mt) continue;
      if (!r.roles.includes(user.role)) return json(res, 403, { error: 'Không có quyền' });
      const out = r.h({ b: ['GET', 'DELETE'].includes(req.method) ? {} : await body(req), p: mt.groups || {}, user, url });
      if (out && out.csv) {
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${out.name}"` });
        return res.end(out.csv);
      }
      return json(res, 200, out);
    }
    json(res, 404, { error: 'Không tìm thấy' });
  } catch (e) {
    json(res, 400, { error: typeof e === 'string' ? e : 'Lỗi: ' + e.message });
  }
}).listen(PORT, () => console.log(`Chạy tại http://localhost:${PORT}`));
