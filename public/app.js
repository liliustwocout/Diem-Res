'use strict';
/* ============ tiện ích ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + 'đ';
const pad = n => String(n).padStart(2, '0');
const localDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => localDate(new Date());
const dmy = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}`; };
const timeOf = iso => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const ROLE = { admin: 'Quản trị', staff: 'Nhân viên', kitchen: 'Bếp', accountant: 'Kế toán' };
const P = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  chef: '<path d="M7 14a4 4 0 1 1 2-7 4 4 0 0 1 6 0 4 4 0 1 1 2 7v5H7z"/><path d="M7 17h10"/>',
  chart: '<path d="M4 20V11M10 20V4M16 20v-7M22 20H2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  wallet: '<path d="M3 8a2 2 0 0 1 2-2h13v3"/><rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="16.5" cy="14" r="1.2"/>',
  logout: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>',
  print: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><rect x="7" y="14" width="10" height="6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/>', back: '<path d="M15 5l-7 7 7 7"/>', down: '<path d="M6 9l6 6 6-6"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

const DOGMARK = '<svg viewBox="20 10 380 280" fill="none" aria-hidden="true"><ellipse cx="200" cy="275" rx="140" ry="9" fill="#00000033"/><g class="la" style="transform-origin:215px 200px"><path d="M215 200L240 258" stroke="#d9c79f" stroke-width="22" stroke-linecap="round"/><ellipse cx="245" cy="266" rx="17" ry="9" fill="#e8dcc0"/></g><g class="lb" style="transform-origin:115px 200px"><path d="M115 200L100 258" stroke="#d9c79f" stroke-width="22" stroke-linecap="round"/><ellipse cx="96" cy="266" rx="17" ry="9" fill="#e8dcc0"/></g><g class="bodyg"><path class="tail" d="M82 150C48 128 44 92 64 76" stroke="#f3e6c8" stroke-width="18" stroke-linecap="round" fill="none"/><ellipse cx="170" cy="165" rx="96" ry="55" fill="#f3e6c8"/><path d="M98 135C130 102 205 106 238 132 212 152 150 158 98 135z" fill="#e5a000"/><ellipse cx="250" cy="150" rx="42" ry="38" fill="#f3e6c8"/><circle cx="275" cy="120" r="48" fill="#f3e6c8"/><path d="M255 92C228 90 218 132 232 162 250 168 268 142 270 110z" fill="#e5a000"/><ellipse cx="318" cy="136" rx="38" ry="26" fill="#fff8e6"/><circle cx="351" cy="125" r="11" fill="#10201e"/><path d="M328 149q14 7 28-3" stroke="#10201e" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M338 150c0 17 17 17 17 0z" fill="#d6372a"/><circle cx="293" cy="108" r="8" fill="#10201e"/><circle cx="296" cy="105" r="2.6" fill="#fff"/><path d="M226 140C236 178 272 184 294 156" stroke="#d6372a" stroke-width="18" stroke-linecap="round" fill="none"/><path d="M232 146C242 176 270 180 288 160" stroke="#f0675a" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M256 178l-12 28 20-7z" fill="#b22d22"/><path d="M262 180l12 26-22-3z" fill="#d6372a"/><circle cx="262" cy="178" r="9" fill="#d6372a"/><g transform="rotate(8 278 70)"><circle cx="262" cy="50" r="17" fill="#fff"/><circle cx="294" cy="50" r="17" fill="#fff"/><circle cx="278" cy="38" r="21" fill="#fff"/><rect x="250" y="56" width="56" height="26" rx="6" fill="#fff"/></g></g><g class="la" style="transform-origin:135px 205px"><path d="M135 205L160 258" stroke="#f3e6c8" stroke-width="22" stroke-linecap="round"/><ellipse cx="165" cy="266" rx="17" ry="9" fill="#fff8e6"/></g><g class="lb" style="transform-origin:200px 205px"><path d="M200 205L180 258" stroke="#f3e6c8" stroke-width="22" stroke-linecap="round"/><ellipse cx="176" cy="266" rx="17" ry="9" fill="#fff8e6"/></g></svg>';
let me = null, tab = null, es = null, refresh = () => {}, live = [], ticking = null, timer = null, poll = null;

/* ============ toast & hộp thoại ============ */
function toast(msg, err) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.innerHTML = `${ic(err ? 'x' : 'check')}<span>${esc(msg)}</span>`;
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2600);
}
function modal(html, cls = '') {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
    const done = v => { document.removeEventListener('keydown', onKey); ov.remove(); resolve(v); };
    const onKey = e => { if (e.key === 'Escape') done(null); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', e => { if (e.target === ov) done(null); });
    ov.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) done(b.dataset.m); });
    document.body.append(ov);
    const f = ov.querySelector('input,select') || ov.querySelector('[data-m="ok"]');
    f && f.focus();
    ov._done = done; ov._resolve = resolve;
  });
}
async function confirmBox(title, text, okText = 'Đồng ý', danger = false) {
  const r = await modal(`<h2>${esc(title)}</h2><p>${text}</p><div class="acts"><button class="btn" data-m="cancel">Huỷ</button><button class="btn ${danger ? 'danger' : 'primary'}" data-m="ok">${esc(okText)}</button></div>`);
  return r === 'ok';
}
function formBox(title, fields, okText = 'Lưu') {
  return new Promise(resolve => {
    const html = `<h2>${esc(title)}</h2><form>${fields.map(f => `<div class="field"><label for="f_${f.name}">${esc(f.label)}</label>${f.options
      ? `<select class="input" id="f_${f.name}" name="${f.name}">${f.options.map(([v, l]) => `<option value="${esc(v)}" ${v === f.value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
      : `<input class="input" id="f_${f.name}" name="${f.name}" type="${f.type || 'text'}" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}" ${f.type === 'number' ? 'inputmode="numeric" min="0"' : ''} autocomplete="off">`}</div>`).join('')}
      <div class="acts"><button type="button" class="btn" data-m="cancel">Huỷ</button><button type="submit" class="btn primary">${esc(okText)}</button></div></form>`;
    let formEl;
    modal(html).then(() => resolve(null));
    const ov = [...document.querySelectorAll('.overlay')].pop();
    formEl = ov.querySelector('form');
    formEl.onsubmit = e => {
      e.preventDefault();
      const o = Object.fromEntries(new FormData(formEl));
      resolve(o); ov._done('x');
    };
  });
}

/* ============ API ============ */
async function api(method, url, data) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/api/login' && url !== '/api/me') { me = null; showLogin(); throw new Error('401'); }
  if (!r.ok) { toast(j.error || 'Có lỗi xảy ra', true); throw new Error(j.error); }
  if (method !== 'GET' && !/\/api\/(login|logout)$/.test(url)) setTimeout(() => refresh(), 0); // cập nhật lại màn hình sau khi thay đổi dữ liệu
  return j;
}
const get = u => api('GET', u), post = (u, d) => api('POST', u, d || {}), put = (u, d) => api('PUT', u, d || {}), del = u => api('DELETE', u);
const safe = fn => async (...a) => { try { await fn(...a); } catch (e) { /* đã báo lỗi */ } };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
function beep() {
  try {
    const c = beep.c || (beep.c = new (window.AudioContext || window.webkitAudioContext)());
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(.18, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .4);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .4);
  } catch (e) { /* bỏ qua */ }
}
const mins = iso => Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000));
const ago = iso => { const m = mins(iso); return m < 1 ? 'Vừa xong' : m < 60 ? m + ' phút' : Math.floor(m / 60) + 'g ' + (m % 60) + 'p'; };
function tickTimes() {
  document.querySelectorAll('.timer[data-since],.age[data-since]').forEach(el => { el.textContent = ago(el.dataset.since); });
  document.querySelectorAll('.kt[data-ts]').forEach(el => { if (!el.dataset.ts) return; const m = mins(el.dataset.ts); el.dataset.age = m >= 12 ? 'late' : m >= 6 ? 'warn' : 'ok'; });
}

