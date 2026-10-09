/* Load approved submissions from the Google Sheet (if configured), then start */
(async()=>{
  const EP=window.SHEET_ENDPOINT;
  if(EP){
    try{
      const rows=await (await fetch(EP+"?action=approved",{cache:"no-store"})).json();
      const have=new Set(window.ENTRIES.map(e=>e[0].toLowerCase()));
      const T={Startup:"Company",Investor:"Capital",Hub:"Ecosystem"};
      rows.forEach(r=>{
        if(!r.Company||have.has(String(r.Company).toLowerCase()))return;
        if(!window.DISTRICTS[r.District])return;
        const type=T[r.Type]||"Company";
        const sector=type==="Company"?(r.Sector&&r.Sector!=="Other"?r.Sector:"B2B SaaS"):type;
        const url=String(r.Website||"").replace(/^https?:\/\//,"").replace(/^www\./,"").replace(/\/.*$/,"");
        window.ENTRIES.push([r.Company,r.Description||"",type,sector,type==="Company"?(r.Stage||"Early"):"—",r.District,url]);
        have.add(String(r.Company).toLowerCase());
      });
    }catch(e){console.warn("Sheet load failed — showing built-in data only",e);}
  }
  start();
})();

function start(){
const $=id=>document.getElementById(id);
const SC=window.SECTOR_COLORS, DISTRICTS=window.DISTRICTS, TOKEN=window.LOGO_TOKEN;
const items=window.ENTRIES.map(([name,desc,type,sector,stage,district,url],i)=>{
  const [la,ln]=DISTRICTS[district],a=(i*2.399963)%(Math.PI*2),r=.0058+(i%5)*.0016;
  return {i,name,desc,type,sector,stage,district,url,c:SC[sector]||"#00f0ff",lat:la+Math.sin(a)*r*.85,lng:ln+Math.cos(a)*r};
});
const ini=n=>n.replace(/[^A-Za-z ]/g,"").split(" ").filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
const logo=(it,s)=>it.url
  ?`<img src="https://img.logo.dev/${it.url}?token=${TOKEN}&size=${s}&format=png&retina=true" alt="${it.name} logo" loading="lazy" onerror="this.outerHTML='<span>${ini(it.name)}</span>'">`
  :`<span>${ini(it.name)}</span>`;
const typeLabel=t=>t==="Company"?"Startup":t==="Capital"?"Investor":"Hub";
const uniq=k=>[...new Set(items.map(i=>i[k]))].filter(v=>v&&v!=="—").sort();
const F={q:"",type:"",district:"",stage:"",sector:""};
let current=null,visible=items;

/* ---------- map ---------- */
const map=L.map("map",{zoomControl:false}).setView([25.15,55.24],11);
const PAD=()=>window.innerWidth>860?{paddingTopLeft:[24,90],paddingBottomRight:[440,90]}:{paddingTopLeft:[10,180],paddingBottomRight:[10,window.innerHeight*.48]};
const HOME=L.latLngBounds([[24.98,55.13],[25.28,55.40]]);
let userMoved=false;
function home(){
  const el=map.getContainer();
  if(!el.clientWidth||!el.clientHeight){requestAnimationFrame(home);return;}
  map.invalidateSize({pan:false});
  const s=map.getSize(),p=PAD();
  const w=s.x-p.paddingTopLeft[0]-p.paddingBottomRight[0],h=s.y-p.paddingTopLeft[1]-p.paddingBottomRight[1];
  let c=L.latLng(25.15,55.26),z=11;
  if(w>=200&&h>=150){
    z=Math.min(12,map.getBoundsZoom(HOME,false,L.point(p.paddingTopLeft).add(p.paddingBottomRight)));
    const dx=(p.paddingBottomRight[0]-p.paddingTopLeft[0])/2,dy=(p.paddingBottomRight[1]-p.paddingTopLeft[1])/2;
    c=map.unproject(map.project(HOME.getCenter(),z).add([dx,dy]),z);
  }
  map.setView(c,z,{reset:true});
  drawMap();
}
function offsetCenter(ll,z){
  const p=PAD(),dx=(p.paddingBottomRight[0]-p.paddingTopLeft[0])/2,dy=(p.paddingBottomRight[1]-p.paddingTopLeft[1])/2;
  return map.unproject(map.project(ll,z).add([dx,dy]),z);
}
L.control.zoom({position:"bottomleft"}).addTo(map);
L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",{attribution:"Tiles © Esri · Data: community",maxZoom:16}).addTo(map);
const layer=L.layerGroup().addTo(map), labels=L.layerGroup().addTo(map);
items.forEach(it=>{
  it._m=L.marker([it.lat,it.lng],{icon:L.divIcon({className:"",iconSize:[34,34],iconAnchor:[17,17],
    html:`<div class="pin" style="--c:${it.c}">${logo(it,80)}</div>`}),title:it.name,riseOnHover:true});
  it._m.bindTooltip(`${it.name}<small>${it.sector==="Capital"||it.sector==="Ecosystem"?typeLabel(it.type):it.sector} · ${it.district}</small>`,{direction:"top",offset:[0,-18]});
  it._m.on("click",()=>openDetail(it));
});
const CLUSTER_ZOOM=13;
const cColor=n=>n>=12?"#ff3dcb":n>=6?"#00f0ff":"#b6ff3b";
const cSize=n=>Math.min(66,34+Math.sqrt(n)*7);

function drawLabels(boxes){
  labels.clearLayers();
  const z=map.getZoom(),placed=boxes.slice(),W=170,H=14;
  const free=b=>!placed.some(p=>Math.abs(p.x-b.x)<(p.w+b.w)/2+6&&Math.abs(p.y-b.y)<(p.h+b.h)/2+4);
  window.PLACES.filter(p=>z>=(p[3]===1?9:p[3]===2?12:13)).forEach(([n,la,ln])=>{
    const p=map.latLngToLayerPoint([la,ln]),w=n.length*7.6+8;
    const slots=[[0,28,[W/2,-21],"center"],[0,-28,[W/2,H+21],"center"],[w/2+24,0,[-24,H/2],"left"],[-(w/2+24),0,[W+24,H/2],"right"]];
    const s=slots.find(s=>free({x:p.x+s[0],y:p.y+s[1],w,h:H}));
    if(!s)return;
    placed.push({x:p.x+s[0],y:p.y+s[1],w,h:H});
    labels.addLayer(L.marker([la,ln],{interactive:false,zIndexOffset:-900,icon:L.divIcon({className:"",iconSize:[W,H],iconAnchor:s[2],
      html:`<div class="plabel" style="text-align:${s[3]}">${n}</div>`})}));
  });
}
function drawMap(){
  layer.clearLayers();
  if(map.getZoom()>=CLUSTER_ZOOM){
    visible.forEach(it=>layer.addLayer(it._m));
    drawLabels(visible.map(it=>{const p=map.latLngToLayerPoint([it.lat,it.lng]);return{x:p.x,y:p.y,w:38,h:38};}));
    markActive();return;
  }
  const by=new Map();
  visible.forEach(it=>{if(!by.has(it.district))by.set(it.district,[]);by.get(it.district).push(it);});
  let g=[...by].map(([d,arr])=>{const p=map.latLngToLayerPoint(DISTRICTS[d]);return{names:[d],n:arr.length,x:p.x,y:p.y};}).sort((a,b)=>b.n-a.n);
  const rad=x=>cSize(x.n)/2+8;
  for(let pass=0;pass<20;pass++){
    let m=false;
    outer:for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){
      const a=g[i],b=g[j];
      if(Math.hypot(a.x-b.x,a.y-b.y)<rad(a)+rad(b)){
        const t=a.n+b.n;g[i]={names:a.names.concat(b.names),n:t,x:(a.x*a.n+b.x*b.n)/t,y:(a.y*a.n+b.y*b.n)/t};
        g.splice(j,1);m=true;break outer;
      }
    }
    if(!m)break;g.sort((a,b)=>b.n-a.n);
  }
  g.forEach((c,idx)=>{
    const s=cSize(c.n),ll=map.layerPointToLatLng([c.x,c.y]);
    const mk=L.marker(ll,{zIndexOffset:500-idx*10,icon:L.divIcon({className:"",iconSize:[s,s],iconAnchor:[s/2,s/2],
      html:`<div class="cl" style="--c:${cColor(c.n)};width:${s}px;height:${s}px"><b>${c.n}</b></div>`})});
    mk.bindTooltip(`${c.names.join(" · ")}<small>${c.n} ${c.n===1?"entity":"entities"} · click to zoom</small>`,{direction:"top",offset:[0,-s/2-4]});
    mk.on("click",()=>{userMoved=true;const z=c.names.length>1?13:14;map.flyTo(offsetCenter(ll,z),z,{duration:.6});});
    layer.addLayer(mk);
  });
  drawLabels(g.map(c=>{const s=cSize(c.n)+16;return{x:c.x,y:c.y,w:s,h:s};}));
}
map.on("zoomend moveend",drawMap);
function markActive(){
  items.forEach(it=>{const el=it._m.getElement();if(el)el.firstElementChild.classList.toggle("on",it===current);});
}

/* ---------- filters ---------- */
const sel={district:$("f-district"),stage:$("f-stage")};
Object.entries(sel).forEach(([k,el])=>{
  uniq(k).forEach(v=>el.append(new Option(v,v)));
  el.onchange=()=>{F[k]=el.value;render();};
});
document.querySelectorAll("#seg-type button").forEach(b=>b.onclick=()=>{
  F.type=b.dataset.v;document.querySelectorAll("#seg-type button").forEach(x=>x.setAttribute("aria-pressed",x===b));render();
});
$("q").oninput=e=>{F.q=e.target.value.trim().toLowerCase();render();};
document.addEventListener("keydown",e=>{
  if(e.key==="/"&&document.activeElement.tagName!=="INPUT"&&document.activeElement.tagName!=="TEXTAREA"){e.preventDefault();$("q").focus();}
  if(e.key==="Escape"){if($("overlay").classList.contains("open"))closeSubmit();else closeDetail();}
});
$("reset").onclick=()=>{
  Object.assign(F,{q:"",type:"",district:"",stage:"",sector:""});
  $("q").value="";Object.values(sel).forEach(s=>s.value="");
  document.querySelectorAll("#seg-type button").forEach((x,i)=>x.setAttribute("aria-pressed",i===0));render();
};
const match=(it,skip)=>{
  for(const k of ["type","district","stage","sector"]) if(k!==skip&&F[k]&&it[k]!==F[k])return false;
  return !F.q||(it.name+" "+it.desc+" "+it.sector+" "+it.district+" "+typeLabel(it.type)).toLowerCase().includes(F.q);
};

/* ---------- sector stats bar ---------- */
function renderBar(){
  const base=items.filter(it=>match(it,"sector")&&it.type==="Company");
  const counts=uniq("sector").filter(s=>s!=="Capital"&&s!=="Ecosystem").map(s=>[s,base.filter(i=>i.sector===s).length]).sort((a,b)=>b[1]-a[1]);
  const max=Math.max(1,...counts.map(c=>c[1]));
  $("sbar").innerHTML=`<span class="lab">Sectors</span>`+counts.map(([s,n])=>
    `<button class="sc" style="--c:${SC[s]}" aria-pressed="${F.sector===s}" data-s="${s}">${s}<span class="bar"><i style="width:${n/max*100}%"></i></span><small>${n}</small></button>`).join("");
  $("sbar").querySelectorAll(".sc").forEach(b=>b.onclick=()=>{F.sector=F.sector===b.dataset.s?"":b.dataset.s;render();});
}

/* ---------- list ---------- */
const rowHTML=it=>`<div class="row" data-i="${it.i}"><div class="lg">${logo(it,80)}</div>
  <div><h3>${it.name}</h3><p>${it.type==="Company"?it.sector:typeLabel(it.type)} · ${it.district}</p></div><span class="dot" style="--c:${it.c}"></span></div>`;
function bindRows(root){root.querySelectorAll(".row").forEach(r=>r.onclick=()=>openDetail(items[+r.dataset.i],true));}
function render(){
  visible=items.filter(it=>match(it));
  $("count").textContent=`${visible.length} of ${items.length}`;
  $("tcount").textContent=visible.length;
  $("list").innerHTML=visible.length?visible.map(rowHTML).join(""):`<div class="empty">Nothing matches — try resetting filters.</div>`;
  bindRows($("list"));
  renderBar();drawMap();
}

/* ---------- spotlight ---------- */
const spot=window.FEATURED.map(n=>items.find(i=>i.name===n)).filter(Boolean);
$("scount").textContent=String(spot.length).padStart(2,"0");
$("spotlist").innerHTML=spot.map((it,k)=>`<div class="scard" style="--c:${it.c}" data-i="${it.i}"><span class="no">${String(k+1).padStart(2,"0")}</span>
  <div class="hd"><div class="lg">${logo(it,96)}</div><div><h3>${it.name}</h3><div class="tg">${it.sector} · ${it.stage} stage</div></div></div><p>${it.desc}</p></div>`).join("");
$("spotlist").querySelectorAll(".scard").forEach(c=>c.onclick=()=>openDetail(items[+c.dataset.i],true));
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.setAttribute("aria-selected",x===t));
  $("dir").hidden=t.dataset.tab!=="dir";$("spot").hidden=t.dataset.tab!=="spot";
});

