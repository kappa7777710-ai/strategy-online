// Вкладка 3 · «Стройка» — карточки строительства по уровням (тирам).

function renderTabs(){
  let html='';
  TAB_LABELS.forEach((label,t)=>{
    const cls='t'+t;
    const count=BUILDINGS.filter(b=>b.tier===t).reduce((s,b)=>s+(state.buildings[b.id]||0),0);
    const badge='T'+t+' · '+count;
    html+='<button class="tab-btn '+cls+' '+(t===activeTier?'active':'')+'" data-tier="'+t+'">'+label+
      '<span class="tab-badge">'+badge+'</span></button>';
  });
  tabsEl.innerHTML=html;
}

function buildingCardBody(b,tierOk,type,count){
  const cls=CLASS_OF_TIER[b.tier];
  const className=CLASSES.find(c=>c.id===cls).name;
  const cost=scaledCost(type,count);
  const skOk=recipeUnlocked(b);
  const afford=Object.entries(cost).every(([rid,q])=>(state.resources[rid]||0)>=q);
  const areaOk=(type.area||0)<=freeArea();
  const outRes=resById(outId(b));
  const richBadge = b.tier===0 ? '<div class="bcard-richness">'+richLabel(b)+': '+Math.round(richOf(b)*100)+'%</div>' : '';
  const wCut=workforceCutForRecipe(b);
  const effWorkers=Math.max(1,Math.round(b.workers*(1-wCut)));
  const staffBadge = '<div class="bcard-staff">Персонал: '+effWorkers+' × '+className+(wCut>0?' (база '+b.workers+')':'')+'</div>';
  const sMult=speedMultForRecipe(b);
  const speedBadge = sMult>1 ? '<div class="bcard-staff">Скорость с учётом навыка: ×'+sMult.toFixed(2)+'</div>' : '';
  const powerBadge = b.power ? '<div class="bcard-staff">Расход электроэнергии: '+fmtPowerKw(b.power*3600/b.cycle)+'</div>' : '';
  const lockNote = skOk ? '' : '<div class="bcard-lock">Нужен навык «'+skillName(recipeSkillId(b))+'» ур. '+(b.unlock||0)+'</div>';
  const areaNote = (skOk && !areaOk) ? '<div class="bcard-lock">Не хватает площади участка ('+(type.area||0)+' нужно, '+freeArea()+' свободно)</div>' : '';
  const costStr=costHtml(cost);
  return {
    outRes, richBadge, staffBadge, speedBadge, powerBadge, lockNote, areaNote, costStr, count,
    disabled: !tierOk||!skOk||!afford||!areaOk,
  };
}
// Карточка строительства = полноразмерная анимированная сцена (3-build-art.js) + описание.
// Рендер-функции ниже возвращают не строку, а объект {key, color, dim, art, info, live}:
//  key  — стабильный ключ карточки; пока набор ключей не меняется, DOM не пересоздаётся,
//         иначе анимации сцен сбрасывались бы каждый тик (renderAll вызывается раз в секунду);
//  info — текстовая часть, её заменяем только когда строка реально изменилась (цены, счётчики);
//  live — необязательная функция, подставляющая «живые» значения в уже нарисованную сцену.
// Карточка стоимости — полное название ресурса, сколько нужно и сколько есть на складе сейчас
// (а не просто короткий тег формулы, как в resTag(); тут решается про стройку, нужна ясность).
function costHtml(cost){
  return Object.entries(cost).map(([rid,q])=>{
    const r=resById(rid);
    const have=state.resources[rid]||0;
    const ok=have>=q;
    const cv=colorVarOf(r);
    return '<div class="cost-item '+(ok?'ok':'bad')+'" style="--rc:var(--'+cv+')">'+
      '<div class="cost-icon">'+iconSvg(rid,cv)+'</div>'+
      '<div class="cost-text"><span class="cost-name">'+r.name+'</span>'+
      '<span class="cost-qty"><strong>'+fmtQty(q)+'</strong><span class="cost-have"> / на складе '+fmtQty(have)+'</span></span></div>'+
    '</div>';
  }).join('');
}
function fmtQty(n){ return Math.round(n).toLocaleString('ru-RU'); }
// Площадь участка под здание — такой же наглядный блок, как и у стоимости ресурсов.
function areaChipHtml(area,areaOk){
  return '<div class="cost-item area-chip '+(areaOk?'ok':'bad')+'" style="--rc:var(--tier-color)">'+
    '<div class="cost-icon">'+iconSvg('area','tier-color')+'</div>'+
    '<div class="cost-text"><span class="cost-name">Площадь участка</span>'+
    '<span class="cost-qty"><strong>'+area+'</strong></span></div>'+
  '</div>';
}
// Выпуск здания — ресурс(ы), которые оно производит. Для зданий с несколькими рецептами
// (горнодобывающая/буровая под разные руды, пищеблок под разные пайки) перечисляем все —
// это ещё не выбор руды (он на вкладке «Производство»), а что вообще можно получить.
function outputChipsHtml(recipes){
  return recipes.map(b=>{
    const rid=outId(b), r=resById(rid), cv=colorVarOf(r);
    const perHour=unitPotentialPerHour(b);
    const qtyStr = rid==='energy'
      ? '<strong>'+fmtPowerKw(perHour)+'</strong><span class="cost-have"> на полной мощности</span>'
      : '<strong>+'+fmtRate(perHour)+'</strong><span class="cost-have"> '+r.name.toLowerCase()+'/ч за установку</span>';
    return '<div class="cost-item output-chip ok" style="--rc:var(--'+cv+')">'+
      '<div class="cost-icon">'+iconSvg(rid,cv)+'</div>'+
      '<div class="cost-text"><span class="cost-name">'+(b.label||r.name)+'</span>'+
      '<span class="cost-qty">'+qtyStr+'</span></div>'+
    '</div>';
  }).join('');
}
function artKeyOf(type){ return type.id==='solar'||type.type==='solar' ? 'solar' : type.id; }
function renderSingleRecipeCard(b,tierOk){
  const type=typeOf(b);
  const count=state.buildings[b.id]||0;
  const bb=buildingCardBody(b,tierOk,type,count);
  const cv=colorVarOf(bb.outRes);
  return {
    key:'rec-'+b.id, color:'var(--'+cv+')', dim:bb.disabled&&tierOk,
    art:buildArtFor(artKeyOf(type),type.icon||bb.outRes.id,cv),
    live: b.type==='solar' ? liveSolar : null,
    info:
      '<div class="bcard-head"><div><h3>'+type.name+'</h3>'+bb.richBadge+bb.staffBadge+bb.speedBadge+bb.powerBadge+'</div></div>'+
      '<div class="bcard-stats"><span>Уже построено: <strong>'+bb.count+'</strong></span><span>Цикл: '+fmtDuration(b.cycle)+' · '+fmtDurationWords(b.cycle)+'</span></div>'+
      bb.lockNote+bb.areaNote+
      '<div class="bcard-section-label">Производит</div><div class="bcard-cost">'+outputChipsHtml([b])+'</div>'+
      '<div class="bcard-section-label">Требуется для постройки</div><div class="bcard-cost">'+areaChipHtml(type.area||0,(type.area||0)<=freeArea())+bb.costStr+'</div>'+
      '<button class="build-btn" data-build="'+b.id+'" '+(bb.disabled?'disabled':'')+'>Построить (+1)</button>',
  };
}
function renderTypeBuildCard(type,recipes,tierOk){
  const count=typeCount({type:type.id});
  const cost=scaledCost(type,count);
  const afford=Object.entries(cost).every(([rid,q])=>(state.resources[rid]||0)>=q);
  const areaOk=(type.area||0)<=freeArea();
  const disabled=!tierOk||!afford||!areaOk;
  const areaNote=(!areaOk)?'<div class="bcard-lock">Не хватает площади участка ('+(type.area||0)+' нужно, '+freeArea()+' свободно)</div>':'';
  const buildId=recipes[0].id; // строится "вслепую" — конкретная руда выбирается позже, во вкладке «Производство»
  const cv=type.neutralColor||'tier0';
  return {
    key:'type-'+type.id, color:'var(--'+cv+')', dim:disabled&&tierOk,
    art:buildArtFor(artKeyOf(type),type.icon,cv),
    info:
      '<div class="bcard-head"><div><h3>'+type.name+'</h3>'+
      '<div class="bcard-staff">Рецепт выбирается после постройки, во вкладке «Производство»</div></div></div>'+
      '<div class="bcard-stats"><span>Уже построено: <strong>'+count+'</strong></span></div>'+
      areaNote+
      '<div class="bcard-section-label">Может производить</div><div class="bcard-cost">'+outputChipsHtml(recipes)+'</div>'+
      '<div class="bcard-section-label">Требуется для постройки</div><div class="bcard-cost">'+areaChipHtml(type.area||0,areaOk)+costHtml(cost)+'</div>'+
      '<button class="build-btn" data-build="'+buildId+'" '+(disabled?'disabled':'')+'>Построить (+1)</button>',
  };
}
function renderBatteryBuildCard(bt){
  const count=state.buildings[bt.id]||0;
  const cost=scaledCost(bt,count);
  const areaOk=(bt.area||0)<=freeArea();
  const afford=Object.entries(cost).every(([rid,q])=>(state.resources[rid]||0)>=q)&&areaOk;
  return {
    key:'bat-'+bt.id, color:'var(--energy)', dim:false,
    art:buildArtFor('battery',bt.icon||'battery','energy'), live:liveBattery,
    info:
      '<div class="bcard-head"><div><h3>'+bt.name+'</h3><div class="bcard-recipe">Ёмкость заряда: +'+fmtStoredEnergyKwh(bt.capacity)+'</div></div></div>'+
      '<div class="bcard-stats"><span>Построено: <strong>'+count+'</strong></span><span>Даёт всего: '+fmtStoredEnergyKwh(count*bt.capacity)+'</span></div>'+
      '<div class="bcard-section-label">Требуется для постройки</div><div class="bcard-cost">'+areaChipHtml(bt.area||0,areaOk)+costHtml(cost)+'</div>'+
      '<button class="build-btn" data-build="'+bt.id+'" '+(afford?'':'disabled')+'>Построить (+1)</button>',
  };
}
// Резервуары для жидкостей — не новые постройки, а улучшение уже стоящего резервуара каждой
// жидкости (LIQUID_TANK_LEVELS в core.js; то же действие, что кнопка на складе). На картинке —
// капсула того размера, который получится после улучшения (на максимуме — текущая), с живым
// уровнем: сколько этой жидкости уже есть относительно новой ёмкости.
const TANK_CARD_LQ={oil:['#6E5A33','#C4A66A']};
function tankCardColors(r){
  const o=TANK_CARD_LQ[r.id];
  const base='var(--'+colorVarOf(r)+')';
  return o ? {lq:o[0],lqt:o[1]} : {lq:base,lqt:'color-mix(in srgb,'+base+' 75%,#fff)'};
}
function tankCardShownLevel(resId){ const n=liquidTankNext(resId); return n ? n.lvl : liquidTankLevel(resId); }
function tankCardPct(resId){
  const cap=LIQUID_TANK_LEVELS[tankCardShownLevel(resId)-1].capacity;
  return Math.max(0,Math.min(100,(state.resources[resId]||0)/cap*100));
}
function renderTankBuildCard(r){
  const cur=liquidTankInfo(r.id), next=liquidTankNext(r.id), shown=tankCardShownLevel(r.id);
  const col=tankCardColors(r);
  const pips=LIQUID_TANK_LEVELS.map(l=>'<i class="'+(l.lvl<=cur.lvl?'on':(next&&l.lvl===next.lvl?'next':''))+'"></i>').join('');
  const afford=next && Object.entries(next.cost).every(([rid,q])=>(state.resources[rid]||0)>=q);
  const action = next
    ? '<div class="bcard-cost">'+costHtml(next.cost)+'</div>'+
      '<button class="build-btn" data-tank-up="'+r.id+'" '+(afford?'':'disabled')+'>Улучшить до «'+next.short+'»</button>'
    : '<div class="bcard-max">Максимальный уровень резервуара</div>';
  return {
    key:'tank-'+r.id+'-'+shown, color:col.lqt, dim:false, extraStyle:'--lq:'+col.lq+';--lqt:'+col.lqt,
    art:bartTank(r.id,shown,tankCardPct(r.id)), live:liveTank(r.id,shown),
    info:
      '<div class="bcard-head"><div><h3>Резервуар: '+r.name+'</h3>'+
        '<div class="bcard-recipe"><span class="bcard-pips">'+pips+'</span>'+cur.name+(next?' → '+next.name:'')+'</div>'+
        '<div class="bcard-staff">Стеклянная капсула · хранит только '+r.name.toLowerCase()+' · площадь участка не занимает</div></div></div>'+
      '<div class="bcard-stats"><span>Ёмкость: <strong>'+cur.capacity.toLocaleString('ru-RU')+'</strong>'+(next?' → <strong>'+next.capacity.toLocaleString('ru-RU')+'</strong>':'')+'</span>'+
        '<span>В баке: <strong>'+Math.round(state.resources[r.id]||0).toLocaleString('ru-RU')+'</strong></span></div>'+
      action,
  };
}
// «Живые» значения сцен: подставляются каждый тик в уже построенную картинку.
function liveSolar(el){ el.style.setProperty('--sun',sunFactor(state.playSeconds||0).toFixed(3)); }
function liveBattery(el){ const cap=energyCapacity(); el.style.setProperty('--chg',(cap>0?Math.min(1,(state.resources.energy||0)/cap):0).toFixed(3)); }
function liveTank(resId,lvl){
  return el=>{
    const liq=el.querySelector('.tk-liquid'); if(!liq) return;
    liq.style.transform='translateY('+tankLevelY(CAPSULE_SIZES[lvl],tankCardPct(resId)).toFixed(1)+'px)';
  };
}

