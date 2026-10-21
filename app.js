(function () {
  const $ = (s) => document.querySelector(s);
  const root = $('#gx');
  const tip = $('#tip');
  const num = (v) => (v == null || v === '' || isNaN(+v) ? null : +v);
  const f$ = (v) => (v == null ? '—' : '$' + (v < 10 ? v.toFixed(2) : v.toFixed(1)));
  const fInt = d3.format(',');
  const fMW = (v) => (v == null ? '—' : v >= 1000 ? d3.format(',.1f')(v / 1000) + ' GW' : fInt(Math.round(v)) + ' MW');
  const fPct = d3.format('.0%');
  const C = (i) => dash.colors[i % dash.colors.length];
  const MUTED = 'var(--cds-chart-muted)';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const OWN = [
    ['Yes', 'Owns / operates', 0],
    ['No - rents/colocates', 'Rents / colocates', 1],
    ['No - marketplace/decentralized', 'Marketplace / decentralized', 2],
    ['Unknown', 'Not stated', -1],
  ];
  const ownColor = (o) => { const e = OWN.find((x) => x[0] === o); return !e || e[2] < 0 ? MUTED : C(e[2]); };
  const VENDORS = ['NVIDIA', 'AMD', 'Intel', 'Google', 'AWS', 'Huawei'];
  const vColor = (v) => C(Math.max(0, VENDORS.indexOf(v)));
  const resolveColor = (c) => { const el = document.createElement('span'); el.style.color = c; root.appendChild(el); const v = getComputedStyle(el).color; el.remove(); return v; };
  const P = () => dash.params() || {};
  const hostDark = () => { const a = document.documentElement.getAttribute('data-theme'); if (a === 'dark' || a === 'light') return a === 'dark'; try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } };
  const gxTheme = () => (P().theme === 'dark' || P().theme === 'light' ? P().theme : hostDark() ? 'dark' : 'light');
  function applyTheme() {
    const th = gxTheme(); root.setAttribute('data-gx-theme', th);
    const b = document.getElementById('theme-toggle'); if (b) { b.setAttribute('aria-pressed', String(th === 'dark')); document.getElementById('theme-label').textContent = th === 'dark' ? 'Light mode' : 'Dark mode'; b.title = th === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; }
  }
  document.getElementById('theme-toggle').addEventListener('click', () => dash.setParams({ theme: gxTheme() === 'dark' ? 'light' : 'dark' }));
  applyTheme();
  const set = (o) => dash.setParams(o);
  const TABS = ['overview', 'pricing', 'capacity', 'hardware', 'directory'];
  const tabOf = () => (TABS.includes(P().tab) ? P().tab : 'overview');
  function openProfile(name) { set({ sel: name, tab: 'directory' }); dash.setLink('directory'); requestAnimationFrame(() => { const d = $('#detail'); if (d && !d.hidden) d.scrollIntoView({ block: 'start', behavior: 'smooth' }); }); }
  document.querySelectorAll('.gx-tabs button').forEach((b) => b.addEventListener('click', () => { set({ tab: b.dataset.tab }); dash.setLink(b.dataset.tab); }));

  /* ---------- v3 interaction layer: sticky nav, mobile filter sheet, back-to-top ---------- */
  const ICON = (n) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'i'); s.setAttribute('aria-hidden', 'true'); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + n); s.append(u); return s; };
  const nav = document.querySelector('.gx-nav'), fBox = $('#filters'), fTog = $('#f-toggle'), scrim = $('#f-scrim'), mbar = document.querySelector('.gx-mbar');
  const searchLab = document.querySelector('.gx-search'), searchHome = searchLab.nextSibling;
  const phone = matchMedia('(max-width:720px)');
  const placeSearch = () => { if (phone.matches) { if (searchLab.parentNode !== mbar) { mbar.prepend(searchLab); searchLab.classList.add('gx-msearch'); } } else if (searchLab.parentNode !== fBox) { fBox.insertBefore(searchLab, $('#f-reset')); searchLab.classList.remove('gx-msearch'); } };
  placeSearch(); (phone.addEventListener ? phone.addEventListener('change', placeSearch) : phone.addListener(placeSearch));
  const sheet = (open) => { fBox.classList.toggle('open', open); scrim.hidden = !open; fTog.setAttribute('aria-expanded', String(open)); document.documentElement.style.overflow = open && phone.matches ? 'hidden' : ''; if (open) { const f = phone.matches ? $('#f-close') : fBox.querySelector('.gx-dd-btn'); if (f) f.focus({ preventScroll: true }); } else fTog.focus({ preventScroll: true }); };
  fTog.addEventListener('click', () => sheet(true));
  [scrim, $('#f-close'), $('#f-done')].forEach((el) => el.addEventListener('click', () => sheet(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && fBox.classList.contains('open')) sheet(false); });
  phone.addEventListener && phone.addEventListener('change', () => { if (!phone.matches && fBox.classList.contains('open')) sheet(false); });
  const toTop = $('#to-top');
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  let ticking = false;
  const onScroll = () => { ticking = false; const r = nav.getBoundingClientRect(); nav.classList.toggle('stuck', r.top <= 0.5 && window.scrollY > 40); toTop.hidden = window.scrollY < 900; };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; setTimeout(onScroll, 60); } }, { passive: true });
  onScroll();
  // switching section from far down the page brings you to the top of the new section
  document.querySelectorAll('.gx-tabs button').forEach((b) => b.addEventListener('click', () => { const y = nav.getBoundingClientRect().top + window.scrollY - 4; if (window.scrollY > y + 10) window.scrollTo({ top: phone.matches ? Math.max(0, y) : y, behavior: 'smooth' }); }));

  /* ---------- flags ---------- */
  let FLAGS = new Map();
  function flag(country) {
    const fl = dash.data('flags');
    if (fl.status === 'ok' && FLAGS.src !== fl.data) { FLAGS = new Map(fl.data.map((r) => [r.country, r.flag])); FLAGS.src = fl.data; }
    const u = FLAGS.get(country); if (!u || !/^data:image\/(svg\+xml|webp|png);base64,/.test(u)) return null;
    const i = document.createElement('img'); i.className = 'flag'; i.src = u; i.alt = ''; i.setAttribute('aria-hidden', 'true'); return i;
  }
  const withFlag = (el, country) => { const f = flag(country); if (f) el.prepend(f); return el; };
  /* ---------- company logos (Logo.dev) ---------- */
  let LOGOS = new Map();
  function logo(provider, size) {
    const lg = dash.data('logos');
    if (lg.status === 'ok' && LOGOS.src !== lg.data) { LOGOS = new Map(lg.data.map((r) => [r.provider, r.logo])); LOGOS.src = lg.data; }
    const u = LOGOS.get(provider); const ok = u && /^data:image\/(webp|png);base64,/.test(u);
    const w = document.createElement('span'); w.className = 'gx-logo' + (size ? ' ' + size : '') + (ok ? '' : ' none'); w.setAttribute('aria-hidden', 'true');
    if (ok) { const i = document.createElement('img'); i.src = u; i.alt = ''; w.append(i); }
    else w.textContent = String(provider || '?').replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
    return w;
  }
  const withLogo = (el, provider, size) => { el.prepend(logo(provider, size)); return el; };

  /* ---------- tooltip ---------- */
  // tooltip: title, optional subtitle, then label/value rows; a row with no label is a note
  function tipPlace(ev) {
    tip.hidden = false;
    const r = root.getBoundingClientRect(); const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = ev.clientX - r.left + 16, y = ev.clientY - r.top + 16;
    if (ev.clientX + 16 + w > Math.min(r.right, window.innerWidth) - 8) x = Math.max(8, ev.clientX - r.left - w - 16);
    if (ev.clientY + 16 + h > window.innerHeight - 8) y = Math.max(ev.clientY - r.top - h - 12, -r.top + 8);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function tipHead(title, sub) {
    const hd = document.createElement('div'); hd.className = 'th';
    const t = document.createElement('div'); t.className = 't'; t.textContent = title; hd.append(t);
    if (sub) { const st = document.createElement('div'); st.className = 'ts'; st.textContent = sub; hd.append(st); }
    return hd;
  }
  function tipShow(ev, title, lines, sub) {
    const nodes = [tipHead(title, sub)];
    const rows = document.createElement('div'); rows.className = 'tr';
    (lines || []).forEach(([l, v, c]) => {
      if (!l) { if (v) { const n = document.createElement('div'); n.className = 'tn'; n.textContent = v; rows.append(n); } return; }
      const d = document.createElement('div'); d.className = 'tl';
      const lb = document.createElement('span'); lb.className = 'k';
      if (c) { const i = document.createElement('span'); i.className = 'dot'; i.style.background = c; lb.append(i); }
      lb.append(l);
      const b = document.createElement('b'); b.textContent = v;
      d.append(lb, b); rows.append(d);
    });
    if (rows.childNodes.length) nodes.push(rows);
    tip.className = 'gx-tip'; tip.replaceChildren(...nodes); tipPlace(ev);
  }
  // provider list tooltip: logo, name, a meta line and GPU chips per provider
  function tipProviders(ev, title, sub, provs, o = {}) {
    const max = o.max || 7; const box = document.createElement('div'); box.className = 'tp';
    provs.slice(0, max).forEach((p) => {
      const row = document.createElement('div'); row.className = 'tpr';
      const nm = document.createElement('div'); nm.className = 'tpn';
      const b = document.createElement('b'); b.textContent = p.provider; nm.append(logo(p.provider, 'sm'), b);
      if (o.meta) { const m = o.meta(p); if (m) { const sm = document.createElement('span'); sm.className = 'tpm'; withFlag(sm, p.hq); sm.append(m); nm.append(sm); } }
      row.append(nm);
      if (o.gpus) {
        const g = o.gpus(p); const ch = document.createElement('div'); ch.className = 'tpc';
        const lim = provs.length === 1 ? 14 : 5;
        if (g && g.length) { g.slice(0, lim).forEach((k) => { const c = document.createElement('i'); c.textContent = k; if (k === o.hl) c.className = 'on'; ch.append(c); }); if (g.length > lim) { const c = document.createElement('i'); c.className = 'more'; c.textContent = `+${g.length - lim}`; ch.append(c); } }
        else { const c = document.createElement('i'); c.className = 'more'; c.textContent = 'GPUs not listed'; ch.append(c); }
        row.append(ch);
      }
      box.append(row);
    });
    const nodes = [tipHead(title, sub), box];
    if (provs.length > max) { const n = document.createElement('div'); n.className = 'tf'; n.textContent = `+${provs.length - max} more · tap to see all`; nodes.push(n); }
    tip.className = 'gx-tip wide'; tip.replaceChildren(...nodes); tipPlace(ev);
  }
  const tipHide = () => { tip.hidden = true; };

  /* ---------- data prep ---------- */
  let cache = {};
  function prep() {
    const pr = dash.data('providers').data, px = dash.data('prices').data, fam = dash.data('gpu_families').data;
    const dc = dash.data('dc_cities'); const cr = dc.status === 'ok' && Array.isArray(dc.data) ? dc.data : [];
    // long profile text lives in a separate dataset so the dashboard can draw before it arrives
    const dt = dash.data('provider_details'); const det = dt.status === 'ok' && Array.isArray(dt.data) ? dt.data : null;
    if (cache.pr === pr && cache.px === px && cache.fam === fam && cache.cr === cr && cache.det === det) return cache.v;
    const detBy = det ? new Map(det.map((r) => [r.provider, r])) : null;
    const cityBy = d3.group(cr, (r) => r.provider);
    const famInfo = new Map(fam.map((f) => [f.family, { ...f, year: +f.year }]));
    const provs = pr.map((p) => ({
      ...(detBy && detBy.get(p.provider)), ...p, op: num(p.op_mw), pl: num(p.planned_mw), h100: num(p.h100_usd), nm: num(p.models_count),
      fams: String(p.families || '').split('|').filter(Boolean),
      cities: [...new Set((cityBy.get(p.provider) || []).map((r) => r.city))],
    }));
    provs.forEach((p) => { p.ncity = p.cities.length; });
    const byName = new Map(provs.map((p) => [p.provider, p]));
    const prices = px.map((r) => ({ ...r, usd: num(r.usd_hr), p: byName.get(r.provider) }));
    cache = { pr, px, fam, cr, det, v: { famInfo, provs, byName, prices, cities: cr } };
    return cache.v;
  }
  // search matches the provider name, its HQ country, or any city where it runs a data center
  const match = (p, s) => String(p.provider).toLowerCase().includes(s) || String(p.hq).toLowerCase().includes(s) || String(p.hq_city || '').toLowerCase().includes(s) || p.cities.some((c) => c.toLowerCase().includes(s));
  // "San Jose, California" (city + state/district) when the HQ city is known; else the country
  const hqPlace = (p, withCountry) => { const c = p.hq_city ? [p.hq_city, p.hq_admin && p.hq_admin !== p.hq_city ? p.hq_admin : null].filter(Boolean).join(', ') : ''; return c ? (withCountry && c !== p.hq ? `${c}, ${p.hq}` : c) : p.hq; };
  // selected GPU model (null = all models); a chip maker or GPU model turns on "where to rent it" mode
  const famSel = () => { const x = P().family; return x && x !== '__all' && x !== 'null' ? x : null; };
  const chipOn = () => !!(P().vendor || famSel());
  // GPU models a provider lists, newest first
  const gpusOf = (p) => { const fi = (cache.v || {}).famInfo; if (!fi) return p.fams; return p.fams.filter((k) => fi.has(k)).sort((a, b) => (fi.get(b).year - fi.get(a).year) || d3.ascending(a, b)); };
  const chipName = () => famSel() || P().vendor || '';
  const sells = (v, p) => { const q = P(); const F = famSel(); return (!F || p.fams.includes(F)) && (!q.vendor || p.fams.some((k) => (v.famInfo.get(k) || {}).vendor === q.vendor)); };
  function filt(v) {
    const q = P(); const s = String(q.q || '').toLowerCase();
    const base = (p) => (!q.region || p.region === q.region) && (!q.category || p.category === q.category) &&
      (!q.vendor || p.fams.some((k) => (v.famInfo.get(k) || {}).vendor === q.vendor)) && (!q.ownership || p.ownership === q.ownership) && (!q.country || p.hq === q.country) && (!q.city || p.cities.includes(q.city)) && (!s || match(p, s));
    // GPU-mix charts compare models, so they ignore the GPU model filter
    const provsAny = v.provs.filter(base);
    const provs = provsAny.filter((p) => sells(v, p));
    const S = new Set(provs);
    // for data center cities, region/country/city describe where the city is, not the provider's HQ
    const provsLoc = v.provs.filter((p) => sells(v, p) && (!q.category || p.category === q.category) && (!q.ownership || p.ownership === q.ownership) && (!s || match(p, s)));
    const SA = new Set(provsAny);
    return { provs, provsAny, provsLoc, prices: v.prices.filter((r) => r.p && S.has(r.p)), pricesAny: v.prices.filter((r) => r.p && SA.has(r.p)) };
  }
  function provMin(prices, fam) {
    const m = new Map();
    const vd = P().vendor; prices.forEach((r) => { if ((fam !== ANY_GPU ? r.family !== fam : !r.segment || (vd && r.vendor !== vd)) || r.usd == null) return; const c = m.get(r.provider); if (!c || r.usd < c.usd) m.set(r.provider, r); });
    return [...m.values()];
  }
  // 'All models' is stored as __all and shown in text as "any GPU"
  const ANY_GPU = 'any GPU';
  // picking a chip maker keeps the GPU focus only if it is one of that maker's chips
  function vendorChange(vd) {
    const v = cache.v; const fam = P().family;
    const keep = !vd || !fam || fam === '__all' || (v && v.famInfo.get(fam) && v.famInfo.get(fam).vendor === vd);
    return keep ? { vendor: vd } : { vendor: vd, family: null };
  }
  const focus = () => famSel() || ANY_GPU;

  /* ---------- helpers ---------- */
  function svgFor(el, W, H, label) {
    const svg = d3.select(el).selectAll('svg').data([0]).join('svg')
      .attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('role', 'img').attr('aria-label', label);
    svg.selectAll('*').remove();
    return svg;
  }
  function measure(svg, texts, cls) {
    const t = svg.append('text').attr('class', cls || '');
    let w = 0; texts.forEach((s) => { t.text(s); w = Math.max(w, t.node().getComputedTextLength()); });
    t.remove(); return w;
  }
  function fail(el) { const d = document.createElement('div'); d.className = 'gx-fail'; d.textContent = 'Failed to load'; el.replaceChildren(d); }
  function emptyNote(el, text) { const d = document.createElement('p'); d.className = 'gx-note'; d.textContent = text; el.replaceChildren(d); }
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  function legend(el, items) {
    el.replaceChildren(...items.map(([label, color, hollow]) => {
      const s = document.createElement('span'); const i = document.createElement('i');
      if (hollow) { i.style.border = '2px solid ' + color; i.style.background = 'transparent'; } else i.style.background = color;
      s.append(i, label); return s;
    }));
  }
  function hbars(el, rows, opt) {
    // rows: {label, value, color, sub, onClick, on, tipTitle, tipLines}
    const W = Math.max(280, el.clientWidth || 400), rowH = opt.rowH || 24, m = { t: 6, r: 8, b: 6 };
    const H = m.t + m.b + rows.length * rowH;
    const svg = svgFor(el, W, H, opt.label);
    const lw = Math.min(W * 0.42, measure(svg, rows.map((r) => r.label)) + 10);
    const vw = measure(svg, rows.map((r) => r.text)) + 8;
    const x = d3.scaleLinear([0, d3.max(rows, (r) => r.value) || 1], [lw, W - m.r - vw]);
    const g = svg.selectAll('g.r').data(rows).join('g').attr('class', 'r').attr('transform', (d, i) => `translate(0,${m.t + i * rowH})`)
      .style('cursor', (d) => (d.onClick ? 'pointer' : null))
      .on('click', (e, d) => d.onClick && d.onClick())
      .on('mousemove', (e, d) => d.tipTitle && tipShow(e, d.tipTitle, d.tipLines || []))
      .on('mouseleave', tipHide);
    g.append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', rowH).attr('fill', 'transparent');
    g.append('text').attr('x', lw - 8).attr('y', rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
      .attr('class', (d) => (d.on ? 'strong' : null)).text((d) => d.label);
    g.append('rect').attr('x', lw).attr('y', rowH * 0.2).attr('height', rowH * 0.6).attr('rx', 4)
      .attr('width', (d) => Math.max(2, x(d.value) - lw)).attr('fill', (d) => d.color)
      .attr('stroke', (d) => (d.on ? 'var(--color-fg)' : null)).attr('stroke-width', 1.5);
    g.append('text').attr('x', (d) => x(d.value) + 6).attr('y', rowH / 2).attr('dy', '0.35em').attr('class', 'strong').text((d) => d.text);
  }

  /* ---------- filters ---------- */
  const sel = { vendor: $('#f-vendor'), family: $('#f-family'), region: $('#f-region'), country: $('#f-country'), category: $('#f-category'), ownership: $('#f-ownership') };
  Object.entries(sel).forEach(([k, el]) => el.addEventListener('change', () => set(k === 'region' ? { region: el.value || null, country: null } : k === 'vendor' ? vendorChange(el.value || null) : { [k]: el.value && el.value !== '__all' ? el.value : null })));
  const qIn = $('#f-q'); let qT;
  qIn.addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(() => set({ q: qIn.value.trim() || null }), 220); });
  $('#f-reset').addEventListener('click', () => { dash.resetParams(); qIn.value = ''; });
  document.querySelectorAll('#metric button').forEach((b) => b.addEventListener('click', () => set({ metric: b.dataset.m, pv: null })));
  $('#metric').addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const bs = [...document.querySelectorAll('#metric button')]; const i = bs.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); const nb = bs[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length];
    set({ metric: nb.dataset.m }); nb.focus();
  });
  document.querySelectorAll('#pg-seg button').forEach((b) => b.addEventListener('click', () => set({ pgroup: b.dataset.g })));
  document.querySelectorAll('#dir th button').forEach((b) => b.addEventListener('click', () => {
    const q = P(); const k = b.dataset.s;
    set({ sort: k, dir: q.sort === k && q.dir === 'desc' ? 'asc' : q.sort === k ? 'desc' : (['provider', 'hq', 'category', 'ownership'].includes(k) ? 'asc' : 'desc') });
  }));
  $('#dir tbody').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-key]'); if (tr) { openProfile(tr.dataset.key); } });
  $('#cheap tbody').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-prov]'); if (tr) { openProfile(tr.dataset.prov); } });

  function fillSelect(el, opts, value, allLabel) {
    const cur = [...el.options].map((o) => o.value + '|' + o.textContent).join(';');
    const want = (allLabel ? [['', allLabel]] : []).concat(opts);
    if (cur !== want.map((o) => o[0] + '|' + o[1]).join(';')) el.replaceChildren(...want.map(([v, t]) => new Option(t, v)));
    el.value = value ?? '';
  }
  function drawFilters(v) {
    const q = P();
    const pricedN = d3.rollup(v.prices.filter((r) => r.usd != null), (a) => new Set(a.map((r) => r.provider)).size, (r) => r.family);
    const vn = new Map(); v.provs.forEach((p) => new Set(p.fams.map((k) => (v.famInfo.get(k) || {}).vendor).filter(Boolean)).forEach((x) => vn.set(x, (vn.get(x) || 0) + 1)));
    fillSelect(sel.vendor, VENDORS.filter((x) => vn.get(x)).map((x) => [x, `${x} (${vn.get(x)} providers)`]), q.vendor, 'All chips');
    const famN = new Map(); v.provs.forEach((p) => p.fams.forEach((k) => famN.set(k, (famN.get(k) || 0) + 1)));
    const famOpts = [...v.famInfo.values()].filter((x) => famN.get(x.family) && (!q.vendor || x.vendor === q.vendor)).sort((a, b) => ((VENDORS.indexOf(a.vendor) + 99) % 99) - ((VENDORS.indexOf(b.vendor) + 99) % 99) || b.year - a.year || (famN.get(b.family) - famN.get(a.family)));
    fillSelect(sel.family, famOpts.map((x) => [x.family, `${x.family} · ${x.vendor} (${famN.get(x.family)})`]), famSel(), q.vendor ? `All ${q.vendor} models` : 'All models');
    const uniq = (k) => [...new Set(v.provs.map((p) => p[k]))].filter(Boolean).sort();
    fillSelect(sel.region, uniq('region').filter((r) => r !== 'Unknown').map((r) => [r, r]), q.region, 'All regions');
    const cs = [...new Set(v.provs.filter((p) => p.hq !== 'Unknown' && (!q.region || p.region === q.region)).map((p) => p.hq))].sort();
    if (q.country && !cs.includes(q.country)) cs.unshift(q.country);
    fillSelect(sel.country, cs.map((c) => [c, c]), q.country, 'All countries');
    Object.entries(sel).forEach(([k, el]) => el.closest('.gx-f').classList.toggle('is-set', k === 'family' ? !!famSel() : !!q[k]));
    qIn.closest('.gx-f').classList.toggle('is-set', !!q.q);
    fillSelect(sel.category, uniq('category').map((r) => [r, r]), q.category, 'All models');
    fillSelect(sel.ownership, OWN.map((o) => [o[0], o[1]]), q.ownership, 'Any ownership');
    if (qIn !== document.activeElement) qIn.value = q.q || '';
    const nSet = ['vendor', 'region', 'country', 'category', 'ownership', 'city'].filter((k) => q[k]).length + (famSel() ? 1 : 0);
    const rb = $('#f-reset'); rb.classList.toggle('is-active', nSet > 0 || !!q.q); rb.querySelector('span').textContent = nSet ? `Reset (${nSet})` : 'Reset';
    const fc = $('#f-count'); fc.hidden = !nSet; fc.textContent = String(nSet); $('#f-toggle').setAttribute('aria-label', nSet ? `Filters, ${nSet} active` : 'Filters');
    const chips = $('#f-chips'); const list = [];
    if (q.city) list.push(['Data center in ' + q.city, { city: null }]);
    chips.hidden = !list.length;
    chips.replaceChildren(...list.map(([t, clr]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'gx-chip'; b.textContent = t + '  ×'; b.setAttribute('aria-label', 'Clear ' + t); b.onclick = () => set(clr); return b; }));
    document.querySelectorAll('#metric button').forEach((b) => { const on = (q.metric || 'providers') === b.dataset.m; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    document.querySelectorAll('#pg-seg button').forEach((b) => b.setAttribute('aria-pressed', String((q.pgroup || 'region') === b.dataset.g)));
  }

  // phone: active-filter chips beside the Filters button, sheet subtitle and the "Show N providers" button
  function drawFSum(v, f) {
    const q = P(); const box = $('#f-sum'); const items = [];
    const pick = (id) => { const el = $(id); const o = el && el.options[el.selectedIndex]; return o ? ddParts(o.textContent).main : ''; };
    if (q.vendor) items.push([pick('#f-vendor'), 'Chip', { vendor: null, family: null }]);
    if (famSel()) items.push([pick('#f-family'), 'GPU', { family: null }]);
    if (q.region) items.push([q.region, 'Region', { region: null, country: null }]);
    if (q.country) items.push([q.country, 'Country', { country: null }]);
    if (q.city) items.push([q.city, 'City', { city: null }]);
    if (q.category) items.push([q.category, 'Model', { category: null }]);
    if (q.ownership) items.push([pick('#f-ownership'), 'DC', { ownership: null }]);
    if (q.q) items.push([`"${q.q}"`, 'Search', { q: null }]);
    const tab = tabOf();
    if (!items.length) { if (tab === 'overview') { const n = document.createElement('span'); n.className = 'fs-note'; n.textContent = `All ${fInt(f.provs.length)} providers`; box.replaceChildren(n); } else box.replaceChildren(); }
    else box.replaceChildren(...items.map(([t, l, clr]) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `Clear ${l}: ${t}`); const s2 = document.createElement('span'); s2.textContent = t; b.append(s2, ICON('x')); b.onclick = () => set(clr); return b; }));
    $('#f-toggle').classList.toggle('has', items.length > 0);
    $('#f-sub').textContent = items.length ? `${items.length} active · ${fInt(f.provs.length)} providers` : `${fInt(f.provs.length)} providers`;
    $('#f-done').textContent = `Show ${fInt(f.provs.length)} provider${f.provs.length === 1 ? '' : 's'}`;
  }
  /* ---------- KPIs + takeaway ---------- */
  function kset(k, t) { const e = document.querySelector(`#kpis [data-k="${k}"]`); e.textContent = t; e.classList.remove('dash-skeleton'); }
  function drawKpis(v, f) {
    const fam = focus(); const n = f.provs.length;
    const byC = d3.rollup(f.provs.filter((p) => p.hq !== 'Unknown'), (a) => a.length, (p) => p.hq);
    const topC = [...byC].sort((a, b) => b[1] - a[1])[0];
    const owns = f.provs.filter((p) => p.ownership === 'Yes').length;
    const mins = provMin(f.prices, fam); const med = d3.median(mins, (r) => r.usd);
    const opP = f.provs.filter((p) => p.op != null), plP = f.provs.filter((p) => p.pl != null);
    kset('providers', fInt(n)); kset('providers_sub', n === v.provs.length ? 'worldwide' : `of ${fInt(v.provs.length)} total`);
    kset('countries', fInt(byC.size)); kset('countries_sub', topC ? `Most: ${topC[0]} (${topC[1]})` : '');
    kset('owns', n ? fPct(owns / n) : '—'); kset('owns_sub', `${fInt(owns)} providers`);
    kset('price_lab', `${fam} median`); kset('price', med == null ? '—' : f$(med)); kset('price_sub', `lowest rate per GPU-hr · ${mins.length} providers`);
    kset('op', opP.length ? fMW(d3.sum(opP, (p) => p.op)) : '—'); kset('op_sub', `disclosed by ${opP.length} providers`);
    kset('pl', plP.length ? fMW(d3.sum(plP, (p) => p.pl)) : '—'); kset('pl_sub', `disclosed by ${plP.length} providers`);

    const take = $('#takeaway'); take.classList.remove('dash-skeleton');
    if (!n) { take.textContent = 'No providers match these filters.'; return; }
    const cheapest = mins.slice().sort((a, b) => a.usd - b.usd)[0];
    const capC = [...d3.rollup(opP.filter((p) => p.hq !== 'Unknown'), (a) => d3.sum(a, (p) => p.op), (p) => p.hq)].sort((a, b) => b[1] - a[1])[0];
    const parts = [];
    const B = (x) => { const b = document.createElement('b'); b.textContent = x; return b; };
    if (cheapest) parts.push(`Cheapest ${fam} right now: `, B(`${f$(cheapest.usd)}/GPU-hr`), ` from ${cheapest.provider}.`);
    else parts.push(`No ${fam} price published in this selection.`);
    if (capC) parts.push(' Most live capacity is held by ', B(capC[0]), '-based providers.');
    take.replaceChildren(...parts);
  }

  /* ---------- map ---------- */
  function countryAgg(f) {
    const fam = focus();
    const agg = new Map();
    f.provs.forEach((p) => {
      if (p.hq === 'Unknown') return;
      const a = agg.get(p.hq) || { n: 0, op: 0, pl: 0, opn: 0, pln: 0, prices: [] };
      a.n++; if (p.op != null) { a.op += p.op; a.opn++; } if (p.pl != null) { a.pl += p.pl; a.pln++; }
      agg.set(p.hq, a);
    });
    provMin(f.prices, fam).forEach((r) => { const a = agg.get(r.p.hq); if (a) { a.prices.push(r.usd); (a.rows = a.rows || []).push(r); } });
    agg.forEach((a) => { a.med = a.prices.length ? d3.median(a.prices) : null; a.pn = a.prices.length; });
    return agg;
  }
  function cityAgg(v, f) {
    const q = P(); const S = new Set(f.provsLoc.map((p) => p.provider)); const m = new Map();
    v.cities.forEach((r) => {
      if (!S.has(r.provider) || (q.country && r.country !== q.country) || (q.region && r.region !== q.region)) return;
      const k = r.city + '|' + r.country;
      const c = m.get(k) || { city: r.city, country: r.country, px: +r.px, py: +r.py, provs: [] };
      if (!c.provs.includes(r.provider)) c.provs.push(r.provider);
      m.set(k, c);
    });
    return [...m.values()].map((c) => ({ ...c, n: c.provs.length }));
  }
  function metricOf(a, m) { return m === 'op' ? a.op : m === 'pl' ? a.pl : m === 'price' ? a.pn : a.n; }
  const MERC = { k: 960 / (2 * Math.PI), y0: 372.2 };
  const mercY = (lat) => MERC.y0 - MERC.k * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  let zoomT = null; let lastCountry; let lastPv = null; let lastRegion = null;
  const MKf = () => ({ providers: 'var(--gx-pv6)', op: 'var(--gx-lv6)', pl: 'var(--gx-pl6)', cities: 'var(--gx-city)', price: 'var(--gx-pr3)' });
  let MK = {};
  function drawMap(v, f) {
    MK = MKf();
    const el = $('#map'); const sw = dash.data('world_map'), sc = dash.data('countries');
    if (sw.status === 'error' || sc.status === 'error') { fail(el); return; }
    if (sw.status !== 'ok' || sc.status !== 'ok') { el.replaceChildren(); el.classList.add('dash-skeleton'); return; }
    el.classList.remove('dash-skeleton');
    const q = P(); const m = q.metric || 'providers'; const fam = focus();
    const agg = countryAgg(f);
    const W = 960, H = 553;
    // provider focus: its headquarters plus every data center city it names
    const pv = q.pv ? v.byName.get(q.pv) : null;
    const cxy0 = new Map(sc.data.map((c) => [c.country, [+c.px, +c.py]]));
    const pvCities = pv ? [...new Map(v.cities.filter((r) => r.provider === pv.provider).map((r) => [r.city + '|' + r.country, { city: r.city, country: r.country, px: +r.px, py: +r.py, n: 1, provs: [pv.provider] }])).values()] : [];
    const pvCountries = new Set(pvCities.map((c) => c.country));
    const hqXY = pv ? (pv.hq_px != null && pv.hq_px !== '' ? [+pv.hq_px, +pv.hq_py] : cxy0.get(pv.hq)) : null;
    // chip finder: with a chip maker or GPU model picked, the providers layer shades countries by providers
    // that sell it AND run a data center there, and shows the cities
    const chip = chipOn() && !pv && m === 'providers';
    const dcN = new Map();
    if (chip) { const SL = new Set(f.provsLoc.map((p) => p.provider)); v.cities.forEach((r) => { if (!SL.has(r.provider)) return; (dcN.get(r.country) || dcN.set(r.country, new Set()).get(r.country)).add(r.provider); }); }
    const svg = svgFor(el, W, H, 'World map of GPU providers and data center cities');
    const defs = svg.append('defs');
    defs.append('clipPath').attr('id', 'gx-map-clip').append('rect').attr('width', W).attr('height', H).attr('rx', 12);
    const glow = defs.append('radialGradient').attr('id', 'gx-glow');
    glow.append('stop').attr('offset', '0%').style('stop-color', 'var(--gx-city-halo)').style('stop-opacity', 0.3);
    glow.append('stop').attr('offset', '100%').style('stop-color', 'var(--gx-city-halo)').style('stop-opacity', 0);
    const frame = svg.append('g').attr('clip-path', 'url(#gx-map-clip)');
    frame.append('rect').attr('width', W).attr('height', H).attr('fill', 'var(--gx-ocean)');
    const g = frame.append('g');
    const grat = g.append('g').attr('stroke', 'var(--cds-chart-grid)').attr('stroke-width', 0.6).attr('fill', 'none');
    d3.range(-150, 181, 30).forEach((lon) => { const x = ((lon + 180) / 360) * W; grat.append('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', H); });
    [-40, -20, 0, 20, 40, 60].forEach((lat) => { const y = mercY(lat); grat.append('line').attr('x1', 0).attr('x2', W).attr('y1', y).attr('y2', y).attr('stroke-dasharray', lat === 0 ? null : '2 4'); });
    const ramp = (() => {
      const meds = [...agg.values()].map((a) => a.med).filter((x) => x != null).sort(d3.ascending);
      if (!meds.length) return null;
      const lo = d3.quantileSorted(meds, 0.1), mid = d3.quantileSorted(meds, 0.5), hi = d3.quantileSorted(meds, 0.9);
      const s = d3.scaleLinear([lo, mid, hi === mid ? mid + 0.01 : hi], [resolveColor('var(--color-ok)'), resolveColor('var(--color-warn)'), resolveColor('var(--color-bad)')]).clamp(true).interpolate(d3.interpolateRgb);
      s.lo = lo; s.mid = mid; s.hi = hi; return s;
    })();
    // country shading: stepped sequential palette per layer; the cities layer shades countries by live MW
    const sm = m === 'cities' ? 'op' : m;
    const cval = (a) => (sm === 'op' ? a.op : sm === 'pl' ? a.pl : sm === 'price' ? a.med : a.n);
    const hasVal = (a) => { const x = cval(a); return x != null && x > 0; };
    const PAL = { providers: 'pv', op: 'lv', pl: 'pl' };
    let shade, breaks, labels;
    if (sm === 'price') {
      const meds = [...agg.values()].map((a) => a.med).filter((x) => x != null).sort(d3.ascending);
      const qs = meds.length ? [0.2, 0.4, 0.6, 0.8].map((p) => d3.quantileSorted(meds, p)) : [1, 2, 3, 4];
      breaks = qs; shade = d3.scaleThreshold(qs, [1, 2, 3, 4, 5].map((i) => `var(--gx-pr${i})`));
      labels = meds.length ? [f$(meds[0])].concat(qs.map(f$)) : [];
    } else {
      breaks = sm === 'providers' ? [2, 3, 5, 10, 20] : sm === 'op' ? [10, 50, 100, 300, 1000] : [50, 200, 500, 1500, 5000];
      shade = d3.scaleThreshold(breaks, [1, 2, 3, 4, 5, 6].map((i) => `var(--gx-${PAL[sm]}${i})`));
      labels = sm === 'providers' ? ['1', '2', '3', '5', '10', '20+'] : ['<' + fMW(breaks[0])].concat(breaks.map((x, i) => fMW(x) + (i === breaks.length - 1 ? '+' : '')));
    }
    const hatch = defs.append('pattern').attr('id', 'gx-hatch').attr('width', 5).attr('height', 5).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
    hatch.append('rect').attr('width', 5).attr('height', 5).attr('fill', 'var(--gx-land)');
    hatch.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 5).attr('stroke', 'var(--gx-line-strong)').attr('stroke-width', 1.2);
    const countryTip = (e, d) => {
      const a = agg.get(d.country); if (!a) { tipHide(); return; }
      tipShow(e, d.country, [['Providers', fInt(a.n)], ['Live', a.opn ? `${fMW(a.op)} (${a.opn} disclose)` : 'not disclosed'], ['Planned', a.pln ? `${fMW(a.pl)} (${a.pln} disclose)` : 'not disclosed'], [`Median ${fam}`, a.med != null ? `${f$(a.med)}/GPU-hr (${a.pn})` : 'no price']]);
    };
    g.append('g').selectAll('path').data(sw.data).join('path')
      .attr('d', (d) => d.d)
      .attr('class', (d) => 'cpath' + (agg.has(d.country) ? ' has' : ''))
      .attr('fill', (d) => { if (pv) return d.country === pv.hq ? 'var(--gx-sel)' : pvCountries.has(d.country) ? 'var(--gx-hov)' : 'var(--gx-land)'; if (q.country === d.country) return 'var(--gx-sel)'; if (chip) { const n = dcN.has(d.country) ? dcN.get(d.country).size : 0; return n ? shade(n) : agg.has(d.country) ? 'url(#gx-hatch)' : 'var(--gx-land)'; } const a = agg.get(d.country); if (!a) return 'var(--gx-land)'; return hasVal(a) ? shade(cval(a)) : 'url(#gx-hatch)'; })
      .attr('fill-opacity', (d) => (!pv && q.country && q.country !== d.country ? 0.45 : 1))
      .attr('stroke', 'var(--gx-border)').attr('stroke-opacity', 0.45).attr('stroke-width', 0.35).attr('vector-effect', 'non-scaling-stroke')
      .style('cursor', (d) => (agg.has(d.country) || dcN.has(d.country) ? 'pointer' : null))
      .on('mousemove', (e, d) => { if (!chip) return countryTip(e, d); const ps = dcN.get(d.country); const a = agg.get(d.country); if (!ps && !a) return tipHide();
        if (!ps) return tipShow(e, d.country, [[`HQs selling ${chipName()}`, String(a.n)], ['', 'No data center city named here']]);
        tipProviders(e, d.country, `${ps.size} provider${ps.size === 1 ? '' : 's'} selling ${chipName()} with a data center here`, [...ps].map((n) => v.byName.get(n)).filter(Boolean).sort((x, y) => (y.op || 0) - (x.op || 0)), { gpus: gpusOf, hl: famSel(), meta: (p) => p.hq, max: 6 }); })
      .on('mouseleave', tipHide)
      .on('click', (e, d) => (agg.has(d.country) || dcN.has(d.country)) && set({ country: q.country === d.country ? null : d.country, city: null }));
    g.selectAll('path').filter((d) => d && d.country === q.country).raise();

    // circles only for cities
    // city circles belong to layers about physical infrastructure: cities, live power, planned power
    const showCities = !!pv || chip || ['cities', 'op', 'pl'].includes(m);
    const pts = pv ? pvCities : showCities ? cityAgg(v, f).sort((a, b) => b.n - a.n) : [];
    const rS = d3.scaleSqrt([0, d3.max(pts, (c) => c.n) || 1], [0, m === 'cities' ? 15 : 12]);
    const rr = (d) => (pv ? 4.6 : Math.max(m === 'cities' ? 2.6 : 2.2, rS(d.n)));
    const isOn = (d) => q.city === d.city;
    const halo = g.append('g').attr('pointer-events', 'none');
    const routes = g.append('g').attr('pointer-events', 'none');
    if (pv && hqXY) {
      routes.selectAll('path').data(pvCities).join('path')
        .attr('d', (d) => { const [x0, y0] = hqXY; const x1 = d.px, y1 = d.py; const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - Math.hypot(x1 - x0, y1 - y0) * 0.22; return `M${x0},${y0}Q${mx},${my} ${x1},${y1}`; })
        .attr('fill', 'none').attr('stroke', 'var(--gx-gblue)').attr('stroke-width', 1.4).attr('stroke-opacity', 0.7).attr('stroke-dasharray', '4 3').attr('vector-effect', 'non-scaling-stroke');
    }
    halo.selectAll('circle').data(pv ? pts : m === 'cities' || chip || q.country ? pts.slice(0, 12) : []).join('circle').attr('cx', (d) => d.px).attr('cy', (d) => d.py).attr('fill', 'url(#gx-glow)');
    const dots = g.append('g').selectAll('circle').data(pts).join('circle')
      .attr('cx', (d) => d.px).attr('cy', (d) => d.py)
      .attr('fill', 'var(--gx-city)').attr('fill-opacity', m === 'cities' ? 0.92 : 0.8)
      .attr('stroke', (d) => (isOn(d) ? 'var(--color-fg)' : 'var(--gx-border)'))
      .style('cursor', 'pointer')
      .on('click', (e, d) => { if (!pv) set({ city: q.city === d.city ? null : d.city }); })
      .on('mousemove', (e, d) => (pv ? tipShow(e, `${d.city}, ${d.country}`, [['Data center of', pv.provider], ['Headquarters', hqPlace(pv, true)]], 'Data center city') : tipProviders(e, `${d.city}, ${d.country}`, `${d.n} provider${d.n === 1 ? '' : 's'}${chipOn() ? ' selling ' + chipName() : ''} with a data center here`, d.provs.map((n) => v.byName.get(n)).filter(Boolean).sort((a, b) => (b.op || 0) - (a.op || 0)), { gpus: gpusOf, hl: famSel(), meta: (p) => p.hq, max: 6 })))
      .on('mouseleave', tipHide);
    // provider HQ points (providers layer): one point per HQ city, tooltip lists each provider's GPUs
    const hqPts = !pv && m === 'providers' ? d3.groups(f.provs.filter((p) => p.hq_px != null && p.hq_px !== ''), (p) => p.hq_city + '|' + p.hq)
      .map(([k, a]) => ({ k, city: a[0].hq_city, place: hqPlace(a[0], true), country: a[0].hq, x: +a[0].hq_px, y: +a[0].hq_py, provs: a.sort((x, y) => (y.op || 0) - (x.op || 0) || d3.ascending(x.provider, y.provider)) }))
      .sort((a, b) => b.provs.length - a.provs.length) : [];
    const hqR = (d) => Math.min(7, 2.4 + Math.sqrt(d.provs.length) * 1.1);
    const hqTip = (e, d) => {
      const F = famSel();
      tipProviders(e, d.provs.length === 1 ? d.provs[0].provider : `HQ in ${d.place}`, d.provs.length === 1 ? `Headquarters · ${d.place}` : `${d.provs.length} providers${F ? ' selling ' + F : ''} headquartered here`, d.provs, { gpus: gpusOf, hl: F, max: 6 });
    };
    const hqDots = g.append('g').attr('class', 'hqpts').selectAll('circle').data(hqPts).join('circle')
      .attr('cx', (d) => d.x).attr('cy', (d) => d.y)
      .attr('fill', 'var(--gx-gblue)').attr('fill-opacity', 0.9).attr('stroke', 'var(--color-bg, #fff)')
      .style('cursor', 'pointer')
      .on('mousemove', hqTip).on('mouseleave', tipHide)
      .on('click', (e, d) => { tipHide(); if (d.provs.length === 1) { set({ pv: d.provs[0].provider }); } else set({ country: q.country === d.country ? null : d.country, city: null }); });
    // country names sized to the country's footprint on the map (no outline); shown only where the name fits
    const cxy = new Map(sc.data.map((c) => [c.country, [+c.px, +c.py]]));
    const cLab = [];
    g.selectAll('path').each(function (d) {
      if (!d || !agg.has(d.country) || !cxy.has(d.country)) return;
      const bb = d.bb ? { width: d.bb[2] - d.bb[0], height: d.bb[3] - d.bb[1] } : this.getBBox(); const area = bb.width * bb.height;
      // three fixed on-screen sizes, like web maps: big countries 12px, medium 11px, small 10px
      const px = area > 4000 ? 12 : area > 700 ? 11 : 10;
      cLab.push({ t: d.country, x: cxy.get(d.country)[0], y: cxy.get(d.country)[1], px, bw: bb.width, tw: d.country.length * px * 0.56 });
    });
    const clab = g.append('g').attr('pointer-events', 'none').selectAll('text').data(cLab).join('text')
      .attr('class', 'ctrylab').attr('x', (d) => d.x).attr('y', (d) => d.y).attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .style('opacity', pv ? 0.45 : m === 'cities' ? 0.6 : 1).text((d) => d.t);
    if (pv) clab.filter((d) => d.t === pv.hq).remove();
    const hqm = g.append('g').attr('pointer-events', 'none');
    if (pv && hqXY) {
      hqm.append('circle').attr('class', 'hqring').attr('cx', hqXY[0]).attr('cy', hqXY[1]).attr('fill', 'none').attr('stroke', 'var(--gx-gblue)');
      hqm.append('circle').attr('class', 'hqdot').attr('cx', hqXY[0]).attr('cy', hqXY[1]).attr('fill', 'var(--gx-gblue)').attr('stroke', '#fff');
      hqm.append('text').attr('class', 'hqlab').attr('x', hqXY[0]).attr('y', hqXY[1]).attr('text-anchor', 'middle').text('HQ · ' + (pv.hq_city || pv.hq));
    }
    const lab = g.append('g').attr('pointer-events', 'none').selectAll('text').data(showCities ? pts.slice(0, pv ? 40 : m === 'cities' || chip || q.country ? 14 : 0) : []).join('text')
      .attr('class', 'citylab').attr('dominant-baseline', 'central').text((d) => d.city);
    const paint = (k) => {
      dots.attr('r', (d) => rr(d) / Math.sqrt(k)).attr('stroke-width', (d) => (isOn(d) ? 2 : 1) / k);
      hqDots.attr('r', (d) => hqR(d) / Math.sqrt(k)).attr('stroke-width', 1.2 / k);
      halo.selectAll('circle').attr('r', (d) => (rr(d) * 2.1) / Math.sqrt(k));
      const s = (el.clientWidth || W) / W; // screen pixels per map unit
      // place names biggest-first and skip any that would overlap a name already placed
      const placed = [];
      const boxOf = (x, y, w, hgt) => [x - w / 2, y - hgt / 2, x + w / 2, y + hgt / 2];
      const hit = (b) => placed.some((p) => b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1]);
      // city names: biggest first, skip any that would collide with a name (or the HQ tag) already placed
      if (pv && hqXY) { const hw = (((pv.hq_city || pv.hq).length + 5) * 11 * 0.6) / (s * k), hh2 = 15 / (s * k), hy = hqXY[1] - 16 / Math.sqrt(k); placed.push([hqXY[0] - hw / 2, hy - hh2 / 2, hqXY[0] + hw / 2, hy + hh2 / 2]); }
      const cityShow = new Set();
      lab.each((d) => { const w = (d.city.length * 10.5 * 0.56) / (s * k), hh = 13 / (s * k), x0 = d.px + rr(d) / Math.sqrt(k) + 3 / k; const bx = [x0, d.py - hh / 2, x0 + w, d.py + hh / 2]; if (hit(bx)) return; placed.push(bx); cityShow.add(d); });
      lab.style('display', (d) => (cityShow.has(d) ? null : 'none'));
      const show = new Set();
      cLab.slice().sort((a, b) => b.px - a.px || b.bw - a.bw).forEach((d) => {
        if (d.bw * s * k < d.tw * 1.05) return;
        const b = boxOf(d.x, d.y, (d.tw + 6) / (s * k), (d.px + 4) / (s * k));
        if (hit(b)) return; placed.push(b); show.add(d);
      });
      clab.style('font-size', (d) => `${d.px / (s * k)}px`).style('display', (d) => (show.has(d) ? null : 'none'));
      hqm.select('.hqdot').attr('r', 6 / Math.sqrt(k)).attr('stroke-width', 2 / k);
      hqm.select('.hqring').attr('r', 12 / Math.sqrt(k)).attr('stroke-width', 1.5 / k);
      hqm.select('.hqlab').attr('dy', -16 / Math.sqrt(k)).style('font-size', `${11 / (s * k)}px`);
      lab.attr('x', (d) => d.px + rr(d) / Math.sqrt(k) + 3 / k).attr('y', (d) => d.py).style('font-size', `${10.5 / (s * k)}px`);
    };
    const zoom = d3.zoom().scaleExtent([1, 14]).translateExtent([[0, 0], [W, H]]).extent([[0, 0], [W, H]])
      .filter((e) => (e.type === 'wheel' ? e.ctrlKey || e.metaKey : e.type && e.type.startsWith('touch') ? e.touches.length >= 2 : !e.button)) // one finger scrolls the page; two fingers pinch the map
      .on('zoom', (e) => { zoomT = e.transform; g.attr('transform', e.transform); paint(e.transform.k); });
    svg.call(zoom).on('dblclick.zoom', null);
    if (q.country !== lastCountry || (q.pv || null) !== lastPv || (q.region || null) !== lastRegion) {
      lastCountry = q.country; lastPv = q.pv || null; lastRegion = q.region || null;
      const node = g.selectAll('path').filter((d) => d && d.country === (pv ? pv.hq : q.country)).node();
      let tr = d3.zoomIdentity;
      const xy = pv ? [hqXY, ...pvCities.map((c) => [c.px, c.py])].filter(Boolean) : !q.country && q.region ? [...agg.keys()].map((c) => cxy0.get(c)).filter(Boolean) : [];
      if (xy.length > 1) {
        const x0 = d3.min(xy, (p) => p[0]), x1 = d3.max(xy, (p) => p[0]), y0 = d3.min(xy, (p) => p[1]), y1 = d3.max(xy, (p) => p[1]);
        const bw = Math.max(60, x1 - x0), bh = Math.max(40, y1 - y0); const k = Math.max(1, Math.min(7, 0.78 / Math.max(bw / W, bh / H)));
        tr = d3.zoomIdentity.translate(W / 2 - k * (x0 + x1) / 2, H / 2 - k * (y0 + y1) / 2).scale(k);
      } else if (node) {
        // frame the main landmass (precomputed bb) so overseas territories don't zoom the map out
        const dd = d3.select(node).datum(); const b = dd && dd.bb ? { x: dd.bb[0], y: dd.bb[1], width: Math.max(dd.bb[2] - dd.bb[0], 4), height: Math.max(dd.bb[3] - dd.bb[1], 4) } : node.getBBox(); const k = Math.max(1, Math.min(10, 0.75 / Math.max(b.width / W, b.height / H)));
        tr = d3.zoomIdentity.translate(W / 2 - k * (b.x + b.width / 2), H / 2 - k * (b.y + b.height / 2)).scale(k);
      }
      svg.call(zoom.transform, zoomT || d3.zoomIdentity);
      svg.transition().duration(600).call(zoom.transform, tr);
    } else if (zoomT) svg.call(zoom.transform, zoomT); else paint(1);
    const ctr = document.createElement('div'); ctr.className = 'gx-zoom';
    [['+', 'Zoom in', () => svg.transition().duration(250).call(zoom.scaleBy, 1.8)], ['−', 'Zoom out', () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.8)], ['⟲', 'Reset view', () => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity)]]
      .forEach(([s, l, fn]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = s; b.setAttribute('aria-label', l); b.title = l; b.onclick = fn; ctr.append(b); });
    el.querySelectorAll('.gx-zoom').forEach((n) => n.remove()); el.append(ctr);

    const mv = (k, txt) => { const e = document.querySelector(`#metric [data-mv="${k}"]`); if (e) e.textContent = txt; };
    document.querySelectorAll('#metric .sw[data-c]').forEach((s) => { s.style.background = [MK.providers, MK.op, MK.pl, MK.cities][+s.dataset.c]; });
    const A = [...agg.values()];
    mv('providers', `${fInt(d3.sum(A, (a) => a.n))} in ${agg.size}`);
    mv('op', fMW(d3.sum(A, (a) => a.op)));
    mv('pl', fMW(d3.sum(A, (a) => a.pl)));
    const fm = provMin(f.prices, fam); mv('price_l', `${fam} price`); mv('price', fm.length ? `${f$(d3.median(fm, (r) => r.usd))} median` : '—');
    const ca = cityAgg(v, f); mv('cities', `${fInt(ca.length)} cities`);
    const titles = { providers: 'Providers by HQ country', op: 'Live capacity by HQ country', pl: 'Planned capacity by HQ country', price: `${fam} price by HQ country`, cities: 'Data center cities and live capacity' };
    $('#map-title').textContent = chip ? `Where to rent ${chipName()}` : titles[m];
    const lg = $('#map-legend');
    lg.replaceChildren();
    if (labels.length) {
      const st = document.createElement('span'); st.className = 'steps';
      const ttl = chip ? `Providers with ${chipName()} data centers` : { providers: 'Providers headquartered', op: 'Live capacity', pl: 'Planned capacity', price: `Median ${fam} $/GPU-hr` }[sm];
      const sb = document.createElement('span'); sb.className = 'sb';
      const s6 = document.createElement('span'); s6.className = 'sw6'; const l6 = document.createElement('span'); l6.className = 'lb6';
      shade.range().forEach((c, i) => { const ii = document.createElement('i'); ii.style.background = c; s6.append(ii); const em = document.createElement('em'); em.textContent = labels[i] || ''; l6.append(em); });
      sb.append(s6, l6); st.append(ttl, sb); lg.append(st);
    }
    if (sm !== 'price') { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = 'repeating-linear-gradient(45deg,var(--gx-land) 0 2px,var(--gx-line-strong) 2px 3px)'; s.append(i, sm === 'providers' ? '' : 'Providers, no MW disclosed'); if (sm !== 'providers') lg.append(s); }
    else { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = 'var(--gx-land)'; s.append(i, 'No price published'); lg.append(s); }
    if (hqPts.length) { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = 'var(--gx-gblue)'; i.style.borderRadius = '50%'; s.append(i, 'Provider HQ (hover for GPUs)'); lg.append(s); }
    if (chip) { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = 'repeating-linear-gradient(45deg,var(--gx-land) 0 2px,var(--gx-line-strong) 2px 3px)'; s.append(i, 'HQ only, no city named'); lg.append(s); }
    if (pts.length) { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = 'var(--gx-city)'; i.style.borderRadius = '50%'; s.append(i, `Data center cities${q.country ? ' in ' + q.country : ''}, sized by providers present`); lg.append(s); }
    const unk = f.provs.filter((p) => p.hq === 'Unknown').length;
    const withCity = new Set(v.cities.map((r) => r.provider)); const fc = f.provs.filter((p) => withCity.has(p.provider)).length;
    $('#map-note').textContent = m === 'cities'
      ? `${fc} of ${f.provs.length} providers name at least one city; the rest list only countries or regions. Ctrl/⌘ + scroll or the buttons to zoom.`
      : (unk ? `${unk} provider${unk > 1 ? 's' : ''} without a stated HQ ${unk > 1 ? 'are' : 'is'} not on the map. ` : '') +
        (m === 'op' || m === 'pl' ? 'Only providers that publish an MW figure count. ' : m === 'price' ? `Color is the median of each provider's lowest ${fam} rate. ` : '') + 'Ctrl/⌘ + scroll to zoom.';
    $('#map-note').textContent = $('#map-note').textContent.replace(/\s*Ctrl\/⌘ \+ scroll( or the buttons)? to zoom\.?/, '').trim();
    if (chip) {
      const withC = new Set(v.cities.map((r) => r.provider)); const nS = f.provsLoc.length; const nC = f.provsLoc.filter((p) => withC.has(p.provider)).length;
      $('#map-note').textContent = `${nC} of ${nS} providers selling ${chipName()} name their data center cities. Tap a country or city to list who sells it there.`;
    }
    document.querySelector('#map-card').classList.toggle('pv-on', !!pv);
    if (pv) {
      $('#map-title').textContent = `${pv.provider}: headquarters and data centers`;
      $('#map-note').textContent = pvCities.length ? `Headquartered in ${hqPlace(pv, true)}. ${pvCities.length} data center ${pvCities.length === 1 ? 'city' : 'cities'} named in ${pvCountries.size} ${pvCountries.size === 1 ? 'country' : 'countries'}. Pick a map layer to go back to the overview.` : `Headquartered in ${hqPlace(pv, true)}. This provider doesn't name specific data center cities.`;
      const it = (bg, txt, round, line) => { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = bg; if (round) i.style.borderRadius = '50%'; if (line) { i.style.height = '0'; i.style.borderTop = '2px dashed var(--gx-gblue)'; i.style.background = 'none'; i.style.width = '18px'; } s.append(i, txt); return s; };
      lg.replaceChildren(it('var(--gx-gblue)', 'Headquarters', true), it('var(--gx-city)', 'Data center city', true), it('', 'Route from HQ', false, true), it('var(--gx-hov)', 'Countries with its data centers'));
    }
  }
  function drawRank(v, f) {
    MK = MKf();
    const el = $('#rank'); const q = P(); const m = q.metric || 'providers'; const fam = focus();
    let rows, val, txt, title, note = '', go, on, color;
    if (m === 'cities') {
      rows = cityAgg(v, f).sort((a, b) => b.n - a.n || d3.ascending(a.city, b.city)).map((c) => ({ c: c.city, sub: c.country, n: c.n }));
      val = (r) => r.n; txt = (r) => fInt(r.n); title = 'Top data center cities'; note = 'Providers with a data center in each city. Click to filter.';
      go = (r) => set({ city: q.city === r.c ? null : r.c }); on = (r) => q.city === r.c; color = MK.cities;
    } else {
      const agg = countryAgg(f);
      rows = [...agg].map(([c, a]) => ({ c, a }));
      if (m === 'price') {
        rows = rows.filter((r) => r.a.pn >= 2).sort((x, y) => x.a.med - y.a.med);
        val = (r) => r.a.med; txt = (r) => `${f$(r.a.med)} · ${r.a.pn}`; title = `Cheapest median ${fam}`; note = 'Countries with 2+ priced providers; number after the dot = providers.';
      } else {
        rows = rows.filter((r) => metricOf(r.a, m) > 0).sort((x, y) => metricOf(y.a, m) - metricOf(x.a, m));
        val = (r) => metricOf(r.a, m); txt = (r) => (m === 'providers' ? fInt(r.a.n) : fMW(metricOf(r.a, m)));
        title = { providers: 'Most providers', op: 'Most live capacity', pl: 'Most planned capacity' }[m];
      }
      go = (r) => set({ country: q.country === r.c ? null : r.c, city: null }); on = (r) => q.country === r.c; color = m === 'price' ? 'var(--gx-pr2)' : MK[m];
    }
    rows = rows.slice(0, 15);
    $('#rank-title').textContent = title; $('#rank-note').textContent = note || 'Click a country to filter.';
    const mx = d3.max(rows, val) || 1;
    if (!rows.length) { el.replaceChildren(); const li = document.createElement('li'); li.textContent = 'No data for this view.'; el.append(li); return; }
    el.replaceChildren(...rows.map((r) => {
      const li = document.createElement('li'); li.tabIndex = 0; if (on(r)) li.className = 'on';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.c; withFlag(nm, r.sub || r.c);
      if (r.sub) { const s = document.createElement('small'); s.textContent = ' ' + r.sub; nm.append(s); }
      const bar = document.createElement('span'); bar.className = 'bar'; const i = document.createElement('i'); i.style.width = (100 * val(r) / mx) + '%'; i.style.background = color; bar.append(i);
      const vv = document.createElement('span'); vv.className = 'v'; vv.textContent = txt(r);
      li.append(nm, vv, bar);
      li.onclick = () => go(r); li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(r); } };
      return li;
    }));
  }

  /* ---------- providers in view ---------- */
  let plistAll = false;
  function drawPlist(v, f) {
    const q = P(); const fam = focus(); const ps = q.psort || 'op';
    document.querySelectorAll('#plist-sort button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ps === ps)));
    const where = q.city ? q.city : q.country ? q.country : q.region ? q.region : null;
    // providers headquartered in the view, plus providers that run a data center inside it
    const list = new Map(f.provs.map((p) => [p.provider, { p, hq: true, here: false }]));
    if (q.country || q.region) {
      const loc = new Set(f.provsLoc.map((p) => p.provider));
      v.cities.forEach((r) => {
        if (!loc.has(r.provider) || (q.country && r.country !== q.country) || (q.region && r.region !== q.region) || (q.city && r.city !== q.city)) return;
        const e = list.get(r.provider); if (e) e.here = true; else list.set(r.provider, { p: v.byName.get(r.provider), hq: false, here: true });
      });
    }
    const best = new Map(provMin(v.prices, fam).map((r) => [r.provider, r]));
    let rows = [...list.values()].filter((e) => e.p);
    const key = { op: (e) => -(e.p.op || 0), price: (e) => (best.get(e.p.provider) ? best.get(e.p.provider).usd : 1e9), cities: (e) => -e.p.ncity, name: () => 0 }[ps];
    rows.sort((a, b) => key(a) - key(b) || d3.ascending(a.p.provider, b.p.provider));
    const total = rows.length; const LIM = 24;
    $('#plist-title').textContent = where ? `Providers in ${where}` : 'Providers in this view';
    $('#plist-note').textContent = where && !q.city ? `${total} providers headquartered in ${where} or running a data center there. Click a card for the full profile.` : `${total} providers match the current filters. Click a card for the full profile.`;
    const more = $('#plist-more'); more.hidden = total <= LIM; more.textContent = plistAll ? 'Show fewer' : `Show all ${total} providers`;
    if (!plistAll) rows = rows.slice(0, LIM);
    if (!rows.length) { emptyNote($('#plist'), 'No providers match these filters.'); return; }
    $('#plist').replaceChildren(...rows.map((e) => {
      const p = e.p; const b = document.createElement('button'); b.type = 'button'; b.className = 'gx-pc';
      b.setAttribute('aria-label', 'Open profile of ' + p.provider);
      b.onclick = () => openProfile(p.provider);
      // header: two lines on the left (logo + name / category + tag), flag + country pinned top-right
      const pn = document.createElement('span'); pn.className = 'pn';
      const who = document.createElement('span'); who.className = 'who';
      const nm = document.createElement('b'); nm.textContent = p.provider; withLogo(nm, p.provider);
      const sub = document.createElement('span'); sub.className = 'meta'; const cat = document.createElement('span'); cat.className = 'cat'; cat.textContent = p.category; sub.append(cat);
      if (where && !q.city) { const tg = document.createElement('span'); tg.className = 'tag' + (e.hq ? '' : ' here'); tg.textContent = e.hq ? (e.here ? 'HQ + data center' : 'HQ') : 'Data center here'; sub.append(tg); }
      who.append(nm, sub);
      const hq = document.createElement('span'); hq.className = 'hq'; hq.textContent = p.hq; withFlag(hq, p.hq); hq.title = 'Headquarters: ' + p.hq;
      pn.append(who, hq);
      const st = document.createElement('span'); st.className = 'stats';
      const br = best.get(p.provider);
      [['Live', p.op != null ? fMW(p.op) : '—'], ['Planned', p.pl != null ? fMW(p.pl) : '—'], [`${fam}`, br ? `${f$(br.usd)} ${TERM_SHORT[br.basis] || ''}` : '—']].forEach(([l, val]) => {
        const s = document.createElement('span'); const em = document.createElement('em'); em.textContent = l; const sv = document.createElement('strong'); sv.textContent = val; s.append(em, sv); st.append(s);
      });
      const ct = document.createElement('span'); ct.className = 'cities'; ct.textContent = p.cities.length ? 'Data centers: ' + p.cities.slice(0, 4).join(', ') + (p.cities.length > 4 ? ` +${p.cities.length - 4}` : '') : 'No data center cities named';
      b.append(pn, st, ct); return b;
    }));
  }

  /* ---------- explorer: provider / country / city list beside the map ---------- */
  let exAll = false; let exT;
  const exQ = $('#ex-q');
  exQ.addEventListener('input', () => { clearTimeout(exT); exT = setTimeout(() => set({ q: exQ.value.trim() || null }), 220); });
  document.querySelectorAll('#ex-mode button').forEach((b) => b.addEventListener('click', () => { exAll = false; const cur = P().metric || 'providers'; set({ ex: b.dataset.ex, metric: b.dataset.ex === 'cities' ? 'cities' : cur === 'cities' ? 'providers' : cur, pv: b.dataset.ex === 'providers' ? P().pv : null }); }));
  $('#ex-sort').addEventListener('change', (e) => set({ psort: e.target.value }));
  $('#ex-more').addEventListener('click', () => { exAll = !exAll; set({ _redraw: Date.now() }); });
  const showMap = () => { if (phone.matches) { const c = $('#map-card'); const y = c.getBoundingClientRect().top + window.scrollY - 70; if (Math.abs(window.scrollY - y) > 80) window.scrollTo({ top: y, behavior: 'smooth' }); } };
  function exItem({ on, onClick, lead, title, sub, val, valSub, bar, color, label }) {
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'gx-xr' + (on ? ' on' : ''); b.setAttribute('aria-pressed', String(!!on)); if (label) b.setAttribute('aria-label', label);
    b.onclick = onClick;
    const main = document.createElement('span'); main.className = 'm';
    const t = document.createElement('b'); t.textContent = title; main.append(t);
    if (sub) { const s2 = document.createElement('span'); s2.className = 's'; if (typeof sub === 'string') s2.textContent = sub; else s2.append(...sub); main.append(s2); }
    const r = document.createElement('span'); r.className = 'r';
    if (val != null) { const vv = document.createElement('strong'); vv.textContent = val; r.append(vv); }
    if (valSub) { const vs = document.createElement('small'); vs.textContent = valSub; r.append(vs); }
    b.append(lead, main, r);
    if (bar != null) { const br = document.createElement('span'); br.className = 'bar'; const i = document.createElement('i'); i.style.width = Math.max(2, bar * 100) + '%'; if (color) i.style.background = color; br.append(i); b.append(br); }
    li.append(b); return li;
  }
  const flagLead = (country) => { const s = document.createElement('span'); s.className = 'lead fl'; const fl = flag(country); if (fl) s.append(fl); else { s.textContent = String(country || '?').slice(0, 2).toUpperCase(); } return s; };
  function drawExplorer(v, f) {
    MK = MKf();
    const q = P(); const mode = ['providers', 'countries', 'cities'].includes(q.ex) ? q.ex : 'providers'; const fam = focus();
    if (exQ !== document.activeElement) exQ.value = q.q || '';
    document.querySelectorAll('#ex-mode button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.ex === mode)));
    $('#ex-sortlab').hidden = mode !== 'providers'; $('#ex-sort').value = q.psort || 'op';
    // region quick filter
    // region tiles: providers per HQ region (other filters applied), tap to zoom + filter
    const regN = d3.rollup(f.provsLoc.filter((p) => p.region && p.region !== 'Unknown'), (a) => ({ n: a.length, op: d3.sum(a, (p) => p.op || 0) }), (p) => p.region);
    const regs = [...regN.keys()].sort((a, b) => regN.get(b).n - regN.get(a).n);
    const rmax = d3.max(regs, (r) => regN.get(r).n) || 1;
    const RI = { 'North America': 'NA', Europe: 'EU', 'Asia Pacific': 'APAC', 'Middle East': 'ME', 'Latin America': 'LATAM', Africa: 'AF' };
    const rh = document.createElement('div'); rh.className = 'rgh';
    const rt = document.createElement('span'); rt.textContent = 'HQ region';
    const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'rgclr'; clr.textContent = q.region ? `Clear ${q.region}` : 'All regions'; clr.disabled = !q.region; clr.onclick = () => set({ region: null, country: null, city: null });
    rh.append(rt, clr);
    const grid = document.createElement('div'); grid.className = 'rgg';
    regs.forEach((r) => {
      const d = regN.get(r); const on = q.region === r;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'rgt' + (on ? ' on' : ''); b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', `${r}: ${d.n} providers${d.op ? ', ' + fMW(d.op) + ' live' : ''}`);
      const code = document.createElement('span'); code.className = 'rc'; code.textContent = RI[r] || r.slice(0, 2).toUpperCase();
      const nm = document.createElement('span'); nm.className = 'rn'; nm.textContent = r;
      const n = document.createElement('strong'); n.textContent = fInt(d.n);
      const sub = document.createElement('small'); sub.textContent = d.op ? `${fMW(d.op)} live` : 'MW not disclosed';
      const bar = document.createElement('i'); bar.style.setProperty('--w', (100 * d.n / rmax) + '%');
      b.append(code, nm, n, sub, bar);
      b.onclick = () => set({ region: on ? null : r, country: null, city: null });
      grid.append(b);
    });
    $('#ex-regions').replaceChildren(rh, grid);
    // chip finder banner: linked to the Chip / GPU filters at the top
    const chipBox = $('#ex-chip'); const chipC = chipOn();
    const bigFirst = (names) => [...names].sort((a, b) => ((v.byName.get(b) || {}).op || 0) - ((v.byName.get(a) || {}).op || 0) || d3.ascending(a, b));
    const dcBy = new Map(); { const SL = new Set(f.provsLoc.map((p) => p.provider)); v.cities.forEach((r) => { if (!SL.has(r.provider) || (q.region && r.region !== q.region)) return; const e = dcBy.get(r.country) || { provs: new Set(), cities: new Set() }; e.provs.add(r.provider); e.cities.add(r.city); dcBy.set(r.country, e); }); }
    if (chipC) {
      const nCity = d3.sum([...dcBy.values()], (e) => e.cities.size);
      const t = document.createElement('div'); t.className = 'cht';
      const b = document.createElement('b'); b.textContent = chipName(); const lab = document.createElement('span'); lab.textContent = 'Where to rent';
      const x = document.createElement('button'); x.type = 'button'; x.className = 'chx'; x.setAttribute('aria-label', 'Clear chip filter'); x.append(ICON('x')); x.onclick = () => set({ family: null, vendor: null });
      t.append(lab, b, x);
      const st = document.createElement('div'); st.className = 'chs';
      [[f.provsLoc.length, 'providers'], [dcBy.size, 'countries'], [nCity, 'cities']].forEach(([n, l]) => { const d = document.createElement('span'); const st2 = document.createElement('strong'); st2.textContent = fInt(n); d.append(st2, ' ' + l); st.append(d); });
      chipBox.className = 'gx-chipbox on'; chipBox.replaceChildren(t, st);
    } else {
      const famN = new Map(); f.provsLoc.forEach((p) => p.fams.forEach((k) => famN.set(k, (famN.get(k) || 0) + 1)));
      const top = [...famN].filter(([k]) => v.famInfo.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const lab = document.createElement('span'); lab.className = 'chl'; lab.append(ICON('gpu'), ' Where to rent');
      const row = document.createElement('div'); row.className = 'chr';
      top.forEach(([k, n]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = k; b.title = `${n} providers offer ${k}`; b.onclick = () => set({ family: k, ex: q.ex === 'providers' || !q.ex ? 'countries' : q.ex, pv: null }); row.append(b); });
      chipBox.className = 'gx-chipbox'; chipBox.replaceChildren(lab, row);
    }
    // providers in view: headquartered here, or running a data center here
    const list = new Map(f.provs.map((p) => [p.provider, { p, hq: true, here: false }]));
    if (q.country || q.region || q.city) {
      const loc = new Set(f.provsLoc.map((p) => p.provider));
      v.cities.forEach((r) => {
        if (!loc.has(r.provider) || (q.country && r.country !== q.country) || (q.region && r.region !== q.region) || (q.city && r.city !== q.city)) return;
        const e = list.get(r.provider); if (e) e.here = true; else list.set(r.provider, { p: v.byName.get(r.provider), hq: false, here: true });
      });
    }
    const best = new Map(provMin(v.prices, fam).map((r) => [r.provider, r]));
    const agg = countryAgg(f); const cities = cityAgg(v, f);
    const nP = [...list.values()].filter((e) => e.p).length;
    document.querySelector('[data-exn="providers"]').textContent = fInt(nP);
    document.querySelector('[data-exn="countries"]').textContent = fInt(chipC ? dcBy.size : agg.size);
    document.querySelector('[data-exn="cities"]').textContent = fInt(cities.length);
    const where = q.city || q.country || q.region;
    $('#ex-count').textContent = where ? `in ${where}` : '';
    const el = $('#ex-list'); let items = []; let hint = '';
    if (mode === 'providers') {
      const ps = q.psort || 'op';
      let rows = [...list.values()].filter((e) => e.p);
      const key = { op: (e) => -(e.p.op || 0), price: (e) => (best.get(e.p.provider) ? best.get(e.p.provider).usd : 1e9), cities: (e) => -e.p.ncity, name: () => 0 }[ps];
      rows.sort((a, b) => key(a) - key(b) || d3.ascending(a.p.provider, b.p.provider));
      if (q.pv) { const i = rows.findIndex((e) => e.p.provider === q.pv); if (i > 0) rows.unshift(rows.splice(i, 1)[0]); }
      hint = 'Tap a provider to map its HQ and data centers';
      items = rows.map((e) => {
        const p = e.p; const br = best.get(p.provider);
        const fl = flag(p.hq); const hqS = document.createElement('span'); hqS.className = 'hqs'; if (fl) hqS.append(fl); hqS.append(p.hq_city || p.hq); hqS.title = 'HQ: ' + hqPlace(p, true);
        const sub = [hqS, document.createTextNode(` · ${p.ncity ? p.ncity + (p.ncity === 1 ? ' city' : ' cities') : 'no cities named'}`)];
        if (where && !q.city && !e.hq) sub.push(Object.assign(document.createElement('em'), { className: 'here', textContent: 'DC here' }));
        const val = ps === 'price' ? (br ? f$(br.usd) : '—') : ps === 'cities' ? String(p.ncity) : ps === 'name' ? (p.op != null ? fMW(p.op) : '') : p.op != null ? fMW(p.op) : '—';
        const valSub = ps === 'price' ? (br ? `${fam} ${TERM_SHORT[br.basis] || ''}` : fam) : ps === 'cities' ? 'cities' : p.op != null ? 'live' : '';
        const lead = document.createElement('span'); lead.className = 'lead'; lead.append(logo(p.provider, 'lg'));
        return exItem({ on: q.pv === p.provider, lead, title: p.provider, sub, val, valSub, label: `${p.provider}, headquartered in ${hqPlace(p, true)}. Show on map`,
          onClick: () => { set({ pv: q.pv === p.provider ? null : p.provider }); if (q.pv !== p.provider) showMap(); } });
      });
    } else if (mode === 'countries' && chipC) {
      const rows = [...dcBy].map(([c, e]) => ({ c, n: e.provs.size, nc: e.cities.size, e })).sort((a, b) => b.n - a.n || d3.ascending(a.c, b.c));
      const mx = d3.max(rows, (r) => r.n) || 1;
      hint = `Countries with a local ${chipName()} data center · tap to see who`;
      items = rows.map((r) => exItem({ on: q.country === r.c, lead: flagLead(r.c), title: r.c,
        sub: `${r.nc} ${r.nc === 1 ? 'city' : 'cities'} · ${trunc(bigFirst(r.e.provs).slice(0, 3).join(', ') + (r.n > 3 ? ` +${r.n - 3}` : ''), 60)}`,
        val: fInt(r.n), valSub: r.n === 1 ? 'provider' : 'providers', bar: r.n / mx, color: 'var(--gx-pv6)',
        onClick: () => set({ country: q.country === r.c ? null : r.c, city: null, ex: q.country === r.c ? 'countries' : 'cities' }) }));
    } else if (mode === 'countries') {
      const m = q.metric || 'providers'; const mm = m === 'cities' ? 'providers' : m;
      let rows = [...agg].map(([c, a]) => ({ c, a }));
      const val = (r) => (mm === 'price' ? r.a.med : metricOf(r.a, mm));
      rows = rows.filter((r) => val(r) != null && val(r) > 0);
      rows.sort((x, y) => (mm === 'price' ? val(x) - val(y) : val(y) - val(x)) || d3.ascending(x.c, y.c));
      const mx = d3.max(rows, val) || 1;
      const dcBy = d3.rollup(cities, (a) => a.length, (c) => c.country);
      hint = { providers: 'HQ countries by number of providers', op: 'HQ countries by live power', pl: 'HQ countries by planned power', price: `HQ countries by median ${fam} price` }[mm] + ' · tap to filter';
      items = rows.map((r) => exItem({ on: q.country === r.c, lead: flagLead(r.c), title: r.c,
        sub: `${fInt(r.a.n)} provider${r.a.n === 1 ? '' : 's'}${dcBy.get(r.c) ? ` · ${dcBy.get(r.c)} DC cities` : ''}`,
        val: mm === 'price' ? f$(r.a.med) : mm === 'providers' ? fInt(r.a.n) : fMW(val(r)), valSub: mm === 'price' ? 'median' : mm === 'providers' ? 'HQ' : mm === 'op' ? 'live' : 'planned',
        bar: mm === 'price' ? null : val(r) / mx, color: MK[mm],
        onClick: () => set({ country: q.country === r.c ? null : r.c, city: null }) }));
    } else {
      const rows = cities.slice().sort((a, b) => b.n - a.n || d3.ascending(a.city, b.city));
      const mx = d3.max(rows, (c) => c.n) || 1;
      hint = 'Cities by providers with a data center there · tap to filter';
      if (chipC) hint = `Cities with a ${chipName()} data center · tap to see who`;
      items = rows.map((c) => exItem({ on: q.city === c.city, lead: flagLead(c.country), title: c.city, sub: `${c.country} · ${trunc(bigFirst(c.provs).slice(0, 3).join(', ') + (c.n > 3 ? ` +${c.n - 3}` : ''), 60)}`,
        val: fInt(c.n), valSub: c.n === 1 ? 'provider' : 'providers', bar: c.n / mx, color: 'var(--gx-city)',
        onClick: () => set({ city: q.city === c.city ? null : c.city, pv: null, ex: q.city === c.city ? 'cities' : 'providers' }) }));
    }
    $('#ex-hint').textContent = hint;
    const LIM = 60; const more = $('#ex-more'); more.hidden = items.length <= LIM; more.textContent = exAll ? 'Show fewer' : `Show all ${fInt(items.length)}`;
    if (!items.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Nothing matches these filters. Try clearing the search or picking All regions.'; el.replaceChildren(li); return; }
    el.replaceChildren(...(exAll ? items : items.slice(0, LIM)));
  }
  function drawFocus(v) {
    const el = $('#ex-focus'); const q = P(); const p = q.pv ? v.byName.get(q.pv) : null;
    if (!p) { el.hidden = true; el.replaceChildren(); return; }
    el.hidden = false;
    const fam = focus(); const br = provMin(v.prices.filter((r) => r.provider === p.provider), fam)[0];
    const head = document.createElement('div'); head.className = 'fh';
    const nm = document.createElement('div'); nm.className = 'fn'; const t = document.createElement('b'); t.textContent = p.provider; withLogo(t, p.provider, 'lg');
    const sub = document.createElement('span'); sub.className = 'fs'; const hq = document.createElement('span'); hq.className = 'hqs'; hq.append('HQ '); const fl = flag(p.hq); if (fl) hq.append(fl); hq.append(hqPlace(p, true)); sub.append(hq, ` · ${p.category}`);
    nm.append(t, sub);
    const acts = document.createElement('div'); acts.className = 'fa';
    const prof = document.createElement('button'); prof.type = 'button'; prof.className = 'gx-btn gx-pri'; prof.textContent = 'Full profile'; prof.onclick = () => openProfile(p.provider);
    const cl = document.createElement('button'); cl.type = 'button'; cl.className = 'gx-ibtn gx-fx'; cl.setAttribute('aria-label', 'Clear provider from map'); cl.append(ICON('x')); cl.onclick = () => set({ pv: null });
    acts.append(prof, cl); head.append(nm, acts);
    const stats = document.createElement('div'); stats.className = 'fst';
    [['Live power', p.op != null ? fMW(p.op) : '—'], ['Planned', p.pl != null ? fMW(p.pl) : '—'], [`${fam} from`, br ? `${f$(br.usd)}/hr` : '—'], ['GPU models', p.nm != null ? String(p.nm) : '—']].forEach(([l, x]) => { const d = document.createElement('div'); const e = document.createElement('em'); e.textContent = l; const s2 = document.createElement('strong'); s2.textContent = x; d.append(e, s2); stats.append(d); });
    const cw = document.createElement('div'); cw.className = 'fc';
    const rows = v.cities.filter((r) => r.provider === p.provider);
    if (rows.length) {
      const byC = d3.groups(rows, (r) => r.country).sort((a, b) => b[1].length - a[1].length);
      const lab = document.createElement('span'); lab.className = 'fcl'; const nC = new Set(rows.map((r) => r.city)).size; lab.append(ICON('pin'), ` ${nC} data center ${nC === 1 ? 'city' : 'cities'}`); cw.append(lab);
      byC.forEach(([c, a]) => { const g = document.createElement('span'); g.className = 'fcg'; const f2 = flag(c); if (f2) g.append(f2); const cs = [...new Set(a.map((r) => r.city))]; g.append(cs.join(', ')); g.title = c; cw.append(g); });
    } else {
      const lab = document.createElement('span'); lab.className = 'fcl'; lab.append(ICON('pin'), ' No specific cities named'); cw.append(lab);
      if (p.locations) { const g = document.createElement('span'); g.className = 'fcg muted'; g.textContent = trunc(String(p.locations), 220); cw.append(g); }
    }
    el.replaceChildren(head, stats, cw);
  }

  /* ---------- pricing ---------- */
  /* ---------- pricing CSV export ---------- */
  // rows = every published offer that matches the filters (chip / GPU narrow to that hardware)
  function priceRows(v, f) {
    const q = P(); const F = famSel();
    return f.prices.filter((r) => r.usd != null && (!F || r.family === F) && (!q.vendor || r.vendor === q.vendor))
      .sort((a, b) => d3.ascending(a.family, b.family) || a.usd - b.usd || d3.ascending(a.provider, b.provider));
  }
  const csvCell = (x) => { const t = x == null ? '' : String(x); return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  function priceCSV(v, rows) {
    const head = ['provider', 'hq_country', 'hq_city', 'hq_region', 'business_model', 'gpu', 'chip_maker', 'architecture', 'model_as_listed', 'pricing_terms', 'usd_per_gpu_hour', 'price_as_published', 'website'];
    const lines = rows.map((r) => { const p = r.p || {}; const fi = v.famInfo.get(r.family) || {};
      return [r.provider, p.hq || r.hq, p.hq_city, p.region || r.region, p.category, r.family, r.vendor || fi.vendor, r.arch || fi.arch, r.model, r.basis, r.usd != null ? r.usd.toFixed(3) : '', r.price_text, p.website].map(csvCell).join(','); });
    return '\ufeff' + [head.join(',')].concat(lines).join('\r\n') + '\r\n';
  }
  async function saveFile(filename, text) {
    // inside claude.ai: the platform's download prompt; on the website: a normal browser download
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        const dl = await window.claude.use('downloads');
        if (dl) { await dl.save({ filename, data: text }); return true; }
      }
    } catch (e) { if (e && (e.code === 'declined' || e.code === 'rate_limited')) return false; }
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.rel = 'noopener'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); return true;
  }
  let dlRows = [];
  function drawDl(v, f) {
    dlRows = priceRows(v, f);
    const np = new Set(dlRows.map((r) => r.provider)).size; const F = famSel(); const q = P();
    const scope = F || q.vendor || 'all GPUs';
    const nt = $('#dl-note'); nt.replaceChildren();
    const b1 = document.createElement('b'); b1.textContent = fInt(dlRows.length); const b2 = document.createElement('b'); b2.textContent = fInt(np);
    nt.append(b1, ` published prices from `, b2, ` providers · ${scope}${q.region ? ' · ' + q.region : ''}${q.country ? ' · ' + q.country : ''}`);
    $('#dl-csv').disabled = !dlRows.length;
  }
  $('#dl-csv').addEventListener('click', async () => {
    const v = cache.v; if (!v || !dlRows.length) return;
    const q = P(); const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const parts = ['gpu-prices', famSel() || q.vendor, q.region, q.country, q.category].filter(Boolean).map(slug);
    const name = parts.join('_') + '_' + new Date().toISOString().slice(0, 10) + '.csv';
    const btn = $('#dl-csv'); const lab = btn.querySelector('span');
    const ok = await saveFile(name, priceCSV(v, dlRows));
    if (ok) { btn.classList.add('done'); lab.textContent = 'Downloaded'; setTimeout(() => { btn.classList.remove('done'); lab.textContent = 'Download CSV'; }, 1800); }
  });
  function drawStrip(v, f) {
    const el = $('#strip'); const fam = focus();
    let groups = d3.groups(f.pricesAny.filter((r) => r.usd != null && v.famInfo.has(r.family) && (!P().vendor || v.famInfo.get(r.family).vendor === P().vendor)), (r) => r.family)
      .filter(([k, a]) => a.length >= 3 || k === fam || ((v.famInfo.get(k) || {}).segment === 'Frontier training' && a.length >= 2))
      .map(([k, a]) => { const s = a.map((r) => r.usd).sort(d3.ascending); return { k, a, n: a.length, q1: d3.quantileSorted(s, 0.25), med: d3.quantileSorted(s, 0.5), q3: d3.quantileSorted(s, 0.75) }; })
      .sort((a, b) => b.n - a.n)
      // top 22 by offers, plus every flagship (frontier-training) GPU with at least 2 offers, e.g. GB200 / GB300
      .filter((g, i) => i < 22 || g.k === fam || ((v.famInfo.get(g.k) || {}).segment === 'Frontier training' && g.n >= 2))
      .sort((a, b) => b.med - a.med);
    if (!groups.length) { emptyNote(el, 'No priced offers match these filters.'); return; }
    const W = Math.max(300, el.clientWidth || 600); const NR = W < 560; const rowH = NR ? 46 : 26, m = { t: 26, r: NR ? 8 : 60, b: 6 }; const cy = NR ? 32 : rowH / 2;
    const H = m.t + m.b + groups.length * rowH;
    const svg = svgFor(el, W, H, 'Price range by GPU model');
    const maxCh = NR ? 28 : 26; const short = (t) => (t.length > maxCh ? t.slice(0, maxCh - 1) + '…' : t);
    // label = GPU name + a pill with how many providers publish a price for it
    groups.forEach((g) => { g.np = new Set(g.a.map((r) => r.provider)).size; g.lab = short(g.k); g.pill = String(g.np); });
    const nameW = new Map(groups.map((g) => [g.k, measure(svg, [g.lab], 'strong')]));
    const pillW = new Map(groups.map((g) => [g.k, measure(svg, [g.pill], 'gx-pilltx') + 16]));
    const lw = NR ? 8 : Math.min(W * 0.4, d3.max(groups, (g) => nameW.get(g.k) + pillW.get(g.k)) + 22);
    const all = groups.flatMap((g) => g.a.map((r) => r.usd));
    const x = d3.scaleLog([Math.max(0.01, d3.min(all) * 0.85), d3.max(all) * 1.15], [lw, W - m.r]);
    const ticks = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50].filter((t) => t >= x.domain()[0] && t <= x.domain()[1]);
    const usable = W - m.r - lw; const tk = NR ? ticks.filter((t) => [0.1, 0.5, 2, 10, 50].includes(t)) : usable < 260 ? ticks.filter((t, i) => i % 2 === 0) : ticks;
    const ax = svg.append('g');
    ax.selectAll('line').data(tk).join('line').attr('x1', x).attr('x2', x).attr('y1', m.t - 6).attr('y2', H - m.b).attr('stroke', 'var(--cds-chart-grid)');
    ax.selectAll('text').data(tk).join('text').attr('x', x).attr('y', m.t - 12).attr('text-anchor', 'middle').attr('class', 'mono').text((t) => '$' + t);
    const g = svg.selectAll('g.row').data(groups).join('g').attr('class', 'row').attr('transform', (d, i) => `translate(0,${m.t + i * rowH})`);
    g.append('rect').attr('x', 0).attr('width', W).attr('height', rowH).attr('fill', (d) => (d.k === fam ? 'var(--color-bg)' : 'transparent')).attr('rx', 4);
    const ly = NR ? 13 : rowH / 2;
    // desktop: [name][pill] right-aligned to the label column; phone: name then pill from the left
    const pillX = (d) => (NR ? 8 + nameW.get(d.k) + 8 : lw - 10 - pillW.get(d.k));
    g.append('text').attr('x', (d) => (NR ? 8 : pillX(d) - 7)).attr('y', ly).attr('dy', '0.35em').attr('text-anchor', NR ? 'start' : 'end')
      .attr('class', 'strong').style('cursor', 'pointer').text((d) => d.lab)
      .on('click', (e, d) => set({ family: d.k }));
    const pg = g.append('g').attr('class', (d) => 'gx-npill' + (d.k === fam ? ' on' : '')).attr('transform', (d) => `translate(${pillX(d)},${ly - 9})`)
      .style('cursor', 'pointer').on('click', (e, d) => set({ family: d.k }))
      .on('mousemove', (e, d) => tipShow(e, d.k, [['Providers with a published price', String(d.np)], ['Price points', String(d.n)], ['Median', `${f$(d.med)}/GPU-hr`]])).on('mouseleave', tipHide);
    pg.append('rect').attr('width', (d) => pillW.get(d.k)).attr('height', 18).attr('rx', 9);
    pg.append('text').attr('class', 'gx-pilltx').attr('x', (d) => pillW.get(d.k) / 2).attr('y', 9).attr('dy', '0.35em').attr('text-anchor', 'middle').text((d) => d.pill);
    g.append('rect').attr('x', (d) => x(d.q1)).attr('width', (d) => Math.max(2, x(d.q3) - x(d.q1))).attr('y', cy - 6).attr('height', 12).attr('rx', 4)
      .attr('fill', (d) => (d.k === fam ? C(0) : MUTED)).attr('fill-opacity', 0.28);
    g.each(function (d) {
      d3.select(this).selectAll('circle').data(d.a).join('circle')
        .attr('cx', (r) => x(r.usd)).attr('cy', (r, i) => cy + (((i * 7919) % 13) / 13 - 0.5) * (NR ? 14 : rowH * 0.55)).attr('r', NR ? 2.2 : 2.6)
        .attr('fill', d.k === fam ? C(0) : MUTED).attr('fill-opacity', d.k === fam ? 0.75 : 0.55)
        .on('mousemove', (e, r) => tipShow(e, `${r.provider} · ${r.p ? r.p.hq : r.hq}`, [[trunc(String(r.model), 60), ''], ['Lowest rate', `${f$(r.usd)}/GPU-hr`], ['Pricing', r.basis || '—'], ['As published', trunc(String(r.price_text), 140)]]))
        .on('mouseleave', tipHide);
    });
    g.append('line').attr('x1', (d) => x(d.med)).attr('x2', (d) => x(d.med)).attr('y1', cy - 8).attr('y2', cy + 8).attr('stroke', 'var(--color-fg)').attr('stroke-width', 2.5).attr('stroke-linecap', 'round');
    g.append('text').attr('x', NR ? W - 8 : W - m.r + 8).attr('y', NR ? 13 : rowH / 2).attr('dy', '0.35em').attr('text-anchor', NR ? 'end' : null).attr('class', 'strong').text((d) => (NR ? 'median ' : '') + f$(d.med));
    if (NR) g.filter((d, i) => i < groups.length - 1).append('line').attr('x1', 8).attr('x2', W - 8).attr('y1', rowH - 0.5).attr('y2', rowH - 0.5).attr('stroke', 'var(--cds-chart-grid)');
    el.classList.add('drawn');
  }
  function drawCheap(f) {
    const fam = focus(); $('#cheap-title').textContent = fam === ANY_GPU ? 'Cheapest offers, any GPU' : `Cheapest ${fam} offers`;
    const rows = provMin(f.prices, fam).sort((a, b) => a.usd - b.usd).slice(0, 20);
    const tb = $('#cheap tbody');
    if (!rows.length) { const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 4; td.textContent = `No published ${fam} prices for these filters.`; tr.append(td); tb.replaceChildren(tr); return; }
    tb.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = String(r.row); tr.dataset.prov = r.provider;
      const cells = [[r.provider, ''], [r.p ? r.p.hq : r.hq, 'hide-narrow'], [fam === ANY_GPU ? `${r.family} · ${TERM_SHORT[r.basis] || 'PAYG'}` : r.basis || '—', 'terms'], [f$(r.usd), 'n']];
      tr.title = String(r.price_text);
      cells.forEach(([t, c], i) => { const td = document.createElement('td'); td.textContent = t; if (c) td.className = c; if (i === 1) withFlag(td, t); if (i === 0) withLogo(td, t, 'sm'); tr.append(td); });
      return tr;
    }));
  }
  function drawPGroup(f) {
    const el = $('#pgroup'); const fam = focus(); const k = P().pgroup || 'region';
    $('#pg-title').textContent = `Median ${fam} rate by group`;
    const mins = provMin(f.prices, fam);
    const lab = (val) => (k === 'ownership' ? (OWN.find((o) => o[0] === val) || [0, val])[1] : val);
    const rows = d3.groups(mins, (r) => r.p[k]).filter(([g, a]) => a.length >= 2 && g)
      .map(([g, a]) => ({ g, med: d3.median(a, (r) => r.usd), n: a.length, lo: d3.min(a, (r) => r.usd) }))
      .sort((a, b) => a.med - b.med);
    if (!rows.length) { emptyNote(el, `Not enough ${fam} prices to compare groups.`); return; }
    hbars(el, rows.map((r) => ({
      label: lab(r.g), value: r.med, text: `${f$(r.med)} · n=${r.n}`, color: k === 'ownership' ? ownColor(r.g) : C(0),
      tipTitle: lab(r.g), tipLines: [['Median', `${f$(r.med)}/GPU-hr`], ['Cheapest', f$(r.lo)], ['Providers', String(r.n)]],
      onClick: () => set({ [k]: P()[k] === r.g ? null : r.g }), on: P()[k] === r.g,
    })), { label: `Median ${fam} price by ${k}`, rowH: 28 });
  }

  /* ---------- capacity ---------- */
  function drawMW(f) {
    const el = $('#mw');
    legend($('#mw-legend'), [['Operational (live)', C(1)], ['Planned / contracted', C(2), true]]);
    const rows = f.provs.filter((p) => p.op != null || p.pl != null).sort((a, b) => Math.max(b.op || 0, b.pl || 0) - Math.max(a.op || 0, a.pl || 0)).slice(0, 18);
    if (!rows.length) { emptyNote(el, 'No provider in this selection discloses MW capacity.'); return; }
    const W = Math.max(300, el.clientWidth || 600); const NR = W < 560; const rowH = NR ? 46 : 26, m = { t: 24, r: 8, b: 6 }; const cy = NR ? 32 : rowH / 2;
    const H = m.t + m.b + rows.length * rowH;
    const svg = svgFor(el, W, H, 'Operational versus planned capacity by provider');
    const names = rows.map((p) => trunc(String(p.provider), NR ? 30 : 26));
    const lw = NR ? 10 : Math.min(W * 0.36, measure(svg, names) + 12);
    const vals = rows.flatMap((p) => [p.op, p.pl]).filter((x) => x != null && x > 0);
    const txt = (p) => (p.op != null && p.pl != null ? `${fMW(p.op)} → ${fMW(p.pl)}` : p.op != null ? `${fMW(p.op)} live` : `${fMW(p.pl)} planned`);
    const vw = NR ? 6 : measure(svg, rows.map(txt)) + 10;
    const x = d3.scaleLog([Math.max(0.5, d3.min(vals) * 0.7), d3.max(vals) * 1.25], [lw, W - m.r - vw]);
    const ticks = [1, 10, 100, 1000, 10000, 100000].filter((t) => t >= x.domain()[0] && t <= x.domain()[1]);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', x).attr('x2', x).attr('y1', m.t - 6).attr('y2', H - m.b).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(NR ? ticks.filter((t, i) => i % 2 === 0) : ticks).join('text').attr('x', x).attr('y', m.t - 12).attr('text-anchor', 'middle').attr('class', 'mono').text((t) => fMW(t));
    const g = svg.selectAll('g.row').data(rows).join('g').attr('class', 'row').attr('transform', (d, i) => `translate(0,${m.t + i * rowH})`).style('cursor', 'pointer')
      .on('click', (e, p) => openProfile(p.provider))
      .on('mousemove', (e, p) => tipShow(e, `${p.provider} · ${p.hq}`, [['Live', p.op_mw_text ? trunc(String(p.op_mw_text), 150) : 'not disclosed', C(1)], ['Planned', p.planned_mw_text ? trunc(String(p.planned_mw_text), 150) : 'not disclosed', C(2)]]))
      .on('mouseleave', tipHide);
    g.append('rect').attr('width', W).attr('height', rowH).attr('fill', 'transparent');
    g.append('text').attr('x', NR ? 10 : lw - 10).attr('y', NR ? 13 : rowH / 2).attr('dy', '0.35em').attr('text-anchor', NR ? 'start' : 'end').attr('class', 'strong').text((p, i) => names[i]);
    if (NR) g.filter((p, i) => i < rows.length - 1).append('line').attr('x1', 10).attr('x2', W - 8).attr('y1', rowH - 0.5).attr('y2', rowH - 0.5).attr('stroke', 'var(--cds-chart-grid)');
    g.filter((p) => p.op != null && p.pl != null).append('line').attr('x1', (p) => x(Math.max(p.op, x.domain()[0]))).attr('x2', (p) => x(Math.max(p.pl, x.domain()[0]))).attr('y1', cy).attr('y2', cy).attr('stroke', MUTED).attr('stroke-width', 2).attr('stroke-linecap', 'round');
    g.filter((p) => p.pl != null && p.pl > 0).append('circle').attr('cx', (p) => x(p.pl)).attr('cy', cy).attr('r', 5).attr('fill', 'var(--color-panel)').attr('stroke', C(2)).attr('stroke-width', 2.2);
    g.filter((p) => p.op != null && p.op > 0).append('circle').attr('cx', (p) => x(p.op)).attr('cy', cy).attr('r', 5).attr('fill', C(1));
    g.append('text').attr('x', (p) => (NR ? W - 8 : x(Math.max(p.op || 0, p.pl || 0, x.domain()[0])) + 10)).attr('y', NR ? 13 : rowH / 2).attr('dy', '0.35em').attr('text-anchor', NR ? 'end' : null).text(txt);
    el.classList.add('drawn');
  }
  function drawOwn(f) {
    const el = $('#own');
    legend($('#own-legend'), OWN.map((o) => [o[1], ownColor(o[0])]));
    const cats = d3.groups(f.provs, (p) => p.category).map(([c, a]) => ({ c, a, n: a.length })).sort((a, b) => b.n - a.n);
    if (!cats.length) { emptyNote(el, 'No providers match these filters.'); return; }
    const W = Math.max(280, el.clientWidth || 400), rowH = 28, m = { t: 4, r: 8, b: 4 };
    const H = m.t + m.b + cats.length * rowH;
    const svg = svgFor(el, W, H, 'Providers by business model and data center ownership');
    const lw = Math.min(W * 0.45, measure(svg, cats.map((c) => c.c)) + 12);
    const vw = measure(svg, cats.map((c) => fInt(c.n))) + 10;
    const x = d3.scaleLinear([0, d3.max(cats, (c) => c.n)], [0, W - lw - m.r - vw]);
    const q = P();
    const g = svg.selectAll('g.row').data(cats).join('g').attr('transform', (d, i) => `translate(0,${m.t + i * rowH})`);
    g.append('text').attr('x', lw - 10).attr('y', rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('class', (d) => (q.category === d.c ? 'strong' : null)).text((d) => d.c);
    g.each(function (d) {
      let acc = 0;
      const segs = OWN.map((o) => { const n = d.a.filter((p) => p.ownership === o[0]).length; const s = { o, n, x0: acc }; acc += n; return s; }).filter((s) => s.n);
      d3.select(this).selectAll('rect').data(segs).join('rect')
        .attr('x', (s) => lw + x(s.x0) + (s.x0 ? 1 : 0)).attr('width', (s) => Math.max(1, x(s.n) - (s.x0 ? 1 : 0))).attr('y', rowH * 0.18).attr('height', rowH * 0.64)
        .attr('fill', (s) => ownColor(s.o[0])).attr('rx', 3).style('cursor', 'pointer')
        .on('mousemove', (e, s) => tipShow(e, d.c, [[s.o[1], `${s.n} of ${d.n} (${fPct(s.n / d.n)})`, ownColor(s.o[0])]]))
        .on('mouseleave', tipHide)
        .on('click', (e, s) => set({ category: d.c, ownership: s.o[0] }));
    });
    g.append('text').attr('x', (d) => lw + x(d.n) + 6).attr('y', rowH / 2).attr('dy', '0.35em').attr('class', 'strong').text((d) => fInt(d.n));
  }
  function drawMWC(f) {
    const el = $('#mwc');
    const rows = d3.groups(f.provs.filter((p) => p.hq !== 'Unknown' && (p.op != null || p.pl != null)), (p) => p.hq)
      .map(([c, a]) => ({ c, op: d3.sum(a, (p) => p.op || 0), pl: d3.sum(a, (p) => p.pl || 0), n: a.length }))
      .sort((a, b) => b.op + b.pl - (a.op + a.pl)).slice(0, 10);
    if (!rows.length) { emptyNote(el, 'No disclosed capacity in this selection.'); return; }
    const W = Math.max(280, el.clientWidth || 400), rowH = 34, m = { t: 4, r: 8, b: 4 };
    const H = m.t + m.b + rows.length * rowH;
    const svg = svgFor(el, W, H, 'Disclosed capacity by HQ country');
    const lw = Math.min(W * 0.4, measure(svg, rows.map((r) => r.c)) + 12);
    const vw = measure(svg, rows.flatMap((r) => [fMW(r.op), fMW(r.pl)])) + 10;
    const x = d3.scaleLinear([0, d3.max(rows, (r) => Math.max(r.op, r.pl)) || 1], [0, W - lw - m.r - vw]);
    const g = svg.selectAll('g.row').data(rows).join('g').attr('transform', (d, i) => `translate(0,${m.t + i * rowH})`).style('cursor', 'pointer')
      .on('click', (e, d) => set({ country: P().country === d.c ? null : d.c }))
      .on('mousemove', (e, d) => tipShow(e, d.c, [['Operational', fMW(d.op), C(1)], ['Planned', fMW(d.pl), C(2)], ['Providers disclosing', String(d.n)]]))
      .on('mouseleave', tipHide);
    g.append('rect').attr('width', W).attr('height', rowH).attr('fill', 'transparent');
    g.append('text').attr('x', lw - 10).attr('y', rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('class', 'strong').text((d) => d.c);
    [['op', C(1), 5], ['pl', C(2), 18]].forEach(([k, col, y]) => {
      g.append('rect').attr('x', lw).attr('y', y).attr('height', 11).attr('rx', 3).attr('width', (d) => Math.max(d[k] ? 2 : 0, x(d[k]))).attr('fill', col).attr('fill-opacity', k === 'pl' ? 0.55 : 1);
      g.append('text').attr('x', (d) => lw + x(d[k]) + 6).attr('y', y + 5.5).attr('dy', '0.35em').text((d) => (d[k] ? fMW(d[k]) : '—'));
    });
  }

  /* ---------- hardware ---------- */
  function drawAvail(v, f) {
    f = { ...f, provs: f.provsAny }; // GPU mix compares models, so the GPU model filter is not applied
    const el = $('#avail'); const fam = focus();
    const cnt = new Map(); f.provs.forEach((p) => p.fams.forEach((x) => cnt.set(x, (cnt.get(x) || 0) + 1)));
    const rows = [...cnt].filter(([k]) => v.famInfo.has(k) && (!P().vendor || v.famInfo.get(k).vendor === P().vendor)).sort((a, b) => b[1] - a[1]).slice(0, 18);
    const vs = [...new Set(rows.map(([k]) => v.famInfo.get(k).vendor))].sort((a, b) => VENDORS.indexOf(a) - VENDORS.indexOf(b));
    legend($('#avail-legend'), vs.map((x) => [x, vColor(x)]));
    if (!rows.length) { emptyNote(el, 'No GPU models listed in this selection.'); return; }
    const n = f.provs.length;
    hbars(el, rows.map(([k, c]) => ({
      label: k, value: c, text: `${fInt(c)} · ${fPct(c / n)}`, color: vColor(v.famInfo.get(k).vendor), on: k === fam,
      tipTitle: `${k} · ${v.famInfo.get(k).vendor} ${v.famInfo.get(k).arch}`, tipLines: [['Providers offering', `${c} of ${n}`], ['Segment', v.famInfo.get(k).segment]],
      onClick: () => set({ family: k }),
    })), { label: 'Providers offering each GPU', rowH: 22 });
  }
  function drawGen(v, f) {
    f = { ...f, provs: f.provsAny }; // GPU mix compares models, so the GPU model filter is not applied
    const el = $('#gen');
    const newest = (p) => { let best = null; p.fams.forEach((k) => { const i = v.famInfo.get(k); if (i && (!best || i.year > best.year)) best = i; }); return best; };
    const g = d3.rollup(f.provs, (a) => a.length, (p) => { const b = newest(p); return b ? `${b.arch}|${b.vendor}` : 'Not specified|'; });
    const yr = new Map(); v.famInfo.forEach((i) => { const k = `${i.arch}|${i.vendor}`; yr.set(k, Math.max(yr.get(k) || 0, i.year || 0)); });
    const rows = [...g].map(([k, c]) => { const [arch, vendor] = k.split('|'); return { arch, vendor, year: yr.get(k) || 0, c }; }).sort((a, b) => b.year - a.year || b.c - a.c);
    if (!rows.length) { emptyNote(el, 'No providers match these filters.'); return; }
    hbars(el, rows.map((r) => ({
      label: r.vendor ? `${r.arch} (${r.vendor})` : r.arch, value: r.c, text: fInt(r.c), color: r.vendor ? vColor(r.vendor) : MUTED,
      tipTitle: r.arch, tipLines: [['Providers whose newest GPU is this generation', String(r.c)]],
    })), { label: 'Providers by newest GPU generation', rowH: 22 });
  }
  function drawHeat(v, f) {
    f = { ...f, provs: f.provsAny }; // GPU mix compares models, so the GPU model filter is not applied
    const el = $('#heat'); const fam = focus();
    const regs = d3.groups(f.provs.filter((p) => p.region !== 'Unknown'), (p) => p.region).map(([r, a]) => ({ r, a, n: a.length })).sort((a, b) => b.n - a.n);
    const cnt = new Map(); f.provs.forEach((p) => p.fams.forEach((x) => cnt.set(x, (cnt.get(x) || 0) + 1)));
    const cols = [...cnt].filter(([k]) => v.famInfo.has(k) && (!P().vendor || v.famInfo.get(k).vendor === P().vendor)).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k]) => k);
    if (!regs.length || !cols.length) { emptyNote(el, 'Not enough data for a regional mix.'); return; }
    const W = Math.max(300, el.clientWidth || 600), ch = 30;
    if (W < 560) {
      const RC = { 'North America': 'NA', Europe: 'EU', 'Asia Pacific': 'APAC', 'Middle East': 'ME', 'Latin America': 'LATAM', Africa: 'AF' };
      const rh = 30, top = 34, lw2 = 104; const cw2 = (W - lw2 - 2) / regs.length;
      const svg = svgFor(el, W, top + cols.length * rh + 4, 'Share of providers in each region offering each GPU');
      svg.append('g').selectAll('text').data(regs).join('text').attr('x', (d, i) => lw2 + i * cw2 + cw2 / 2).attr('y', 12).attr('text-anchor', 'middle').attr('class', 'strong').style('font-size', '10.5px').text((d) => RC[d.r] || d.r.slice(0, 4));
      svg.append('g').selectAll('text').data(regs).join('text').attr('x', (d, i) => lw2 + i * cw2 + cw2 / 2).attr('y', 26).attr('text-anchor', 'middle').attr('class', 'mono').style('font-size', '10px').text((d) => d.n);
      const rg = svg.selectAll('g.r').data(cols).join('g').attr('transform', (k, i) => `translate(0,${top + i * rh})`).style('cursor', 'pointer').on('click', (e, k) => set({ family: k }));
      rg.append('text').attr('x', 2).attr('y', rh / 2).attr('dy', '0.35em').attr('class', (k) => (k === fam ? 'strong' : null)).text((k) => trunc(k, 15));
      rg.each(function (k) {
        const cells = regs.map((d) => { const c = d.a.filter((p) => p.fams.includes(k)).length; return { c, s: c / d.n }; });
        const cg = d3.select(this).selectAll('g').data(cells).join('g').attr('transform', (c, i) => `translate(${lw2 + i * cw2},0)`);
        cg.append('rect').attr('x', 1.5).attr('y', 1.5).attr('width', cw2 - 3).attr('height', rh - 3).attr('rx', 5).attr('fill', 'var(--color-border-line)').attr('fill-opacity', 0.35);
        cg.append('rect').attr('x', 1.5).attr('y', 1.5).attr('width', cw2 - 3).attr('height', rh - 3).attr('rx', 5).attr('fill', C(0)).attr('fill-opacity', (c) => (c.c ? 0.08 + 0.85 * c.s : 0));
        cg.append('text').attr('x', cw2 / 2).attr('y', rh / 2).attr('dy', '0.35em').attr('text-anchor', 'middle').style('font-size', '10.5px')
          .style('fill', (c) => (c.s > 0.5 ? 'var(--color-bg)' : 'var(--color-fg-muted)')).text((c) => (c.c ? Math.round(c.s * 100) + '%' : ''));
      });
      return;
    }
    const svgTmp = svgFor(el, W, 100, 'Regional GPU mix');
    const lw = measure(svgTmp, regs.map((r) => `${r.r} · ${r.n}`)) + 14;
    const cw = (W - lw - 4) / cols.length;
    const rot = cw < 64;
    const top = rot ? measure(svgTmp, cols) * 0.72 + 12 : 22;
    const H = top + regs.length * ch + 4;
    const svg = svgFor(el, W, H, 'Share of providers in each region offering each GPU');
    svg.append('g').selectAll('text').data(cols).join('text')
      .attr('transform', (d, i) => `translate(${lw + i * cw + cw / 2},${top - 8})${rot ? ' rotate(-40)' : ''}`)
      .attr('text-anchor', rot ? 'start' : 'middle').attr('class', (d) => (d === fam ? 'strong' : null)).style('cursor', 'pointer').text((d) => d)
      .on('click', (e, d) => set({ family: d }));
    const rowsG = svg.selectAll('g.r').data(regs).join('g').attr('transform', (d, i) => `translate(0,${top + i * ch})`);
    rowsG.append('text').attr('x', lw - 10).attr('y', ch / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('class', 'strong').text((d) => `${d.r} · ${d.n}`);
    rowsG.each(function (d) {
      const cells = cols.map((k) => { const c = d.a.filter((p) => p.fams.includes(k)).length; return { k, c, s: c / d.n }; });
      const cg = d3.select(this).selectAll('g').data(cells).join('g').attr('transform', (c, i) => `translate(${lw + i * cw},0)`)
        .on('mousemove', (e, c) => tipShow(e, `${d.r} · ${c.k}`, [['Providers offering', `${c.c} of ${d.n} (${fPct(c.s)})`]]))
        .on('mouseleave', tipHide);
      cg.append('rect').attr('x', 1).attr('y', 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3).attr('fill', 'var(--color-border-line)').attr('fill-opacity', 0.35);
      cg.append('rect').attr('x', 1).attr('y', 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3).attr('fill', C(0)).attr('fill-opacity', (c) => (c.c ? 0.08 + 0.85 * c.s : 0));
      if (cw >= 30) cg.append('text').attr('x', cw / 2).attr('y', ch / 2).attr('dy', '0.35em').attr('text-anchor', 'middle')
        .style('fill', (c) => (c.s > 0.5 ? 'var(--color-bg)' : 'var(--color-fg-muted)')).text((c) => (c.c ? fPct(c.s) : ''));
    });
  }

  /* ---------- directory + detail ---------- */
  function drawDir(f) {
    const q = P(); const k = q.sort || 'op_mw'; const dir = q.dir || 'desc';
    const numK = { models_count: 'nm', h100_usd: 'h100', op_mw: 'op', planned_mw: 'pl', dc_cities: 'ncity' };
    const val = (p) => (numK[k] ? p[numK[k]] : String(p[k] || '').toLowerCase());
    const rows = f.provs.slice().sort((a, b) => {
      const x = val(a), y = val(b);
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      return dir === 'asc' ? d3.ascending(x, y) : d3.descending(x, y);
    });
    document.querySelectorAll('#dir th').forEach((th) => { const b = th.querySelector('button'); th.setAttribute('aria-sort', b && b.dataset.s === k ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'); });
    $('#dir-count').textContent = `${fInt(rows.length)} providers · sorted by ${document.querySelector(`#dir th button[data-s="${k}"]`).textContent.toLowerCase()} (${dir === 'asc' ? 'low to high' : 'high to low'})`;
    const own = (o) => (OWN.find((x) => x[0] === o) || [0, o])[1];
    $('#dir tbody').replaceChildren(...rows.map((p) => {
      const tr = document.createElement('tr'); tr.dataset.key = p.provider; tr.tabIndex = 0; if (q.sel === p.provider) tr.className = 'on';
      tr.onkeydown = (e) => { if (e.key === 'Enter') tr.click(); };
      const cells = [[p.provider, ''], [p.hq, ''], [p.category, 'hide-narrow'], [own(p.ownership), 'hide-narrow'], [p.nm == null ? '—' : String(p.nm), 'n'],
        [f$(p.h100), 'n'], [p.op == null ? '—' : fInt(p.op), 'n hide-narrow'], [p.pl == null ? '—' : fInt(p.pl), 'n hide-narrow'],
        [p.cities.length ? p.cities.slice(0, 2).join(', ') + (p.cities.length > 2 ? ` +${p.cities.length - 2}` : '') : '—', 'hide-narrow city']];
      cells.forEach(([t, c], i) => {
        const td = document.createElement('td'); if (c) td.className = c;
        if (i === 3) { const d = document.createElement('span'); d.className = 'dot'; d.style.background = ownColor(p.ownership); td.append(d, t); } else { td.textContent = t; if (i === 1) { withFlag(td, t); if (p.hq_city) { const sm = document.createElement('small'); sm.className = 'hqc'; sm.textContent = hqPlace(p); td.append(sm); } } if (i === 0) withLogo(td, t, 'sm'); }
        tr.append(td);
      });
      return tr;
    }));
  }
  // top 5 flagship GPUs: frontier-training parts first, then newest; full list behind a toggle
  const SEG_RANK = { 'Frontier training': 0, Training: 1, Inference: 2, Workstation: 3, Consumer: 4 };
  function topModels(v, p) {
    const d = document.createElement('div');
    const h4 = document.createElement('h4');
    const fams = p.fams.filter((k) => v.famInfo.has(k)).map((k) => v.famInfo.get(k))
      .sort((a, b) => (SEG_RANK[a.segment] ?? 9) - (SEG_RANK[b.segment] ?? 9) || b.year - a.year);
    const top = fams.slice(0, 5);
    h4.textContent = top.length ? `Top ${top.length} flagship GPUs` : 'GPU models offered';
    d.append(h4);
    if (top.length) {
      const w = document.createElement('ul'); w.className = 'gx-models';
      top.forEach((f) => { const s = document.createElement('li'); const b = document.createElement('b'); b.textContent = f.family; const m = document.createElement('small'); m.textContent = ` — ${f.vendor} ${f.arch}`; s.append(b, m); w.append(s); });
      d.append(w);
    }
    const all = String(p.models_text || '').split('\n').map((x) => x.trim()).filter(Boolean);
    if (all.length > top.length || !top.length) {
      const pp = document.createElement('p'); pp.textContent = all.join('\n'); pp.hidden = top.length > 0; pp.style.marginTop = 'var(--s2)';
      if (top.length) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gx-linkbtn';
        const lab = () => (pp.hidden ? `Show all ${all.length} models as listed` : 'Hide full list');
        btn.textContent = lab(); btn.onclick = () => { pp.hidden = !pp.hidden; btn.textContent = lab(); };
        d.append(btn);
      }
      d.append(pp);
    }
    return d;
  }
  function drawDetail(v) {
    const el = $('#detail'); const name = P().sel; const p = name && v.byName.get(name);
    if (!p) { el.hidden = true; el.replaceChildren(); return; }
    el.hidden = false;
    const head = document.createElement('div'); head.className = 'gx-dhead';
    const h = document.createElement('h3'); h.textContent = p.provider; withLogo(h, p.provider, 'lg');
    const right = document.createElement('div'); right.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center';
    [p.hq, p.category, (OWN.find((o) => o[0] === p.ownership) || [0, p.ownership])[1]].forEach((t, i) => { const s = document.createElement('span'); s.className = 'pill'; s.textContent = i === 0 ? hqPlace(p, true) : t; if (i === 0) { withFlag(s, p.hq); s.title = 'Headquarters'; } right.append(s); });
    if (/^https?:\/\//.test(String(p.website))) { const a = document.createElement('a'); a.href = p.website; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Website ↗'; a.className = 'gx-chip'; right.append(a); }
    const x = document.createElement('button'); x.type = 'button'; x.className = 'gx-btn'; x.textContent = 'Close'; x.onclick = () => set({ sel: null }); right.append(x);
    head.append(h, right);
    const grid = document.createElement('div'); grid.className = 'gx-detail';
    const fields = [['What they are', p.type], ['GPU models offered', p.models_text], ['Data center locations', p.locations], ['Operational capacity', p.op_mw_text],
      ['Planned / contracted capacity', p.planned_mw_text], ['Capacity notes', p.capacity_notes], ['Investment / valuation', p.investment], ['Other information', p.notes]];
    fields.forEach(([t, val]) => { if (!val || val === 'n.a.') return;
      if (t === 'GPU models offered') { grid.append(topModels(v, p)); return; }
      const d = document.createElement('div'); const h4 = document.createElement('h4'); h4.textContent = t; const pp = document.createElement('p'); pp.textContent = val; d.append(h4, pp); grid.append(d); });
    if (p.cities.length) {
      const d = document.createElement('div'); d.style.gridColumn = '1/-1';
      const h4 = document.createElement('h4'); h4.textContent = `Data center cities (${p.cities.length})`;
      const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
      p.cities.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.style.cursor = 'pointer'; b.textContent = c; b.title = 'Show providers with a data center in ' + c; b.onclick = () => { set({ city: c, sel: null, tab: 'overview', metric: 'cities' }); dash.setLink('overview'); }; w.append(b); });
      d.append(h4, w); grid.prepend(d);
    }
    const pr = v.prices.filter((r) => r.provider === p.provider);
    const box = document.createElement('div'); box.className = 'gx-tablebox'; box.style.maxHeight = '320px';
    const tb = document.createElement('table'); const th = document.createElement('thead'); th.innerHTML = '<tr><th style="padding:8px 10px">GPU</th><th style="padding:8px 10px">As published</th><th class="n" style="padding:8px 10px">Lowest $/GPU-hr</th></tr>';
    const body = document.createElement('tbody');
    pr.forEach((r) => { const tr = document.createElement('tr'); tr.style.cursor = 'default'; [[r.model, ''], [r.price_text, ''], [r.usd == null ? (r.excluded ? 'excluded' : '—') : f$(r.usd), 'n']].forEach(([t, c]) => { const td = document.createElement('td'); td.textContent = String(t); if (c) td.className = c; tr.append(td); }); body.append(tr); });
    tb.append(th, body); box.append(tb);
    const ph = document.createElement('h4'); ph.textContent = `Published prices (${pr.length})`; ph.style.cssText = 'margin:0;font-size:var(--cds-font-size-caption);color:var(--color-fg-muted)';
    el.replaceChildren(head, grid, ph, box);
  }

  /* ---------- insights ---------- */
  function insights(id, cards) {
    $(id).replaceChildren(...cards.map(([eb, big, parts, fc]) => {
      const d = document.createElement('div'); d.className = 'gx-in';
      const e = document.createElement('span'); e.className = 'gx-eyebrow'; e.textContent = eb;
      const lo = String(eb).toLowerCase(); e.prepend(ICON(/city|cities|location/.test(lo) ? 'pin' : /hub|based|countr/.test(lo) ? 'flag' : /capacity|power|mw|gw/.test(lo) ? 'zap' : /cheap|price|median|rate|\$/.test(lo) ? 'tag' : /gpu|model|generation|vendor|chip/.test(lo) ? 'cpu' : /provider|operator|owner/.test(lo) ? 'building' : 'spark'));
      const b = document.createElement('span'); b.className = 'big'; b.textContent = big; if (fc) withFlag(b, fc);
      const p = document.createElement('span'); p.className = 'txt';
      parts.forEach((x) => { if (typeof x === 'string') p.append(x); else { const s = document.createElement('b'); s.textContent = x[0]; p.append(s); } });
      d.append(e, b, p); return d;
    }));
  }
  const TERM_SHORT = { 'On-demand (PAYG)': 'PAYG', Commitment: 'commitment', 'Spot / interruptible': 'spot', Serverless: 'serverless' };
  function termsText(rows) {
    const c = d3.rollups(rows || [], (a) => a.length, (r) => r.basis || 'On-demand (PAYG)').sort((a, b) => b[1] - a[1]);
    return c.map(([k, n]) => `${n} ${TERM_SHORT[k] || k}`).join(', ');
  }
  function insOverview(v, f) {
    const agg = [...countryAgg(f)];
    const n = f.provs.length || 1;
    const top = agg.slice().sort((a, b) => b[1].n - a[1].n)[0];
    const cap = agg.filter((a) => a[1].op > 0).sort((a, b) => b[1].op - a[1].op)[0];
    const fam = focus();
    const cheap = agg.filter((a) => a[1].pn >= 2).sort((a, b) => a[1].med - b[1].med)[0];
    const topCity = cityAgg(v, f).sort((a, b) => b.n - a.n)[0];
    insights('#ins-overview', [
      ['Top data center city', topCity ? topCity.city : '—', topCity ? ['named as a data center location by ', [`${topCity.n} providers`], ` (${topCity.country}).`] : ['No city named by these providers.'], topCity && topCity.country],
      [`Cheapest ${fam} hub`, cheap ? f$(cheap[1].med) : '—', cheap ? ['median per GPU-hr among ', [`${cheap[1].pn} providers in ${cheap[0]}`], ` · range ${f$(d3.min(cheap[1].prices))}–${f$(d3.max(cheap[1].prices))} · `, termsText(cheap[1].rows), '.'] : [`No country has two or more ${fam} prices.`], cheap && cheap[0]],
    ]);
  }
  function insPricing(f) {
    const fam = focus(); const mins = provMin(f.prices, fam).sort((a, b) => a.usd - b.usd);
    const s = mins.map((r) => r.usd);
    const q1 = s.length ? d3.quantileSorted(s, 0.25) : null, q3 = s.length ? d3.quantileSorted(s, 0.75) : null;
    const hyper = mins.filter((r) => r.p.category === 'Hyperscaler'), rest = mins.filter((r) => r.p.category !== 'Hyperscaler');
    const gap = hyper.length && rest.length ? d3.median(hyper, (r) => r.usd) / d3.median(rest, (r) => r.usd) : null;
    insights('#ins-pricing', [
      [`Cheapest ${fam}`, s.length ? f$(s[0]) : '—', s.length ? ['per GPU-hr from ', [mins[0].provider], ` (${mins[0].p.hq}) · ${TERM_SHORT[mins[0].basis] || 'PAYG'} rate.`] : [`No published ${fam} prices for these filters.`]],
      ['Typical range', s.length ? `${f$(q1)}–${f$(q3)}` : '—', s.length ? ['middle half of ', [`${s.length} providers`], ` pricing ${fam}.`] : ['—']],
      ['Hyperscaler premium', gap ? `${gap.toFixed(1)}×` : '—', gap ? ['hyperscaler median vs. ', ['everyone else'], ` for ${fam}.`] : ['Not enough hyperscaler prices to compare.']],
    ]);
  }
  function insCapacity(f) {
    const op = f.provs.filter((p) => p.op != null).sort((a, b) => b.op - a.op);
    const pl = f.provs.filter((p) => p.pl != null).sort((a, b) => b.pl - a.pl);
    const n = f.provs.length || 1; const own = f.provs.filter((p) => p.ownership === 'Yes').length;
    insights('#ins-capacity', [
      ['Largest live footprint', op.length ? fMW(op[0].op) : '—', op.length ? [[op[0].provider], ` leads ${op.length} providers that disclose live MW.`] : ['No live MW disclosed.']],
      ['Largest pipeline', pl.length ? fMW(pl[0].pl) : '—', pl.length ? [[pl[0].provider], ' has the biggest planned or contracted figure.'] : ['No planned MW disclosed.']],
      ['Asset-heavy', fPct(own / n), [[`${own} providers`], ' own or operate their data centers; the rest rent, colocate or broker.']],
    ]);
  }
  function insHardware(v, f) {
    f = { ...f, provs: f.provsAny }; // GPU mix compares models, so the GPU model filter is not applied
    const n = f.provs.length || 1;
    const cnt = new Map(); f.provs.forEach((p) => p.fams.forEach((x) => cnt.set(x, (cnt.get(x) || 0) + 1)));
    const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
    const bw = f.provs.filter((p) => p.fams.some((k) => /^Blackwell/.test((v.famInfo.get(k) || {}).arch || '') && (v.famInfo.get(k) || {}).segment === 'Frontier training')).length;
    const amd = f.provs.filter((p) => p.fams.some((k) => (v.famInfo.get(k) || {}).vendor === 'AMD')).length;
    insights('#ins-hardware', [
      ['Most offered', top ? fPct(top[1] / n) : '—', top ? ['of providers list the ', [top[0]], '.'] : ['No GPUs listed.']],
      ['Blackwell data center', fPct(bw / n), [[`${bw} providers`], ' list B200, B300, GB200 or GB300.']],
      ['AMD alternative', fPct(amd / n), [[`${amd} providers`], ' offer AMD Instinct GPUs.']],
    ]);
  }

  /* ---------- orchestrate ---------- */
  const CHARTS = ['#map', '#strip', '#pgroup', '#mw', '#own', '#mwc', '#avail', '#gen', '#heat'];
  let jumped = false;
  /* ---------- dropdowns: native select kept for state, custom menu on mouse devices ---------- */
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const DD = [];
  let ddOpen = null;
  const ddPop = document.createElement('div'); ddPop.className = 'gx-dd-pop'; ddPop.hidden = true; ddPop.setAttribute('role', 'listbox'); root.append(ddPop);
  const ddScrim = document.createElement('div'); ddScrim.className = 'gx-dd-scrim'; ddScrim.hidden = true; root.append(ddScrim);
  ddScrim.addEventListener('click', () => ddClose());
  // "H100 · NVIDIA (258)" -> main "H100", sub "NVIDIA", count "258"
  function ddParts(t) {
    const m = String(t).match(/^(.*?)\s*\(([\d,]+)(?:\s+[a-z ]+)?\)\s*$/i); let main = m ? m[1] : String(t); const cnt = m ? m[2] : '';
    const i = main.indexOf(' · '); const sub = i > 0 ? main.slice(i + 3) : ''; if (i > 0) main = main.slice(0, i);
    return { main, sub, cnt };
  }
  function ddSync(d) {
    const o = d.sel.options[d.sel.selectedIndex]; const pp = ddParts(o ? o.textContent : '');
    d.val.textContent = pp.main; d.btn.title = o ? o.textContent : '';
    d.wrap.classList.add('dd-on');
  }
  function ddClose(focusBtn) {
    if (!ddOpen) return; const d = ddOpen; ddOpen = null; ddPop.hidden = true; ddScrim.hidden = true; ddPop.classList.remove('sheet'); document.documentElement.style.overflow = fBox.classList.contains('open') && phone.matches ? 'hidden' : ''; d.btn.setAttribute('aria-expanded', 'false'); d.wrap.classList.remove('dd-open');
    if (focusBtn) d.btn.focus();
  }
  function ddRender(d, q) {
    const ql = (q || '').toLowerCase(); const items = [];
    [...d.sel.options].forEach((o, i) => {
      if (ql && !o.textContent.toLowerCase().includes(ql)) return;
      const pp = ddParts(o.textContent);
      const it = document.createElement('div'); it.className = 'gx-dd-opt' + (i === d.sel.selectedIndex ? ' sel' : '') + (o.value === '' || o.value === '__all' ? ' all' : '');
      it.setAttribute('role', 'option'); it.setAttribute('aria-selected', String(i === d.sel.selectedIndex)); it.dataset.i = i; it.id = 'dd-o-' + i;
      const ck = document.createElement('span'); ck.className = 'ck'; ck.append(ICON('check'));
      const tx = document.createElement('span'); tx.className = 'tx'; const mn = document.createElement('b'); mn.textContent = pp.main; tx.append(mn);
      if (pp.sub) { const sb = document.createElement('small'); sb.textContent = pp.sub; tx.append(sb); }
      it.append(ck, tx);
      if (pp.cnt) { const c = document.createElement('em'); c.textContent = pp.cnt; it.append(c); }
      it.addEventListener('mousedown', (e) => e.preventDefault());
      it.addEventListener('click', () => ddPick(d, i));
      items.push(it);
    });
    if (!items.length) { const n = document.createElement('div'); n.className = 'gx-dd-empty'; n.textContent = 'No matches'; items.push(n); }
    d.list.replaceChildren(...items);
    d.act = Math.max(0, items.findIndex((x) => x.classList.contains('sel'))); ddActive(d);
  }
  function ddActive(d) {
    const os = [...d.list.querySelectorAll('.gx-dd-opt')]; os.forEach((o, i) => o.classList.toggle('act', i === d.act));
    const a = os[d.act]; if (a) { a.scrollIntoView({ block: 'nearest' }); (d.search || d.btn).setAttribute('aria-activedescendant', a.id); }
  }
  function ddPick(d, i) { ddClose(true); if (d.sel.selectedIndex !== i) { d.sel.selectedIndex = i; d.sel.dispatchEvent(new Event('change', { bubbles: true })); } ddSync(d); }
  function ddOpenFor(d) {
    if (ddOpen === d) { ddClose(true); return; } ddClose(); ddOpen = d;
    const many = d.sel.options.length > 10;
    ddPop.replaceChildren(); d.search = null;
    const asSheet = phone.matches;
    if (asSheet) {
      // phones: bottom sheet with a title and a close button
      const hd = document.createElement('div'); hd.className = 'gx-dd-head';
      const lab = d.wrap.querySelector(':scope > span'); const t = document.createElement('b'); t.textContent = lab ? lab.textContent.trim() : (d.sel.getAttribute('aria-label') || 'Choose');
      if (lab && lab.querySelector('svg')) t.prepend(lab.querySelector('svg').cloneNode(true));
      const x = document.createElement('button'); x.type = 'button'; x.className = 'gx-ibtn'; x.setAttribute('aria-label', 'Close'); x.append(ICON('x')); x.onclick = () => ddClose(true);
      hd.append(t, x); ddPop.append(hd);
    }
    if (many) {
      const sw = document.createElement('div'); sw.className = 'gx-dd-search'; sw.append(ICON('search'));
      const si = document.createElement('input'); si.type = 'search'; si.placeholder = 'Search…'; si.setAttribute('aria-label', 'Search options'); si.autocomplete = 'off';
      si.addEventListener('input', () => ddRender(d, si.value)); si.addEventListener('keydown', (e) => ddKey(e, d));
      sw.append(si); ddPop.append(sw); d.search = si;
    }
    d.list = document.createElement('div'); d.list.className = 'gx-dd-list'; ddPop.append(d.list);
    ddRender(d, '');
    ddPop.hidden = false; d.btn.setAttribute('aria-expanded', 'true'); d.wrap.classList.add('dd-open');
    if (asSheet) {
      ddPop.classList.add('sheet'); ddScrim.hidden = false; document.documentElement.style.overflow = 'hidden';
      ['left', 'top', 'bottom', 'minWidth', 'maxHeight'].forEach((k) => { ddPop.style[k] = ''; });
      ddActive(d); return;
    }
    const rr = root.getBoundingClientRect(), br = d.wrap.getBoundingClientRect();
    const w = Math.max(br.width, d.compact ? 180 : 260);
    let left = br.left - rr.left; if (br.left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - w - rr.left);
    ddPop.style.minWidth = w + 'px'; ddPop.style.left = left + 'px';
    const below = window.innerHeight - br.bottom; const h = Math.min(380, Math.max(below, br.top) - 16);
    ddPop.style.maxHeight = h + 'px';
    if (below < 260 && br.top > below) { ddPop.style.top = ''; ddPop.style.bottom = (rr.bottom - br.top + 6) + 'px'; } else { ddPop.style.bottom = ''; ddPop.style.top = (br.bottom - rr.top + 6) + 'px'; }
    ddActive(d);
    if (d.search) d.search.focus();
  }
  function ddKey(e, d) {
    const os = d.list ? [...d.list.querySelectorAll('.gx-dd-opt')] : [];
    if (e.key === 'ArrowDown') { e.preventDefault(); if (ddOpen !== d) return ddOpenFor(d); d.act = Math.min(os.length - 1, d.act + 1); ddActive(d); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (ddOpen !== d) return ddOpenFor(d); d.act = Math.max(0, d.act - 1); ddActive(d); }
    else if (e.key === 'Enter' || (e.key === ' ' && e.target === d.btn)) { e.preventDefault(); if (ddOpen !== d) return ddOpenFor(d); const o = os[d.act]; if (o) ddPick(d, +o.dataset.i); }
    else if (e.key === 'Escape') { if (ddOpen === d) { e.preventDefault(); e.stopPropagation(); ddClose(true); } }
    else if (e.key === 'Tab') ddClose();
  }
  document.querySelectorAll('.gx-f select, .gx-sort select').forEach((sel) => {
    const wrap = sel.closest('.gx-f, .gx-sort');
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gx-dd-btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', sel.getAttribute('aria-label') || '');
    const val = document.createElement('span'); val.className = 'v'; btn.append(val);
    sel.after(btn);
    const d = { sel, wrap, btn, val, compact: wrap.classList.contains('gx-sort'), act: 0 };
    btn.addEventListener('click', (e) => { e.preventDefault(); ddOpenFor(d); });
    btn.addEventListener('keydown', (e) => ddKey(e, d));
    sel.addEventListener('change', () => ddSync(d));
    DD.push(d); ddSync(d);
  });
  document.addEventListener('mousedown', (e) => { if (ddOpen && !ddPop.contains(e.target) && !ddOpen.wrap.contains(e.target)) ddClose(); });
  window.addEventListener('resize', () => { if (!ddPop.classList.contains('sheet')) ddClose(); }); // the phone keyboard resizes the window; keep the sheet open
  fineHover.addEventListener && fineHover.addEventListener('change', () => DD.forEach(ddSync));
  const ddSyncAll = () => DD.forEach(ddSync);
  // phone filter row: drop the right-edge fade once scrolled to the end
  const fEdge = () => { const f = $('#filters'); f.classList.toggle('at-end', f.scrollLeft + f.clientWidth >= f.scrollWidth - 4); };
  $('#filters').addEventListener('scroll', fEdge, { passive: true });
  const render = () => {
    const core = ['providers', 'prices', 'gpu_families'].map((id) => dash.data(id).status);
    const bad = core.some((s) => s === 'error' || s === 'connect' || s === 'declined' || s === 'missing');
    if (bad || core.some((s) => s !== 'ok')) {
      CHARTS.forEach((s) => { const el = $(s); if (bad) { el.classList.remove('dash-skeleton'); fail(el); } else { el.replaceChildren(); el.classList.add('dash-skeleton'); } });
      ['#ex-list', '#cheap tbody', '#dir tbody'].forEach((s) => $(s).replaceChildren());
      $('#detail').hidden = true;
      return;
    }
    CHARTS.forEach((s) => $(s).classList.remove('dash-skeleton'));
    applyTheme();
    root.style.setProperty('--gx-accent', 'var(--gx-gblue)'); root.style.setProperty('--gx-accent-2', C(3));
    const v = prep(); const f = filt(v);
    drawFilters(v); drawFSum(v, f); drawKpis(v, f);
    const tab = tabOf(); root.dataset.tab = tab;
    document.querySelectorAll('.gx-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    TABS.forEach((id) => { document.getElementById(id).hidden = id !== tab; });
    if (tab === 'overview') { drawMap(v, f); drawExplorer(v, f); drawFocus(v); insOverview(v, f); }
    if (tab === 'pricing') { drawDl(v, f); drawStrip(v, f); drawCheap(f); drawPGroup(f); insPricing(f); }
    if (tab === 'capacity') { drawMW(f); drawOwn(f); drawMWC(f); insCapacity(f); }
    if (tab === 'hardware') { drawAvail(v, f); drawGen(v, f); drawHeat(v, f); insHardware(v, f); }
    if (tab === 'directory') { drawDir(f); drawDetail(v); }
    ddSyncAll(); fEdge();
    if (!jumped) { jumped = true; const h = location.hash.slice(1); if (TABS.includes(h) && h !== tab) set({ tab: h }); }
  };
  dash.onData(render);
  // redraw charts when the width changes enough to switch layouts (rotation, window resize)
  let lastW = window.innerWidth, rT;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; render(); } }, 200); });
})();
