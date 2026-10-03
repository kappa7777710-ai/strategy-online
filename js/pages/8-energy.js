// Вкладка 8 · «Энергия» — мнемосхема энергосистемы базы, перенесённая один в один с макета
// designs/energy/2-mnemonic.html: солнце и источники слева сверху, аккумуляторы и сброс излишка
// слева снизу, шина базы по центру, группы потребителей справа, живые потоки энергии между узлами.
// Единицы — реальные (кВт для потоков, Дж для запаса) — см. fmtPowerKw/fmtStoredEnergyKwh в core.js.
// Под «i» у солнца — «Профиль суток», под «i» у солнечных панелей — «Выработка по часам»: оба
// расчётные (sunFactor × текущий парк панелей), не история — игра не ведёт поминутных логов.
//
// Панель обновляется раз в секунду, но DOM схемы строится заново только когда меняется её
// структура (набор зданий, открытый поповер). В остальные тики обновляются
// лишь значения — элементы с data-live, — иначе CSS-анимации потоков и переходы полос
// перезапускались бы каждую секунду.

let sunPopOpen=false;
let genPopOpen=null;
let energyStructKey='';

const EN_GROUPS=[
  {id:'miner',  name:'Горнодобыча', color:'#C9A227',      what:'Сейчас добывается'},
  {id:'drill',  name:'Бурение',     color:'#49B8F0',      what:'Сейчас бурится'},
  {id:'farm',   name:'Фермы',       color:'#8CAF52',      what:'Сейчас выращивается'},
  {id:'kitchen',name:'Пищеблоки',   color:'var(--ration)',what:'Сейчас готовится'},
  {id:'other',  name:'Прочее',      color:'var(--tier1)', what:'Сейчас работает'},
];
const EN_GEN_COLOR={solar:'#FFDD57', tpp:'#F2A93B'};

function energyGenerators(){ return BUILDINGS.filter(b=>(b.type==='solar'||b.type==='tpp') && (state.buildings[b.id]||0)>0); }
function energyConsumerGroups(){
  const known=EN_GROUPS.map(g=>g.id);
  return EN_GROUPS.map(g=>({
    ...g,
    list:BUILDINGS.filter(b=>b.power && (state.buildings[b.id]||0)>0 && (known.includes(b.type)?b.type:'other')===g.id),
  })).filter(g=>g.list.length);
}
function energyInstalledKw(b){ return b.power*(state.buildings[b.id]||0)/b.cycle*3600; }
function fmtKwh(kwh){
  const sc=[[1,'кВт·ч'],[1e3,'МВт·ч'],[1e6,'ГВт·ч']], a=Math.abs(kwh);
  let i=0; sc.forEach((s,k)=>{ if(a>=s[0]) i=k; });
  const x=kwh/sc[i][0], d=Math.abs(x)>=100?0:Math.abs(x)>=10?1:2;
  return (kwh===0?'0':x.toFixed(d))+' '+sc[i][1];
}
function fmtDurHm(sec){
  sec=Math.max(0,Math.round(sec));
  const d=Math.floor(sec/86400), h=Math.floor(sec%86400/3600), m=Math.floor(sec%3600/60);
  if(d>0) return d+' д '+h+' ч';
  if(h>0) return h+' ч '+m+' м';
  if(m>0) return m+' м';
  return sec+' с';
}
// Сводка на текущий тик: всё, что показывают узлы и потоки.
function energyNow(){
  const bal=energyBalance(), frac=Math.max(0,Math.min(1,lastPowerFraction));
  const groups=energyConsumerGroups();
  const installed=groups.reduce((s,g)=>s+g.list.reduce((s2,b)=>s2+energyInstalledKw(b),0),0);
  const supply=bal.draw;
  const demand=frac>=0.999?supply:frac>0.001?supply/frac:installed;
  const stored=state.resources.energy||0, cap=energyCapacity();
  const full=cap>0 && stored>=cap-1e-6;
  const curtail=full && bal.net>0 ? bal.net : 0;
  const flow=bal.net-curtail;
  const nameplate=energyGenerators().reduce((s,b)=>s+energyNameplateKw(b),0);
  return {bal, frac, supply, demand, stored, cap, pct:cap>0?Math.min(100,stored/cap*100):0, curtail, flow, nameplate, sun:sunFactor(state.playSeconds)};
}

/* ---------- «Профиль суток» — расчётная кривая выработки по часам (не история) ---------- */
function energySunProfile(){
  const gens=energyGenerators(), gen=new Array(24).fill(0), bal=energyBalance();
  gens.forEach(b=>{
    if(b.type==='solar'){
      const nameplate=energyNameplateKw(b);
      for(let h=0;h<24;h++) gen[h]+=nameplate*sunFactor(h*3600+1800);
    }else{
      const now=recipeRatePerHour(b);
      for(let h=0;h<24;h++) gen[h]+=now;
    }
  });
  return {gen, demandKw:bal.draw};
}
function dialPoint(cx,cy,r,deg){ const a=(deg-90)*Math.PI/180; return [cx+r*Math.cos(a),cy+r*Math.sin(a)]; }
function dialSector(cx,cy,r0,r1,d0,d1){
  const a=dialPoint(cx,cy,r1,d0), b=dialPoint(cx,cy,r1,d1), c=dialPoint(cx,cy,r0,d1), d=dialPoint(cx,cy,r0,d0), big=(d1-d0)>180?1:0;
  return 'M'+a[0].toFixed(1)+' '+a[1].toFixed(1)+' A'+r1+' '+r1+' 0 '+big+' 1 '+b[0].toFixed(1)+' '+b[1].toFixed(1)+
    ' L'+c[0].toFixed(1)+' '+c[1].toFixed(1)+' A'+r0+' '+r0+' 0 '+big+' 0 '+d[0].toFixed(1)+' '+d[1].toFixed(1)+' Z';
}
function buildSunDialSvg(){
  const CX=150, CY=150, R0=96, RMAX=30;
  const prof=energySunProfile();
  const cap=energyCapacity(), cur=state.resources.energy||0, pct=cap>0?Math.min(100,cur/cap*100):0;
  let top=1; prof.gen.forEach(v=>{ if(v>top) top=v; }); if(prof.demandKw>top) top=prof.demandKw;
  const k=RMAX/top;
  let bg='', wedges='', hits='', ticks='';
  for(let h=0;h<24;h++){
    const d0=h*15+0.4, d1=(h+1)*15-0.4, sf=sunFactor(h*3600+1800);
    bg+='<path d="'+dialSector(CX,CY,166,172,d0,d1)+'" fill="rgba(255,221,87,'+(0.08+0.72*sf).toFixed(2)+')"/>';
    const lg=prof.gen[h]*k;
    if(lg>0.5) wedges+='<path d="'+dialSector(CX,CY,R0+1,R0+1+lg,d0,d1)+'" fill="var(--energy)" opacity=".9"/>';
    hits+='<path class="en-dial-hit" d="'+dialSector(CX,CY,40,164,h*15,(h+1)*15)+'"><title>'+String(h).padStart(2,'0')+':00–'+String((h+1)%24).padStart(2,'0')+':00 · выработка ≈'+fmtPowerKw(prof.gen[h])+'</title></path>';
    if(h%6===0){
      const t=dialPoint(CX,CY,182,h*15);
      ticks+='<text x="'+t[0].toFixed(1)+'" y="'+(t[1]+4).toFixed(1)+'" text-anchor="middle" font-size="11" fill="var(--text-secondary)">'+String(h).padStart(2,'0')+':00</text>';
    }
  }
  const demR=R0+1+Math.min(RMAX+4,prof.demandKw*k);
  const demCircle='<circle cx="'+CX+'" cy="'+CY+'" r="'+demR.toFixed(1)+'" fill="none" stroke="#5AA9FF" stroke-width="1.4" stroke-dasharray="4 4" opacity=".85"/>';
  const ringR=44, ringCirc=2*Math.PI*ringR, dash=(ringCirc*pct/100).toFixed(1);
  const center='<circle cx="'+CX+'" cy="'+CY+'" r="60" fill="var(--bg)" stroke="var(--border)"/>'+
    '<circle cx="'+CX+'" cy="'+CY+'" r="'+ringR+'" fill="none" stroke="var(--border)" stroke-width="9"/>'+
    '<circle cx="'+CX+'" cy="'+CY+'" r="'+ringR+'" fill="none" stroke="'+(pct<15?'var(--bad)':'var(--tier0)')+'" stroke-width="9" stroke-linecap="round" transform="rotate(-90 '+CX+' '+CY+')" stroke-dasharray="'+dash+' '+ringCirc.toFixed(1)+'"/>'+
    '<text x="'+CX+'" y="'+(CY-1)+'" text-anchor="middle" font-size="20" font-weight="500" fill="var(--text-primary)">'+Math.round(pct)+'%</text>'+
    '<text x="'+CX+'" y="'+(CY+16)+'" text-anchor="middle" font-size="10.5" fill="var(--text-secondary)">'+fmtStoredEnergyKwh(cur)+'</text>';
  const clockDeg=gameClockSec(state.playSeconds)/86400*360;
  const hp1=dialPoint(CX,CY,66,clockDeg), hp2=dialPoint(CX,CY,160,clockDeg);
  const hand='<line x1="'+hp1[0].toFixed(1)+'" y1="'+hp1[1].toFixed(1)+'" x2="'+hp2[0].toFixed(1)+'" y2="'+hp2[1].toFixed(1)+'" stroke="#fff" stroke-width="1.5" opacity=".85" stroke-linecap="round"/>'+
    '<circle cx="'+hp2[0].toFixed(1)+'" cy="'+hp2[1].toFixed(1)+'" r="4" fill="#fff"/>';
  return '<svg viewBox="-54 -44 408 390" role="img" aria-label="Прогноз выработки по часам суток">'+
    '<circle cx="150" cy="150" r="176" fill="#0A0F20" stroke="var(--border)"/>'+
    '<circle cx="150" cy="150" r="'+R0+'" fill="none" stroke="var(--border)" stroke-dasharray="3 5"/>'+
    bg+wedges+demCircle+ticks+hits+center+hand+'</svg>';
}

