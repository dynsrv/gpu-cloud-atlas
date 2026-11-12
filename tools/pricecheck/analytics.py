"""Build data/price_changes.json['analytics']: per-GPU price index over past checks, discount by
pricing model, and price-per-performance. Run after each price refresh; add the new check's commit to SNAPS."""
import json, subprocess, statistics as S, collections
SNAPS = [('2026-10-21', '827180c'), ('2026-10-31', '082be95'), ('2026-11-10', '16029f0')]
KEY = ['H100','H200','B200','B300','GB200','GH200','A100','L40S','L40','L4','A40','A30','A10','T4','V100','RTX Pro 6000',
       'RTX 6000 Ada','RTX A6000','RTX 5090','RTX 4090','MI300X','MI350/355X']
def git(c): return json.loads(subprocess.check_output(['git', 'show', f'{c}:data/prices.json']))
def q(v, p):
    v = sorted(v); k = (len(v) - 1) * p; f = int(k); c = min(f + 1, len(v) - 1); return v[f] + (v[c] - v[f]) * (k - f)
def provmin(P, fam, basis=None):
    m = {}
    for r in P:
        if r['family'] != fam or not r.get('usd_hr'): continue
        if basis and not (r.get('basis') or 'On-demand').startswith(basis): continue
        m[r['provider']] = min(m.get(r['provider'], 9e9), r['usd_hr'])
    return list(m.values())
cur = json.load(open('data/prices.json'))
snaps = [(d, git(c)) for d, c in SNAPS] + [(json.load(open('data/price_changes.json'))['date'], cur)]
index = {}
for f in KEY:
    pts = []
    for d, P in snaps:
        v = provmin(P, f)
        if len(v) >= 3: pts.append({'d': d, 'med': round(S.median(v), 3), 'p25': round(q(v, .25), 3), 'p75': round(q(v, .75), 3), 'n': len(v)})
    if pts and pts[-1]['n'] >= 6: index[f] = pts
spread = {}
for f in KEY:
    row = {}
    for k, b in (('od', 'On-demand'), ('commit', 'Commitment'), ('spot', 'Spot'), ('serverless', 'Serverless')):
        v = provmin(cur, f, b)
        if len(v) >= 3: row[k] = {'med': round(S.median(v), 3), 'n': len(v)}
    if 'od' in row and len(row) > 1: spread[f] = row
import re
G = {}
for g in json.load(open('data/gpu_specs.json')):
    f = g['family']
    if f not in G or (g.get('bf16_tflops') or 0) > (G[f].get('bf16_tflops') or 0): G[f] = dict(g, benchmarks=(G.get(f, {}).get('benchmarks') or []) + (g.get('benchmarks') or []))
    else: G[f]['benchmarks'] = (G[f].get('benchmarks') or []) + (g.get('benchmarks') or [])
value = []
for f in KEY:
    if f not in index or f not in G: continue
    g = G[f]; med = index[f][-1]['med']; tok = None
    toks = [b['result'] for b in g.get('benchmarks') or [] if re.search(r'Llama ?2[- ]70B.*Offline', b.get('workload', '')) and 'per GPU' in (b.get('unit') or '')]
    tok = max(toks) if toks else None
    value.append({'family': f, 'med': med, 'n': index[f][-1]['n'], 'bf16_tflops': g.get('bf16_tflops'), 'memory_gb': g.get('memory_gb'),
                  'llama70b_tps': tok,
                  'usd_per_pflop_hr': round(med / (g['bf16_tflops'] / 1000), 3) if g.get('bf16_tflops') else None,
                  'usd_per_100gb_hr': round(med / g['memory_gb'] * 100, 3) if g.get('memory_gb') else None,
                  'usd_per_mtok': round(med / (tok * 3600) * 1e6, 4) if tok else None})
D = json.load(open('data/price_changes.json'))
D['analytics'] = {'dates': [d for d, _ in snaps], 'index': index, 'spread': spread, 'value': value,
                  'method': 'Each provider counts once per GPU: its lowest published rate (USD per GPU-hour). Medians and quartiles are across providers. Spread groups each provider\'s lowest rate by the pricing model of that rate. Value divides the median price by the datasheet BF16 dense TFLOPS, HBM capacity and MLPerf Inference Llama 2 70B Offline tokens/s per GPU.'}
json.dump(D, open('data/price_changes.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for f, p in index.items(): print(f, [(x['d'][5:], x['med'], x['n']) for x in p])
for f, s in spread.items(): print(f, s)
for v in value: print(v)
