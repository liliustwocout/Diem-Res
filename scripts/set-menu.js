// Thay thực đơn trong DB bằng lib/menu-data.js. Món cũ chỉ bị ẩn (active=0) để đơn cũ vẫn còn tên món.
// Chạy cục bộ:  node scripts/set-menu.js
// Chạy trên Turso:  $env:TURSO_DATABASE_URL='libsql://...'; $env:TURSO_AUTH_TOKEN='...'; node scripts/set-menu.js
const { createClient } = require('@libsql/client');
const items = require('../lib/menu-data.js');
const client = createClient({ url: process.env.TURSO_DATABASE_URL || 'file:data.db', authToken: process.env.TURSO_AUTH_TOKEN });
(async () => {
  const cols = (await client.execute('PRAGMA table_info(menu)')).rows.map(r => r.name);
  if (!cols.includes('image')) await client.execute("ALTER TABLE menu ADD COLUMN image TEXT DEFAULT ''");
  await client.batch([
    'UPDATE menu SET active=0 WHERE active=1',
    ...items.map(([name, price, category, image]) => ({ sql: 'INSERT INTO menu(name,price,category,image) VALUES(?,?,?,?)', args: [name, price, category, image] })),
  ], 'write');
  const r = await client.execute('SELECT COUNT(*) c FROM menu WHERE active=1');
  console.log('Đã cập nhật thực đơn:', r.rows[0].c, 'món');
})().catch(e => { console.error(e.message); process.exit(1); });
