// Тестовое меню стройки (build-menu-test.html). Своих правил нет: данные, цены, площадь и
// сама постройка берутся из core.js (tryBuild, scaledCost, freeArea …), картинки зданий из
// 3-build-art.js. Скрипт только рисует и подключается к renderAll, чтобы обновляться каждый тик.

const BM_CATS=[
  {id:'all',label:'Все категории'},
  ...BUILD_CATEGORIES.filter(c=>c.id!=='storage'),
  {id:'staff',label:'Персонал'},
];
const bm={tab:'projects', cat:'all', sort:'ready', q:'', sel:null, qty:1, recipe:{}};
const bmArt={};   // кэш SVG-сцен: строим один раз, иначе анимации сбрасывались бы каждый тик

// ---------- Каталог ----------
function bmCatalog(){
  const items=[];
  BUILDING_TYPES.forEach(t=>{
    const recipes=BUILDINGS.filter(b=>typeKey(b)===t.id && recipeVisible(b));
    if(!recipes.length) return;
    items.push({key:'type-'+t.id, name:t.name, cat:t.category||'mining', color:t.neutralColor||'tier0',
      art:()=>buildArtFor(artKeyOf(t),t.icon,t.neutralColor||'tier0'), area:t.area||0,
      cost:()=>scaledCost(t,typeCount(recipes[0])), count:()=>typeCount(recipes[0]), recipes,
      unlocked:()=>tierUnlocked(0)});
  });
  BATTERIES.forEach(bt=>items.push({key:'bat-'+bt.id, name:bt.name, cat:'energy', color:'energy',
    art:()=>buildArtFor('battery','battery','energy'), area:bt.area||0, buildId:bt.id,
    cost:()=>scaledCost(bt,state.buildings[bt.id]||0), count:()=>state.buildings[bt.id]||0,
    note:'Ёмкость заряда +'+fmtStoredEnergyKwh(bt.capacity), unlocked:()=>true}));
  HOUSING.forEach(h=>items.push({key:'house-'+h.id, name:h.name, cat:'staff', color:'class'+h.cls,
    art:()=>buildArtFor('house','housing','class'+h.cls), area:h.area||0, buildId:h.id,
    cost:()=>scaledCost(h,state.buildings[h.id]||0), count:()=>state.buildings[h.id]||0,
    note:'Вместимость +'+h.capacity+' чел.', unlocked:()=>typeof popUnlocked!=='function'||popUnlocked(h.cls)}));
  WORKFORCE_BUILDINGS.forEach(w=>items.push({key:'wf-'+w.id, name:w.name, cat:'staff', color:'class1',
    art:()=>buildArtFor('hr','hrDept','class1'), area:w.area||0, buildId:w.id,
    cost:()=>scaledCost(w,state.buildings[w.id]||0), count:()=>state.buildings[w.id]||0,
    note:'Набор рабочих из жилых блоков', unlocked:()=>true}));
  return items;
}
const BM_ITEMS=bmCatalog();
// Ссылка вида build-menu-test.html#type-solar сразу открывает нужный проект (так ведёт кнопка со страницы энергии).
{ const h=location.hash.slice(1); if(h && BM_ITEMS.some(i=>i.key===h)) bm.sel=h; }
function bmItem(key){ return BM_ITEMS.find(i=>i.key===key); }
function bmArtOf(it){ return bmArt[it.key] || (bmArt[it.key]=it.art()); }
function bmRecipe(it){
  if(!it.recipes) return null;
  const id=bm.recipe[it.key];
  return it.recipes.find(b=>b.id===id && recipeUnlocked(b)) || it.recipes.find(recipeUnlocked) || it.recipes[0];
}
function bmBuildId(it){ const r=bmRecipe(it); return r ? r.id : it.buildId; }

// Что мешает построить qty штук: недостающие ресурсы, площадь, блокировка.
function bmCheck(it,qty){
  const cost=it.cost();
  const lines=Object.entries(cost).map(([rid,q])=>({rid, need:q*qty, have:state.resources[rid]||0}));
  const missing=lines.filter(l=>l.have<l.need);
  const areaNeed=it.area*qty, areaOk=areaNeed<=freeArea();
  const recipe=bmRecipe(it);
  const unlocked=it.unlocked() && (!recipe || recipeUnlocked(recipe));
  let status='ok';
  if(!unlocked) status='locked'; else if(missing.length) status='missing'; else if(!areaOk) status='area';
  return {lines, missing, areaNeed, areaOk, unlocked, status};
}
function bmMaxQty(it){
  let m=99;
  Object.entries(it.cost()).forEach(([rid,q])=>{ if(q>0) m=Math.min(m,Math.floor((state.resources[rid]||0)/q)); });
  if(it.area>0) m=Math.min(m,Math.floor(freeArea()/it.area));
  return Math.max(0,m);
}

