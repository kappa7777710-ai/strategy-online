// Тестовая страница энергосети (energy-test.html) в стиле SAGE. Цифры берутся из игры:
// баланс и сводка — energyNow()/energyBalance() (core.js, 8-energy.js), журнал — journalValues(),
// профиль суток — energySunProfile(). Скрипт только рисует и обновляется вместе с renderAll.

const EN_SUBS=[{id:'sources',label:'Источники'},{id:'consumers',label:'Потребители'},{id:'journal',label:'Журнал'}];
const en={tab:'sources'};
const enArt={};

// Энергетические постройки для карточек справа: генераторы (по рецепту) и аккумуляторы.
function enSources(){
  const list=BUILDINGS.filter(b=>b.type==='solar'||b.type==='tpp').map(b=>{
    const t=typeOf(b), count=state.buildings[b.id]||0, now=recipeRatePerHour(b), plate=energyNameplateKw(b);
    const u=util[b.id]||{};
    let tag=['dim','Не построено'];
    if(count>0){
      if(now>0.01) tag=['ok','Работает'];
      else if(b.type==='solar' && sunFactor(state.playSeconds||0)<=0) tag=['warn','Ночь'];
      else tag=['bad',u.reason==='input'?'Нет топлива':'Простаивает'];
    }
    return {key:'type-'+t.id, name:t.name, color:t.neutralColor||'energy', count, artKey:artKeyOf(t), icon:t.icon,
      main:fmtPowerKw(now), sub:count>0?'из '+fmtPowerKw(plate)+' установленных':'выработка до '+fmtPowerKw(b.out.energy*3600/b.cycle)+' на 1 шт.', tag};
  });
  BATTERIES.forEach(bt=>{
    const count=state.buildings[bt.id]||0;
    list.push({key:'bat-'+bt.id, name:bt.name, color:'energy', count, artKey:'battery', icon:'battery',
      main:fmtStoredEnergyKwh(count*bt.capacity), sub:'+'+fmtStoredEnergyKwh(bt.capacity)+' ёмкости на 1 шт.',
      tag:count>0?['ok','В сети']:['dim','Не построено']});
  });
  return list;
}
function enArtOf(s){ return enArt[s.key] || (enArt[s.key]=buildArtFor(s.artKey,s.icon,s.color)); }

// Группы потребителей с фактической и полной нагрузкой.
function enConsumers(){
  return energyConsumerGroups().map(g=>{
    const now=g.list.reduce((s,b)=>s+powerDrawPerHour(b),0), full=g.list.reduce((s,b)=>s+energyInstalledKw(b),0);
    const units=g.list.reduce((s,b)=>s+(state.buildings[b.id]||0),0);
    return {...g, now, full, units};
  });
}

// ---------- Заголовок ----------
function renderEnTitle(c){
  const tag = c.demand<=0.01 ? '<span class="bm-tag dim">Нагрузки нет</span>'
    : c.frac>=0.999 ? '<span class="bm-tag ok">Обеспечено 100%</span>'
    : '<span class="bm-tag bad">Дефицит · обеспечено '+Math.round(c.frac*100)+'%</span>';
  const net=c.bal.net;
  setHtml('bmTitle',
    '<div class="bm-title-main"><h1>Энергосеть базы</h1><div class="bm-title-tags"><b>T0</b>'+tag+'</div></div>'+
    '<div class="bm-through"><div><label>Баланс сети</label><b class="'+(net>=0?'en-pos':'en-neg')+'">'+(net>=0?'+':'−')+fmtPowerKw(Math.abs(net))+'</b></div>'+
      '<div class="r"><label>Заряд аккумуляторов</label><b>'+Math.round(c.pct)+'%</b></div></div>');
}

