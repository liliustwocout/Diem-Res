// Lõi API dùng chung cho Vercel (serverless) và chạy cục bộ. Cơ sở dữ liệu: libSQL (Turso, hoặc file khi chạy cục bộ).
const crypto = require('crypto');
const { createClient } = require('@libsql/client');

const client = createClient({ url: process.env.TURSO_DATABASE_URL || 'file:data.db', authToken: process.env.TURSO_AUTH_TOKEN });
const TZ = '+07:00'; // giờ Việt Nam
const run = async (sql, ...a) => { const r = await client.execute({ sql, args: a }); return { changes: r.rowsAffected, id: Number(r.lastInsertRowid || 0) }; };
const q = async (sql, ...a) => { const r = await client.execute({ sql, args: a }); return r.rows.map(row => Object.fromEntries(r.columns.map((c, i) => [c, row[i]]))); };
const q1 = async (sql, ...a) => (await q(sql, ...a))[0];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE, name TEXT, role TEXT, salt TEXT, hash TEXT, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS menu(id INTEGER PRIMARY KEY, name TEXT, price INTEGER, category TEXT DEFAULT '', available INTEGER DEFAULT 1, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS tables_(id INTEGER PRIMARY KEY, name TEXT, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, table_id INTEGER, status TEXT DEFAULT 'open', created_at TEXT, paid_at TEXT, total INTEGER DEFAULT 0, method TEXT, user_id INTEGER);
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY, order_id INTEGER, menu_id INTEGER, name TEXT, price INTEGER, qty INTEGER, note TEXT DEFAULT '', status TEXT DEFAULT 'draft', sent_at TEXT);
CREATE TABLE IF NOT EXISTS expenses(id INTEGER PRIMARY KEY, date TEXT, title TEXT, amount INTEGER, user_id INTEGER);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER);
`;
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
async function addUser(username, name, role, pw) {
  const salt = crypto.randomBytes(8).toString('hex');
  await run('INSERT INTO users(username,name,role,salt,hash) VALUES(?,?,?,?,?)', username, name, role, salt, hashPw(pw, salt));
}
let ready;
function init() {
  return ready || (ready = (async () => {
    await client.executeMultiple(SCHEMA);
    if (!(await q1('SELECT 1 x FROM users'))) {
      const prod = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
      if (prod) {
        // Bản chạy thật: chỉ tạo quản trị, mật khẩu lấy từ biến môi trường.
        if (!process.env.ADMIN_PASSWORD) throw new Error('Thiếu biến môi trường ADMIN_PASSWORD');
        await addUser('admin', 'Quản trị', 'admin', process.env.ADMIN_PASSWORD);
      } else {
        await addUser('admin', 'Quản trị', 'admin', 'admin123');
        await addUser('nhanvien', 'Nhân viên', 'staff', '123456');
        await addUser('bep', 'Bếp', 'kitchen', '123456');
        await addUser('ketoan', 'Kế toán', 'accountant', '123456');
      }
      await client.batch([
        ...require('./menu-data.js').map(m => ({ sql: 'INSERT INTO menu(name,price,category) VALUES(?,?,?)', args: m })),
        ...Array.from({ length: 8 }, (_, i) => ({ sql: 'INSERT INTO tables_(name) VALUES(?)', args: ['Bàn ' + (i + 1)] })),
      ], 'write');
    }
  })().catch(e => { ready = null; throw e; }));
}

const ROLES = ['admin', 'staff', 'kitchen', 'accountant'];
const now = () => new Date().toISOString();
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const bounds = (from, to) => [new Date(`${from}T00:00:00${TZ}`).toISOString(), new Date(`${to}T23:59:59.999${TZ}`).toISOString()];
const json = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
async function readBody(req) {
  if (req.body !== undefined) { // Vercel đã đọc sẵn body
    let b = req.body;
    if (Buffer.isBuffer(b)) b = b.toString();
    if (typeof b === 'string') { try { return JSON.parse(b || '{}'); } catch { return {}; } }
    return b || {};
  }
  return new Promise(r => { let s = ''; req.on('data', c => (s += c)); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });
}
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(c => c[0]));

const openOrderOf = tid => q1("SELECT * FROM orders WHERE table_id=? AND status='open'", tid);
const orderFull = async o => { o.items = await q('SELECT * FROM order_items WHERE order_id=? ORDER BY id', o.id); return o; };
const recalc = id => run('UPDATE orders SET total=(SELECT COALESCE(SUM(price*qty),0) FROM order_items WHERE order_id=?) WHERE id=?', id, id);
const ALL = ROLES, A = ['admin'], S = ['admin', 'staff'], K = ['admin', 'kitchen'], C = ['admin', 'accountant'];

const routes = [
  ['GET', '/api/menu', ALL, () => q('SELECT * FROM menu WHERE active=1 ORDER BY category,id')],
  ['POST', '/api/menu', A, async ({ b }) => { if (!b.name || !(b.price >= 0)) throw 'Thiếu tên/giá'; await run('INSERT INTO menu(name,price,category) VALUES(?,?,?)', b.name, +b.price, b.category || ''); return { ok: 1 }; }],
  ['PUT', '/api/menu/:id', K, async ({ b, p, user }) => {
    if (user.role === 'kitchen') await run('UPDATE menu SET available=? WHERE id=?', b.available ? 1 : 0, p.id);
    else await run('UPDATE menu SET name=COALESCE(?,name),price=COALESCE(?,price),category=COALESCE(?,category),available=COALESCE(?,available) WHERE id=?', b.name ?? null, b.price ?? null, b.category ?? null, b.available == null ? null : (b.available ? 1 : 0), p.id);
    return { ok: 1 };
  }],
  ['DELETE', '/api/menu/:id', A, async ({ p }) => { await run('UPDATE menu SET active=0 WHERE id=?', p.id); return { ok: 1 }; }],

  ['GET', '/api/tables', ALL, async () => {
    const ts = await q('SELECT * FROM tables_ WHERE active=1 ORDER BY id');
    // 2 truy vấn cố định thay vì 2 truy vấn cho mỗi bàn (tránh N+1 tới DB từ xa)
    const orders = await q("SELECT * FROM orders WHERE status='open'");
    const items = orders.length ? await q("SELECT * FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status='open') ORDER BY id") : [];
    for (const o of orders) o.items = items.filter(i => i.order_id === o.id);
    for (const t of ts) t.order = orders.find(o => o.table_id === t.id) || null;
    return ts;
  }],
  ['POST', '/api/tables', A, async ({ b }) => { if (!b.name) throw 'Thiếu tên bàn'; await run('INSERT INTO tables_(name) VALUES(?)', b.name); return { ok: 1 }; }],
  ['PUT', '/api/tables/:id', A, async ({ b, p }) => { if (!b.name) throw 'Thiếu tên bàn'; await run('UPDATE tables_ SET name=? WHERE id=?', b.name, p.id); return { ok: 1 }; }],
  ['DELETE', '/api/tables/:id', A, async ({ p }) => { if (await openOrderOf(p.id)) throw 'Bàn đang có đơn'; await run('UPDATE tables_ SET active=0 WHERE id=?', p.id); return { ok: 1 }; }],

  ['GET', '/api/users', A, () => q('SELECT id,username,name,role,active FROM users ORDER BY id')],
  ['POST', '/api/users', A, async ({ b }) => {
    const u = String(b.username || '').trim().toLowerCase();
    if (!u || !b.password || !ROLES.includes(b.role)) throw 'Thiếu thông tin';
    if (await q1('SELECT 1 x FROM users WHERE username=?', u)) throw 'Tên đăng nhập đã tồn tại';
    await addUser(u, b.name || u, b.role, b.password); return { ok: 1 };
  }],
  ['PUT', '/api/users/:id', A, async ({ b, p, user }) => {
    if (b.name) await run('UPDATE users SET name=? WHERE id=?', String(b.name).trim(), p.id);
    if (b.password) { const salt = crypto.randomBytes(8).toString('hex'); await run('UPDATE users SET salt=?,hash=? WHERE id=?', salt, hashPw(b.password, salt), p.id); }
    if (b.active != null) { if (+p.id === user.id) throw 'Không thể khoá chính mình'; await run('UPDATE users SET active=? WHERE id=?', b.active ? 1 : 0, p.id); if (!b.active) await run('DELETE FROM sessions WHERE user_id=?', p.id); }
    return { ok: 1 };
  }],

  ['POST', '/api/tables/:id/items', S, async ({ b, p, user }) => {
    const m = await q1('SELECT * FROM menu WHERE id=? AND active=1', b.menu_id);
    if (!m) throw 'Món không tồn tại';
    if (!m.available) throw m.name + ' đã hết';
    let o = await openOrderOf(p.id);
    if (!o) o = { id: (await run('INSERT INTO orders(table_id,created_at,user_id) VALUES(?,?,?)', p.id, now(), user.id)).id };
    const qty = Math.max(1, +b.qty || 1);
    const same = await q1("SELECT id FROM order_items WHERE order_id=? AND menu_id=? AND note=? AND status='draft'", o.id, m.id, b.note || '');
    if (same) await run('UPDATE order_items SET qty=qty+? WHERE id=?', qty, same.id);
    else await run('INSERT INTO order_items(order_id,menu_id,name,price,qty,note) VALUES(?,?,?,?,?,?)', o.id, m.id, m.name, m.price, qty, b.note || '');
    await recalc(o.id); return { ok: 1 };
  }],
  ['DELETE', '/api/items/:id', S, async ({ p }) => {
    const it = await q1('SELECT * FROM order_items WHERE id=?', p.id);
    if (!it) throw 'Không tìm thấy';
    if (it.status !== 'draft') throw 'Món đã gửi bếp, không xoá được';
    await run('DELETE FROM order_items WHERE id=?', p.id); await recalc(it.order_id); return { ok: 1 };
  }],
  ['POST', '/api/items/:id/dec', S, async ({ p }) => {
    const it = await q1('SELECT * FROM order_items WHERE id=?', p.id);
    if (!it || it.status !== 'draft') throw 'Món đã gửi bếp, không giảm được';
    if (it.qty > 1) await run('UPDATE order_items SET qty=qty-1 WHERE id=?', p.id); else await run('DELETE FROM order_items WHERE id=?', p.id);
    await recalc(it.order_id); return { ok: 1 };
  }],
  ['POST', '/api/tables/:id/send', S, async ({ p }) => {
    const o = await openOrderOf(p.id); if (!o) throw 'Bàn chưa có đơn';
    const n = (await run("UPDATE order_items SET status='new',sent_at=? WHERE order_id=? AND status='draft'", now(), o.id)).changes;
    if (!n) throw 'Không có món mới để gửi';
    return { ok: 1, sent: n };
  }],
  ['POST', '/api/tables/:id/pay', S, async ({ b, p }) => {
    const o = await openOrderOf(p.id); if (!o) throw 'Bàn chưa có đơn';
    if (await q1("SELECT 1 x FROM order_items WHERE order_id=? AND status='draft'", o.id)) throw 'Còn món chưa gửi bếp';
    if ((await q1("SELECT 1 x FROM order_items WHERE order_id=? AND status IN('new','cooking')", o.id)) && !b.force) throw 'Bếp chưa làm xong hết món';
    await recalc(o.id);
    await run("UPDATE orders SET status='paid',paid_at=?,method=? WHERE id=?", now(), b.method === 'transfer' ? 'transfer' : 'cash', o.id);
    const paid = await orderFull(await q1('SELECT * FROM orders WHERE id=?', o.id));
    paid.table_name = (await q1('SELECT name FROM tables_ WHERE id=?', p.id)).name;
    return { ok: 1, order: paid };
  }],

  ['GET', '/api/kitchen', K, () => q("SELECT i.*, t.name AS table_name FROM order_items i JOIN orders o ON o.id=i.order_id JOIN tables_ t ON t.id=o.table_id WHERE o.status='open' AND i.status IN('new','cooking','done') AND i.sent_at IS NOT NULL AND (i.status!='done' OR i.sent_at > ?) ORDER BY i.sent_at,i.id", new Date(Date.now() - 3600e3).toISOString())],
  ['PUT', '/api/kitchen/order/:oid', K, async ({ b, p }) => {
    if (b.status === 'cooking') await run("UPDATE order_items SET status='cooking' WHERE order_id=? AND status='new'", p.oid);
    else if (b.status === 'done') await run("UPDATE order_items SET status='done' WHERE order_id=? AND status IN('new','cooking')", p.oid);
    else throw 'Trạng thái sai';
    return { ok: 1 };
  }],
  ['PUT', '/api/kitchen/:id', K, async ({ b, p }) => {
    if (!['cooking', 'done'].includes(b.status)) throw 'Trạng thái sai';
    await run("UPDATE order_items SET status=? WHERE id=? AND status!='draft'", b.status, p.id); return { ok: 1 };
  }],

  ['GET', '/api/report', C, async ({ url }) => {
    const from = url.searchParams.get('from') || today(), to = url.searchParams.get('to') || today();
    const [lo, hi] = bounds(from, to);
    const rev = await q1("SELECT COALESCE(SUM(total),0) s, COUNT(*) c FROM orders WHERE status='paid' AND paid_at BETWEEN ? AND ?", lo, hi);
    const exp = await q1('SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE date BETWEEN ? AND ?', from, to);
    const byDay = await q("SELECT substr(datetime(paid_at,'+7 hours'),1,10) d, SUM(total) s, COUNT(*) c FROM orders WHERE status='paid' AND paid_at BETWEEN ? AND ? GROUP BY d ORDER BY d", lo, hi);
    const top = await q("SELECT i.name, SUM(i.qty) q, SUM(i.qty*i.price) s FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.status='paid' AND o.paid_at BETWEEN ? AND ? GROUP BY i.name ORDER BY q DESC LIMIT 5", lo, hi);
    return { from, to, revenue: rev.s, orders: rev.c, expense: exp.s, profit: rev.s - exp.s, byDay, top };
  }],
  ['GET', '/api/expenses', C, ({ url }) => q('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC,id DESC', url.searchParams.get('from') || '0000', url.searchParams.get('to') || '9999')],
  ['POST', '/api/expenses', C, async ({ b, user }) => {
    if (!b.title || !(+b.amount > 0)) throw 'Thiếu nội dung/số tiền';
    await run('INSERT INTO expenses(date,title,amount,user_id) VALUES(?,?,?,?)', b.date || today(), b.title, +b.amount, user.id); return { ok: 1 };
  }],
  ['DELETE', '/api/expenses/:id', C, async ({ p }) => { await run('DELETE FROM expenses WHERE id=?', p.id); return { ok: 1 }; }],
  ['GET', '/api/export', C, async ({ url }) => {
    const from = url.searchParams.get('from') || today(), to = url.searchParams.get('to') || today();
    const [lo, hi] = bounds(from, to);
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['Loại', 'Ngày', 'Nội dung', 'Số tiền']];
    (await q("SELECT o.id,o.paid_at,o.total,o.method,t.name tn FROM orders o JOIN tables_ t ON t.id=o.table_id WHERE o.status='paid' AND o.paid_at BETWEEN ? AND ? ORDER BY o.paid_at", lo, hi))
      .forEach(o => rows.push(['Thu', new Date(new Date(o.paid_at).getTime() + 7 * 3600e3).toISOString().slice(0, 10), `Đơn #${o.id} - ${o.tn} (${o.method === 'transfer' ? 'CK' : 'Tiền mặt'})`, o.total]));
    (await q('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date', from, to)).forEach(e => rows.push(['Chi', e.date, e.title, -e.amount]));
    return { csv: '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n'), name: `bao-cao_${from}_${to}.csv` };
  }],
];
const matchers = routes.map(([m, p, roles, h]) => ({ m, roles, h, re: new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$') }));

async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  try {
    await init();
    const secure = (req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const b = await readBody(req);
      const u = await q1('SELECT * FROM users WHERE username=? AND active=1', String(b.username || '').trim().toLowerCase());
      const ok = u && crypto.timingSafeEqual(Buffer.from(hashPw(String(b.password || ''), u.salt)), Buffer.from(u.hash));
      if (!ok) return json(res, 401, { error: 'Sai tên đăng nhập hoặc mật khẩu' });
      const token = crypto.randomBytes(24).toString('hex');
      await run('INSERT INTO sessions VALUES(?,?)', token, u.id);
      res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure}`);
      return json(res, 200, { id: u.id, name: u.name, role: u.role });
    }
    const s = await q1('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND u.active=1', cookie(req).sid || '');
    if (url.pathname === '/api/logout') { await run('DELETE FROM sessions WHERE token=?', cookie(req).sid || ''); return json(res, 200, { ok: 1 }); }
    if (!s) return json(res, 401, { error: 'Chưa đăng nhập' });
    const user = { id: s.id, name: s.name, role: s.role };
    if (url.pathname === '/api/me') return json(res, 200, user);
    for (const r of matchers) {
      if (r.m !== req.method) continue;
      const mt = r.re.exec(url.pathname); if (!mt) continue;
      if (!r.roles.includes(user.role)) return json(res, 403, { error: 'Không có quyền' });
      const out = await r.h({ b: ['GET', 'DELETE'].includes(req.method) ? {} : await readBody(req), p: mt.groups || {}, user, url });
      if (out && out.csv) {
        res.statusCode = 200; res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="${out.name}"`);
        return res.end(out.csv);
      }
      return json(res, 200, out);
    }
    json(res, 404, { error: 'Không tìm thấy' });
  } catch (e) {
    console.error(e);
    json(res, typeof e === 'string' ? 400 : 500, { error: typeof e === 'string' ? e : 'Lỗi máy chủ: ' + e.message });
  }
}
module.exports = handler;