// ---------- Мелочи ---------- (esc, num, ico, hms, setHtml — в sage-shell.js)
const STATUS_TAG={
  ok:['ok','Доступно'], area:['warn','Нет места'], locked:['dim','Закрыто'],
};
function statusTag(c){
  if(c.status==='missing') return '<span class="bm-tag bad">Не хватает '+c.missing.length+'</span>';
  const t=STATUS_TAG[c.status]; return '<span class="bm-tag '+t[0]+'">'+t[1]+'</span>';
}

// ---------- Рамка страницы (sage-shell.js) ----------
function renderShell(){
  const it=bm.sel&&bmItem(bm.sel);
  sgShell({page:'build', mainSub:'all', subs:BM_CATS.filter(c=>c.id!=='all'), activeSub:bm.cat, focus:it?it.name:'—'});
}

// ---------- Каталог справа ----------
function bmVisible(){
  const q=bm.q.trim().toLowerCase();
  let list=BM_ITEMS.filter(it=>(bm.cat==='all'||it.cat===bm.cat) && (!q||it.name.toLowerCase().includes(q)));
  if(bm.tab==='built') list=list.filter(it=>it.count()>0);
  const rank={ok:0,area:1,missing:2,locked:3};
  const by={
    az:(a,b)=>a.name.localeCompare(b.name,'ru'), za:(a,b)=>b.name.localeCompare(a.name,'ru'),
    area:(a,b)=>a.area-b.area||a.name.localeCompare(b.name,'ru'),
    ready:(a,b)=>rank[bmCheck(a,1).status]-rank[bmCheck(b,1).status]||a.name.localeCompare(b.name,'ru'),
  };
  return list.sort(by[bm.sort]);
}
function renderCatalog(){
  const ready=BM_ITEMS.filter(it=>bmCheck(it,1).status==='ok').length;
  const built=BM_ITEMS.reduce((s,it)=>s+it.count(),0);
  setHtml('bmCatTabs',
    '<button class="bm-ctab'+(bm.tab==='projects'?' active':'')+'" data-tab="projects">Проекты <span>· '+ready+' доступно</span></button>'+
    '<button class="bm-ctab'+(bm.tab==='built'?' active':'')+'" data-tab="built">Построено <span>· '+built+' объектов</span></button>');
  const list=bmVisible();
  document.getElementById('bmFound').textContent=list.length;
  if(!list.length){ setHtml('bmCards','<div class="bm-empty">Ничего не найдено. Сбросьте поиск или выберите другую категорию.</div>'); return; }
  setHtml('bmCards',list.map(it=>{
    const c=bmCheck(it,1);
    const catLbl=(BM_CATS.find(x=>x.id===it.cat)||{}).label||'';
    return '<button class="bm-card'+(bm.sel===it.key?' sel':'')+(c.status==='ok'?'':' off')+'" data-key="'+it.key+'" style="--tier-color:var(--'+it.color+')">'+
      '<span class="bm-card-top"><span class="bm-count">×'+it.count()+'</span>'+statusTag(c)+'</span>'+
      '<span class="bm-card-art"><svg class="bart" viewBox="18 4 224 184" style="--tier-color:var(--'+it.color+')">'+bmArtOf(it)+'</svg></span>'+
      '<span class="bm-card-name">'+esc(it.name)+'</span><span class="bm-card-sub">'+catLbl+' · '+it.area+' м²</span>'+
    '</button>';
  }).join(''));
}