/* ============ đăng nhập ============ */
function showLogin() {
  clearInterval(poll); clearInterval(timer);
  document.body.classList.remove('dark');
  $('#app').innerHTML = `<div class="login">
    <section class="login-art" aria-hidden="true">
      <svg class="dog" viewBox="20 10 380 280" fill="none"><circle cx="210" cy="150" r="170" fill="#ffffff0a"/><circle cx="210" cy="150" r="125" fill="#ffffff0a"/><ellipse cx="200" cy="275" rx="140" ry="9" fill="#00000033"/><g class="la" style="transform-origin:215px 200px"><path d="M215 200L240 258" stroke="#d9c79f" stroke-width="22" stroke-linecap="round"/><ellipse cx="245" cy="266" rx="17" ry="9" fill="#e8dcc0"/></g><g class="lb" style="transform-origin:115px 200px"><path d="M115 200L100 258" stroke="#d9c79f" stroke-width="22" stroke-linecap="round"/><ellipse cx="96" cy="266" rx="17" ry="9" fill="#e8dcc0"/></g><g class="bodyg"><path class="tail" d="M82 150C48 128 44 92 64 76" stroke="#f3e6c8" stroke-width="18" stroke-linecap="round" fill="none"/><ellipse cx="170" cy="165" rx="96" ry="55" fill="#f3e6c8"/><path d="M98 135C130 102 205 106 238 132 212 152 150 158 98 135z" fill="#e5a000"/><ellipse cx="250" cy="150" rx="42" ry="38" fill="#f3e6c8"/><circle cx="275" cy="120" r="48" fill="#f3e6c8"/><path d="M255 92C228 90 218 132 232 162 250 168 268 142 270 110z" fill="#e5a000"/><ellipse cx="318" cy="136" rx="38" ry="26" fill="#fff8e6"/><circle cx="351" cy="125" r="11" fill="#10201e"/><path d="M328 149q14 7 28-3" stroke="#10201e" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M338 150c0 17 17 17 17 0z" fill="#d6372a"/><circle cx="293" cy="108" r="8" fill="#10201e"/><circle cx="296" cy="105" r="2.6" fill="#fff"/><path d="M226 140C236 178 272 184 294 156" stroke="#d6372a" stroke-width="18" stroke-linecap="round" fill="none"/><path d="M232 146C242 176 270 180 288 160" stroke="#f0675a" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M256 178l-12 28 20-7z" fill="#b22d22"/><path d="M262 180l12 26-22-3z" fill="#d6372a"/><circle cx="262" cy="178" r="9" fill="#d6372a"/><g transform="rotate(8 278 70)"><circle cx="262" cy="50" r="17" fill="#fff"/><circle cx="294" cy="50" r="17" fill="#fff"/><circle cx="278" cy="38" r="21" fill="#fff"/><rect x="250" y="56" width="56" height="26" rx="6" fill="#fff"/></g></g><g class="la" style="transform-origin:135px 205px"><path d="M135 205L160 258" stroke="#f3e6c8" stroke-width="22" stroke-linecap="round"/><ellipse cx="165" cy="266" rx="17" ry="9" fill="#fff8e6"/></g><g class="lb" style="transform-origin:200px 205px"><path d="M200 205L180 258" stroke="#f3e6c8" stroke-width="22" stroke-linecap="round"/><ellipse cx="176" cy="266" rx="17" ry="9" fill="#fff8e6"/></g></svg>
    </section>
    <section class="login-form"><form class="login-card" id="lf">
      <h1>Đăng nhập</h1><p class="muted" style="margin-bottom:22px">Dùng tài khoản do quản trị cấp.</p>
      <div class="field"><label for="u">Tên đăng nhập</label><input class="input" id="u" autocomplete="username" autocapitalize="off" autofocus></div>
      <div class="field"><label for="p">Mật khẩu</label><input class="input" id="p" type="password" autocomplete="current-password"></div>
      <div class="err" id="le" role="alert"></div>
      <button class="btn primary lg" style="width:100%" type="submit">Vào hệ thống</button>
      <div class="demo" aria-label="Tài khoản mẫu" ${['localhost', '127.0.0.1'].includes(location.hostname) ? '' : 'hidden'}><span class="muted" style="font-size:13px;width:100%">Tài khoản mẫu, bấm để điền:</span>
        ${[['admin', 'admin123', 'Quản trị'], ['nhanvien', '123456', 'Nhân viên'], ['bep', '123456', 'Bếp'], ['ketoan', '123456', 'Kế toán']].map(([u, p, l]) => `<button type="button" data-u="${u}" data-p="${p}">${l}</button>`).join('')}</div>
    </form></section></div>`;
  $('.demo').onclick = e => { const b = e.target.closest('[data-u]'); if (b) { $('#u').value = b.dataset.u; $('#p').value = b.dataset.p; $('#p').focus(); } };
  $('#lf').onsubmit = async e => {
    e.preventDefault(); $('#le').textContent = '';
    try { me = await post('/api/login', { username: $('#u').value, password: $('#p').value }); try { beep.c = beep.c || new (window.AudioContext || window.webkitAudioContext)(); } catch (x) {} start(); }
    catch (err) { $('#le').textContent = err.message || 'Không đăng nhập được'; }
  };
}

