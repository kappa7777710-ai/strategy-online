// Вкладка 6 · «Цех» — сворачиваемые группы установок и конвейерные линии.

// «Производство»: каждый тип установок — сворачиваемая группа. Шапка — сводка значками,
// в развёрнутом виде каждая установка — конвейерная линия: переключатель руды → копёр →
// лента, которая заполняется по ходу цикла → выход с «+N» → таймер.

// Свёрнутые группы помнятся в браузере — это удобство интерфейса, не часть сохранения игры.
const PROD_UI_KEY='industrial_belt_prod_ui';
let prodCollapsed={};
try{ prodCollapsed=JSON.parse(localStorage.getItem(PROD_UI_KEY)||'{}')||{}; }catch(e){ prodCollapsed={}; }
function toggleProdGroup(typeId){
  prodCollapsed[typeId]=!prodCollapsed[typeId];
  try{ localStorage.setItem(PROD_UI_KEY,JSON.stringify(prodCollapsed)); }catch(e){}
  renderProduction();
}
const CHEVRON='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 5 7 9.5 11.5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ALERT20='<svg viewBox="0 0 20 20" fill="currentColor" style="color:var(--bad)" aria-hidden="true"><path d="M10 2 19 18H1z"/><rect x="9" y="7.5" width="2" height="5.5" rx="1" style="fill:var(--ink)"/><circle cx="10" cy="15.3" r="1.1" style="fill:var(--ink)"/></svg>';