// ---------- Центр: генераторы → сеть → потребители ----------
function hexPts(cx,cy,r){
  let p=[]; for(let k=0;k<6;k++){ const a=Math.PI/180*(60*k-90); p.push((cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1)); }
  return p.join(' ');
}
function hexSvgIcon(inner,cv,cx,cy,s,vb){
  return '<svg x="'+(cx-s/2)+'" y="'+(cy-s/2)+'" width="'+s+'" height="'+s+'" viewBox="'+(vb||'0 0 20 20')+'" fill="currentColor" style="color:var(--'+cv+')">'+inner+'</svg>';
}
function renderEnVis(c){
  const W=420, H=640, CX=210, CY=320, R=92, r=38, IY=96, OY=548;
  const gens=BUILDINGS.filter(b=>(b.type==='solar'||b.type==='tpp') && (state.buildings[b.id]||0)>0);
  const cons=enConsumers();
  const xs=(n,w)=>Array.from({length:n},(_,i)=>CX+(i-(n-1)/2)*Math.min(w,(W-90)/Math.max(1,n-1||1)));
  const ok=c.demand<=0.01||c.frac>=0.999;
  let bg='';
  const hr=44, hw=Math.sqrt(3)*hr;
  for(let row=-1;row<11;row++) for(let col=-1;col<6;col++){
    const x=col*hw+(row%2?hw/2:0), y=row*hr*1.5, d=Math.hypot(x-CX,(y-CY)*0.55)/260;
    if(d>1) continue;
    bg+='<polygon class="bm-cell" points="'+hexPts(x,y,hr-3)+'" style="opacity:'+(0.9-d*0.85).toFixed(2)+'"/>';
  }
  let links='', nodes='';
  const top=gens.length?gens:[null];
  xs(top.length,104).forEach((x,i)=>{
    const b=top[i], d='M'+x+','+(IY+r)+' C'+x+','+(IY+130)+' '+CX+','+(CY-R-90)+' '+CX+','+(CY-R);
    if(!b){
      links+='<path class="bm-link out use" d="'+d+'"/>';
      nodes+='<g class="bm-node out use"><polygon points="'+hexPts(x,IY,r)+'"/>'+hexSvgIcon(ICONS.power,'text-muted',x,IY-4,24)+
        '<text x="'+x+'" y="'+(IY-r-10)+'" class="bm-node-qty">Нет генераторов</text></g>';
      return;
    }
    const now=recipeRatePerHour(b), live=now>0.01, t=typeOf(b);
    links+='<path class="bm-link '+(live?'gen':'out use')+'" d="'+d+'"/>'+(live?'<path class="bm-flow gen" d="'+d+'"/>':'');
    nodes+='<g class="bm-node '+(live?'gen':'out use')+'"><polygon points="'+hexPts(x,IY,r)+'"/>'+hexSvgIcon(ICONS[t.icon]||ICONS.power,'energy',x,IY-6,30)+
      '<text x="'+x+'" y="'+(IY+22)+'" class="bm-node-name">'+(b.type==='solar'?'Солнце':'ТЭС')+' ×'+(state.buildings[b.id]||0)+'</text>'+
      '<text x="'+x+'" y="'+(IY-r-10)+'" class="bm-node-qty">+'+fmtPowerKw(now)+'</text></g>';
  });
  const bot=cons.length?cons:[null];
  xs(bot.length,110).forEach((x,i)=>{
    const g=bot[i], d='M'+CX+','+(CY+R)+' C'+CX+','+(CY+R+80)+' '+x+','+(OY-r-80)+' '+x+','+(OY-r);
    if(!g){
      links+='<path class="bm-link out use" d="'+d+'"/>';
      nodes+='<g class="bm-node out use"><polygon points="'+hexPts(x,OY,r)+'"/>'+hexSvgIcon(ICONS.area,'text-muted',x,OY-4,22)+
        '<text x="'+x+'" y="'+(OY+r+18)+'" class="bm-node-qty">Нет потребителей</text></g>';
      return;
    }
    // Красный — только реальная нехватка электричества; простаивающая группа (нет сырья, персонала,
    // места на складе) показана приглушённо — дело не в сети.
    const st=g.now<=0.01?'idle':c.frac<0.999?'bad':'ok';
    const cls=st==='idle'?'out use':st;
    links+='<path class="bm-link '+cls+'" d="'+d+'"/>'+(st!=='idle'?'<path class="bm-flow '+st+'" d="'+d+'"/>':'');
    nodes+='<g class="bm-node '+cls+'" style="--gc:'+g.color+'"><polygon points="'+hexPts(x,OY,r)+'"/>'+
      '<circle cx="'+x+'" cy="'+(OY-6)+'" r="9" class="en-gdot"/>'+
      '<text x="'+x+'" y="'+(OY+20)+'" class="bm-node-name">'+esc(g.name).slice(0,11)+'</text>'+
      '<text x="'+x+'" y="'+(OY+r+18)+'" class="bm-node-qty">'+(st==='idle'?'простой':'−'+fmtPowerKw(g.now))+'</text></g>';
  });
  if(!enArt.core) enArt.core=buildArtFor('battery','battery','energy');
  const art='<svg x="'+(CX-R*0.86)+'" y="'+(CY-R*0.72)+'" width="'+(R*1.72)+'" height="'+(R*1.42)+'" viewBox="18 4 224 184" class="bart" style="--tier-color:var(--energy);--chg:'+(c.pct/100).toFixed(3)+'">'+enArt.core+'</svg>';
  // Кольцо заряда по периметру ядра.
  const per=6*R, dash=(c.pct/100*per).toFixed(1);
  setHtml('bmVis','<svg class="bm-chain '+(ok?'ok':'bad')+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Генераторы, сеть и потребители">'+
    '<defs><clipPath id="enHexClip"><polygon points="'+hexPts(CX,CY,R-10)+'"/></clipPath></defs>'+
    '<g class="bm-cells">'+bg+'</g>'+links+
    '<polygon class="bm-core-glow" points="'+hexPts(CX,CY,R+6)+'"/>'+
    '<polygon class="bm-core-ring" points="'+hexPts(CX,CY,R)+'"/>'+
    '<polygon class="bm-core-in" points="'+hexPts(CX,CY,R-10)+'"/>'+
    '<g clip-path="url(#enHexClip)">'+art+'</g>'+
    '<polygon class="en-charge" points="'+hexPts(CX,CY,R+14)+'" style="stroke-dasharray:'+dash+' '+(per*1.2).toFixed(1)+'"/>'+
    '<text x="'+CX+'" y="'+(CY+R+30)+'" class="bm-core-name">Энергосеть · '+Math.round(c.pct)+'%</text>'+
    '<text x="16" y="24" class="bm-axis">Генерация</text>'+
    '<text x="16" y="'+(H-14)+'" class="bm-axis">Нагрузка по группам</text>'+nodes+'</svg>');
}

