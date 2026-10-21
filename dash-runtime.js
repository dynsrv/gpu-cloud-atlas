/* Standalone stand-in for the dashboard host: loads the datasets, keeps filter state in the URL. */
(function () {
  const DEFAULTS = { category: null, country: null, dir: 'desc', family: null, metric: 'providers', ownership: null, pgroup: 'region', q: null, region: null, sel: null, sort: 'op_mw', tab: 'overview' };
  const SETS = ['providers', 'prices', 'gpu_families', 'countries', 'world_map', 'dc_cities', 'flags', 'logos', 'provider_details', 'gpu_specs'];
  // the dashboard draws as soon as these arrive; the rest fill in after
  const CORE = ['providers', 'prices', 'gpu_families'];
  const store = {}; SETS.forEach((id) => { store[id] = { status: 'loading', data: null }; });
  const subs = [];
  const readUrl = () => { const p = { ...DEFAULTS }; new URLSearchParams(location.search).forEach((v, k) => { p[k] = v === '' ? null : v; }); return p; };
  let params = readUrl();
  const writeUrl = () => { const u = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => { if (v != null && v !== DEFAULTS[k]) u.set(k, v); }); const s = u.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); };
  let queued = false;
  const fire = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }, 0); };
  window.dash = {
    colors: ['#2D72D2', '#238551', '#C87619', '#7961DB', '#CD4246', '#00A396', '#DB2C6F', '#8EB125'],
    data: (id) => store[id] || { status: 'missing', data: null },
    onData: (f) => { subs.push(f); fire(); },
    params: () => ({ ...params }),
    setParams: (o) => { params = { ...params, ...o }; writeUrl(); fire(); },
    resetParams: () => { const t = params.theme; params = { ...DEFAULTS }; if (t) params.theme = t; writeUrl(); fire(); },
    setLink: () => {},
  };
  window.addEventListener('popstate', () => { params = readUrl(); fire(); });
  const V = (() => { try { return new URL(document.currentScript.src).searchParams.get('v') || ''; } catch (e) { return ''; } })();
  // per-dataset cache keys (content hashes injected into index.html), so a deploy only re-downloads the files that changed
  const DV = window.__DV || {};
  const url = (id) => '/data/' + id + '.json' + (DV[id] || V ? '?v=' + (DV[id] || V) : '');
  const settled = {};
  const load = (id, pri) => fetch(url(id), { priority: pri }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { store[id] = { status: 'ok', data: d }; }).catch(() => { store[id] = { status: 'error', data: null }; })
    .then(() => { settled[id] = true; });
  // 1) everything the first screen draws: fetched together, rendered once (no half-drawn map, no second full render)
  const q0 = readUrl();
  const FIRST = ['providers', 'prices', 'gpu_families', 'countries', 'world_map', 'dc_cities']
    .concat(q0.tab === 'datasheet' ? ['gpu_specs'] : [], q0.sel || q0.tab === 'directory' ? ['provider_details', 'flags', 'logos'] : []);
  const LATE = SETS.filter((id) => !FIRST.includes(id));
  Promise.all(FIRST.map((id) => load(id, CORE.includes(id) ? 'high' : 'auto'))).then(() => {
    fire();
    // 2) the rest (logos, long profiles, datasheet) after the first paint, batched into one more render
    const go = () => Promise.all(LATE.map((id) => load(id, 'low'))).then(() => fire());
    (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(go, { timeout: 1500 });
  });
})();
