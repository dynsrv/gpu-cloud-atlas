"""Fetch website icons for providers that have no Logo.dev logo.
Sources, best first: Google favicon service (128px), DuckDuckGo icon service.
Writes icons.json: [{provider, domain, source, px, logo: data URI (28px WebP)}] and icons_report.txt."""
import base64, io, json, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

UA = {'User-Agent': 'Mozilla/5.0 (GPU Cloud Atlas icon fetch)'}
def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15) as r:
            if r.status != 200: return None
            return r.read()
    except Exception:
        return None

def load(b):
    try:
        im = Image.open(io.BytesIO(b))
        if getattr(im, 'n_frames', 1) > 1 or im.format == 'ICO':
            # pick the largest frame of an .ico
            try:
                sizes = sorted(im.info.get('sizes', []) or [im.size], key=lambda s: s[0] * s[1])
                im.size = sizes[-1]
            except Exception:
                pass
        im.load(); return im.convert('RGBA')
    except Exception:
        return None

def blank(im):
    ex = im.getextrema()
    return ex[3][1] == 0 or all(lo == hi for lo, hi in ex[:3])

def cands(dom):
    base = dom.split('/')[0]
    roots = [base] + ([base.split('.', 1)[1]] if base.count('.') >= 2 else [])
    for d in roots:
        yield 'google', f'https://www.google.com/s2/favicons?domain={d}&sz=128'
        yield 'duckduckgo', f'https://icons.duckduckgo.com/ip3/{d}.ico'

def fetch(row):
    best = None
    for src, url in cands(row['domain']):
        b = get(url)
        if not b: continue
        im = load(b)
        if im is None or blank(im) or im.size[0] < 16: continue
        if best is None or im.size[0] > best[1].size[0]: best = (src, im)
        if best and best[1].size[0] >= 64: break
    if not best: return dict(provider=row['provider'], domain=row['domain'], source=None)
    src, im = best
    S = 28; c = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    im.thumbnail((S, S), Image.LANCZOS)
    c.paste(im, ((S - im.size[0]) // 2, (S - im.size[1]) // 2), im)
    out = io.BytesIO(); c.save(out, 'WEBP', quality=86, method=6)
    return dict(provider=row['provider'], domain=row['domain'], source=src, px=best[1].size[0] if hasattr(best[1], 'size') else None,
                logo='data:image/webp;base64,' + base64.b64encode(out.getvalue()).decode())

rows = json.load(open(sys.argv[1]))
with ThreadPoolExecutor(12) as ex: res = list(ex.map(fetch, rows))
ok = [r for r in res if r.get('logo')]
json.dump(ok, open('icons.json', 'w'), separators=(',', ':'))
open('icons_report.txt', 'w').write('\n'.join(f"{r['provider']}\t{r['domain']}\t{r.get('source')}" for r in res))
print(len(rows), 'rows,', len(ok), 'icons')
