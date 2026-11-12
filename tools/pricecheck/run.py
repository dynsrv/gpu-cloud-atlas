import json,re,ssl,urllib.request,concurrent.futures,html,gzip,zlib,collections,time
ctx=ssl.create_default_context();ctx.check_hostname=False;ctx.verify_mode=ssl.CERT_NONE
UA={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36','Accept':'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8','Accept-Language':'en-US,en;q=0.9','Accept-Encoding':'gzip, deflate'}
J=json.load(open('job.json'));plan=J['plan'];rows=J['rows']
def fetch(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=25,context=ctx)
        b=r.read(6_000_000);enc=r.headers.get('Content-Encoding','')
        if enc=='gzip': b=gzip.decompress(b)
        elif enc=='deflate': b=zlib.decompress(b)
        return u,r.status,r.geturl(),b.decode('utf8','ignore')
    except Exception as e: return u,getattr(e,'code',0) or str(e)[:60],u,''
urls=sorted({u for v in plan.values() for u in v})
pages={}
with concurrent.futures.ThreadPoolExecutor(32) as ex:
    for u,st,fin,txt in ex.map(fetch,urls): pages[u]=(st,fin,txt)
def vis(t):
    t=re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>',' ',t);t=re.sub(r'<[^>]+>',' ',t);t=html.unescape(t);return re.sub(r'\s+',' ',t)
def raw(t):
    t=html.unescape(t).replace('\\u0024','$').replace('\\"','"');return t
V={u:vis(t) for u,(s,f,t) in pages.items() if t}
R={u:raw(t) for u,(s,f,t) in pages.items() if t}
def nums(t):
    out=[]
    for m in re.finditer(r'(?<![\w.])(\d{1,3}(?:[,.\s]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)',t):
        s=m.group(1)
        if re.fullmatch(r'\d{1,2}',s) and '.' not in s: continue
        out.append(s)
    return out
def variants(s):
    v={s}
    c=s.replace(',','').replace(' ','')
    v.add(c)
    try:
        f=float(c)
        v.add(f'{f:.2f}');v.add(f'{f:,.2f}');v.add(f'{f:g}')
        if f==int(f): v.add(f'{int(f):,}');v.add(str(int(f)))
        v.add(f'{f:.3f}'.rstrip('0'))
    except: pass
    return {x for x in v if len(x)>=3}
def found(x,txt):
    return re.search(r'(?<![\d.])'+re.escape(x)+r'(?![\d])',txt) is not None
FK={'RTX Pro 6000':'PRO 6000','RTX 6000 Ada':'6000 Ada','RTX A6000':'A6000','MI350/355X':'MI35','RTX 4090':'4090','RTX 5090':'5090','Gaudi':'Gaudi','TPU':'TPU','Ascend':'Ascend','MI300X':'MI300X','MI325X':'MI325','GB200':'GB200','GB300':'GB300','GH200':'GH200'}
def key(r):
    if r['fam'] in FK: return FK[r['fam']]
    m=re.search(r'\b([A-Z]{1,3}\d{2,4}[A-Z]?)\b',r['model'])
    return m.group(1) if m else r['fam']
res=[]
byp=collections.defaultdict(list)
for r in rows: byp[r['p']].append(r)
pstat={}
for p,rs in byp.items():
    us=[u for u in plan[p] if u in R]
    pstat[p]={u:(pages[u][0],len(R.get(u,''))) for u in plan[p]}
    for r in rs:
        ns=nums(r['t'])
        k=key(r)
        best=None
        for u in us:
            hit=[n for n in ns if any(found(x,R[u]) or found(x,V[u]) for x in variants(n))]
            km=k.lower() in R[u].lower()
            sc=(len(hit),km)
            if best is None or sc>best[0]: best=(sc,u,hit,km)
        if not best: res.append({'row':r['row'],'st':'nopage'});continue
        (nh,km),u,hit,_=best
        st='all' if ns and nh==len(ns) and km else ('some' if nh else 'none')
        o={'row':r['row'],'st':st,'url':u,'n':len(ns),'hit':nh,'km':km}
        if st!='all':
            snips=[]
            for uu in us:
                T=V[uu]
                for m in re.finditer(re.escape(k),T,re.I):
                    s=T[max(0,m.start()-90):m.end()+170]
                    if re.search(r'[$€£¥₹]|USD|EUR|/h|hour|hr|mo',s) and s not in snips: snips.append(s)
                    if len(snips)>=4: break
                if len(snips)>=4: break
            if len(snips)<2:
                for uu in us:
                    T=R[uu]
                    for m in re.finditer(re.escape(k),T,re.I):
                        s=re.sub(r'\s+',' ',T[max(0,m.start()-60):m.end()+200])
                        if re.search(r'\d\.\d',s) and s not in snips: snips.append(s)
                        if len(snips)>=4: break
                    if len(snips)>=4: break
            o['sn']=[x[:280] for x in snips]
        res.append(o)
json.dump({'res':res,'pstat':pstat},open('res.json','w'))
c=collections.Counter(x['st'] for x in res);print(c)
