// Вкладка 4 · «Рабочие» — отдел кадров (см. HR_DEPT в core.js), жильё, персонал и его нужды.

function renderHrStatus(){
  const totalWorkers=Math.floor(state.population||0);
  const assignedWorkers=CLASSES.reduce((s,c)=>s+Math.floor((lastWorkforce[c.id]||blankWf()).assigned),0);
  const freeWorkers=Math.max(0, totalWorkers-assignedWorkers);
  const housing=HOUSING.find(h=>h.cls===1);
  const houseCount=housing?(state.buildings[housing.id]||0):0;
  const ceilPerDay=houseCount*HR_MAX_RECRUIT_PER_HOUR_PER_UNIT*24;

  return '<div class="hr-status bevel-frame">'+
    '<div class="hr-status-header">'+
      '<svg class="hr-status-icon" viewBox="0 0 48 48" fill="currentColor" style="color:var(--class1)" aria-hidden="true">'+FEATURE_ICONS.hrDept+'</svg>'+
      '<div><h3>Отдел кадров</h3><p class="hr-status-desc">Управление персоналом колонии. Потолок найма: '+ceilPerDay.toFixed(1)+' чел/сутки (по '+(HR_MAX_RECRUIT_PER_HOUR_PER_UNIT*24).toFixed(0)+' за жилой блок, построено: '+houseCount+')</p></div>'+
    '</div>'+
    '<div class="hr-status-grid">'+
      '<div class="hr-stat-box"><div class="hr-stat-label">Всего рабочих</div><div class="hr-stat-value">'+totalWorkers+'</div></div>'+
      '<div class="hr-stat-box"><div class="hr-stat-label">Работают</div><div class="hr-stat-value">'+assignedWorkers+'</div></div>'+
      '<div class="hr-stat-box"><div class="hr-stat-label">Свободны</div><div class="hr-stat-value">'+freeWorkers+'</div></div>'+
    '</div>'+
  '</div>';
}

// «Инфографика» набора персонала: сунк-бар набранного населения против жилого потолка,
// три ключевых числа (потолок / текущая скорость / свободные места) и расход бонусных
// пайков по каждой культуре фермы — всё на тех же цветовых токенах и bevel/sunk-компонентах,
// что и остальная игра (склад, энергия), без отдельной палитры.
function renderRecruitSection(){
  const cap=housingCapacityTotal(1);
  const pop=Math.min(cap, state.population||0);
  const pct=cap>0?Math.max(0,Math.min(100,(pop/cap)*100)):0;
  const levelPct=Math.round((state.hrRationLevel||0)*100);
  const r=lastRecruit||{maxRate:0,wantRate:0,actualRate:0,fraction:1,room:0};
  const short=r.fraction<0.995 && r.wantRate>0.01;
  const rationRows=Object.entries(HR_RATION_COST).map(([rid,perWorker])=>{
    const g=resById(rid);
    const amt=state.resources[rid]||0;
    const consumeHr=perWorker*r.actualRate;
    return '<div class="chip" style="--chip-color:var(--'+colorVarOf(g)+')"><div>'+iconSvg(g.id,colorVarOf(g))+'</div>'+
      '<div class="chip-body"><div class="chip-name" title="'+g.name+'">'+resName(g.id)+'</div>'+
      '<div class="chip-amt">'+Math.floor(amt)+'</div>'+
      '<div class="chip-rate zero">Паёк: −'+consumeHr.toFixed(2)+'/ч</div>'+
      '</div></div>';
  }).join('');
  return '<div class="rec-panel bevel-frame">'+
    '<div class="rec-head"><svg class="rec-head-icon" viewBox="0 0 20 20" fill="currentColor" style="color:var(--class1)" aria-hidden="true">'+UI20.worker+'</svg>'+
      '<h3>Приток рабочих с других планет</h3></div>'+
    '<div class="rec-pop-row">'+
      '<div class="rec-pop-bar sunk'+(pct>=99.5?' full':'')+'"><i class="rec-pop-fill" style="width:'+pct.toFixed(1)+'%"></i></div>'+
      '<span class="rec-pop-val">'+Math.floor(pop)+' / '+Math.floor(cap)+' набрано</span>'+
    '</div>'+
    '<div class="rec-stats">'+
      '<div class="stat"><span class="stat-label">Потолок найма</span><span class="stat-value">'+(r.maxRate*24).toFixed(1)+' чел/сутки</span></div>'+
      '<div class="stat"><span class="stat-label">Текущая скорость</span><span class="stat-value '+(short?'bad':(r.actualRate>0.01?'ok':''))+'">'+r.actualRate.toFixed(3)+' чел/ч</span></div>'+
      '<div class="stat"><span class="stat-label">Свободных мест</span><span class="stat-value">'+Math.floor(r.room)+'</span></div>'+
    '</div>'+
    '<div class="rec-cost-info">'+
      '<div class="rec-cost-title">Стоимость найма одного рабочика:</div>'+
      '<div class="rec-cost-breakdown">'+
      '<span>6 H₂O</span><span>+</span><span>2 Паёк</span>'+
      '</div>'+
      '<div class="rec-cost-desc">Это 2-дневная норма питания для переселенца</div>'+
    '</div>'+
    '<div class="rec-slider-row">'+
      '<label for="hrRationSlider">Бонусные пайки</label>'+
      '<input type="range" id="hrRationSlider" min="0" max="100" step="1" value="'+levelPct+'">'+
      '<span class="rec-slider-val" id="hrRationVal">'+levelPct+'%</span>'+
    '</div>'+
    '<div class="rec-slider-hint">Чем правее ползунок, тем больше урожая уходит на пайки — но тем быстрее рабочие едут на планету.</div>'+
    (short?'<div class="rec-warn">Не хватает урожая на пайки — набор идёт медленнее потолка.</div>':'')+
    '<div class="pop-needs">'+rationRows+'</div>'+
  '</div>';
}