// ---------- Центр: цепочка «материалы → здание → выпуск» ----------
function hexPts(cx,cy,r){
  let p=[]; for(let k=0;k<6;k++){ const a=Math.PI/180*(60*k-90); p.push((cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1)); }
  return p.join(' ');
}
function hexIcon(rid,cx,cy,s){
  const r=resById(rid), cv=r?colorVarOf(r):'tier0';
  return '<svg x="'+(cx-s/2)+'" y="'+(cy-s/2)+'" width="'+s+'" height="'+s+'" viewBox="0 0 48 48" fill="currentColor" style="color:var(--'+cv+')">'+(RES48[rid]||'<circle cx="24" cy="24" r="14"/>')+'</svg>';
}
function renderVis(it,c,qty){
  const W=420, H=640, CX=210, CY=320, R=92;
  const recipe=bmRecipe(it);
  const ins=c.lines;
  const outs=recipe ? Object.entries(recipe.out).map(([rid,q])=>({rid,label:'+'+fmtRate(q*3600/recipe.cycle*speedMultForRecipe(recipe)*(rid==='energy'?1:richOf(recipe)))+'/ч'}))
                    .concat(Object.entries(recipe.in).map(([rid,q])=>({rid,label:'−'+fmtRate(q*3600/recipe.cycle*speedMultForRecipe(recipe))+'/ч',use:true})))
                    : [];
  // Фоновые соты: тон зависит от того, хватает ли всего на постройку.
  const tone=c.status==='ok'?'ok':'bad';
  let bg='';
  const hr=44, hw=Math.sqrt(3)*hr;
  for(let row=-1;row<11;row++) for(let col=-1;col<6;col++){
    const x=col*hw+(row%2?hw/2:0), y=row*hr*1.5;
    const d=Math.hypot(x-CX,(y-CY)*0.55)/260;
    if(d>1) continue;
    bg+='<polygon class="bm-cell" points="'+hexPts(x,y,hr-3)+'" style="opacity:'+(0.9-d*0.85).toFixed(2)+'"/>';
  }
  const xs=(n,w)=>Array.from({length:n},(_,i)=>CX+(i-(n-1)/2)*Math.min(w,(W-90)/Math.max(1,n-1||1)));
  const inX=xs(ins.length,104), outX=xs(outs.length,110);
  const IY=96, OY=548, r=38;
  let links='', nodes='';
  ins.forEach((l,i)=>{
    const ok=l.have>=l.need, x=inX[i];
    const d='M'+x+','+(IY+r)+' C'+x+','+(IY+130)+' '+CX+','+(CY-R-90)+' '+CX+','+(CY-R);
    links+='<path class="bm-link '+(ok?'ok':'bad')+'" d="'+d+'"/><path class="bm-flow '+(ok?'ok':'bad')+'" d="'+d+'"/>';
    nodes+='<g class="bm-node '+(ok?'ok':'bad')+'"><polygon points="'+hexPts(x,IY,r)+'"/>'+hexIcon(l.rid,x,IY-6,34)+
      '<text x="'+x+'" y="'+(IY+22)+'" class="bm-node-name">'+esc(resName(l.rid)).slice(0,10)+'</text>'+
      '<text x="'+x+'" y="'+(IY-r-10)+'" class="bm-node-qty">'+num(Math.min(l.have,l.need))+' / '+num(l.need)+'</text></g>';
  });
  outs.forEach((o,i)=>{
    const x=outX[i];
    const d='M'+CX+','+(CY+R)+' C'+CX+','+(CY+R+80)+' '+x+','+(OY-r-80)+' '+x+','+(OY-r);
    links+='<path class="bm-link out'+(o.use?' use':'')+'" d="'+d+'"/>'+(o.use?'':'<path class="bm-flow out" d="'+d+'"/>');
    nodes+='<g class="bm-node out'+(o.use?' use':'')+'"><polygon points="'+hexPts(x,OY,r)+'"/>'+hexIcon(o.rid,x,OY-6,34)+
      '<text x="'+x+'" y="'+(OY+22)+'" class="bm-node-name">'+esc(resName(o.rid)).slice(0,10)+'</text>'+
      '<text x="'+x+'" y="'+(OY+r+18)+'" class="bm-node-qty">'+o.label+'</text></g>';
  });
  if(!outs.length){
    nodes+='<g class="bm-node out"><polygon points="'+hexPts(CX,OY,r)+'"/><text x="'+CX+'" y="'+(OY+6)+'" class="bm-node-big">×'+qty+'</text>'+
      '<text x="'+CX+'" y="'+(OY+r+18)+'" class="bm-node-qty">'+esc(it.note||'')+'</text></g>';
    links+='<path class="bm-link out" d="M'+CX+','+(CY+R)+' L'+CX+','+(OY-r)+'"/>';
  }
  const art='<svg x="'+(CX-R*0.86)+'" y="'+(CY-R*0.72)+'" width="'+(R*1.72)+'" height="'+(R*1.42)+'" viewBox="18 4 224 184" class="bart" style="--tier-color:var(--'+it.color+')">'+bmArtOf(it)+'</svg>';
  const svg='<svg class="bm-chain '+tone+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Материалы и выпуск: '+esc(it.name)+'">'+
    '<defs><clipPath id="bmHexClip"><polygon points="'+hexPts(CX,CY,R-10)+'"/></clipPath></defs>'+
    '<g class="bm-cells">'+bg+'</g>'+links+
    '<polygon class="bm-core-glow" points="'+hexPts(CX,CY,R+6)+'"/>'+
    '<polygon class="bm-core-ring" points="'+hexPts(CX,CY,R)+'"/>'+
    '<polygon class="bm-core-in" points="'+hexPts(CX,CY,R-10)+'"/>'+
    '<g clip-path="url(#bmHexClip)">'+art+'</g>'+
    '<text x="'+CX+'" y="'+(CY+R+26)+'" class="bm-core-name">'+esc(it.name.toUpperCase())+'</text>'+
    '<text x="'+(16)+'" y="'+(24)+'" class="bm-axis">Материалы</text>'+
    '<text x="'+(16)+'" y="'+(H-14)+'" class="bm-axis">'+(outs.length?'Выпуск и расход · 1 установка':'Результат')+'</text>'+
    nodes+'</svg>';
  setHtml('bmVis',svg);
}