/* ---------- detail drawer ---------- */
function openDetail(it,fly){
  current=it;
  const pool=visible.includes(it)?visible:items, idx=pool.indexOf(it);
  $("d-idx").textContent=`${String(idx+1).padStart(2,"0")} / ${String(pool.length).padStart(2,"0")}`;
  const near=items.filter(x=>x!==it&&x.district===it.district).slice(0,5);
  $("dbody").innerHTML=`
    <div class="dhero" style="--c:${it.c}"><div class="lg">${logo(it,192)}</div>
      <div><h2>${it.name}</h2><div class="tg">${typeLabel(it.type)}${it.type==="Company"?" · "+it.sector:""}</div></div></div>
    <p class="ddesc">${it.desc}</p>
    <div class="facts">
      <div><i>District</i><b>${it.district}</b></div>
      <div><i>Stage</i><b>${it.stage==="—"?"n/a":it.stage}</b></div>
      <div><i>Type</i><b>${typeLabel(it.type)}</b></div>
      <div><i>Website</i><b>${it.url||"—"}</b></div>
    </div>
    <div class="dact">
      ${it.url?`<a class="btn sm" href="https://${it.url}" target="_blank" rel="noopener">Visit website ↗</a>`:""}
      <button class="btn sm ghost" id="d-fly">Show on map</button>
    </div>
    ${near.length?`<div class="near"><h4>Also in ${it.district}</h4>${near.map(rowHTML).join("")}</div>`:""}`;
  bindRows($("dbody"));
  $("d-fly").onclick=()=>fly2(it);
  $("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false");
  $("dbody").scrollTop=0;
  if(fly)fly2(it);else markActive();
  $("d-prev").onclick=()=>openDetail(pool[(idx-1+pool.length)%pool.length],true);
  $("d-next").onclick=()=>openDetail(pool[(idx+1)%pool.length],true);
}
function fly2(it){
  userMoved=true;
  map.flyTo(offsetCenter(L.latLng(it.lat,it.lng),15),15,{duration:.7});
  map.once("moveend",markActive);
}
function closeDetail(){current=null;$("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true");markActive();}
$("d-close").onclick=closeDetail;

