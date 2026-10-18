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
  const sheet = (open) => { fBox.classList.toggle('open', open); scrim.hidden = !open; fTog.setAttribute('aria-expanded', String(open)); document.documentElement.style.overflow = open && phone.matches ? 'hidden' : ''; if (open) { const f = fBox.querySelector('select'); if (f) f.focus({ preventScroll: true }); } else fTog.focus({ preventScroll: true }); };
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
    const u = FLAGS.get(country); if (!u || !/^data:image\/svg\+xml;base64,/.test(u)) return null;
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
  function tipShow(ev, title, lines) {
    const t = document.createElement('div'); t.className = 't'; t.textContent = title;
    const nodes = [t];
    lines.forEach(([l, v, c]) => {
      const d = document.createElement('div');
      if (c) { const i = document.createElement('span'); i.className = 'dot'; i.style.background = c; d.append(i); }
      if (l) d.append(l + ' ');
      const b = document.createElement('b'); b.textContent = v; d.append(b);
      nodes.push(d);
    });
    tip.replaceChildren(...nodes); tip.hidden = false;
    const r = root.getBoundingClientRect();
    let x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
    const w = tip.offsetWidth;
    if (x + w > r.width) x = Math.max(0, ev.clientX - r.left - w - 14);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  const tipHide = () => { tip.hidden = true; };

  /* ---------- data prep ---------- */
  let cache = {};
  function prep() {
    const pr = dash.data('providers').data, px = dash.data('prices').data, fam = dash.data('gpu_families').data;
    const dc = dash.data('dc_cities'); const cr = dc.status === 'ok' && Array.isArray(dc.data) ? dc.data : [];
    if (cache.pr === pr && cache.px === px && cache.fam === fam && cache.cr === cr) return cache.v;
    const cityBy = d3.group(cr, (r) => r.provider);
    const famInfo = new Map(fam.map((f) => [f.family, { ...f, year: +f.year }]));
    const provs = pr.map((p) => ({
      ...p, op: num(p.op_mw), pl: num(p.planned_mw), h100: num(p.h100_usd), nm: num(p.models_count),
      fams: String(p.families || '').split('|').filter(Boolean),
      cities: [...new Set((cityBy.get(p.provider) || []).map((r) => r.city))],
    }));
    provs.forEach((p) => { p.ncity = p.cities.length; });
    const byName = new Map(provs.map((p) => [p.provider, p]));
    const prices = px.map((r) => ({ ...r, usd: num(r.usd_hr), p: byName.get(r.provider) }));
    cache = { pr, px, fam, cr, v: { famInfo, provs, byName, prices, cities: cr } };
    return cache.v;
  }
  function filt(v) {
    const q = P(); const s = String(q.q || '').toLowerCase();
    const provs = v.provs.filter((p) => (!q.region || p.region === q.region) && (!q.category || p.category === q.category) &&
      (!q.vendor || p.fams.some((k) => (v.famInfo.get(k) || {}).vendor === q.vendor)) && (!q.ownership || p.ownership === q.ownership) && (!q.country || p.hq === q.country) && (!q.city || p.cities.includes(q.city)) && (!s || String(p.provider).toLowerCase().includes(s)));
    const S = new Set(provs);
    // for data center cities, region/country/city describe where the city is, not the provider's HQ
    const provsLoc = v.provs.filter((p) => (!q.vendor || p.fams.some((k) => (v.famInfo.get(k) || {}).vendor === q.vendor)) && (!q.category || p.category === q.category) && (!q.ownership || p.ownership === q.ownership) && (!s || String(p.provider).toLowerCase().includes(s)));
    return { provs, provsLoc, prices: v.prices.filter((r) => r.p && S.has(r.p)) };
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
    const keep = !vd || fam === '__all' || (v && v.famInfo.get(fam) && v.famInfo.get(fam).vendor === vd);
    if (keep) return { vendor: vd };
    const first = v ? [...v.famInfo.values()].find((x) => x.vendor === vd && v.prices.some((r) => r.family === x.family && r.usd != null)) : null;
    return { vendor: vd, family: first ? first.family : '__all' };
  }
  const focus = () => (P().family === '__all' ? ANY_GPU : P().family || 'H100');

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
  Object.entries(sel).forEach(([k, el]) => el.addEventListener('change', () => set(k === 'region' ? { region: el.value || null, country: null } : k === 'vendor' ? vendorChange(el.value || null) : { [k]: el.value || (k === 'family' ? 'H100' : null) })));
  const qIn = $('#f-q'); let qT;
  qIn.addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(() => set({ q: qIn.value.trim() || null }), 220); });
  $('#f-reset').addEventListener('click', () => { dash.resetParams(); qIn.value = ''; });
  document.querySelectorAll('#metric button').forEach((b) => b.addEventListener('click', () => set({ metric: b.dataset.m })));
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
    fillSelect(sel.family, [['__all', `${q.vendor ? 'All ' + q.vendor + ' models' : 'All models'} (${new Set(v.prices.filter((r) => r.usd != null && r.segment && (!q.vendor || r.vendor === q.vendor)).map((r) => r.provider)).size} priced)`]].concat([...v.famInfo.keys()].filter((f) => pricedN.get(f) && (!q.vendor || v.famInfo.get(f).vendor === q.vendor)).map((f) => [f, `${f} · ${v.famInfo.get(f).vendor} (${pricedN.get(f)} priced)`])), P().family || 'H100');
    const uniq = (k) => [...new Set(v.provs.map((p) => p[k]))].filter(Boolean).sort();
    fillSelect(sel.region, uniq('region').filter((r) => r !== 'Unknown').map((r) => [r, r]), q.region, 'All regions');
    const cs = [...new Set(v.provs.filter((p) => p.hq !== 'Unknown' && (!q.region || p.region === q.region)).map((p) => p.hq))].sort();
    if (q.country && !cs.includes(q.country)) cs.unshift(q.country);
    fillSelect(sel.country, cs.map((c) => [c, c]), q.country, 'All countries');
    Object.entries(sel).forEach(([k, el]) => el.closest('.gx-f').classList.toggle('is-set', k === 'family' ? false : !!q[k]));
    qIn.closest('.gx-f').classList.toggle('is-set', !!q.q);
    fillSelect(sel.category, uniq('category').map((r) => [r, r]), q.category, 'All models');
    fillSelect(sel.ownership, OWN.map((o) => [o[0], o[1]]), q.ownership, 'Any ownership');
    if (qIn !== document.activeElement) qIn.value = q.q || '';
    const nSet = ['vendor', 'region', 'country', 'category', 'ownership', 'city'].filter((k) => q[k]).length + (q.family && q.family !== 'H100' ? 1 : 0);
    const fc = $('#f-count'); fc.hidden = !nSet; fc.textContent = String(nSet); $('#f-toggle').setAttribute('aria-label', nSet ? `Filters, ${nSet} active` : 'Filters');
    const chips = $('#f-chips'); const list = [];
    if (q.city) list.push(['Data center in ' + q.city, { city: null }]);
    if (q.sel) list.push(['Profile: ' + q.sel, { sel: null }]);
    chips.hidden = !list.length;
    chips.replaceChildren(...list.map(([t, clr]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'gx-chip'; b.textContent = t + '  ×'; b.setAttribute('aria-label', 'Clear ' + t); b.onclick = () => set(clr); return b; }));
    document.querySelectorAll('#metric button').forEach((b) => { const on = (q.metric || 'providers') === b.dataset.m; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    document.querySelectorAll('#pg-seg button').forEach((b) => b.setAttribute('aria-pressed', String((q.pgroup || 'region') === b.dataset.g)));
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
    kset('providers', fInt(n)); kset('providers_sub', `of ${fInt(v.provs.length)} in the dataset`);
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
    parts.push(B(`${fInt(n)} providers`), ` headquartered in ${byC.size} ${byC.size === 1 ? 'country' : 'countries'}. `);
    if (cheapest) parts.push(`The cheapest ${fam} is `, B(`${f$(cheapest.usd)}/GPU-hr`), ` from ${cheapest.provider}, against a median of ${f$(med)}. `);
    else parts.push(`None of them publish a ${fam} price. `);
    if (capC) parts.push(`Providers based in ${capC[0]} disclose the most live capacity, `, B(fMW(capC[1])), '.');
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
  let zoomT = null; let lastCountry;
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
      .attr('fill', (d) => { if (q.country === d.country) return 'var(--gx-sel)'; const a = agg.get(d.country); if (!a) return 'var(--gx-land)'; return hasVal(a) ? shade(cval(a)) : 'url(#gx-hatch)'; })
      .attr('fill-opacity', (d) => (q.country && q.country !== d.country ? 0.45 : 1))
      .attr('stroke', 'var(--gx-border)').attr('stroke-opacity', 0.45).attr('stroke-width', 0.35).attr('vector-effect', 'non-scaling-stroke')
      .style('cursor', (d) => (agg.has(d.country) ? 'pointer' : null))
      .on('mousemove', countryTip).on('mouseleave', tipHide)
      .on('click', (e, d) => agg.has(d.country) && set({ country: q.country === d.country ? null : d.country, city: null }));
    g.selectAll('path').filter((d) => d && d.country === q.country).raise();

    // circles only for cities
    // city circles belong to layers about physical infrastructure: cities, live power, planned power
    const showCities = ['cities', 'op', 'pl'].includes(m);
    const pts = showCities ? cityAgg(v, f).sort((a, b) => b.n - a.n) : [];
    const rS = d3.scaleSqrt([0, d3.max(pts, (c) => c.n) || 1], [0, m === 'cities' ? 15 : 12]);
    const rr = (d) => Math.max(m === 'cities' ? 2.6 : 2.2, rS(d.n));
    const isOn = (d) => q.city === d.city;
    const halo = g.append('g').attr('pointer-events', 'none');
    halo.selectAll('circle').data(m === 'cities' || q.country ? pts.slice(0, 12) : []).join('circle').attr('cx', (d) => d.px).attr('cy', (d) => d.py).attr('fill', 'url(#gx-glow)');
    const dots = g.append('g').selectAll('circle').data(pts).join('circle')
      .attr('cx', (d) => d.px).attr('cy', (d) => d.py)
      .attr('fill', 'var(--gx-city)').attr('fill-opacity', m === 'cities' ? 0.92 : 0.8)
      .attr('stroke', (d) => (isOn(d) ? 'var(--color-fg)' : 'var(--gx-border)'))
      .style('cursor', 'pointer')
      .on('click', (e, d) => set({ city: q.city === d.city ? null : d.city }))
      .on('mousemove', (e, d) => tipShow(e, `${d.city}, ${d.country}`, [['Providers with a data center here', String(d.n)], ['', trunc(d.provs.slice(0, 8).join(', ') + (d.n > 8 ? ` +${d.n - 8} more` : ''), 220)]]))
      .on('mouseleave', tipHide);
    // country names sized to the country's footprint on the map (no outline); shown only where the name fits
    const cxy = new Map(sc.data.map((c) => [c.country, [+c.px, +c.py]]));
    const cLab = [];
    g.selectAll('path').each(function (d) {
      if (!d || !agg.has(d.country) || !cxy.has(d.country)) return;
      const bb = this.getBBox(); const area = bb.width * bb.height;
      // three fixed on-screen sizes, like web maps: big countries 12px, medium 11px, small 10px
      const px = area > 4000 ? 12 : area > 700 ? 11 : 10;
      cLab.push({ t: d.country, x: cxy.get(d.country)[0], y: cxy.get(d.country)[1], px, bw: bb.width, tw: d.country.length * px * 0.56 });
    });
    const clab = g.append('g').attr('pointer-events', 'none').selectAll('text').data(cLab).join('text')
      .attr('class', 'ctrylab').attr('x', (d) => d.x).attr('y', (d) => d.y).attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .style('opacity', m === 'cities' ? 0.6 : 1).text((d) => d.t);
    const lab = g.append('g').attr('pointer-events', 'none').selectAll('text').data(showCities ? pts.slice(0, m === 'cities' || q.country ? 12 : 0) : []).join('text')
      .attr('class', 'citylab').attr('dominant-baseline', 'central').text((d) => d.city);
    const paint = (k) => {
      dots.attr('r', (d) => rr(d) / Math.sqrt(k)).attr('stroke-width', (d) => (isOn(d) ? 2 : 1) / k);
      halo.selectAll('circle').attr('r', (d) => (rr(d) * 2.1) / Math.sqrt(k));
      const s = (el.clientWidth || W) / W; // screen pixels per map unit
      // place names biggest-first and skip any that would overlap a name already placed
      const placed = [];
      const boxOf = (x, y, w, hgt) => [x - w / 2, y - hgt / 2, x + w / 2, y + hgt / 2];
      const hit = (b) => placed.some((p) => b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1]);
      lab.each((d) => { const w = (d.city.length * 10.5 * 0.56) / (s * k), hh = 13 / (s * k), x0 = d.px + rr(d) / Math.sqrt(k) + 3 / k; placed.push([x0, d.py - hh / 2, x0 + w, d.py + hh / 2]); });
      const show = new Set();
      cLab.slice().sort((a, b) => b.px - a.px || b.bw - a.bw).forEach((d) => {
        if (d.bw * s * k < d.tw * 1.05) return;
        const b = boxOf(d.x, d.y, (d.tw + 6) / (s * k), (d.px + 4) / (s * k));
        if (hit(b)) return; placed.push(b); show.add(d);
      });
      clab.style('font-size', (d) => `${d.px / (s * k)}px`).style('display', (d) => (show.has(d) ? null : 'none'));
      lab.attr('x', (d) => d.px + rr(d) / Math.sqrt(k) + 3 / k).attr('y', (d) => d.py).style('font-size', `${10.5 / (s * k)}px`);
    };
    const zoom = d3.zoom().scaleExtent([1, 10]).translateExtent([[0, 0], [W, H]]).extent([[0, 0], [W, H]])
      .filter((e) => (e.type === 'wheel' ? e.ctrlKey || e.metaKey : e.type && e.type.startsWith('touch') ? e.touches.length >= 2 : !e.button)) // one finger scrolls the page; two fingers pinch the map
      .on('zoom', (e) => { zoomT = e.transform; g.attr('transform', e.transform); paint(e.transform.k); });
    svg.call(zoom).on('dblclick.zoom', null);
    if (q.country !== lastCountry) {
      lastCountry = q.country;
      const node = g.selectAll('path').filter((d) => d && d.country === q.country).node();
      let tr = d3.zoomIdentity;
      if (node) {
        const b = node.getBBox(); const k = Math.max(1, Math.min(8, 0.75 / Math.max(b.width / W, b.height / H)));
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
    $('#map-title').textContent = titles[m];
    const lg = $('#map-legend');
    lg.replaceChildren();
    if (labels.length) {
      const st = document.createElement('span'); st.className = 'steps';
      const ttl = { providers: 'Providers headquartered', op: 'Live capacity', pl: 'Planned capacity', price: `Median ${fam} $/GPU-hr` }[sm];
      const sb = document.createElement('span'); sb.className = 'sb';
      const s6 = document.createElement('span'); s6.className = 'sw6'; const l6 = document.createElement('span'); l6.className = 'lb6';
      shade.range().forEach((c, i) => { const ii = document.createElement('i'); ii.style.background = c; s6.append(ii); const em = document.createElement('em'); em.textContent = labels[i] || ''; l6.append(em); });
      sb.append(s6, l6); st.append(ttl, sb); lg.append(st);
    }
    if (sm !== 'price') { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = 'repeating-linear-gradient(45deg,var(--gx-land) 0 2px,var(--gx-line-strong) 2px 3px)'; s.append(i, sm === 'providers' ? '' : 'Providers, no MW disclosed'); if (sm !== 'providers') lg.append(s); }
    else { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = 'var(--gx-land)'; s.append(i, 'No price published'); lg.append(s); }
    if (pts.length) { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = 'var(--gx-city)'; i.style.borderRadius = '50%'; s.append(i, `Data center cities${q.country ? ' in ' + q.country : ''}, sized by providers present`); lg.append(s); }
    const unk = f.provs.filter((p) => p.hq === 'Unknown').length;
    const withCity = new Set(v.cities.map((r) => r.provider)); const fc = f.provs.filter((p) => withCity.has(p.provider)).length;
    $('#map-note').textContent = m === 'cities'
      ? `${fc} of ${f.provs.length} providers name at least one city; the rest list only countries or regions. Ctrl/⌘ + scroll or the buttons to zoom.`
      : (unk ? `${unk} provider${unk > 1 ? 's' : ''} without a stated HQ ${unk > 1 ? 'are' : 'is'} not on the map. ` : '') +
        (m === 'op' || m === 'pl' ? 'Only providers that publish an MW figure count. ' : m === 'price' ? `Color is the median of each provider's lowest ${fam} rate. ` : '') + 'Ctrl/⌘ + scroll to zoom.';
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
  document.querySelectorAll('#plist-sort button').forEach((b) => b.addEventListener('click', () => set({ psort: b.dataset.ps })));
  $('#plist-more').addEventListener('click', () => { plistAll = !plistAll; set({ _redraw: Date.now() }); });
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

  /* ---------- pricing ---------- */
  function drawStrip(v, f) {
    const el = $('#strip'); const fam = focus();
    let groups = d3.groups(f.prices.filter((r) => r.usd != null && v.famInfo.has(r.family) && (!P().vendor || v.famInfo.get(r.family).vendor === P().vendor)), (r) => r.family)
      .filter(([k, a]) => a.length >= 3 || k === fam)
      .map(([k, a]) => { const s = a.map((r) => r.usd).sort(d3.ascending); return { k, a, n: a.length, q1: d3.quantileSorted(s, 0.25), med: d3.quantileSorted(s, 0.5), q3: d3.quantileSorted(s, 0.75) }; })
      .sort((a, b) => b.n - a.n).slice(0, 22).sort((a, b) => b.med - a.med);
    if (!groups.length) { emptyNote(el, 'No priced offers match these filters.'); return; }
    const W = Math.max(300, el.clientWidth || 600), rowH = 26, m = { t: 26, r: 60, b: 6 };
    const H = m.t + m.b + groups.length * rowH;
    const svg = svgFor(el, W, H, 'Price range by GPU model');
    const maxCh = W < 500 ? 15 : 40; const short = (t) => (t.length > maxCh ? t.slice(0, maxCh - 1) + '…' : t);
    groups.forEach((g) => { g.lab = `${short(g.k)} · ${g.n}`; });
    const labels = groups.map((g) => g.lab);
    const lw = Math.min(W * 0.34, measure(svg, labels) + 12);
    const all = groups.flatMap((g) => g.a.map((r) => r.usd));
    const x = d3.scaleLog([Math.max(0.01, d3.min(all) * 0.85), d3.max(all) * 1.15], [lw, W - m.r]);
    const ticks = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50].filter((t) => t >= x.domain()[0] && t <= x.domain()[1]);
    const usable = W - m.r - lw; const tk = usable < 260 ? ticks.filter((t, i) => i % 2 === 0) : ticks;
    const ax = svg.append('g');
    ax.selectAll('line').data(tk).join('line').attr('x1', x).attr('x2', x).attr('y1', m.t - 6).attr('y2', H - m.b).attr('stroke', 'var(--cds-chart-grid)');
    ax.selectAll('text').data(tk).join('text').attr('x', x).attr('y', m.t - 12).attr('text-anchor', 'middle').attr('class', 'mono').text((t) => '$' + t);
    const g = svg.selectAll('g.row').data(groups).join('g').attr('class', 'row').attr('transform', (d, i) => `translate(0,${m.t + i * rowH})`);
    g.append('rect').attr('x', 0).attr('width', W).attr('height', rowH).attr('fill', (d) => (d.k === fam ? 'var(--color-bg)' : 'transparent')).attr('rx', 4);
    g.append('text').attr('x', lw - 10).attr('y', rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
      .attr('class', (d) => (d.k === fam ? 'strong' : null)).style('cursor', 'pointer').text((d) => d.lab)
      .on('click', (e, d) => set({ family: d.k }));
    g.append('rect').attr('x', (d) => x(d.q1)).attr('width', (d) => Math.max(2, x(d.q3) - x(d.q1))).attr('y', rowH / 2 - 6).attr('height', 12).attr('rx', 4)
      .attr('fill', (d) => (d.k === fam ? C(0) : MUTED)).attr('fill-opacity', 0.28);
    g.each(function (d) {
      d3.select(this).selectAll('circle').data(d.a).join('circle')
        .attr('cx', (r) => x(r.usd)).attr('cy', (r, i) => rowH / 2 + (((i * 7919) % 13) / 13 - 0.5) * rowH * 0.55).attr('r', 2.6)
        .attr('fill', d.k === fam ? C(0) : MUTED).attr('fill-opacity', d.k === fam ? 0.75 : 0.55)
        .on('mousemove', (e, r) => tipShow(e, `${r.provider} · ${r.p ? r.p.hq : r.hq}`, [[trunc(String(r.model), 60), ''], ['Lowest rate', `${f$(r.usd)}/GPU-hr`], ['Pricing', r.basis || '—'], ['As published', trunc(String(r.price_text), 140)]]))
        .on('mouseleave', tipHide);
    });
    g.append('line').attr('x1', (d) => x(d.med)).attr('x2', (d) => x(d.med)).attr('y1', rowH / 2 - 8).attr('y2', rowH / 2 + 8).attr('stroke', 'var(--color-fg)').attr('stroke-width', 2.5).attr('stroke-linecap', 'round');
    g.append('text').attr('x', W - m.r + 8).attr('y', rowH / 2).attr('dy', '0.35em').attr('class', 'strong').text((d) => f$(d.med));
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
    const W = Math.max(300, el.clientWidth || 600), rowH = 26, m = { t: 24, r: 8, b: 6 };
    const H = m.t + m.b + rows.length * rowH;
    const svg = svgFor(el, W, H, 'Operational versus planned capacity by provider');
    const names = rows.map((p) => trunc(String(p.provider), 26));
    const lw = Math.min(W * 0.36, measure(svg, names) + 12);
    const vals = rows.flatMap((p) => [p.op, p.pl]).filter((x) => x != null && x > 0);
    const txt = (p) => (p.op != null && p.pl != null ? `${fMW(p.op)} → ${fMW(p.pl)}` : p.op != null ? `${fMW(p.op)} live` : `${fMW(p.pl)} planned`);
    const vw = measure(svg, rows.map(txt)) + 10;
    const x = d3.scaleLog([Math.max(0.5, d3.min(vals) * 0.7), d3.max(vals) * 1.25], [lw, W - m.r - vw]);
    const ticks = [1, 10, 100, 1000, 10000, 100000].filter((t) => t >= x.domain()[0] && t <= x.domain()[1]);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', x).attr('x2', x).attr('y1', m.t - 6).attr('y2', H - m.b).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('x', x).attr('y', m.t - 12).attr('text-anchor', 'middle').attr('class', 'mono').text((t) => fMW(t));
    const g = svg.selectAll('g.row').data(rows).join('g').attr('class', 'row').attr('transform', (d, i) => `translate(0,${m.t + i * rowH})`).style('cursor', 'pointer')
      .on('click', (e, p) => openProfile(p.provider))
      .on('mousemove', (e, p) => tipShow(e, `${p.provider} · ${p.hq}`, [['Live', p.op_mw_text ? trunc(String(p.op_mw_text), 150) : 'not disclosed', C(1)], ['Planned', p.planned_mw_text ? trunc(String(p.planned_mw_text), 150) : 'not disclosed', C(2)]]))
      .on('mouseleave', tipHide);
    g.append('rect').attr('width', W).attr('height', rowH).attr('fill', 'transparent');
    g.append('text').attr('x', lw - 10).attr('y', rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('class', 'strong').text((p, i) => names[i]);
    g.filter((p) => p.op != null && p.pl != null).append('line').attr('x1', (p) => x(Math.max(p.op, x.domain()[0]))).attr('x2', (p) => x(Math.max(p.pl, x.domain()[0]))).attr('y1', rowH / 2).attr('y2', rowH / 2).attr('stroke', MUTED).attr('stroke-width', 2).attr('stroke-linecap', 'round');
    g.filter((p) => p.pl != null && p.pl > 0).append('circle').attr('cx', (p) => x(p.pl)).attr('cy', rowH / 2).attr('r', 5).attr('fill', 'var(--color-panel)').attr('stroke', C(2)).attr('stroke-width', 2.2);
    g.filter((p) => p.op != null && p.op > 0).append('circle').attr('cx', (p) => x(p.op)).attr('cy', rowH / 2).attr('r', 5).attr('fill', C(1));
    g.append('text').attr('x', (p) => x(Math.max(p.op || 0, p.pl || 0, x.domain()[0])) + 10).attr('y', rowH / 2).attr('dy', '0.35em').text(txt);
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
    const el = $('#gen');
    const newest = (p) => { let best = null; p.fams.forEach((k) => { const i = v.famInfo.get(k); if (i && (!best || i.year > best.year)) best = i; }); return best; };
    const g = d3.rollup(f.provs, (a) => a.length, (p) => { const b = newest(p); return b ? `${b.arch}|${b.vendor}|${b.year}` : 'Not specified||0'; });
    const rows = [...g].map(([k, c]) => { const [arch, vendor, year] = k.split('|'); return { arch, vendor, year: +year, c }; }).sort((a, b) => b.year - a.year || b.c - a.c);
    if (!rows.length) { emptyNote(el, 'No providers match these filters.'); return; }
    hbars(el, rows.map((r) => ({
      label: r.vendor ? `${r.arch} (${r.vendor})` : r.arch, value: r.c, text: fInt(r.c), color: r.vendor ? vColor(r.vendor) : MUTED,
      tipTitle: r.arch, tipLines: [['Providers whose newest GPU is this generation', String(r.c)]],
    })), { label: 'Providers by newest GPU generation', rowH: 22 });
  }
  function drawHeat(v, f) {
    const el = $('#heat'); const fam = focus();
    const regs = d3.groups(f.provs.filter((p) => p.region !== 'Unknown'), (p) => p.region).map(([r, a]) => ({ r, a, n: a.length })).sort((a, b) => b.n - a.n);
    const cnt = new Map(); f.provs.forEach((p) => p.fams.forEach((x) => cnt.set(x, (cnt.get(x) || 0) + 1)));
    const cols = [...cnt].filter(([k]) => v.famInfo.has(k) && (!P().vendor || v.famInfo.get(k).vendor === P().vendor)).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k]) => k);
    if (!regs.length || !cols.length) { emptyNote(el, 'Not enough data for a regional mix.'); return; }
    const W = Math.max(320, el.clientWidth || 600), ch = 30;
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
        if (i === 3) { const d = document.createElement('span'); d.className = 'dot'; d.style.background = ownColor(p.ownership); td.append(d, t); } else { td.textContent = t; if (i === 1) withFlag(td, t); if (i === 0) withLogo(td, t, 'sm'); }
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
    [p.hq, p.category, (OWN.find((o) => o[0] === p.ownership) || [0, p.ownership])[1]].forEach((t, i) => { const s = document.createElement('span'); s.className = 'pill'; s.textContent = t; if (i === 0) withFlag(s, t); right.append(s); });
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
      ['Biggest hub', top ? fPct(top[1].n / n) : '—', top ? ['of providers are based in ', [top[0]], ` (${top[1].n} of ${f.provs.length}).`] : ['No providers match.'], top && top[0]],
      ['Most live capacity', cap ? fMW(cap[1].op) : '—', cap ? ['disclosed by ', [`${cap[1].opn} ${cap[0]}`], `-based provider${cap[1].opn > 1 ? 's' : ''}.`] : ['No live capacity disclosed in this selection.'], cap && cap[0]],
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
  dash.onData(() => {
    const core = ['providers', 'prices', 'gpu_families'].map((id) => dash.data(id).status);
    const bad = core.some((s) => s === 'error' || s === 'connect' || s === 'declined' || s === 'missing');
    if (bad || core.some((s) => s !== 'ok')) {
      CHARTS.forEach((s) => { const el = $(s); if (bad) { el.classList.remove('dash-skeleton'); fail(el); } else { el.replaceChildren(); el.classList.add('dash-skeleton'); } });
      ['#rank', '#cheap tbody', '#dir tbody'].forEach((s) => $(s).replaceChildren());
      $('#detail').hidden = true;
      return;
    }
    CHARTS.forEach((s) => $(s).classList.remove('dash-skeleton'));
    applyTheme();
    root.style.setProperty('--gx-accent', 'var(--gx-gblue)'); root.style.setProperty('--gx-accent-2', C(3));
    const v = prep(); const f = filt(v);
    drawFilters(v); drawKpis(v, f);
    const tab = tabOf();
    document.querySelectorAll('.gx-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    TABS.forEach((id) => { document.getElementById(id).hidden = id !== tab; });
    if (tab === 'overview') { drawMap(v, f); drawRank(v, f); insOverview(v, f); drawPlist(v, f); }
    if (tab === 'pricing') { drawStrip(v, f); drawCheap(f); drawPGroup(f); insPricing(f); }
    if (tab === 'capacity') { drawMW(f); drawOwn(f); drawMWC(f); insCapacity(f); }
    if (tab === 'hardware') { drawAvail(v, f); drawGen(v, f); drawHeat(v, f); insHardware(v, f); }
    if (tab === 'directory') { drawDir(f); drawDetail(v); }
    if (!jumped) { jumped = true; const h = location.hash.slice(1); if (TABS.includes(h) && h !== tab) set({ tab: h }); }
  });
})();