// ---------- Заголовок и настройки ----------
function renderTitle(it,c){
  const have=c.lines.length-c.missing.length;
  setHtml('bmTitle',
    '<div class="bm-title-main"><h1>'+esc(it.name)+'</h1>'+
      '<div class="bm-title-tags"><b>T0</b><span class="bm-tag '+(c.missing.length?'bad':'ok')+'">'+have+'/'+c.lines.length+' материалов в наличии</span></div></div>'+
    '<div class="bm-through"><div><label>Площадь участка</label><b>'+num(c.areaNeed)+' м² из '+num(freeArea())+' свободных</b></div>'+
      '<div class="r"><label class="'+(c.areaOk?'ok':'bad')+'">'+(c.areaOk?'Места хватает':'Не хватает места')+'</label><b>Построено: '+it.count()+'</b></div></div>');
}
function renderCfg(it,c,qty){
  const recipe=bmRecipe(it), max=bmMaxQty(it);
  const assigned=Object.values(lastWorkforce).reduce((s,w)=>s+Math.floor(w.assigned),0);
  const freeStaff=Math.max(0,(state.population||0)-assigned);
  const staff=recipe?(recipe.workers||0)*qty:0;
  const cyc=recipe?recipe.cycle/speedMultForRecipe(recipe):0;
  let h='<div class="bm-proj"><label>'+(recipe?'Цикл производства':'Возведение')+'</label><b>'+
    '<svg viewBox="0 0 20 20" width="15" height="15"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 5.5V10l3 2" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>'+
    hms(cyc)+'</b></div>';
  h+='<div class="bm-field"><div class="bm-flabel"><span>Количество</span><span>Макс '+max+'</span></div>'+
    '<div class="bm-step">'+ico('area','text-muted',18)+
      '<input id="bmQty" type="number" min="1" max="99" value="'+qty+'" aria-label="Количество">'+
      '<span class="bm-arrows"><button data-qty="+1" aria-label="Больше">▲</button><button data-qty="-1" aria-label="Меньше">▼</button></span>'+
      '<button class="bm-mini" data-qty="max">Макс</button><button class="bm-mini x" data-qty="reset" aria-label="Сбросить">×</button></div></div>';
  h+='<div class="bm-field"><div class="bm-flabel"><span>Персонал</span><span>'+freeStaff+' свободно</span></div>'+
    '<div class="bm-step ro">'+ico('worker','class1',18)+'<output>'+staff+'</output><span class="bm-unit">'+(recipe?(recipe.workers||0)+' чел. × '+qty:'не требуется')+'</span></div></div>';
  if(it.recipes){
    h+='<div class="bm-field"><div class="bm-flabel"><span>Рецепт после постройки</span><span>'+it.recipes.length+' вар.</span></div>'+
      '<label class="bm-select wide"><select id="bmRecipe">'+it.recipes.map(b=>
        '<option value="'+b.id+'"'+(recipe&&b.id===recipe.id?' selected':'')+(recipeUnlocked(b)?'':' disabled')+'>'+esc(b.label||(resById(outId(b))||{}).name||recipeLabel(b))+(recipeUnlocked(b)?'':' · закрыто')+'</option>').join('')+
      '</select></label></div>';
  }
  h+='<div class="bm-field"><div class="bm-flabel"><span>Требования</span><span>×'+qty+'</span></div><ul class="bm-req">'+
    '<li class="'+(c.areaOk?'ok':'bad')+'">'+ico('area','text-secondary')+'<span>Площадь участка</span><b>'+num(c.areaNeed)+' из '+num(freeArea())+' м²'+'</b></li>'+
    c.lines.map(l=>{ const r=resById(l.rid); return '<li class="'+(l.have>=l.need?'ok':'bad')+'">'+ico(l.rid,colorVarOf(r))+'<span>'+esc(r.name)+'</span><b>'+num(l.need)+' / '+num(l.have)+'</b></li>'; }).join('')+
    (recipe&&recipe.power?'<li class="info">'+ico('power','energy')+'<span>Потребление</span><b>'+fmtPowerKw(recipe.power*qty)+'</b></li>':'')+
    '</ul></div>';
  const can=c.status==='ok';
  const why=c.status==='missing'?'Не хватает: '+c.missing.map(l=>resById(l.rid).name.toLowerCase()).join(', '):
            c.status==='area'?'Нет свободной площади':c.status==='locked'?'Проект закрыт':'Готово к возведению';
  h+='<div class="bm-actions"><label>Действия</label><div>'+
    '<button class="bm-act" data-act="reset"><svg viewBox="0 0 20 20" width="14" height="14"><path d="M4 10a6 6 0 1 0 2-4.5M4 3v4h4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>Сбросить<small>Вернуть по умолчанию</small></span></button>'+
    '<button class="bm-act primary" data-act="build"'+(can?'':' disabled')+'><svg viewBox="0 0 20 20" width="14" height="14"><path d="M10 2l2.4 5 5.4.6-4 3.7 1.1 5.3L10 14l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" fill="currentColor"/></svg><span>Начать стройку<small>'+esc(why)+'</small></span></button>'+
  '</div></div>';
  setHtml('bmCfg',h);
}