/* ---------- «Выработка по часам» у солнечной панели ---------- */
function buildGenHeatmap(b){
  const nameplate=energyNameplateKw(b);
  let max=0; const vals=[];
  for(let h=0;h<24;h++){ const v=nameplate*sunFactor(h*3600+1800); vals.push(v); if(v>max) max=v; }
  const curH=Math.floor(gameClockSec(state.playSeconds)/3600);
  let cells='';
  vals.forEach((v,h)=>{
    const t=max>0?v/max:0;
    cells+='<div class="en-hm-cell'+(h===curH?' now':'')+'" style="background:rgba(255,221,87,'+(0.1+0.8*t).toFixed(2)+')" title="'+String(h).padStart(2,'0')+':00 · '+fmtPowerKw(v)+'"></div>';
  });
  return '<div class="en-hm-grid">'+cells+'</div>'+
    '<div class="en-hm-legend"><span>00:00</span><span style="flex:1"></span><span>12:00</span><span style="flex:1"></span><span>23:00</span></div>'+
    '<div class="en-hm-legend"><span>Пик: '+fmtPowerKw(max)+' · за сутки ≈ '+fmtKwh(vals.reduce((s,v)=>s+v,0))+'</span></div>';
}

/* ---------- узлы мнемосхемы (стили m-* — как в макете) ---------- */
function infoBtn(attr,open,title){
  return '<button type="button" class="en-info" '+attr+' aria-expanded="'+open+'" title="'+title+'">i</button>';
}
function renderSunNode(c){
  const day=c.sun>0.001;
  return '<div class="m-node m-sun" id="enNodeSun">'+
    '<div class="m-sunrow">'+
      '<svg class="m-sunico" viewBox="0 0 54 54" aria-hidden="true">'+
        '<g class="m-sunrays" data-live="sunRays" opacity="'+Math.max(.1,c.sun).toFixed(2)+'"><path d="M27 3v8M27 43v8M3 27h8M43 27h8M10 10l5.7 5.7M38.3 38.3L44 44M44 10l-5.7 5.7M15.7 38.3L10 44" stroke="#FFDD57" stroke-width="3" stroke-linecap="round"/></g>'+
        '<circle data-live="sunDisc" cx="27" cy="27" r="11" fill="'+(day?'#FFDD57':'#C9D2EE')+'" opacity="'+Math.max(.25,c.sun).toFixed(2)+'"/>'+
        '<circle data-live="moonCut" cx="32" cy="23" r="10" fill="#131A2E" opacity="'+(day?0:1)+'"/>'+
      '</svg>'+
      '<div style="flex:1;min-width:0"><div class="m-nh" style="margin:0"><h3>Солнце</h3>'+infoBtn('data-toggle-sun-pop',sunPopOpen,'Профиль суток')+'</div>'+
        '<div class="m-big" data-live="sunPct">'+Math.round(c.sun*100)+'%</div>'+
        '<div class="m-of" data-live="sunTxt">'+(day?'День':'Ночь')+' · '+dayClockStr(state.playSeconds)+'</div></div>'+
    '</div>'+
    (sunPopOpen?
      '<div class="en-dialpop" id="enSunPop">'+
        '<div class="en-dialpop-head"><h4>Профиль суток</h4><button type="button" class="en-dialpop-close" data-close-sun-pop aria-label="Закрыть">×</button></div>'+
        '<p class="en-dialpop-note">Расчётная кривая по текущему парку панелей — не история. Пунктир — текущее потребление, кольцо в центре — заряд аккумуляторов.</p>'+
        '<div data-live="sunDial">'+buildSunDialSvg()+'</div>'+
        '<div class="en-key"><span><i style="background:var(--energy)"></i>Выработка солнца</span><span><i style="background:#5AA9FF"></i>Текущее потребление</span></div>'+
      '</div>':'')+
  '</div>';
}
function renderGenNode(b,c){
  const count=state.buildings[b.id]||0, now=recipeRatePerHour(b), nameplate=energyNameplateKw(b);
  const pct=nameplate>0?Math.min(100,now/nameplate*100):0, isSolar=b.type==='solar', k='gen_'+b.id;
  const title=isSolar?'Солнечные панели':recipeLabel(b);
  let extra='';
  if(isSolar){
    let tiles=''; for(let i=0;i<Math.min(count,24);i++) tiles+='<i></i>';
    const daily=Array.from({length:24},(_,h)=>nameplate*sunFactor(h*3600+1800)).reduce((s,v)=>s+v,0);
    extra='<div class="m-tiles" data-live="'+k+'_tiles" style="--to:'+(0.12+0.88*c.sun).toFixed(2)+'">'+tiles+'</div>'+
      '<div class="m-line"><span>Прогноз на сутки</span><b data-live="'+k+'_day">'+fmtKwh(daily)+'</b></div>';
  }else{
    extra='<div class="m-line"><span>Работает</span><b data-live="'+k+'_util">'+Math.round(pct)+'%</b></div>';
  }
  return '<div class="m-node m-gen'+(now>0?' sel':'')+'" data-live-class="'+k+'_cls" id="enNodeGen-'+b.id+'" style="--nc:'+(EN_GEN_COLOR[b.type]||'#FFDD57')+'">'+
    '<div class="m-nh"><h3>'+title+'</h3><span class="m-tag">×'+count+'</span>'+(isSolar?infoBtn('data-toggle-gen-pop="'+b.id+'"',genPopOpen===b.id,'Выработка по часам'):'')+'</div>'+
    '<div class="m-big" data-live="'+k+'_now">'+fmtPowerKw(now)+'</div>'+
    '<div class="m-of" data-live="'+k+'_of">из '+fmtPowerKw(nameplate)+' установленных</div>'+
    '<div class="m-bar"><i data-live="'+k+'_bar" style="width:'+pct.toFixed(1)+'%"></i></div>'+
    extra+
    (isSolar && genPopOpen===b.id?
      '<div class="en-dialpop en-genpop" id="enGenPop">'+
        '<div class="en-dialpop-head"><h4>Выработка по часам</h4><button type="button" class="en-dialpop-close" data-close-gen-pop aria-label="Закрыть">×</button></div>'+
        '<p class="en-dialpop-note">Расчётная кривая по текущему парку панелей на сутки — не история, а прогноз «как выглядели бы сутки сейчас». Рамкой отмечен текущий час.</p>'+
        '<div data-live="genHeat">'+buildGenHeatmap(b)+'</div>'+
      '</div>':'')+
  '</div>';
}
function renderBusNode(c){
  const f=c.frac, pct=f*100, ringCirc=2*Math.PI*48;
  const state_=f>=0.999?'<span style="color:var(--good)">● Норма</span>':f<0.02?'<span style="color:var(--bad)">● Блэкаут</span>':'<span style="color:#F0B93D">● Просадка</span>';
  const flow=Math.abs(c.flow)<0.01?'0':(c.flow>0?'+':'−')+fmtPowerKw(Math.abs(c.flow));
  return '<div class="m-node m-busn" id="enNodeBus">'+
    '<div class="m-nh"><h3>Шина базы</h3></div>'+
    '<svg class="m-ring" viewBox="0 0 118 118" aria-hidden="true">'+
      '<circle cx="59" cy="59" r="48" fill="none" stroke="#0B1022" stroke-width="12"/>'+
      '<circle data-live="ringArc" cx="59" cy="59" r="48" fill="none" stroke="'+(f>=0.999?'#4ADE9B':f>=0.5?'#F0B93D':'#F4557B')+'" stroke-width="12" stroke-linecap="round" transform="rotate(-90 59 59)" stroke-dasharray="'+(ringCirc*f).toFixed(1)+' '+ringCirc.toFixed(1)+'"/>'+
      '<text data-live="ringPct" x="59" y="58" text-anchor="middle" font-size="22" font-weight="500">'+(pct<99.5&&pct>0?pct.toFixed(1):Math.round(pct))+'%</text>'+
      '<text x="59" y="76" text-anchor="middle" font-size="10" style="fill:#9CA6C4">обеспечено</text>'+
    '</svg>'+
    '<div class="m-line"><span>Потребность</span><b data-live="busDem">'+fmtPowerKw(c.demand)+'</b></div>'+
    '<div class="m-line"><span>Получено</span><b data-live="busSup">'+fmtPowerKw(c.supply)+'</b></div>'+
    '<div class="m-line"><span>Выработка</span><b data-live="busGen">'+fmtPowerKw(c.bal.gen)+'</b></div>'+
    '<div class="m-line"><span>Акк. поток</span><b data-live="busFlow">'+flow+'</b></div>'+
    '<div class="m-line"><span>Автономия</span><b data-live="busAuto">'+(c.supply>0.01?fmtDurHm(c.stored/c.supply*3600):'∞')+'</b></div>'+
    '<div style="margin-top:8px;font-size:11.5px" data-live="busState">'+state_+'</div>'+
  '</div>';
}
function renderBatteryNode(c){
  const count=BATTERIES.reduce((s,bt)=>s+(state.buildings[bt.id]||0),0), h=62*c.pct/100;
  const flowTxt=Math.abs(c.flow)<0.01?'Без изменений':c.flow>0?'Заряд +'+fmtPowerKw(c.flow)+' · полон через '+fmtDurHm((c.cap-c.stored)/c.flow*3600):'Разряд −'+fmtPowerKw(-c.flow)+' · пуст через '+fmtDurHm(c.stored/-c.flow*3600);
  return '<div class="m-node m-batt" id="enNodeBatt">'+
    '<div class="m-nh"><h3>Аккумуляторы</h3><span class="m-tag">'+(count?'×'+count:'базовый блок')+'</span></div>'+
    '<div class="m-batrow">'+
      '<svg class="m-batico" viewBox="0 0 52 78" aria-hidden="true">'+
        '<rect x="17" y="1" width="18" height="6" rx="2" fill="#4B5680"/>'+
        '<rect x="4" y="7" width="44" height="68" rx="6" fill="#0B1022" stroke="#4B5680" stroke-width="2.5"/>'+
        '<clipPath id="enBatClip"><rect x="7" y="10" width="38" height="62" rx="3"/></clipPath>'+
        '<rect data-live="batLevel" x="7" y="'+(72-h).toFixed(1)+'" width="38" height="'+h.toFixed(1)+'" fill="'+(c.pct<15?'#F4557B':'#4FD1E7')+'" clip-path="url(#enBatClip)" opacity=".9"/>'+
        '<path data-live="batBolt" d="M28 22 L16 44 H25 L21 62 L36 38 H27 Z" fill="#fff" opacity="'+(Math.abs(c.flow)<0.01?.2:.9)+'"/>'+
      '</svg>'+
      '<div style="flex:1;min-width:0"><div class="m-big" data-live="batJ">'+fmtStoredEnergyKwh(c.stored)+' <span class="m-kwh">('+fmtKwh(c.stored)+')</span></div><div class="m-of" data-live="batOf">из '+fmtStoredEnergyKwh(c.cap)+' ('+fmtKwh(c.cap)+')</div>'+
        '<div class="m-bar"><i data-live="batBar" style="width:'+c.pct.toFixed(1)+'%"></i></div>'+
        '<div class="m-of" data-live="batFlowTxt">'+flowTxt+'</div></div>'+
    '</div>'+
  '</div>';
}
function renderCurtNode(c){
  return '<div class="m-node m-curt'+(c.curtail>0.01?'':' idle')+'" id="enNodeCurt">'+
    '<div class="m-nh"><h3>Сброс излишка</h3><span class="m-big" style="font-size:15px" data-live="curtV">'+(c.curtail>0.01?fmtPowerKw(c.curtail):'нет')+'</span></div>'+
  '</div>';
}
// Будущие источники энергии: в игре их пока нет, поэтому модули честно показывают 0 кВт.
function renderPlannedSource(id,title,kind,note,color){
  return '<div class="m-node m-plan" id="'+id+'" style="--nc:'+color+'">'+
    '<div class="m-nh"><h3>'+title+'</h3><span class="m-tag">'+kind+'</span></div>'+
    '<div class="m-big">'+fmtPowerKw(0)+'</div><div class="m-of">'+note+'</div>'+
    '<div class="m-bar"><i style="width:0"></i></div>'+
  '</div>';
}
function renderConsumerGroup(g){
  const sum=g.list.reduce((s,b)=>s+powerDrawPerHour(b),0);
  const inst=g.list.reduce((s,b)=>s+energyInstalledKw(b),0);
  const units=g.list.reduce((s,b)=>s+(state.buildings[b.id]||0),0);
  const rows=g.list.map(b=>{
    const count=state.buildings[b.id]||0, now=powerDrawPerHour(b), inst=energyInstalledKw(b);
    return '<div class="m-row" style="--rc:var(--'+colorVarOf(resById(outId(b)))+')"><i></i><span>'+resFullName(outId(b))+' <small>'+recipeLabel(b)+'</small></span><em>×'+count+'</em>'+
      '<b data-live="rv_'+b.id+'">'+fmtPowerKw(now)+'</b>'+
      '<div class="m-rowbar"><i data-live="rb_'+b.id+'" style="width:'+(inst>0?now/inst*100:0).toFixed(0)+'%"></i></div></div>';
  }).join('');
  return '<div class="m-group" tabindex="0" id="enNodeGrp-'+g.id+'" style="--nc:'+g.color+'" aria-describedby="enGpop-'+g.id+'">'+
    '<div class="m-gh"><h3>'+g.name+'</h3><b data-live="gv_'+g.id+'">'+fmtPowerKw(sum)+'</b></div>'+
    '<div class="m-gsub"><span>'+g.list.length+' '+plural(g.list.length,'вид','вида','видов')+' · '+units+' '+plural(units,'установка','установки','установок')+'</span>'+
      '<span data-live="gl_'+g.id+'">загрузка '+(inst>0?Math.round(sum/inst*100):0)+'%</span></div>'+
    '<div class="m-gbar"><i data-live="gb_'+g.id+'" style="width:'+(inst>0?sum/inst*100:0).toFixed(0)+'%"></i></div>'+
    '<div class="m-gpop" role="tooltip" id="enGpop-'+g.id+'"><div class="m-gpop-h">'+g.what+'</div>'+rows+'</div>'+
  '</div>';
}
function plural(n,one,few,many){ const a=n%100, b=n%10; if(a>10&&a<20) return many; if(b===1) return one; if(b>=2&&b<=4) return few; return many; }