/* ---------- forms ---------- */
async function post(form){
  const EP=window.SHEET_ENDPOINT;
  if(EP){
    const r=await fetch(EP,{method:"POST",body:new URLSearchParams(new FormData(form))});
    const j=await r.json().catch(()=>({ok:r.ok}));
    if(!j.ok)throw new Error("sheet");return j;
  }
  const r=await fetch(form.action,{method:"POST",body:new FormData(form),headers:{Accept:"application/json"}});
  if(!r.ok)throw new Error(r.status);return r;
}
const ov=$("overlay");
[["s-t","type"],["s-d","district"],["s-se","sector"],["s-st","stage"]].forEach(([id,k])=>{
  const el=$(id);el.append(new Option("Select…",""));
  (k==="type"?["Startup","Investor","Hub"]:uniq(k).filter(v=>v!=="Capital"&&v!=="Ecosystem")).forEach(v=>el.append(new Option(v,v)));
  el.append(new Option("Other","Other"));
});
const openSubmit=()=>{ov.classList.add("open");setTimeout(()=>$("s-n").focus(),50);};
function closeSubmit(){ov.classList.remove("open");$("sub-wrap").style.display="";$("sub-thanks").style.display="none";$("sub-err").style.display="none";}
$("open-submit").onclick=openSubmit;$("sub-cancel").onclick=closeSubmit;$("sub-done").onclick=closeSubmit;
ov.onclick=e=>{if(e.target===ov)closeSubmit();};
$("sub").onsubmit=async e=>{
  e.preventDefault();const f=e.target,b=f.querySelector("[type=submit]");
  b.disabled=true;b.textContent="Sending…";$("sub-err").style.display="none";
  try{await post(f);f.reset();$("sub-wrap").style.display="none";$("sub-thanks").style.display="block";}
  catch{$("sub-err").style.display="block";}
  finally{b.disabled=false;b.textContent="Send submission";}
};
$("nl").onsubmit=async e=>{
  e.preventDefault();const f=e.target,b=f.querySelector("[type=submit]"),m=$("nl-msg");
  b.disabled=true;m.textContent="";
  try{await post(f);f.reset();m.style.color="var(--lime)";m.textContent="You're on the list.";}
  catch{m.style.color="#ff8fa8";m.textContent="Couldn't subscribe — try again shortly.";}
  finally{b.disabled=false;}
};