let lastBuildKey='';
function renderBuildings(){
  const tierOk=tierUnlocked(activeTier);
  const areaPct=Math.min(100,Math.round((usedArea()/BASE_AREA)*100));
  const areaHtml='<span>Площадь участка</span>'+
    '<div class="warehouse-bar'+(areaPct>=99.5?' full':'')+'" style="flex:1"><div class="warehouse-bar-fill" style="width:'+areaPct+'%"></div></div>'+
    '<span class="warehouse-value">'+usedArea()+' / '+BASE_AREA+'</span>';
  const groups={};
  BUILDINGS.filter(b=>b.tier===activeTier && recipeVisible(b)).forEach(b=>{
    const k=typeKey(b);
    (groups[k]=groups[k]||[]).push(b);
  });
  // Карточки группируются не только по типу установки, но и по категории (Добыча/Энергия
  // и так далее) — каждая категория рисуется отдельным блоком со своим заголовком.
  const catCards={};
  const push=(cat,card)=>{ (catCards[cat]=catCards[cat]||[]).push(card); };
  Object.keys(groups).forEach(k=>{
    const recipes=groups[k];
    const type=typeOf(recipes[0]);
    const cat=type.category||'mining';
    if(recipes.length>1 && recipes[0].type) push(cat,renderTypeBuildCard(type,recipes,tierOk));
    else recipes.forEach(b=>push(cat,renderSingleRecipeCard(b,tierOk)));
  });
  BATTERIES.forEach(bt=>push('energy',renderBatteryBuildCard(bt)));
  if(activeTier===0) liquidResourceIds().forEach(id=>push('storage',renderTankBuildCard(resById(id))));
  const cats=BUILD_CATEGORIES.filter(c=>catCards[c.id]);
  const key=activeTier+'|'+tierOk+'|'+cats.map(c=>c.id+':'+catCards[c.id].map(k=>k.key).join(',')).join(';');

  if(key===lastBuildKey && bgridEl.querySelector('.bcard')){
    const area=bgridEl.querySelector('.area-summary');
    if(area._html!==areaHtml){ area._html=areaHtml; area.innerHTML=areaHtml; }
    cats.forEach(c=>catCards[c.id].forEach(card=>{
      const el=bgridEl.querySelector('.bcard[data-card="'+card.key+'"]');
      if(!el) return;
      el.classList.toggle('dim',!!card.dim);
      const info=el.querySelector('.bcard-info');
      if(info._html!==card.info){ info._html=card.info; info.innerHTML=card.info; }
      if(card.live) card.live(el);
    }));
    return;
  }
  lastBuildKey=key;
  let html='';
  if(!tierOk){
    html+='<div class="locked-banner">Постройте хотя бы один объект уровня T'+(activeTier-1)+', чтобы открыть этот раздел цепочки.</div>';
  }
  html+='<div class="area-summary">'+areaHtml+'</div>';
  cats.forEach(c=>{
    html+='<h2 class="build-cat-head">'+c.label+'</h2><div class="build-cat-grid">'+
      catCards[c.id].map(card=>
        '<div class="bcard'+(card.dim?' dim':'')+'" data-card="'+card.key+'" style="--tier-color:'+card.color+(card.extraStyle?';'+card.extraStyle:'')+'">'+
          '<div class="bart">'+card.art+'</div>'+
          '<div class="bcard-info">'+card.info+'</div>'+
        '</div>').join('')+
    '</div>';
  });
  bgridEl.innerHTML=html;
  bgridEl.querySelectorAll('.bcard-info').forEach(el=>{ el._html=el.innerHTML; });
  // Сравнение ведём со своими строками, а не с innerHTML (браузер пишет disabled как disabled="").
  cats.forEach(c=>catCards[c.id].forEach(card=>{
    const el=bgridEl.querySelector('.bcard[data-card="'+card.key+'"]');
    if(!el) return;
    el.querySelector('.bcard-info')._html=card.info;
    if(card.live) card.live(el);
  }));
  const area=bgridEl.querySelector('.area-summary'); area._html=areaHtml;
}

tabsEl.addEventListener('click', e=>{
  const btn=e.target.closest('[data-tier]');
  if(!btn) return;
  activeTier=parseInt(btn.dataset.tier,10);
  renderTabs();
  renderView();
});
bgridEl.addEventListener('click', e=>{
  const up=e.target.closest('[data-tank-up]');
  if(up){ if(!up.disabled) tryUpgradeLiquidTank(up.dataset.tankUp); return; }
  const btn=e.target.closest('[data-build]');
  if(!btn) return;
  tryBuild(btn.dataset.build);
});