// ---------- Средняя колонка: сутки, баланс, аккумуляторы, профиль ----------
function enProfileSvg(){
  const p=energySunProfile(), W=340, H=120, pad=22, bw=(W-pad)/24;
  const max=Math.max(1,p.demandKw,...p.gen)*1.1;
  const y=v=>H-16-(v/max)*(H-28);
  const hour=Math.floor(((state.playSeconds||0)%86400)/3600);
  let bars='';
  p.gen.forEach((v,h)=>{ bars+='<rect x="'+(pad+h*bw+1).toFixed(1)+'" y="'+y(v).toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+Math.max(0,H-16-y(v)).toFixed(1)+'" class="en-bar'+(h===hour?' now':'')+'"/>'; });
  const dy=y(p.demandKw).toFixed(1);
  const ticks=[0,6,12,18,24].map(h=>'<text x="'+(pad+h*bw).toFixed(1)+'" y="'+(H-3)+'" class="en-tick">'+String(h%24).padStart(2,'0')+'</text>').join('');
  return '<svg class="en-prof" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Выработка по часам и текущая нагрузка">'+
    '<text x="0" y="'+(Number(y(max/1.1))+4)+'" class="en-tick start">'+fmtPowerKw(max/1.1)+'</text>'+
    '<line x1="'+pad+'" x2="'+W+'" y1="'+(H-16)+'" y2="'+(H-16)+'" class="en-axisl"/>'+bars+
    (p.demandKw>0?'<line x1="'+pad+'" x2="'+W+'" y1="'+dy+'" y2="'+dy+'" class="en-dem"/><text x="'+W+'" y="'+(dy-4)+'" class="en-tick end dem">нагрузка '+fmtPowerKw(p.demandKw)+'</text>':'')+
    ticks+'</svg>';
}
function renderEnCfg(c){
  const sec=state.playSeconds||0, sun=sunFactor(sec);
  let eta='Заряд не меняется';
  if(c.flow>0.01 && c.cap>c.stored) eta='До полного заряда · '+fmtDurHm((c.cap-c.stored)/c.flow*3600);
  else if(c.flow<-0.01 && c.stored>0) eta='До разряда · '+fmtDurHm(c.stored/(-c.flow)*3600);
  else if(c.cap>0 && c.stored>=c.cap-1e-6) eta='Аккумуляторы заполнены';
  const seg=(pct,cls)=>'<div class="en-seg '+cls+'"><i style="width:'+Math.max(0,Math.min(100,pct)).toFixed(1)+'%"></i></div>';
  let h='<div class="bm-proj"><label>Время суток</label><b>'+
    '<svg viewBox="0 0 20 20" width="15" height="15"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 5.5V10l3 2" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>'+
    dayClockStr(sec)+' · '+(sun>0?'День · солнце '+Math.round(sun*100)+'%':'Ночь · солнца нет')+'</b></div>';
  h+='<div class="bm-field"><div class="bm-flabel"><span>Обеспеченность нагрузки</span><span>'+(c.demand>0.01?Math.round(c.frac*100)+'%':'—')+'</span></div>'+
    seg(c.demand>0.01?c.frac*100:0,c.frac>=0.999?'ok':'bad')+'</div>';
  h+='<div class="bm-field"><div class="bm-flabel"><span>Аккумуляторы</span><span>'+fmtStoredEnergyKwh(c.stored)+' / '+fmtStoredEnergyKwh(c.cap)+'</span></div>'+
    seg(c.pct,'cyan')+'<div class="en-note">'+eta+'</div></div>';
  h+='<div class="bm-field"><div class="bm-flabel"><span>Профиль суток</span><span>расчёт</span></div><div class="en-prof-wrap">'+enProfileSvg()+'</div></div>';
  h+='<div class="bm-field"><div class="bm-flabel"><span>Сейчас</span><span>кВт</span></div><ul class="bm-req">'+
    '<li class="ok">'+ico('power','energy')+'<span>Выработка</span><b>'+fmtPowerKw(c.bal.gen)+'</b></li>'+
    '<li class="'+(c.frac>=0.999?'ok':'bad')+'">'+ico('worker','class1')+'<span>Нагрузка</span><b>'+fmtPowerKw(c.supply)+' из '+fmtPowerKw(c.demand)+'</b></li>'+
    '<li class="info">'+ico('energy','energy')+'<span>Установленная мощность</span><b>'+fmtPowerKw(c.nameplate)+'</b></li>'+
    (c.curtail>0.01?'<li class="info">'+ico('trash','text-muted')+'<span>Сбрасывается излишек</span><b>'+fmtPowerKw(c.curtail)+'</b></li>':'')+
    '</ul></div>';
  h+='<div class="bm-actions"><label>Действия</label><div>'+
    '<a class="bm-act" href="'+sgHref('build')+'#type-solar"><svg viewBox="0 0 20 20" width="14" height="14"><path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.3 4.3l2.1 2.1M13.6 13.6l2.1 2.1M4.3 15.7l2.1-2.1M13.6 6.4l2.1-2.1" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="3.2" fill="currentColor"/></svg><span>Генератор<small>Открыть в стройке</small></span></a>'+
    '<a class="bm-act primary" href="'+sgHref('build')+'#bat-battery_small"><svg viewBox="0 0 20 20" width="14" height="14"><rect x="3" y="5" width="13" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="16" y="8" width="2" height="4" fill="currentColor"/><path d="M10 7l-2 3.5h3L9 14" stroke="currentColor" stroke-width="1.5" fill="none"/></svg><span>Аккумулятор<small>Увеличить ёмкость</small></span></a>'+
  '</div></div>';
  setHtml('bmCfg',h);
}

