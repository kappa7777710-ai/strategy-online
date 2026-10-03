// Вкладка 1 · «Штаб» — сводка колонии.

function renderHQMiniProd(){
  const rows=BUILDINGS.filter(b=>unitsOf(b.id).length>0).map(b=>{
    const count=state.buildings[b.id]||0;
    const rate=recipeRatePerHour(b);
    const miniRes=resById(outId(b)), miniCv=colorVarOf(miniRes), miniType=typeOf(b);
    return '<div class="hq-mini-row">'+iconSvg(miniType.icon||miniRes.id,miniCv)+
      '<span class="hq-mini-name" title="'+resFullName(outId(b))+'">'+recipeLabel(b)+'</span>'+
      '<span class="hq-mini-count">×'+count+'</span>'+
      '<span class="hq-mini-rate">'+(rate>=10?Math.round(rate):rate.toFixed(1))+' '+resTag(miniRes.id)+'/ч</span></div>';
  }).join('');
  if(!rows) return '';
  return '<div class="panel" style="margin-top:14px;"><h2>Производственные здания</h2><div class="hq-mini-list">'+rows+'</div></div>';
}
function renderHQ(){
  const totalBuilt=Object.values(state.buildings).reduce((s,n)=>s+n,0);
  const workers=Object.values(lastWorkforce).reduce((s,c)=>s+Math.floor(c.assigned),0);
  const slots=Object.values(lastWorkforce).reduce((s,c)=>s+Math.floor(c.cap),0);
  const usedKg=totalCargoWeight(), capKg=warehouseCapacityKg();
  const trainSk=SKILLS.find(x=>x.id===state.training);
  let html='<div class="panel"><h2>Обзор базы</h2>'+
    '<div class="pop-metrics">'+
      '<span>Время работы: <strong>'+fmtElapsed(Date.now()-state.startTs)+'</strong></span>'+
      '<span>Построено объектов: <strong>'+totalBuilt+'</strong></span>'+
      '<span>Площадь: <strong>'+usedArea()+' / '+BASE_AREA+'</strong></span>'+
      '<span>Персонал: <strong>'+workers+' / '+slots+'</strong></span>'+
      '<span>Склад: <strong>'+Math.round(usedKg).toLocaleString('ru-RU')+' / '+capKg.toLocaleString('ru-RU')+' кг</strong></span>'+
      '<span>Изучается: <strong>'+(trainSk?trainSk.name+' (ур. '+skillLevelById(trainSk.id)+')':'—')+'</strong></span>'+
    '</div>'+
  '</div>'+
  renderHQMiniProd();
  hqPanelEl.innerHTML=html;
}