/* ============ khung ứng dụng ============ */
const TABS = {
  admin: [['report', 'Tổng quan', 'chart'], ['tables', 'Sơ đồ bàn', 'grid'], ['menu', 'Thực đơn', 'menu'], ['tablesAdm', 'Bàn', 'receipt'], ['users', 'Tài khoản', 'users']],
  staff: [['tables', 'Bàn & gọi món', 'grid']],
  kitchen: [['kitchen', 'Đơn bếp', 'chef'], ['stock', 'Báo hết món', 'ban']],
  accountant: [['report', 'Doanh thu', 'chart'], ['expenses', 'Chi phí', 'wallet']],
};
P.ban = '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>';
function start() {
  tab = TABS[me.role][0][0];
  if (es) es.close();
  // Không dùng kết nối giữ mở (Vercel không hỗ trợ): tự cập nhật mỗi 3 giây ở màn cần xem trực tiếp.
  clearInterval(poll);
  poll = setInterval(() => { if (live.length && !document.hidden && !document.querySelector('.overlay')) refresh(); }, 3000);
  clearInterval(timer); timer = setInterval(tickTimes, 20000);
  shell();
}
function shell() {
  document.body.classList.toggle('dark', me.role === 'kitchen');
  const t = TABS[me.role];
  $('#app').innerHTML = `<div class="shell"><nav class="rail" aria-label="Điều hướng">
    <div class="brand"><i class="dogmark">${DOGMARK}</i>Diem Res</div>
    ${t.map(([k, l, i]) => `<button class="nav ${k === tab ? 'on' : ''}" data-t="${k}" ${k === tab ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('')}
    <div class="who"><span class="avatar">${esc(me.name.trim().charAt(0).toUpperCase())}</span><div><b>${esc(me.name)}</b><small>${ROLE[me.role]}</small></div><button class="btn" id="out" aria-label="Đăng xuất" title="Đăng xuất">${ic('logout')}</button></div>
  </nav><main class="main"><div class="top"><h1 id="title"></h1><div class="sp"></div><div id="topx" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"></div></div><div id="v"></div></main></div>`;
  $('#title').textContent = t.find(x => x[0] === tab)[1];
  $('#out').onclick = async () => { await post('/api/logout').catch(() => {}); me = null; showLogin(); };
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { if (b.dataset.t !== tab) { tab = b.dataset.t; shell(); } });
  live = []; refresh = () => {};
  V[tab]();
}
const $v = () => $('#v');
const skeleton = n => `<div class="floor">${'<div class="skel"></div>'.repeat(n)}</div>`;
const on = (map, ev = 'click') => { $v()['on' + ev] = e => { const el = e.target.closest('[data-a]'); if (el && map[el.dataset.a]) map[el.dataset.a](el, e); }; };