// ---------- Сборка ----------
function renderBuildMenu(){
  if(!bm.sel || !bmItem(bm.sel)) bm.sel=(bmVisible()[0]||BM_ITEMS[0]).key;
  const it=bmItem(bm.sel);
  bm.qty=Math.max(1,Math.min(99,bm.qty|0));
  const c=bmCheck(it,bm.qty);
  renderShell(); renderCatalog();
  renderTitle(it,c); renderVis(it,c,bm.qty); renderCfg(it,c,bm.qty);
}

// Игра зовёт renderAll каждый тик и после каждого действия — дорисовываем меню следом.
const _bmRenderAll=renderAll;
renderAll=function(){ _bmRenderAll(); renderBuildMenu(); };

// ---------- События ----------
document.getElementById('bmFilter').innerHTML=BM_CATS.map(c=>'<option value="'+c.id+'">'+c.label+'</option>').join('');
document.getElementById('bmSearch').addEventListener('input',e=>{ bm.q=e.target.value; renderBuildMenu(); });
document.getElementById('bmFilter').addEventListener('change',e=>{ bm.cat=e.target.value; renderBuildMenu(); });
document.getElementById('bmSort').addEventListener('change',e=>{ bm.sort=e.target.value; renderBuildMenu(); });
document.getElementById('bmNav').addEventListener('click',e=>{
  const b=e.target.closest('[data-sub]'); if(!b) return;
  bm.cat=b.dataset.sub; document.getElementById('bmFilter').value=bm.cat; renderBuildMenu();
});
document.getElementById('bmCatTabs').addEventListener('click',e=>{
  const b=e.target.closest('[data-tab]'); if(!b) return; bm.tab=b.dataset.tab; renderBuildMenu();
});
document.getElementById('bmCards').addEventListener('click',e=>{
  const b=e.target.closest('[data-key]'); if(!b) return;
  if(bm.sel!==b.dataset.key){ bm.sel=b.dataset.key; bm.qty=1; }
  renderBuildMenu();
  if(window.matchMedia('(max-width:1279px)').matches) document.getElementById('bmTitle').scrollIntoView({behavior:'smooth',block:'start'});
});
document.getElementById('bmCfg').addEventListener('click',e=>{
  const it=bmItem(bm.sel);
  const q=e.target.closest('[data-qty]');
  if(q){
    const v=q.dataset.qty;
    bm.qty = v==='max' ? Math.max(1,bmMaxQty(it)) : v==='reset' ? 1 : bm.qty+parseInt(v,10);
    renderBuildMenu(); return;
  }
  const a=e.target.closest('[data-act]');
  if(!a) return;
  if(a.dataset.act==='reset'){ bm.qty=1; delete bm.recipe[it.key]; renderBuildMenu(); return; }
  if(a.dataset.act==='build' && !a.disabled){
    const id=bmBuildId(it);
    for(let i=0;i<bm.qty;i++) tryBuild(id);
    bm.qty=1; renderBuildMenu();
  }
});
document.getElementById('bmCfg').addEventListener('change',e=>{
  e.target.blur();
  if(e.target.id==='bmQty'){ bm.qty=parseInt(e.target.value,10)||1; renderBuildMenu(); }
  if(e.target.id==='bmRecipe'){ bm.recipe[bm.sel]=e.target.value; renderBuildMenu(); }
});
