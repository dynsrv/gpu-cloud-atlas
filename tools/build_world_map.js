const topo=require('topojson-client'),d3=require('d3-geo'),fs=require('fs');
const w=require('world-atlas/countries-50m.json');
const fc=topo.feature(w,w.objects.countries);
fc.features=fc.features.filter(f=>f.properties.name!=='Antarctica');
const W=960, N=80, Sth=-56;
const proj=d3.geoMercator().fitWidth(W,{type:'MultiPoint',coordinates:[[-180,N],[180,N],[-180,Sth],[180,Sth]]});
const [,y0]=proj([0,N]),[,y1]=proj([0,Sth]); proj.translate([proj.translate()[0],proj.translate()[1]-y0]);
const H=Math.round(y1-y0); proj.clipExtent([[0,0],[W,H]]);
const path=d3.geoPath(proj).digits(+process.argv[3]||1);
const alias={'United States of America':'United States','Czechia':'Czech Republic','Dominican Rep.':'Dominican Republic','Bosnia and Herz.':'Bosnia and Herzegovina',"Côte d'Ivoire":'Ivory Coast'};
// zoom frame: the main landmass plus nearby large parts (skips far overseas territories)
const P2=d3.geoPath(proj);
function mainBB(f){
  const g=f.geometry; if(!g) return null;
  const polys=g.type==='MultiPolygon'?g.coordinates.map(c=>({type:'Polygon',coordinates:c})):[g];
  const ps=polys.map(p=>({b:P2.bounds(p),a:P2.area(p)})).filter(p=>isFinite(p.a)&&p.a>0);
  if(!ps.length) return null;
  const tot=ps.reduce((s,p)=>s+p.a,0); ps.sort((x,y)=>y.a-x.a); const m=ps[0];
  const cx=(m.b[0][0]+m.b[1][0])/2, cy=(m.b[0][1]+m.b[1][1])/2, dg=Math.hypot(m.b[1][0]-m.b[0][0],m.b[1][1]-m.b[0][1]);
  let [[x0,y0],[x1,y1]]=m.b;
  ps.slice(1).forEach(p=>{const px=(p.b[0][0]+p.b[1][0])/2,py=(p.b[0][1]+p.b[1][1])/2;
    if(p.a>=tot*0.01 && Math.hypot(px-cx,py-cy)<=Math.max(1.6*dg,30)){x0=Math.min(x0,p.b[0][0]);y0=Math.min(y0,p.b[0][1]);x1=Math.max(x1,p.b[1][0]);y1=Math.max(y1,p.b[1][1]);}});
  return [x0,y0,x1,y1].map(v=>+v.toFixed(1));
}
const rows=fc.features.map(f=>({country:alias[f.properties.name]||f.properties.name,d:path(f),bb:mainBB(f)})).filter(r=>r.d);
const out=process.argv[2];
fs.writeFileSync(out+'/world_map.json',JSON.stringify(rows));
const c=JSON.parse(fs.readFileSync(out+'/countries.json'));
c.forEach(r=>{const [x,y]=proj([r.lon,r.lat]);r.px=+x.toFixed(1);r.py=+y.toFixed(1)});
fs.writeFileSync(out+'/countries.json',JSON.stringify(c));
console.log('H',H,rows.length,fs.statSync(out+'/world_map.json').size, c.find(r=>r.country==='Singapore'));
