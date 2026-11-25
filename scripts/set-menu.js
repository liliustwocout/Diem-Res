// Thay thực đơn trong DB bằng lib/menu-data.js. Món cũ chỉ bị ẩn (active=0) để đơn cũ vẫn còn tên món.
// Chạy cục bộ:  node scripts/set-menu.js
// Chạy trên Turso:  $env:TURSO_DATABASE_URL='libsql://...'; $env:TURSO_AUTH_TOKEN='...'; node scripts/set-menu.js
const { createClient } = require('@libsql/client');
const items = require('../lib/menu-data.js');
const client = createClient({ url: process.env.TURSO_DATABASE_URL || 'file:data.db', authToken: process.env.TURSO_AUTH_TOKEN });
(async () => {
  await client.batch([
    'UPDATE menu SET active=0 WHERE active=1',
    ...items.map(([name, price, category]) => ({ sql: 'INSERT INTO menu(name,price,category) VALUES(?,?,?)', args: [name, price, category] })),
  ], 'write');
  const r = await client.execute('SELECT COUNT(*) c FROM menu WHERE active=1');
  console.log('Đã cập nhật thực đơn:', r.rows[0].c, 'món');
})().catch(e => { console.error(e.message); process.exit(1); });