/* ---------- журнал: итоги за период (по записанной истории, см. recordEnergyHistory в core.js) ---------- */
const EN_PERIODS=[
  {id:'live',label:'Реальное время',sec:300,     tier:'live',phrase:'за последние 5 минут'},
  {id:'h1',  label:'1 час',         sec:3600,    tier:'m1',  phrase:'за последний час'},
  {id:'d1',  label:'Сутки',         sec:86400,   tier:'m10', phrase:'за последние сутки'},
  {id:'d7',  label:'Неделя',        sec:604800,  tier:'h1',  phrase:'за неделю'},
  {id:'d30', label:'Месяц',         sec:2592000, tier:'h4',  phrase:'за месяц'},
  {id:'d90', label:'3 месяца',      sec:7776000, tier:'h4',  phrase:'за 3 месяца'},
];
const EN_PMAP={}; EN_PERIODS.forEach(p=>{ EN_PMAP[p.id]=p; });
const ENERGY_UI_KEY='industrial_belt_energy_ui';
let enUi={period:'d1'};
try{ enUi=Object.assign(enUi,JSON.parse(localStorage.getItem(ENERGY_UI_KEY)||'{}')); }catch(e){}
if(!EN_PMAP[enUi.period]||enUi.period==='live') enUi.period='d1';
function saveEnergyUi(){ try{ localStorage.setItem(ENERGY_UI_KEY,JSON.stringify(enUi)); }catch(e){} }
let enChart=null; // {kpi, period, hov}