/* ============ các màn hình ============ */
const V = {
  /* ----- sơ đồ bàn + gọi món ----- */
  tables() {
    live = ['tables', 'menu'];
    let tables = [], menu = [], sel = null, cat = 'Tất cả', q = '', method = 'cash', built = false;
    const canOrder = me.role === 'staff' || me.role === 'admin';
    const st = t => {
      const it = t.order ? t.order.items : [];
      if (!t.order) return { k: 'free', l: 'Trống' };
      if (!it.length || it.some(i => i.status === 'draft')) return { k: 'pick', l: 'Đang chọn món' };
      if (it.some(i => i.status === 'new' || i.status === 'cooking')) return { k: 'cook', l: 'Bếp đang làm' };
      return { k: 'ready', l: 'Sẵn sàng tính tiền' };
    };
    const cur = () => tables.find(t => t.id === sel);
    $v().innerHTML = skeleton(8);
    refresh = safe(async () => { [tables, menu] = await Promise.all([get('/api/tables'), get('/api/menu')]); paint(); });

    function paint() { if (sel && !cur()) sel = null; sel ? paintPos() : paintFloor(); }
    function paintFloor() {
      built = false;
      $('.top').style.display = '';
      $('#topx').innerHTML = `<div class="legend"><span style="--c:#c7d2cd">Trống</span><span style="--c:#e5a000">Bếp đang làm</span><span style="--c:#1f8a58">Sẵn sàng tính tiền</span></div>`;
      $v().innerHTML = tables.length ? `<div class="floor">${tables.map(t => {
        const s = st(t);
        return `<button class="tcard ${s.k}" data-a="open" data-id="${t.id}"><b>${esc(t.name)}</b><span class="st">${s.l}</span>${t.order ? `<span class="age" data-since="${t.order.created_at}">${ago(t.order.created_at)}</span><span class="amt">${money(t.order.total)}</span>` : '<span class="amt" style="font-size:14px;font-weight:600">Bấm để mở bàn</span>'}</button>`;
      }).join('')}</div>` : `<div class="card empty"><b>Chưa có bàn nào</b>Quản trị thêm bàn ở mục Bàn.</div>`;
      on({ open: el => { sel = +el.dataset.id; paint(); } });
    }
    function paintPos() {
      const t = cur();
      if (!built) {
        built = true;
        $('#topx').innerHTML = '';
        $('.top').style.display = 'none';
        const cats = ['Tất cả', ...new Set(menu.map(m => m.category || 'Khác'))];
        $v().innerHTML = `<div class="toolbar"><button class="btn" data-a="back">${ic('back')}Về sơ đồ bàn</button><h2 style="font-size:22px;font-weight:800">${esc(t.name)}</h2></div>
        <div class="pos"><section><div class="menu-tools"><div class="searchbox">${ic('search')}<input class="input" id="q" placeholder="Tìm món" aria-label="Tìm món" value="${esc(q)}"></div></div>
        <div class="chips" id="chips"></div><div class="tiles" id="tiles"></div></section>
        <aside class="card ticket" id="ticket"></aside></div>
        <button class="btn primary lg fab" data-a="toticket">${ic('receipt')}<span id="fabt"></span></button>`;
        $('#q').oninput = e => { q = e.target.value; paintTiles(); };
        on({
          back: () => { sel = null; paint(); },
          cat: el => { cat = el.dataset.c; paintChips(cats); paintTiles(); },
          add: safe(async el => { await post(`/api/tables/${sel}/items`, { menu_id: +el.dataset.id }); }),
          inc: safe(async el => { await post(`/api/tables/${sel}/items`, { menu_id: +el.dataset.mid }); }),
          dec: safe(async el => { await post(`/api/items/${el.dataset.id}/dec`); }),
          rm: safe(async el => { await del(`/api/items/${el.dataset.id}`); }),
          send: safe(async () => { const r = await post(`/api/tables/${sel}/send`); toast(`Đã gửi bếp ${r.sent} món`); }),
          method: el => { method = el.dataset.v; paintTicket(); },
          pay: safe(payFlow),
          toticket: () => $('#ticket').scrollIntoView({ behavior: 'smooth' }),
        });
        paintChips(cats);
      }
      paintTiles(); paintTicket();
    }
    function paintChips(cats) { $('#chips').innerHTML = cats.map(c => `<button class="pill ${c === cat ? 'on' : ''}" data-a="cat" data-c="${esc(c)}">${esc(c)}</button>`).join(''); }
    function paintTiles() {
      const o = cur().order, count = {};
      (o ? o.items : []).filter(i => i.status === 'draft').forEach(i => count[i.menu_id] = (count[i.menu_id] || 0) + i.qty);
      const list = menu.filter(m => (cat === 'Tất cả' || (m.category || 'Khác') === cat) && m.name.toLowerCase().includes(q.trim().toLowerCase()));
      $('#tiles').innerHTML = list.length ? list.map(m => `<button class="tile ${m.available ? '' : 'off'}" data-a="add" data-id="${m.id}" ${canOrder ? '' : 'disabled'}>${count[m.id] ? `<i class="qty">${count[m.id]}</i>` : ''}<b>${esc(m.name)}</b><span>${m.available ? money(m.price) : 'Hết món'}</span></button>`).join('') : `<div class="card empty" style="grid-column:1/-1"><b>Không thấy món nào</b>Thử từ khoá khác hoặc chọn nhóm Tất cả.</div>`;
    }
    function paintTicket() {
      const t = cur(), o = t.order, items = o ? o.items : [], drafts = items.filter(i => i.status === 'draft');
      const label = { draft: 'Chưa gửi', new: 'Chờ bếp', cooking: 'Đang làm', done: 'Đã xong' };
      $('#ticket').innerHTML = `<div class="ticket-h"><h3>Đơn ${esc(t.name)}</h3>${o ? `<span class="muted" style="font-size:13px">Mở lúc ${timeOf(o.created_at)}</span>` : ''}</div>
      <div class="lines">${items.length ? items.map(i => `<div class="line"><span class="nm">${esc(i.name)}</span><span class="pr">${money(i.price * i.qty)}</span>
        <div class="sub">${i.status === 'draft' && canOrder ? `<span class="stepper"><button data-a="dec" data-id="${i.id}" aria-label="Giảm">${ic('minus')}</button><b>${i.qty}</b><button data-a="inc" data-mid="${i.menu_id}" aria-label="Tăng">${ic('plus')}</button></span>` : `<span class="muted">×${i.qty}</span>`}
        <span style="display:flex;gap:8px;align-items:center"><span class="tag dot ${i.status}">${label[i.status]}</span>${i.status === 'draft' && canOrder ? `<button class="btn sm icon danger" data-a="rm" data-id="${i.id}" aria-label="Xoá món">${ic('trash')}</button>` : ''}</span></div></div>`).join('')
        : `<div class="empty"><b>Bàn chưa có món</b>Bấm vào món bên trái để thêm.</div>`}</div>
      ${canOrder ? `<div class="ticket-f"><div class="total"><span>Tổng cộng</span><b>${money(o ? o.total : 0)}</b></div>
        ${drafts.length ? `<button class="btn ok lg" data-a="send">${ic('send')}Gửi bếp (${drafts.reduce((s, i) => s + i.qty, 0)} món)</button>`
        : o ? `<button class="btn primary lg" data-a="pay">Thanh toán</button>` : `<p class="muted" style="text-align:center">Chọn món bên trái để bắt đầu.</p>`}</div>` : ''}`;
      const f = $('#fabt'); if (f) f.textContent = `Đơn · ${money(o ? o.total : 0)}`;
    }
    async function payFlow() {
      const t = cur(), o = t.order, items = o.items;
      if (items.some(i => i.status === 'draft')) return toast('Gửi bếp các món chưa gửi trước khi thanh toán', true);
      const cooking = items.some(i => i.status === 'new' || i.status === 'cooking');
      const mp = modal(`<h2>Thanh toán ${esc(t.name)}</h2><p style="font-size:34px;font-weight:800;color:var(--tx);margin:6px 0 4px">${money(o.total)}</p>
        ${cooking ? '<p style="color:var(--chili);font-weight:700">Bếp chưa làm xong hết món. Vẫn thanh toán?</p>' : '<p>Chọn hình thức khách trả:</p>'}
        <div class="seg" id="mseg" style="margin-top:6px"><button type="button" data-pick="cash" class="on">Tiền mặt</button><button type="button" data-pick="transfer">Chuyển khoản</button></div>
        <div class="acts" style="margin-top:34px;justify-content:space-between"><button class="btn" data-m="cancel">Quay lại</button><button class="btn primary lg" data-m="ok">Xác nhận đã thu tiền</button></div>`);
      const ov = [...document.querySelectorAll('.overlay')].pop();
      method = 'cash';
      ov.querySelector('#mseg').onclick = e => { const b = e.target.closest('[data-pick]'); if (!b) return; method = b.dataset.pick; ov.querySelectorAll('[data-pick]').forEach(x => x.classList.toggle('on', x === b)); };
      if ((await mp) !== 'ok') return;
      const r = await post(`/api/tables/${sel}/pay`, { method, force: cooking });
      sel = null; built = false; await refresh(); showReceipt(r.order);
    }
    refresh();
  },

  /* ----- bếp ----- */
  kitchen() {
    live = ['kitchen'];
    let seen = null;
    $v().innerHTML = skeleton(3);
    refresh = safe(async () => {
      const list = await get('/api/kitchen');
      const by = new Map();
      list.forEach(i => { if (!by.has(i.order_id)) by.set(i.order_id, { t: i.table_name, items: [] }); by.get(i.order_id).items.push(i); });
      const tickets = [...by.entries()].map(([id, v]) => {
        const open = v.items.filter(i => i.status !== 'done');
        return { id, ...v, open, since: (open[0] || v.items[0]).sent_at, active: open.length > 0 };
      }).sort((a, b) => (b.active - a.active) || a.since.localeCompare(b.since));
      const ids = new Set(list.filter(i => i.status === 'new').map(i => i.id));
      const fresh = seen ? [...ids].filter(x => !seen.has(x)) : [];
      if (fresh.length) beep();
      seen = ids;
      const nNew = list.filter(i => i.status === 'new').length, nCook = list.filter(i => i.status === 'cooking').length;
      $('#topx').innerHTML = `<div class="kpis"><span class="tag new dot">Chờ ${nNew}</span><span class="tag cooking dot">Đang làm ${nCook}</span></div>`;
      const freshTables = new Set(list.filter(i => fresh.includes(i.id)).map(i => i.order_id));
      $v().innerHTML = tickets.length ? `<div class="tickets">${tickets.map(t => {
        const m = mins(t.since);
        return `<article class="kt ${freshTables.has(t.id) ? 'fresh' : ''}" data-ts="${t.active ? t.since : ''}" data-age="${t.active ? (m >= 12 ? 'late' : m >= 6 ? 'warn' : 'ok') : 'ok'}" style="${t.active ? '' : 'opacity:.55'}">
        <div class="kt-h"><b>${esc(t.t)}</b>${t.active ? `<span class="timer" data-since="${t.since}">${ago(t.since)}</span>` : '<span class="tag done">Hoàn tất</span>'}</div>
        ${t.items.map(i => `<div class="ki ${i.status}"><span class="q">${i.qty}×</span><span class="nm">${esc(i.name)}</span>${i.status === 'done' ? ic('check') : ''}</div>`).join('')}
        ${t.active ? `<div class="kt-f">${t.items.some(i => i.status === 'new') ? `<button class="btn lg primary" data-a="all" data-s="cooking" data-oid="${t.id}">Nhận hết đơn</button>` : `<button class="btn lg ok" data-a="all" data-s="done" data-oid="${t.id}">${ic('check')}Xong hết đơn</button>`}</div>` : ''}</article>`;
      }).join('')}</div>` : `<div class="card empty"><b>Chưa có đơn nào</b>Đơn mới sẽ hiện ở đây và có tiếng báo.</div>`;
    });
    on({ all: safe(async el => { await put('/api/kitchen/order/' + el.dataset.oid, { status: el.dataset.s }); }) });
    refresh();
  },
  stock() {
    live = ['menu'];
    $v().innerHTML = skeleton(6);
    refresh = safe(async () => {
      const menu = await get('/api/menu');
      $('#topx').innerHTML = `<span class="muted">Bấm vào món để đổi trạng thái. Nhân viên sẽ không gọi được món đã hết.</span>`;
      $v().innerHTML = `<div class="stockgrid">${menu.map(m => `<button class="stockrow ${m.available ? '' : 'out'}" data-a="t" data-id="${m.id}" data-v="${m.available ? 0 : 1}" role="switch" aria-checked="${!!m.available}"><span>${esc(m.name)}</span><span class="switch ${m.available ? 'on' : ''}"></span></button>`).join('')}</div>`;
    });
    on({ t: safe(async el => { await put('/api/menu/' + el.dataset.id, { available: +el.dataset.v }); toast(el.dataset.v === '0' ? 'Đã báo hết món' : 'Đã có lại món'); }) });
    refresh();
  },

  /* ----- admin: thực đơn ----- */
  menu() {
    live = [];
    let menu = [];
    $v().innerHTML = skeleton(6);
    const fields = (m = {}) => [{ name: 'name', label: 'Tên món', value: m.name, placeholder: 'Ví dụ: Phở bò' }, { name: 'price', label: 'Giá (đồng)', type: 'number', value: m.price }, { name: 'category', label: 'Nhóm', value: m.category, placeholder: 'Món chính, Đồ uống...' }];
    refresh = safe(async () => {
      menu = await get('/api/menu');
      $('#topx').innerHTML = `<button class="btn primary" data-a="new">${ic('plus')}Thêm món</button>`;
      $('#topx').onclick = e => e.target.closest('[data-a="new"]') && addItem();
      const groups = {}; menu.forEach(m => (groups[m.category || 'Khác'] = groups[m.category || 'Khác'] || []).push(m));
      $v().innerHTML = menu.length ? `<div class="card">${Object.entries(groups).map(([g, ms]) => `<div class="group-h">${esc(g)}</div><div class="list">${ms.map(m => `<div class="li"><div class="grow"><b>${esc(m.name)}</b>${m.available ? '' : '<span class="tag new">Hết món</span>'}</div><b>${money(m.price)}</b><div class="acts"><button class="btn sm icon" data-a="edit" data-id="${m.id}" aria-label="Sửa ${esc(m.name)}">${ic('edit')}</button><button class="btn sm icon danger" data-a="del" data-id="${m.id}" aria-label="Xoá ${esc(m.name)}">${ic('trash')}</button></div></div>`).join('')}</div>`).join('')}</div>` : `<div class="card empty"><b>Thực đơn đang trống</b>Bấm Thêm món để bắt đầu.</div>`;
    });
    async function addItem() { const r = await formBox('Thêm món', fields(), 'Thêm món'); if (r) await safe(async () => { await post('/api/menu', { ...r, price: +r.price }); toast('Đã thêm món'); })(); }
    on({
      edit: safe(async el => { const m = menu.find(x => x.id == el.dataset.id); const r = await formBox('Sửa món', fields(m)); if (r) { await put('/api/menu/' + m.id, { name: r.name, price: +r.price, category: r.category }); toast('Đã lưu'); } }),
      del: safe(async el => { const m = menu.find(x => x.id == el.dataset.id); if (await confirmBox('Xoá món', `Xoá <b>${esc(m.name)}</b> khỏi thực đơn? Hoá đơn cũ vẫn giữ nguyên.`, 'Xoá món', true)) { await del('/api/menu/' + m.id); toast('Đã xoá món'); } }),
    });
    refresh();
  },
  tablesAdm() {
    live = [];
    let tables = [];
    $v().innerHTML = skeleton(6);
    refresh = safe(async () => {
      tables = await get('/api/tables');
      $('#topx').innerHTML = `<button class="btn primary" id="addt">${ic('plus')}Thêm bàn</button>`;
      $('#addt').onclick = safe(async () => { const r = await formBox('Thêm bàn', [{ name: 'name', label: 'Tên bàn', placeholder: 'Bàn 9, Sân vườn 1...' }], 'Thêm bàn'); if (r) { await post('/api/tables', r); toast('Đã thêm bàn'); } });
      $v().innerHTML = `<div class="admin-tables">${tables.map(t => `<div class="atc"><b>${esc(t.name)}</b>${t.order ? '<span class="tag cooking">Có khách</span>' : ''}<button class="btn sm icon" data-a="ren" data-id="${t.id}" aria-label="Đổi tên ${esc(t.name)}">${ic('edit')}</button><button class="btn sm icon danger" data-a="del" data-id="${t.id}" aria-label="Xoá ${esc(t.name)}">${ic('trash')}</button></div>`).join('')}</div>`;
    });
    on({
      ren: safe(async el => { const t = tables.find(x => x.id == el.dataset.id); const r = await formBox('Đổi tên bàn', [{ name: 'name', label: 'Tên bàn', value: t.name }]); if (r) { await put('/api/tables/' + t.id, r); toast('Đã đổi tên'); } }),
      del: safe(async el => { const t = tables.find(x => x.id == el.dataset.id); if (await confirmBox('Xoá bàn', `Xoá <b>${esc(t.name)}</b>?`, 'Xoá bàn', true)) { await del('/api/tables/' + t.id); toast('Đã xoá bàn'); } }),
    });
    refresh();
  },
  users() {
    live = [];
    let users = [];
    $v().innerHTML = skeleton(4);
    refresh = safe(async () => {
      users = await get('/api/users');
      $('#topx').innerHTML = `<button class="btn primary" id="addu">${ic('plus')}Tạo tài khoản</button>`;
      $('#addu').onclick = safe(async () => {
        const r = await formBox('Tạo tài khoản', [{ name: 'name', label: 'Họ tên' }, { name: 'username', label: 'Tên đăng nhập' }, { name: 'password', label: 'Mật khẩu', type: 'password' }, { name: 'role', label: 'Vai trò', value: 'staff', options: Object.entries(ROLE) }], 'Tạo tài khoản');
        if (r) { await post('/api/users', r); toast('Đã tạo tài khoản'); refresh(); }
      });
      $v().innerHTML = `<div class="card list">${users.map(u => `<div class="li"><span class="avatar" style="background:var(--jade);color:#fff">${esc((u.name || u.username).charAt(0).toUpperCase())}</span><div class="grow"><b>${esc(u.name)}</b><small>@${esc(u.username)}</small></div><span class="tag">${ROLE[u.role]}</span>${u.active ? '' : '<span class="tag new">Đã khoá</span>'}<div class="acts"><button class="btn sm" data-a="pw" data-id="${u.id}">Đặt lại mật khẩu</button><button class="btn sm ${u.active ? 'danger' : 'ok'}" data-a="lock" data-id="${u.id}" data-v="${u.active ? 0 : 1}">${u.active ? 'Khoá' : 'Mở khoá'}</button></div></div>`).join('')}</div>`;
    });
    on({
      pw: safe(async el => { const u = users.find(x => x.id == el.dataset.id); const r = await formBox('Đặt lại mật khẩu: ' + u.name, [{ name: 'password', label: 'Mật khẩu mới', type: 'password' }]); if (r && r.password) { await put('/api/users/' + u.id, { password: r.password }); toast('Đã đổi mật khẩu'); } }),
      lock: safe(async el => { await put('/api/users/' + el.dataset.id, { active: +el.dataset.v }); toast(el.dataset.v === '0' ? 'Đã khoá tài khoản' : 'Đã mở khoá'); refresh(); }),
    });
    refresh();
  },

  /* ----- doanh thu ----- */
  report() {
    live = [];
    let from = today(), to = today(), preset = 'today';
    const range = p => {
      const d = new Date(), t = today();
      if (p === 'today') return [t, t];
      if (p === '7') { d.setDate(d.getDate() - 6); return [localDate(d), t]; }
      if (p === 'month') return [t.slice(0, 8) + '01', t];
      return [from, to];
    };
    $v().innerHTML = skeleton(3);
    refresh = safe(async () => {
      const [r, tables] = await Promise.all([get(`/api/report?from=${from}&to=${to}`), me.role === 'admin' ? get('/api/tables') : Promise.resolve(null)]);
      const max = Math.max(1, ...r.byDay.map(d => d.s)), topMax = Math.max(1, ...r.top.map(d => d.q));
      const busy = tables ? tables.filter(t => t.order).length : 0;
      $('#topx').innerHTML = `<a class="btn ok" href="/api/export?from=${from}&to=${to}" download>${ic('download')}Xuất Excel</a>`;
      $v().innerHTML = `<div class="toolbar"><div class="pills">${[['today', 'Hôm nay'], ['7', '7 ngày'], ['month', 'Tháng này']].map(([k, l]) => `<button class="pill ${preset === k ? 'on' : ''}" data-a="p" data-p="${k}">${l}</button>`).join('')}</div>
        <input class="input" type="date" id="df" value="${from}" style="width:auto" aria-label="Từ ngày"><span class="muted">đến</span><input class="input" type="date" id="dt" value="${to}" style="width:auto" aria-label="Đến ngày"></div>
      <div class="stats"><div class="card stat hero"><small>Doanh thu</small><div class="n">${money(r.revenue)}</div><small>${r.orders} đơn đã thanh toán</small></div>
        <div class="card stat"><small>Chi phí</small><div class="n">${money(r.expense)}</div></div>
        <div class="card stat"><small>Lãi tạm tính</small><div class="n" style="color:${r.profit < 0 ? 'var(--chili)' : 'var(--ok)'}">${money(r.profit)}</div></div>
        ${tables ? `<div class="card stat"><small>Bàn đang có khách</small><div class="n">${busy}<span class="muted" style="font-size:18px;font-weight:600"> / ${tables.length}</span></div></div>` : ''}</div>
      <div class="cols"><div class="card"><h3>Doanh thu theo ngày</h3>${r.byDay.length ? `<div class="bars">${r.byDay.map(d => `<div class="bar" title="${dmy(d.d)}: ${money(d.s)} (${d.c} đơn)"><em>${d.s >= 1e6 ? (d.s / 1e6).toFixed(1) + 'tr' : Math.round(d.s / 1000) + 'k'}</em><i style="height:${Math.max(2, d.s / max * 150)}px"></i><small>${dmy(d.d)}</small></div>`).join('')}</div>` : `<div class="empty"><b>Chưa có doanh thu</b>Số liệu hiện khi có đơn được thanh toán.</div>`}</div>
        <div class="card"><h3>Món bán chạy</h3>${r.top.length ? `<div class="rank">${r.top.map(d => `<div><span class="r"><span>${esc(d.name)}</span><span>${d.q} phần</span></span><span class="meter"><i style="width:${d.q / topMax * 100}%"></i></span></div>`).join('')}</div>` : `<div class="empty"><b>Chưa có dữ liệu</b></div>`}</div></div>`;
      $('#df').onchange = $('#dt').onchange = () => { from = $('#df').value; to = $('#dt').value; preset = ''; refresh(); };
    });
    on({ p: el => { preset = el.dataset.p; [from, to] = range(preset); refresh(); } });
    refresh();
  },
  expenses() {
    live = [];
    let list = [];
    $v().innerHTML = skeleton(3);
    refresh = safe(async () => {
      list = await get('/api/expenses');
      const total = list.reduce((s, x) => s + x.amount, 0);
      $('#topx').innerHTML = `<button class="btn primary" id="adde">${ic('plus')}Ghi chi phí</button>`;
      $('#adde').onclick = safe(async () => {
        const r = await formBox('Ghi chi phí', [{ name: 'title', label: 'Nội dung', placeholder: 'Nguyên liệu, điện nước, lương...' }, { name: 'amount', label: 'Số tiền (đồng)', type: 'number' }, { name: 'date', label: 'Ngày', type: 'date', value: today() }], 'Ghi chi phí');
        if (r) { await post('/api/expenses', { ...r, amount: +r.amount }); toast('Đã ghi chi phí'); }
      });
      $v().innerHTML = list.length ? `<div class="stats"><div class="card stat"><small>Tổng chi đã ghi</small><div class="n">${money(total)}</div><small>${list.length} khoản</small></div></div>
        <div class="card list">${list.map(x => `<div class="li"><div class="grow"><b>${esc(x.title)}</b><small>${dmy(x.date)}/${x.date.slice(0, 4)}</small></div><b>${money(x.amount)}</b><button class="btn sm icon danger" data-a="del" data-id="${x.id}" aria-label="Xoá khoản chi">${ic('trash')}</button></div>`).join('')}</div>`
        : `<div class="card empty"><b>Chưa ghi khoản chi nào</b>Bấm Ghi chi phí để thêm khoản đầu tiên.</div>`;
    });
    on({ del: safe(async el => { if (await confirmBox('Xoá khoản chi', 'Khoản chi này sẽ bị xoá khỏi báo cáo.', 'Xoá', true)) { await del('/api/expenses/' + el.dataset.id); toast('Đã xoá'); } }) });
    refresh();
  },
};