/* ---------- init ---------- */
$("k1").textContent=items.length;
$("k2").textContent=uniq("district").length;
$("k3").textContent=items.filter(i=>i.type==="Capital").length;
render();
home();
{const el=map.getContainer();let n=0;const iv=setInterval(()=>{
  const s=map.getSize();
  if(!userMoved&&(s.x!==el.clientWidth||s.y!==el.clientHeight||!document.querySelector(".leaflet-tile-loaded")))home();
  if(++n>40)clearInterval(iv);
},200);}
setTimeout(()=>{if(!userMoved)home();},0);
setTimeout(()=>{if(!userMoved)home();},300);
document.fonts&&document.fonts.ready.then(()=>{if(!userMoved)home();});
if(document.readyState!=="complete")addEventListener("load",()=>{if(!userMoved)home();});
window.addEventListener("resize",()=>{clearTimeout(rzT);rzT=setTimeout(()=>{if(userMoved){map.invalidateSize();drawMap();}else home();},80);});
map.getContainer().addEventListener("pointerdown",()=>userMoved=true);
map.getContainer().addEventListener("wheel",()=>userMoved=true,{passive:true});
let rzT;new ResizeObserver(()=>{clearTimeout(rzT);rzT=setTimeout(()=>{if(userMoved){map.invalidateSize();drawMap();}else home();},80);}).observe($("map"));
}