function popUnlocked(cls){
  if(cls===1) return true;
  return tierUnlocked(cls);
}

function renderServiceCard(sb){
  const count=state.buildings[sb.id]||0;
  const cost=scaledCost(sb,count);
  const unlocked=popUnlocked(sb.cls);
  const afford=Object.entries(cost).every(([rid,q])=>(state.resources[rid]||0)>=q);
  const uInfo=util[sb.id]||{frac:0,reason:'idle'};
  const uPct=Math.round(uInfo.frac*100);
  const uClass = count===0?'idle':(uInfo.frac>0.95?'full':(uInfo.frac>0.05?'partial':'blocked'));
  const uLabel = count===0?'Ещё не построено':(REASON_LABELS[uInfo.reason]+(uInfo.reason==='full'?'':' · '+uPct+'%'));
  const inputsStr=Object.entries(sb.in).map(([rid,q])=>q+' '+resName(rid)).join(' + ');
  const outRes=resById(sb.id);
  const cv='class'+sb.cls;
  const costStr=Object.entries(cost).map(([rid,q])=>{
    const ok=(state.resources[rid]||0)>=q;
    return '<span class="'+(ok?'ok':'bad')+'">'+q+' '+resTag(rid)+'</span>';
  }).join('');
  return '<div class="bcard" style="--tier-color:var(--'+cv+')">'+
    '<div class="bcard-head">'+iconSvg(outRes.id,cv)+
      '<div><h3>'+sb.name+'</h3><div class="bcard-recipe">'+inputsStr+' → '+sb.out[sb.id]+' '+resTag(outRes.id)+'</div></div>'+
    '</div>'+
    '<div class="bcard-stats"><span>Построено: <strong>'+count+'</strong></span><span>Цикл: '+fmtDuration(sb.cycle)+' · '+fmtDurationWords(sb.cycle)+'</span></div>'+
    '<div class="util-bar '+uClass+'"><div class="util-fill" style="width:'+(count===0?0:uPct)+'%"></div></div>'+
    '<div class="util-label">'+uLabel+'</div>'+
    '<div class="bcard-cost">'+costStr+'</div>'+
    '<button class="build-btn" data-build="'+sb.id+'" '+((!unlocked||!afford)?'disabled':'')+'>Построить (+1)</button>'+
  '</div>';
}

function renderHousingCard(h){
  const count=state.buildings[h.id]||0;
  const cost=scaledCost(h,count);
  const unlocked=popUnlocked(h.cls);
  const afford=Object.entries(cost).every(([rid,q])=>(state.resources[rid]||0)>=q);
  const cv='class'+h.cls;
  const totalCap=count*h.capacity+(BASE_FREE_CAPACITY[h.cls]||0);
  const costStr=Object.entries(cost).map(([rid,q])=>{
    const ok=(state.resources[rid]||0)>=q;
    return '<span class="'+(ok?'ok':'bad')+'">'+q+' '+resTag(rid)+'</span>';
  }).join('');
  return '<div class="bcard" style="--tier-color:var(--'+cv+')">'+
    '<div class="bcard-head">'+iconSvg('housing',cv)+
      '<div><h3>'+h.name+'</h3><div class="bcard-recipe">Вместимость: '+h.capacity+' чел. за блок</div></div>'+
    '</div>'+
    '<div class="bcard-stats"><span>Построено: <strong>'+count+'</strong></span><span>Всего мест: '+totalCap+'</span></div>'+
    '<div class="bcard-cost">'+costStr+'</div>'+
    '<button class="build-btn" data-build="'+h.id+'" '+((!unlocked||!afford)?'disabled':'')+'>Построить (+1)</button>'+
  '</div>';
}

function needRow(label,weightLabel,fraction,barColorVar){
  const pct=Math.round(fraction*100);
  const barColor = fraction>0.95?'var(--good)':(fraction>0.5?'var('+barColorVar+')':'var(--bad)');
  return '<div class="need-row"><span class="need-label">'+label+'</span><span class="need-weight">'+weightLabel+'</span>'+
    '<div class="need-bar"><div class="need-bar-fill" style="width:'+pct+'%;background:'+barColor+'"></div></div>'+
    '<span class="need-pct">'+pct+'%</span></div>';
}