// Корзины выбранного периода: n штук подряд, null — данных нет. back=1 — предыдущий такой же период.
function ehBins(pid,back){
  const P=EN_PMAP[pid], h=ehInit(), def=P.tier==='live'?EH_LIVE:EH_TIERS.find(t=>t.id===P.tier);
  const tier=P.tier==='live'?energyLiveHist:h.tiers[P.tier];
  const n=Math.max(1,Math.round(P.sec/def.sec)), last=Math.floor((h.clock-1e-6)/def.sec)-(back?n:0);
  const byT={}; tier.rows.forEach(r=>{ byT[r[0]]=r; }); if(tier.open) byT[tier.open[0]]=tier.open;
  const rows=[]; for(let t=last-n+1;t<=last;t++) rows.push(byT[t]||null);
  return {n, sec:def.sec, first:last-n+1, rows, off:h.off};
}
function ehStats(pid,back){
  const b=ehBins(pid,back), s={gen:0,dem:0,sup:0,cur:0,def:0,cov:0,pg:0,pd:0,first:null,last:null,span:b.n*b.sec};
  b.rows.forEach(r=>{
    if(!r||!r[10]) return;
    s.gen+=r[1]; s.dem+=r[2]; s.sup+=r[3]; s.cur+=r[4]; s.def+=r[7]; s.cov+=r[10];
    if(r[8]>s.pg) s.pg=r[8]; if(r[9]>s.pd) s.pd=r[9];
    if(s.first==null) s.first=r[5]; s.last=r[5];
  });
  return s;
}
function jDelta(cur,prev,hasPrev,mode){
  if(!hasPrev) return '<div class="j-d" title="Сравнение появится, когда накопится история за прошлый такой же период">нет прошлого периода</div>';
  if(prev===0&&cur===0) return '<div class="j-d">без изменений</div>';
  const pct=prev>0?(cur-prev)/prev*100:(cur>0?100:0);
  if(Math.abs(pct)<0.5) return '<div class="j-d">без изменений</div>';
  const up=pct>=0, cls=mode==='good'?(up?'good':'bad'):mode==='bad'?(up?'bad':'good'):mode==='warn'?(up?'warn':'good'):'';
  return '<div class="j-d '+cls+'" title="К прошлому такому же периоду">'+(up?'▲ ':'▼ ')+Math.abs(pct).toFixed(Math.abs(pct)>=10?0:1)+'% к прошлому</div>';
}
function jPct(v,d){ return v.toFixed(d==null?0:d)+'%'; }
// Значения всех девяти карточек за период — те же функции дают подпись «за период» в окне графика.
function journalValues(pid){
  const c=ehStats(pid,false), p=ehStats(pid,true), has=p.cov>=p.span*0.25;
  const unmet=Math.max(0,c.dem-c.sup), unmetP=Math.max(0,p.dem-p.sup);
  const ratio=c.dem>0?c.sup/c.dem*100:100, ratioP=p.dem>0?p.sup/p.dem*100:100;
  const meanG=c.cov>0?c.gen/c.cov*3600:0, meanD=c.cov>0?c.dem/c.cov*3600:0;
  const nameplate=energyGenerators().reduce((s,b)=>s+energyNameplateKw(b),0);
  const dSt=(c.last||0)-(c.first||0);
  return {c, p, has, list:[
    {id:'gen', l:'Выработано',      color:'#FFDD57', v:fmtKwh(c.gen), s:'средняя '+fmtPowerKw(meanG), d:jDelta(c.gen,p.gen,has,'good')},
    {id:'sup', l:'Потреблено',      color:'#5AA9FF', v:fmtKwh(c.sup), s:'из '+fmtKwh(c.dem)+' нужных', d:jDelta(c.sup,p.sup,has,'neutral')},
    {id:'unmet',l:'Не хватило',     color:'#F4557B', v:fmtKwh(unmet), s:'обеспеченность '+jPct(ratio,1), d:jDelta(unmet,unmetP,has,'bad')},
    {id:'cur', l:'Сброшено излишка',color:'#8C93B0', v:fmtKwh(c.cur), s:jPct(c.gen>0?c.cur/c.gen*100:0)+' от выработки', d:jDelta(c.cur,p.cur,has,'warn')},
    {id:'ratio',l:'Обеспеченность', color:'#4ADE9B', v:jPct(ratio,1), s:'по энергии', d:jDelta(ratio,ratioP,has,'good')},
    {id:'def', l:'Время дефицита',  color:'#F0B93D', v:c.def>0?fmtDurHm(c.def):'0 м', s:jPct(c.cov>0?c.def/c.cov*100:0)+' периода', d:jDelta(c.def,p.def,has,'bad')},
    {id:'pg',  l:'Пик выработки',   color:'#FFDD57', v:fmtPowerKw(c.pg), s:'установлено '+fmtPowerKw(nameplate), d:jDelta(c.pg,p.pg,has,'neutral')},
    {id:'pd',  l:'Пик нагрузки',    color:'#5AA9FF', v:fmtPowerKw(c.pd), s:'средняя '+fmtPowerKw(meanD), d:jDelta(c.pd,p.pd,has,'neutral')},
    {id:'st',  l:'Заряд за период', color:'#4FD1E7', v:(dSt>=0?'+':'−')+fmtStoredEnergyKwh(Math.abs(dSt)), s:c.first==null?'нет данных':'с '+fmtStoredEnergyKwh(c.first)+' до '+fmtStoredEnergyKwh(c.last), d:''},
  ]};
}
function renderJournal(c){
  const P=EN_PMAP[enUi.period], jv=journalValues(enUi.period);
  const covPct=Math.min(100,jv.c.cov/jv.c.span*100);
  const tabs=EN_PERIODS.filter(p=>p.id!=='live').map(p=>'<button type="button" class="en-tab'+(p.id===enUi.period?' active':'')+'" data-en-period="'+p.id+'" aria-pressed="'+(p.id===enUi.period)+'">'+p.label+'</button>').join('');
  return '<section class="j-journal">'+
    '<div class="j-top"><div class="en-tabs" data-live="jtabs">'+tabs+'</div>'+
      '<div class="j-live" data-live="jlive"><span>Сейчас: выработка <b>'+fmtPowerKw(c.bal.gen)+'</b></span><span>нагрузка <b>'+fmtPowerKw(c.demand)+'</b></span>'+
        '<span>обеспечено <b>'+Math.round(c.frac*100)+'%</b></span><span>заряд <b>'+fmtStoredEnergyKwh(c.stored)+'</b></span></div></div>'+
    '<div class="j-cov" data-live="jcov">'+(covPct<99?'История записывается с момента обновления игры: '+P.phrase+' собрано '+fmtDurHm(jv.c.cov)+' из '+fmtDurHm(jv.c.span)+' ('+jPct(covPct)+').':'')+'</div>'+
    '<div class="j-kpis">'+jv.list.map(k=>
      '<div class="j-kpi" style="--kc:'+k.color+'" data-live="jk_'+k.id+'">'+
        '<div class="j-kh"><span class="j-kl">'+k.l+'</span><button type="button" class="en-info j-i" data-kpi-chart="'+k.id+'" title="График: '+k.l.toLowerCase()+'">i</button></div>'+
        '<div class="j-kv">'+k.v+'</div><div class="j-ks">'+k.s+'</div>'+k.d+'</div>').join('')+
    '</div>'+
  '</section>';
}

