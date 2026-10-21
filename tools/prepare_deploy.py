#!/usr/bin/env python3
"""Usage: tools/prepare_deploy.py <full-commit-sha>
Writes deploy/out/index.html and deploy/out/vercel.json for the Vercel bootstrap deployment.
- code files are cache-busted by the 7-char commit sha
- every data/*.json gets its own content hash (window.__DV), so unchanged datasets stay in the browser cache across deploys"""
import hashlib, json, pathlib, sys
sha = sys.argv[1]; root = pathlib.Path(__file__).resolve().parent.parent
dv = {p.stem: hashlib.sha1(p.read_bytes()).hexdigest()[:8] for p in sorted((root / 'data').glob('*.json'))}
html = (root / 'deploy/index.template.html').read_text().replace('__V__', sha[:7]).replace('__DV__', json.dumps(dv, separators=(',', ':')))
out = root / 'deploy/out'; out.mkdir(exist_ok=True)
(out / 'index.html').write_text(html)
vj = {"rewrites": [{"source": "/:path*", "destination": f"https://cdn.jsdelivr.net/gh/dynsrv/gpu-cloud-atlas@{sha}/:path*"}],
      "headers": [{"source": "/", "headers": [{"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"}]}]}
(out / 'vercel.json').write_text(json.dumps(vj, separators=(',', ':')))
print(len(html), 'bytes index.html;', len(dv), 'datasets hashed')