function renderPopulation(){
  let html=renderHrStatus();
  html+=renderRecruitSection();
  CLASSES.forEach(c=>{
    const wf=lastWorkforce[c.id]||blankWf();
    const unlocked=popUnlocked(c.id);
    const cv='class'+c.id;
    const productivity=Math.round(wf.staffing*wf.satisfaction*100);
    const prodClass = productivity>=90?'ok':(productivity>=50?'warn':'bad');

    let stockIds, breakdownHtml;
    if(c.id===1){
      stockIds=c.needsWeighted.map(n=>n.id);
      breakdownHtml='<div class="need-list">'+wf.weighted.map(n=>
        needRow(n.label,'вес '+Math.round(n.weight*100)+'%',n.fraction,'--'+cv)
      ).join('')+'</div>';
    }else{
      stockIds=c.extraNeeds||[];
      const baseRow=needRow('Базовые нужды (разнорабочие)','наследуется',wf.base||0,'--'+cv);
      const extraRows=wf.extras.map(e=>needRow(resName(e.id),'min',e.fraction,'--'+cv)).join('');
      breakdownHtml='<div class="need-list">'+baseRow+extraRows+'</div>';
    }

    const stockHtml=stockIds.map(gid=>{
      const g=resById(gid);
      const amt=state.resources[gid]||0;
      const rate=netRate(gid);
      const rateClass=rate>0.01?'pos':(rate<-0.01?'neg':'zero');
      const perWorker=PER_WORKER_RATE[gid];
      const consumeHr = perWorker!=null ? perWorker*wf.assigned*3600 : 0;
      const daysLeft = consumeHr>0 ? amt/(consumeHr*24) : Infinity;
      const supplyStr = consumeHr<=0.0001 ? '' : (
        '<div class="chip-rate zero">−'+consumeHr.toFixed(2)+'/ч · запас '+(daysLeft>99?'99+ дн':(daysLeft<1?Math.round(daysLeft*24)+' ч':daysLeft.toFixed(1)+' дн'))+'</div>'
      );
      return '<div class="chip" style="--chip-color:var(--'+colorVarOf(g)+')"><div>'+iconSvg(g.id,colorVarOf(g))+'</div>'+
        '<div class="chip-body"><div class="chip-name" title="'+g.name+'">'+resName(g.id)+'</div>'+
        '<div class="chip-amt">'+Math.floor(amt)+'</div>'+
        '<div class="chip-rate '+rateClass+'">'+(rate>=0?'+':'')+rate.toFixed(1)+'/с</div>'+
        supplyStr+
        '</div></div>';
    }).join('');

    const housing=HOUSING.find(h=>h.cls===c.id);
    const services=SERVICE_BUILDINGS.filter(s=>s.cls===c.id);
    const serviceCards=services.map(renderServiceCard).join('');
    html+='<div class="pop-class">'+
      '<div class="pop-class-head" style="--tier-color:var(--'+cv+')">'+iconSvg('class'+c.id,cv)+'<h3>'+c.name+'</h3>'+
        '<div class="pop-metrics">'+
          '<span>Занято: '+Math.floor(wf.assigned)+' / '+Math.floor(wf.demand)+'</span>'+
          '<span>Мест: '+Math.floor(wf.cap)+'</span>'+
          '<span class="'+(wf.staffing>0.95?'ok':'bad')+'">Штат: '+Math.round(wf.staffing*100)+'%</span>'+
          '<span class="'+prodClass+'">Производительность: '+productivity+'%</span>'+
        '</div></div>'+
      (unlocked?'':'<div class="locked-banner">Откроется вместе с уровнем T'+c.id+' производственной цепочки.</div>')+
      breakdownHtml+
      '<div class="pop-needs">'+stockHtml+'</div>'+
      '<div class="pop-grid">'+renderHousingCard(housing)+serviceCards+'</div>'+
    '</div>';
  });
  popPanelEl.innerHTML=html;
}

popPanelEl.addEventListener('click', e=>{
  const btn=e.target.closest('[data-build]');
  if(!btn) return;
  tryBuild(btn.dataset.build);
});

// Ползунок «Бонусные пайки» дёргает renderPopulation() каждую секунду через общий тик
// (см. simulateStep/renderAll) — без этого флага каждая перерисовка сбрасывала бы фокус
// и позицию ползунка прямо во время перетаскивания. Тот же приём, что warehouseDragging
// у драг-н-дропа склада (см. 7-warehouse.js).
let hrSliderDragging=false;
popPanelEl.addEventListener('input', e=>{
  const slider=e.target.closest('#hrRationSlider');
  if(!slider) return;
  hrSliderDragging=true;
  state.hrRationLevel=Math.max(0,Math.min(1,Number(slider.value)/100));
  const valEl=document.getElementById('hrRationVal');
  if(valEl) valEl.textContent=slider.value+'%';
});
popPanelEl.addEventListener('change', e=>{
  const slider=e.target.closest('#hrRationSlider');
  if(!slider) return;
  hrSliderDragging=false;
  state.hrRationLevel=Math.max(0,Math.min(1,Number(slider.value)/100));
  saveState();
  renderPopulation();
});