/* ---------- окно с графиком карточки ---------- */
const avgKw=(r,i)=>r[10]>0?r[i]/r[10]*3600:null;
const EN_CHARTS={
  gen:  {title:'Выработка',      unit:'power', series:[{label:'Выработка',color:'#FFDD57',fill:true,f:r=>avgKw(r,1)},{label:'Сброс излишка',color:'#8C93B0',f:r=>avgKw(r,4)}]},
  sup:  {title:'Потребление',    unit:'power', series:[{label:'Получено',color:'#5AA9FF',fill:true,f:r=>avgKw(r,3)},{label:'Потребность',color:'#B9C2E0',dash:[4,3],f:r=>avgKw(r,2)}]},
  unmet:{title:'Нехватка энергии',unit:'power',series:[{label:'Не хватило',color:'#F4557B',fill:true,f:r=>r[10]>0?Math.max(0,r[2]-r[3])/r[10]*3600:null},{label:'Потребность',color:'#B9C2E0',dash:[4,3],f:r=>avgKw(r,2)}]},
  cur:  {title:'Сброс излишка',  unit:'power', series:[{label:'Сброшено',color:'#8C93B0',fill:true,f:r=>avgKw(r,4)},{label:'Выработка',color:'#FFDD57',f:r=>avgKw(r,1)}]},
  ratio:{title:'Обеспеченность', unit:'pct',   series:[{label:'Обеспеченность',color:'#4ADE9B',fill:true,f:r=>r[10]>0?(r[2]>0?r[3]/r[2]*100:100):null}]},
  def:  {title:'Время дефицита', unit:'pct', bars:true, series:[{label:'Доля времени с дефицитом',color:'#F0B93D',f:r=>r[10]>0?r[7]/r[10]*100:null}]},
  pg:   {title:'Пик выработки',  unit:'power', series:[{label:'Пик',color:'#FFDD57',f:r=>r[10]>0?r[8]:null},{label:'Средняя',color:'#FFDD57',fill:true,dash:[4,3],f:r=>avgKw(r,1)}]},
  pd:   {title:'Пик нагрузки',   unit:'power', series:[{label:'Пик',color:'#5AA9FF',f:r=>r[10]>0?r[9]:null},{label:'Средняя',color:'#5AA9FF',fill:true,dash:[4,3],f:r=>avgKw(r,2)}]},
  st:   {title:'Заряд аккумуляторов',unit:'joule',series:[{label:'Заряд',color:'#4FD1E7',fill:true,f:r=>r[10]>0?r[5]:null},{label:'Ёмкость',color:'#4FD1E7',dash:[5,4],f:r=>r[10]>0?r[6]:null}]},
};
function hexA(hex,a){ const n=parseInt(hex.slice(1),16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
function chartFmt(unit,v){ return unit==='power'?fmtPowerKw(v):unit==='joule'?fmtStoredEnergyKwh(v):v.toFixed(1)+'%'; }
function chartAxis(unit,max){
  if(unit==='pct') return {div:1,name:'%',max:100,step:25};
  const sc=unit==='power'?POWER_SCALE:JOULE_SCALE, mul=unit==='joule'?J_PER_KWH:1;
  const i=Math.max(unit==='joule'?2:1,pickUnitScale(sc,max*mul)), div=sc[i][0]/mul, m=Math.max(max/div,1e-9);
  const e=Math.pow(10,Math.floor(Math.log10(m))); let step=e;
  for(const k of [0.1,0.2,0.25,0.5,1,2,2.5,5,10]){ step=k*e; if(m/step<=5) break; }
  return {div, name:sc[i][1], max:Math.ceil(m/step-1e-9)*step*div, step:step*div};
}
function ensureChartModal(){
  let el=document.getElementById('enChartModal'); if(el) return el;
  el=document.createElement('div'); el.id='enChartModal'; el.className='j-modal'; el.hidden=true;
  el.innerHTML='<div class="j-mbox" role="dialog" aria-modal="true" aria-labelledby="enChartTitle">'+
    '<div class="j-mh"><h3 id="enChartTitle"></h3><button type="button" class="en-dialpop-close" data-chart-close aria-label="Закрыть">×</button></div>'+
    '<div class="en-tabs j-mtabs"></div><div class="j-mleg"></div>'+
    '<div class="j-chart"><canvas></canvas><div class="en-tip" hidden></div></div>'+
    '<div class="j-msum"></div></div>';
  document.body.appendChild(el);
  el.addEventListener('click',e=>{
    if(e.target===el||e.target.closest('[data-chart-close]')){ closeEnergyChart(); return; }
    const pb=e.target.closest('[data-chart-period]');
    if(pb){ enChart.period=pb.dataset.chartPeriod; enChart.hov=-1; drawEnergyChart(); }
  });
  const cv=el.querySelector('canvas');
  const move=e=>{ if(!enChart||!enChart.geom) return; const g=enChart.geom, r=cv.getBoundingClientRect(), x=e.clientX-r.left-g.l;
    const idx=g.bars?Math.floor(x/g.slot):Math.round(x/g.slot); enChart.hov=(idx>=0&&idx<g.n)?idx:-1; drawEnergyChart(); };
  cv.addEventListener('pointermove',move); cv.addEventListener('pointerdown',move);
  cv.addEventListener('pointerleave',()=>{ if(enChart){ enChart.hov=-1; drawEnergyChart(); } });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&enChart) closeEnergyChart(); });
  window.addEventListener('resize',()=>{ if(enChart) drawEnergyChart(); });
  return el;
}
function openEnergyChart(kpi){ enChart={kpi, period:enUi.period, hov:-1}; ensureChartModal().hidden=false; drawEnergyChart(); }
function closeEnergyChart(){ enChart=null; const el=document.getElementById('enChartModal'); if(el) el.hidden=true; }
function agoStr(sec){ return sec<90?Math.round(sec)+' с назад':fmtDurHm(sec)+' назад'; }
function drawEnergyChart(){
  if(!enChart) return;
  const el=ensureChartModal(), cfg=EN_CHARTS[enChart.kpi], P=EN_PMAP[enChart.period];
  const kv=journalValues(enChart.period).list.find(k=>k.id===enChart.kpi);
  el.querySelector('#enChartTitle').textContent=cfg.title;
  const tabsHtml=EN_PERIODS.map(p=>'<button type="button" class="en-tab'+(p.id===enChart.period?' active':'')+'" data-chart-period="'+p.id+'">'+p.label+'</button>').join('');
  const tabsEl=el.querySelector('.j-mtabs'); if(tabsEl.innerHTML!==tabsHtml) tabsEl.innerHTML=tabsHtml;
  el.querySelector('.j-mleg').innerHTML=cfg.series.map(s=>'<span><i style="background:'+s.color+'"></i>'+s.label+'</span>').join('');
  el.querySelector('.j-msum').innerHTML='<span>'+kv.l+' '+P.phrase+':</span> <b>'+kv.v+'</b> <span class="dim">· '+kv.s+'</span>';

  const b=ehBins(enChart.period,false), n=b.n, data=cfg.series.map(s=>b.rows.map(r=>r?s.f(r):null));
  const cv=el.querySelector('canvas'), box=cv.parentElement, W=box.clientWidth, H=280; if(!W) return;
  const dpr=window.devicePixelRatio||1; cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.width=W+'px'; cv.style.height=H+'px';
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  const pad={l:56,r:12,t:20,b:24}, pw=W-pad.l-pad.r, ph=H-pad.t-pad.b;
  let ymax=0; data.forEach(a=>a.forEach(v=>{ if(v!=null&&v>ymax) ymax=v; })); if(ymax<=0) ymax=cfg.unit==='pct'?100:1;
  const ax=chartAxis(cfg.unit,ymax), top=ax.max, bars=!!cfg.bars, slot=bars?pw/n:pw/Math.max(1,n-1);
  const X=i=>bars?pad.l+slot*(i+0.5):pad.l+slot*i, Y=v=>pad.t+ph-(v/top)*ph;
  enChart.geom={l:pad.l,slot,n,bars};
  const binGame=i=>(b.first+i)*b.sec+b.off;
  if(b.n*b.sec<=604800){ // ночь — затемнённые полосы
    ctx.fillStyle='rgba(4,7,20,.55)'; let rs=-1;
    for(let i=0;i<=n;i++){
      const night=i<n && sunFactor(binGame(i)+b.sec/2)<=0.0001;
      if(night&&rs<0) rs=i;
      if(!night&&rs>=0){ const xa=Math.max(pad.l,X(rs)-slot/2), xb=Math.min(W-pad.r,X(i-1)+slot/2); ctx.fillRect(xa,pad.t,xb-xa,ph); rs=-1; }
    }
  }
  ctx.font='11px "IBM Plex Mono",monospace'; ctx.textAlign='right'; ctx.textBaseline='middle';
  for(let v=0;v<=top+1e-9;v+=ax.step){
    const y=Math.round(Y(v))+.5; ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
    ctx.fillStyle='#606A8A'; ctx.fillText(String(+(v/ax.div).toFixed(2)),pad.l-7,y);
  }
  ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillStyle='#9CA6C4'; ctx.fillText(ax.name,4,2);
  ctx.textBaseline='alphabetic'; ctx.fillStyle='#606A8A';
  for(let k=0;k<=4;k++){
    const back=P.sec*(1-k/4), lab=k===4?'сейчас':P.sec<=3600?'−'+Math.round(back/60)+' м':P.sec<=86400?'−'+Math.round(back/3600)+' ч':'−'+Math.round(back/86400)+' д';
    ctx.textAlign=k===0?'left':k===4?'right':'center'; ctx.fillText(lab,pad.l+pw*k/4,H-6);
  }
  cfg.series.forEach((s,si)=>{
    const a=data[si];
    if(bars){ ctx.fillStyle=s.color; a.forEach((v,i)=>{ if(v==null||v<=0) return; const bw=Math.max(1,slot-(slot>4?1.2:0)); ctx.fillRect(X(i)-bw/2,Y(v),bw,Y(0)-Y(v)); }); return; }
    // непрерывные отрезки без пропусков данных
    let seg=[];
    const flush=()=>{
      if(!seg.length) return;
      if(s.fill){ ctx.beginPath(); seg.forEach(([i,v],k)=>{ k?ctx.lineTo(X(i),Y(v)):ctx.moveTo(X(i),Y(v)); }); ctx.lineTo(X(seg[seg.length-1][0]),Y(0)); ctx.lineTo(X(seg[0][0]),Y(0)); ctx.closePath(); ctx.fillStyle=hexA(s.color,0.16); ctx.fill(); }
      ctx.beginPath(); seg.forEach(([i,v],k)=>{ k?ctx.lineTo(X(i),Y(v)):ctx.moveTo(X(i),Y(v)); });
      if(seg.length===1){ ctx.fillStyle=s.color; ctx.fillRect(X(seg[0][0])-1.5,Y(seg[0][1])-1.5,3,3); }
      ctx.strokeStyle=s.color; ctx.lineWidth=1.7; ctx.lineJoin='round'; ctx.setLineDash(s.dash||[]); ctx.stroke(); ctx.setLineDash([]); seg=[];
    };
    a.forEach((v,i)=>{ if(v==null) flush(); else seg.push([i,v]); }); flush();
  });
  const tip=el.querySelector('.en-tip'), hov=enChart.hov;
  if(hov>=0&&hov<n){
    const hx=Math.round(X(hov))+.5; ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(hx,pad.t); ctx.lineTo(hx,pad.t+ph); ctx.stroke();
    const t0=binGame(hov), age=(n-hov)*b.sec, rows=b.rows[hov];
    tip.innerHTML='<div class="en-tip-t">'+dayClockStr(t0)+'–'+dayClockStr(t0+b.sec)+' · '+agoStr(age)+'</div>'+
      (rows?cfg.series.map((s,si)=>'<div class="en-tip-row"><i style="background:'+s.color+'"></i><span>'+s.label+'</span><b>'+(data[si][hov]==null?'—':chartFmt(cfg.unit,data[si][hov]))+'</b></div>').join('')
        :'<div class="en-tip-row"><span>Нет данных — история тогда ещё не писалась</span></div>');
    tip.hidden=false;
    const tw=tip.offsetWidth; let x=X(hov)+14; if(x+tw>W-4) x=X(hov)-tw-14; if(x<4) x=4;
    tip.style.left=x+'px'; tip.style.top='8px';
  }else tip.hidden=true;
}