// ---------- Справа: источники, потребители, журнал ----------
function renderEnCat(c){
  const src=enSources(), cons=enConsumers();
  const built=src.filter(s=>s.count>0).length;
  setHtml('bmCatTabs',EN_SUBS.map(t=>{
    const extra=t.id==='sources'?' · '+built+' в сети':t.id==='consumers'?' · '+cons.length+' групп':' · '+EN_PMAP[enUi.period].label;
    return '<button class="bm-ctab'+(en.tab===t.id?' active':'')+'" data-tab="'+t.id+'">'+t.label+' <span>'+extra+'</span></button>';
  }).join(''));
  let h='';
  if(en.tab==='sources'){
    h='<div class="bm-cards">'+src.map(s=>
      '<a class="bm-card'+(s.count>0?'':' off')+'" href="'+sgHref('build')+'#'+s.key+'" style="--tier-color:var(--'+s.color+')">'+
        '<span class="bm-card-top"><span class="bm-count">×'+s.count+'</span><span class="bm-tag '+s.tag[0]+'">'+s.tag[1]+'</span></span>'+
        '<span class="bm-card-art"><svg class="bart" viewBox="18 4 224 184" style="--tier-color:var(--'+s.color+')">'+enArtOf(s)+'</svg></span>'+
        '<span class="bm-card-name">'+esc(s.name)+'</span><span class="en-card-val">'+s.main+'</span><span class="bm-card-sub">'+s.sub+'</span></a>').join('')+'</div>';
  }else if(en.tab==='consumers'){
    h=cons.length?'<ul class="en-cons">'+cons.map(g=>{
      const pct=g.full>0?g.now/g.full*100:0, idle=g.now<=0.01;
      return '<li style="--gc:'+g.color+'"><div class="en-cons-h"><b>'+g.name+'</b><span>'+g.units+' уст.</span></div>'+
        '<div class="en-seg"><i style="width:'+pct.toFixed(1)+'%;background:var(--gc)"></i></div>'+
        '<div class="en-cons-f"><span>'+fmtPowerKw(g.now)+' из '+fmtPowerKw(g.full)+'</span><span class="'+(pct>=99.9?'ok':'bad')+'">'+Math.round(pct)+'%</span></div></li>';
    }).join('')+'</ul>':'<div class="bm-empty">Потребителей пока нет. Электричество тратят шахты, буровые, фермы и пищеблоки.</div>';
  }else{
    const jv=journalValues(enUi.period);
    h='<div class="en-periods">'+EN_PERIODS.filter(p=>p.id!=='live').map(p=>
      '<button class="en-period'+(p.id===enUi.period?' active':'')+'" data-period="'+p.id+'">'+p.label+'</button>').join('')+'</div>'+
      '<div class="en-kpis">'+jv.list.map(k=>
        '<div class="en-kpi" style="--kc:'+k.color+'"><label>'+k.l+'</label><b>'+k.v+'</b><span>'+k.s+'</span>'+k.d+'</div>').join('')+'</div>';
  }
  setHtml('bmCards',h);
}

function renderEnergyMenu(){
  const c=energyNow();
  sgShell({page:'energy', mainSub:'sources', subs:EN_SUBS, activeSub:en.tab, focus:EN_SUBS.find(s=>s.id===en.tab).label});
  renderEnTitle(c); renderEnVis(c); renderEnCfg(c); renderEnCat(c);
}

const _enRenderAll=renderAll;
renderAll=function(){ _enRenderAll(); renderEnergyMenu(); };

{ const h=location.hash.slice(1); if(EN_SUBS.some(s=>s.id===h)) en.tab=h; }
document.getElementById('bmNav').addEventListener('click',e=>{
  const b=e.target.closest('[data-sub]'); if(!b) return; en.tab=b.dataset.sub; renderEnergyMenu();
});
document.getElementById('bmCatTabs').addEventListener('click',e=>{
  const b=e.target.closest('[data-tab]'); if(!b) return; en.tab=b.dataset.tab; renderEnergyMenu();
});
document.getElementById('bmCards').addEventListener('click',e=>{
  const b=e.target.closest('[data-period]'); if(!b) return; enUi.period=b.dataset.period; saveEnergyUi(); renderEnergyMenu();
});