/* ============ hoá đơn ============ */
function showReceipt(o) {
  const d = new Date(o.paid_at);
  modal(`<div class="okmark">${ic('check')}</div><h2 style="text-align:center">Đã thanh toán</h2><p style="text-align:center">${esc(o.table_name)} · ${money(o.total)}</p>
  <div class="receipt" id="receipt"><h4>DIEM RES</h4><div class="c">Hoá đơn #${o.id} · ${esc(o.table_name)}</div><div class="c">${d.toLocaleDateString('vi-VN')} ${timeOf(o.paid_at)}</div><hr>
  ${o.items.map(i => `<div class="r"><span>${esc(i.name)} ×${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}<hr>
  <div class="r t"><span>TỔNG</span><span>${money(o.total)}</span></div><div class="r"><span>Hình thức</span><span>${o.method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</span></div><hr><div class="c">Cảm ơn quý khách!</div></div>
  <div class="acts"><button class="btn" id="prt">${ic('print')}In hoá đơn</button><button class="btn primary" data-m="ok">Xong</button></div>`);
  document.getElementById('prt').onclick = () => window.print();
}

/* ============ khởi động ============ */
fetch('/api/me').then(r => r.ok ? r.json() : null).then(u => { me = u; u ? start() : showLogin(); }).catch(showLogin);