/* ---------- таблица под схемой ---------- */
function energyTable(gens,groups){
  let rows='<thead><tr><th>Источник / потребитель</th><th>Кол-во</th><th>Установлено</th><th>Сейчас</th><th>Загрузка</th><th>Доля потребления</th></tr></thead><tbody>';
  if(gens.length){
    rows+='<tr class="grp"><td colspan="6">Источники</td></tr>';
    gens.forEach(b=>{
      const count=state.buildings[b.id]||0, now=recipeRatePerHour(b), inst=energyNameplateKw(b);
      rows+='<tr><td><i class="d-dot" style="background:'+(EN_GEN_COLOR[b.type]||'var(--energy)')+'"></i>'+(b.type==='solar'?'Солнечные панели':recipeLabel(b))+'</td><td>'+count+'</td><td>'+fmtPowerKw(inst)+'</td><td>'+fmtPowerKw(now)+'</td><td>'+(inst>0?Math.round(now/inst*100):0)+'%</td><td class="dim">—</td></tr>';
    });
  }
  const totalDraw=groups.reduce((s,g)=>s+g.list.reduce((s2,b)=>s2+powerDrawPerHour(b),0),0);
  groups.forEach(g=>{
    rows+='<tr class="grp"><td colspan="6">'+g.name+'</td></tr>';
    g.list.forEach(b=>{
      const count=state.buildings[b.id]||0, now=powerDrawPerHour(b), inst=energyInstalledKw(b), sh=totalDraw>0?now/totalDraw*100:0, cv=colorVarOf(resById(outId(b)));
      rows+='<tr><td><i class="d-dot" style="background:var(--'+cv+')"></i>'+recipeLabel(b)+'</td><td>'+count+'</td><td>'+fmtPowerKw(inst)+'</td><td>'+fmtPowerKw(now)+'</td><td>'+(inst>0?Math.round(now/inst*100):0)+'%</td>'+
        '<td>'+sh.toFixed(1)+'%<span class="d-mini"><i style="width:'+Math.min(100,sh*2.2)+'%;background:var(--'+cv+')"></i></span></td></tr>';
    });
  });
  const cntAll=groups.reduce((s,g)=>s+g.list.reduce((s2,b)=>s2+(state.buildings[b.id]||0),0),0);
  rows+='<tr class="tot"><td>Итого потребители</td><td>'+cntAll+'</td><td class="dim">—</td><td>'+fmtPowerKw(totalDraw)+'</td><td class="dim">—</td><td>100%</td></tr></tbody>';
  return rows;
}