function renderProductionGroup(type){
  const recipes=BUILDINGS.filter(b=>b.type===type.id && recipeVisible(b));
  const units=state.units.filter(u=>recipes.some(b=>b.id===u.recipe));
  if(!units.length) return '';
  const collapsed=!!prodCollapsed[type.id];
  const typeCv=type.neutralColor||'tier0';
  const anyWork=recipes.some(unitWorking);
  const wf=lastWorkforce[CLASS_OF_TIER[0]]||blankWf();
  const staffOk=wf.staffing>0.999;
  // Персонал делится между группами пропорционально: у каждой своя потребность и её доля занятых.
  // Отключённые вручную установки в спрос не входят — как и в computeWorkforce.
  const groupDemand=units.filter(u=>u.active!==false).reduce((sum,u)=>{ const b=BUILDINGS.find(x=>x.id===u.recipe); return sum+b.workers*(1-workforceCutForRecipe(b)); },0);
  const groupAssigned=Math.floor(groupDemand*wf.staffing+1e-6);

  const chips=recipes.map(b=>'<span class="mi-chip sunk" title="'+resFullName(outId(b))+' в час">'+resIcon48(outId(b))+'+'+fmtRate(recipeRatePerHour(b))+'/ч</span>').join('');
  const summary='<div class="mi-sum bevel-frame" data-prod-toggle="'+type.id+'" role="button" tabindex="0" aria-expanded="'+(!collapsed)+'" title="'+type.name+(collapsed?' — развернуть':' — свернуть')+'">'+
    svg48(TYPE48[type.id]||'',typeCv,'mi-type'+(anyWork?' working':''))+
    '<span class="mi-cnt">×'+units.length+'</span>'+chips+'<span class="mi-sp"></span>'+
    '<span class="mi-chip sunk'+(staffOk?'':' bad')+'" title="Персонал этих установок: есть / нужно">'+ui20('worker','class1')+groupAssigned+'/'+Math.round(groupDemand)+'</span>'+
    '<span class="mi-chev sunk">'+CHEVRON+'</span>'+
  '</div>';
  if(collapsed) return '<div class="mi-group collapsed">'+summary+'</div>';

  const rows=units.map(u=>{
    const b=BUILDINGS.find(x=>x.id===u.recipe);
    const oid=outId(b), cv=colorVarOf(resById(oid));
    const off=u.active===false;
    const idle=off||!unitWorking(b);
    const tog=recipes.map(r=>{
      const rid=outId(r), cur=r.id===b.id;
      const dis=recipes.length<2||cur||!recipeUnlocked(r);
      const tip=resFullName(rid)+' · +'+fmtRate(unitPotentialPerHour(r))+'/ч'+(cur?' — добывается сейчас':(recipes.length>1?' — переключить, цикл начнётся заново':''));
      return '<button type="button" class="cv-ore'+(cur?' on':'')+'" style="--oc:var(--'+colorVarOf(resById(rid))+')" data-retool-unit="'+u.id+'" data-retool-to="'+r.id+'" '+(dis?'disabled':'')+' title="'+tip+'">'+resIcon48(rid)+'</button>';
    }).join('');
    const reason=off?REASON_LABELS.off:(REASON_LABELS[(util[b.id]||{}).reason]||'Простой');
    const outTip=idle?reason:'+'+b.out[oid]+' '+resFullName(oid)+' за цикл';
    const powerBtn='<button type="button" class="cv-power'+(off?' off':'')+'" data-toggle-unit="'+u.id+'" title="'+(off?'Включить установку':'Отключить установку')+'">'+miniIcon('power')+'</button>';
    return '<div class="cv-row bevel'+(idle?' idle':'')+(off?' off':'')+'" style="--oc:var(--'+cv+')" data-cycle-unit="'+u.id+'">'+
      '<span class="cv-id">#'+u.id+'</span>'+powerBtn+(recipes.length>1?'<div class="cv-tog">'+tog+'</div>':'')+
      '<span title="'+richLabel(b)+': '+Math.round(richOf(b)*100)+'%">'+svg48(TYPE48[type.id]||'',typeCv,'cv-rig'+(idle?'':' working'),';--oc:var(--'+cv+')')+'</span>'+
      '<div class="cv-track sunk"></div>'+
      '<div class="cv-out sunk" data-cycle-out="'+u.id+'" title="'+outTip+'">'+(idle?ALERT20:resIcon48(oid)+'<b>+'+b.out[oid]+'</b>')+'</div>'+
      '<div class="cv-time" data-cycle-time="'+u.id+'" title="'+(idle?reason:'До конца цикла')+'"></div></div>';
  }).join('');
  return '<div class="mi-group">'+summary+
    '<div class="cv-lines bevel-frame">'+rows+
      '<button type="button" class="cv-add" data-section-go="build" title="Построить ещё">+</button>'+
    '</div></div>';
}
// Сводка по персоналу цеха: сколько всего нанято, сколько реально занято работой
// в активных установках (assigned=min(население, спрос)) и сколько простаивает без дела
// (нанятых больше, чем сейчас требуется — например, после отключения части установок).
function renderProdWorkforceBar(){
  const wf=lastWorkforce[CLASS_OF_TIER[0]]||blankWf();
  const population=Math.floor(wf.population);
  const demand=Math.round(wf.demand);
  const assigned=Math.min(population,Math.floor(wf.assigned+1e-6));
  const free=Math.max(0,population-assigned);
  const short=Math.max(0,demand-population);
  return '<div class="prod-wf bevel-frame">'+
    '<span class="prod-wf-item" title="Нанято и проживает в колонии">'+ui20('worker','class1')+'<b>'+population+'</b><i>всего</i></span>'+
    '<span class="prod-wf-item" title="Сейчас заняты работой на установках">'+ui20('worker','class1')+'<b>'+assigned+'</b><i>занято</i></span>'+
    '<span class="prod-wf-item'+(free>0?' good':'')+'" title="Нанятые, но без работы прямо сейчас (установок/спроса не хватает, либо часть отключена)">'+ui20('worker','class1')+'<b>'+free+'</b><i>свободно</i></span>'+
    (short>0?'<span class="prod-wf-item bad" title="Сколько рабочих мест ещё не укомплектовано">'+ui20('worker','class1')+'<b>−'+short+'</b><i>не хватает</i></span>':'')+
  '</div>';
}
let lastProdHtml='';
function renderProduction(){
  const groups=BUILDING_TYPES.map(renderProductionGroup).join('');
  const html = (state.units.length?renderProdWorkforceBar():'') + (groups || '<div class="locked-banner">Пока ничего не работает — загляните во вкладку «Построить».</div>');
  // Панель перерисовывается каждый тик; DOM трогаем только при реальных изменениях,
  // иначе пропадали бы клики и сбрасывалась анимация колёс. Прогресс циклов — в tickCycleBars.
  if(html===lastProdHtml) return;
  lastProdHtml=html;
  productionPanelEl.innerHTML=html;
  tickCycleBars();
}

productionPanelEl.addEventListener('click', e=>{
  const btn=e.target.closest('[data-retool-unit]');
  if(btn){ tryRetoolUnit(Number(btn.dataset.retoolUnit), btn.dataset.retoolTo); return; }
  const pw=e.target.closest('[data-toggle-unit]');
  if(pw){ tryToggleUnit(Number(pw.dataset.toggleUnit)); return; }
  const tg=e.target.closest('[data-prod-toggle]');
  if(tg){ toggleProdGroup(tg.dataset.prodToggle); return; }
  if(e.target.closest('[data-section-go]')) openSection(e.target.closest('[data-section-go]').dataset.sectionGo);
});
productionPanelEl.addEventListener('keydown', e=>{
  const tg=e.target.closest('[data-prod-toggle]');
  if(tg && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); toggleProdGroup(tg.dataset.prodToggle); }
});