function renderEnergy(){
  const gens=energyGenerators(), groups=energyConsumerGroups(), c=energyNow();
  const html=
    '<section class="m-scheme" id="enScheme">'+
      '<svg class="m-flows" id="enFlows" aria-hidden="true"></svg>'+
      '<div class="m-grid">'+
        '<div class="m-src">'+renderSunNode(c)+gens.map(b=>renderGenNode(b,c)).join('')+
          (gens.length?'':'<div class="m-node m-empty">Постройте солнечную панель или угольную ТЭС во вкладке «Стройка» — без источника энергии неоткуда взяться.</div>')+
        '</div>'+
        '<div class="m-bus">'+
          renderPlannedSource('enNodeAdmin','Административный центр','солнечная','ещё не подключён к шине','#FFDD57')+
          renderBusNode(c)+
          renderPlannedSource('enNodeGenset','Генератор','резервный','ещё не построен','#F2A93B')+
        '</div>'+
        '<div class="m-bat">'+renderBatteryNode(c)+renderCurtNode(c)+'</div>'+
        '<div class="m-cons">'+(groups.length?groups.map(renderConsumerGroup).join(''):'<div class="m-empty-cons">Пока никто не потребляет энергию.</div>')+'</div>'+
      '</div>'+
    '</section>'+
    renderJournal(c)+
    (gens.length||groups.length?'<section><div class="d-table-wrap"><table class="d-table" data-live="table">'+energyTable(gens,groups)+'</table></div></section>':'');

  const key=JSON.stringify([gens.map(b=>b.id+':'+state.buildings[b.id]),groups.map(g=>g.id+':'+g.list.map(b=>b.id+'x'+state.buildings[b.id]).join(',')),
    BATTERIES.map(bt=>state.buildings[bt.id]||0).join(','),sunPopOpen,genPopOpen]);
  if(key!==energyStructKey || !document.getElementById('enScheme')){
    energyStructKey=key;
    energyPanelEl.innerHTML=html;
    buildEnergyFlows(gens,groups);
  }else{
    patchEnergyLive(html);
  }
  updateEnergyFlows(c,groups);
  if(enChart) drawEnergyChart();
}
// Переносит в живой DOM только изменившиеся значения (элементы с data-live / data-live-class).
function patchEnergyLive(html){
  const t=document.createElement('div'); t.innerHTML=html;
  t.querySelectorAll('[data-live-class]').forEach(n=>{
    const o=energyPanelEl.querySelector('[data-live-class="'+n.dataset.liveClass+'"]');
    if(o && o.getAttribute('class')!==n.getAttribute('class')) o.setAttribute('class',n.getAttribute('class'));
  });
  t.querySelectorAll('[data-live]').forEach(n=>{
    const o=energyPanelEl.querySelector('[data-live="'+n.dataset.live+'"]');
    if(!o || o.outerHTML===n.outerHTML) return;
    for(const a of [...o.attributes]) if(!n.hasAttribute(a.name)) o.removeAttribute(a.name);
    for(const a of n.attributes) if(o.getAttribute(a.name)!==a.value) o.setAttribute(a.name,a.value);
    if(o.innerHTML!==n.innerHTML) o.innerHTML=n.innerHTML;
  });
}

/* ---------- живые потоки энергии (как в макете: линия-подложка + бегущие точки) ---------- */
let energyFlows=[];
const EN_NS='http://www.w3.org/2000/svg';
function buildEnergyFlows(gens,groups){
  const svg=document.getElementById('enFlows'); if(!svg) return;
  svg.innerHTML=''; energyFlows=[];
  const mk=(from,to,color,fn)=>{
    const base=document.createElementNS(EN_NS,'path'), dash=document.createElementNS(EN_NS,'path');
    base.setAttribute('class','m-flow-base'); base.setAttribute('stroke',color);
    dash.setAttribute('class','m-flow-dash'); dash.setAttribute('stroke',color);
    svg.appendChild(base); svg.appendChild(dash);
    energyFlows.push({from,to,base,dash,fn,lastDur:0});
  };
  gens.forEach(b=>{
    const col=EN_GEN_COLOR[b.type]||'#FFDD57';
    if(b.type==='solar') mk('enNodeSun','enNodeGen-'+b.id,col,c=>({i:c.sun}));
    mk('enNodeGen-'+b.id,'enNodeBus',col,()=>{ const np=energyNameplateKw(b); return {i:np>0?recipeRatePerHour(b)/np:0}; });
  });
  mk('enNodeAdmin','enNodeBus','#FFDD57',()=>({i:0}));
  mk('enNodeGenset','enNodeBus','#F2A93B',()=>({i:0}));
  mk('enNodeBus','enNodeBatt','#4FD1E7',c=>{ const ref=Math.max(c.nameplate,c.demand,1); return {i:Math.min(1,Math.abs(c.flow)/ref*1.6),rev:c.flow<0}; });
  mk('enNodeBatt','enNodeCurt','#8C93B0',c=>({i:c.nameplate>0?Math.min(1,c.curtail/c.nameplate*1.6):0}));
  groups.forEach(g=>{
    mk('enNodeBus','enNodeGrp-'+g.id,g.color,()=>{
      const inst=g.list.reduce((s,b)=>s+energyInstalledKw(b),0), now=g.list.reduce((s,b)=>s+powerDrawPerHour(b),0);
      return {i:inst>0?now/inst:0};
    });
  });
}
function layoutEnergyFlows(){
  const scheme=document.getElementById('enScheme'), svg=document.getElementById('enFlows'); if(!scheme||!svg) return;
  const host=scheme.getBoundingClientRect(); if(!host.width) return;
  const stacked=window.innerWidth<=860;
  svg.setAttribute('viewBox','0 0 '+host.width+' '+host.height);
  let firstGrp=true;
  energyFlows.forEach(f=>{
    const A=document.getElementById(f.from), B=document.getElementById(f.to); if(!A||!B) return;
    const a=A.getBoundingClientRect(), b=B.getBoundingClientRect(); let d;
    if(stacked){
      if(f.to.indexOf('enNodeGrp-')===0){ if(!firstGrp){ f.base.setAttribute('d',''); f.dash.setAttribute('d',''); return; } firstGrp=false; }
      const cx=(Math.max(a.left,b.left)+Math.min(a.right,b.right))/2-host.left, y1=Math.min(a.bottom,b.bottom)-host.top, y2=Math.max(a.top,b.top)-host.top;
      d='M'+cx+' '+y1+' L'+cx+' '+y2;
    }else if(a.left<b.right && b.left<a.right){
      const cx=(Math.max(a.left,b.left)+Math.min(a.right,b.right))/2-host.left;
      const y1=(a.top<b.top?a.bottom:a.top)-host.top, y2=(a.top<b.top?b.top:b.bottom)-host.top;
      d='M'+cx+' '+y1+' L'+cx+' '+y2;
    }else{
      const ltr=a.right<=b.left, xa=(ltr?a.right:a.left)-host.left, xb=(ltr?b.left:b.right)-host.left;
      let ya=(a.top+a.height/2)-host.top, yb=(b.top+b.height/2)-host.top;
      if(b.height>a.height) yb=Math.min(b.bottom-host.top-14,Math.max(b.top-host.top+14,ya)); else ya=Math.min(a.bottom-host.top-14,Math.max(a.top-host.top+14,yb));
      const mx=(xa+xb)/2;
      d='M'+xa+' '+ya+' C'+mx+' '+ya+' '+mx+' '+yb+' '+xb+' '+yb;
    }
    f.base.setAttribute('d',d); f.dash.setAttribute('d',d);
  });
}
function updateEnergyFlows(c){
  layoutEnergyFlows();
  energyFlows.forEach(f=>{
    const r=f.fn(c), i=Math.max(0,Math.min(1,r.i||0)), on=i>0.01, w=2+7*Math.sqrt(i), dur=Math.max(.35,1.7-1.35*i);
    f.base.setAttribute('stroke-width',w+4); f.base.style.opacity=on?'.2':'.07';
    f.dash.setAttribute('stroke-width',Math.max(2.5,w*0.8)); f.dash.style.opacity=on?'1':'0';
    f.dash.style.strokeDasharray='0.5 '+(9+w*0.6).toFixed(1);
    if(Math.abs(dur-f.lastDur)>0.06){ f.dash.style.animationDuration=dur.toFixed(2)+'s'; f.lastDur=dur; }
    f.dash.classList.toggle('rev',!!r.rev);
  });
}
window.addEventListener('resize', ()=>{ if(!energyPanelEl.hidden) layoutEnergyFlows(); });
if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ if(!energyPanelEl.hidden) layoutEnergyFlows(); });

energyPanelEl.addEventListener('click', e=>{
  // stopPropagation: иначе этот же клик дойдёт до document и обработчик «клик вне поповера»
  // ниже тут же закроет только что открытый поповер.
  if(e.target.closest('[data-toggle-sun-pop]')){ e.stopPropagation(); sunPopOpen=!sunPopOpen; genPopOpen=null; renderEnergy(); return; }
  if(e.target.closest('[data-close-sun-pop]')){ e.stopPropagation(); sunPopOpen=false; renderEnergy(); return; }
  const genBtn=e.target.closest('[data-toggle-gen-pop]');
  if(genBtn){ e.stopPropagation(); const id=genBtn.dataset.toggleGenPop; genPopOpen=(genPopOpen===id)?null:id; sunPopOpen=false; renderEnergy(); return; }
  if(e.target.closest('[data-close-gen-pop]')){ e.stopPropagation(); genPopOpen=null; renderEnergy(); return; }
  if(e.target.closest('.en-dialpop')){ e.stopPropagation(); return; }
  const per=e.target.closest('[data-en-period]');
  if(per){ enUi.period=per.dataset.enPeriod; saveEnergyUi(); renderEnergy(); return; }
  const kc=e.target.closest('[data-kpi-chart]');
  if(kc){ openEnergyChart(kc.dataset.kpiChart); return; }
});
document.addEventListener('click', ()=>{
  if(sunPopOpen||genPopOpen){ sunPopOpen=false; genPopOpen=null; renderEnergy(); }
});
