// Вкладка 2 · «Здания» — построенные установки плитками: прочность, ремонт, снос.

function demolishCost(b){
  const count=state.buildings[b.id]||0;
  if(count<=0) return {};
  const marginal=scaledCost(typeOf(b), count-1);
  const refund={};
  Object.entries(marginal).forEach(([rid,q])=>{ const r=Math.floor(q*DEMOLISH_REFUND); if(r>0) refund[rid]=r; });
  return refund;
}
function renderBuildingStatusCard(b){
  const units=unitsOf(b.id);
  if(!units.length) return '';
  const outRes=resById(outId(b));
  const type=typeOf(b);
  const title = b.type ? type.name+' · '+recipeLabel(b) : b.name;
  const dCost=demolishCost(b);
  const dKeys=Object.keys(dCost);
  const dStr=dKeys.length ? dKeys.map(rid=>dCost[rid]+' '+resName(rid)).join(' + ') : 'ничего';
  const statusCv=colorVarOf(outRes);
  const tilesHtml=units.map(u=>{
    const durPct=Math.round(u.durability);
    const durClass = u.durability>=80?'ok':(u.durability>=45?'warn':'bad');
    const tileState = u.durability>=80?'':(u.durability>=45?' worn':' damaged');
    const rCost=repairCost(u,b);
    const rKeys=Object.keys(rCost);
    const rAfford=rKeys.every(rid=>(state.resources[rid]||0)>=rCost[rid]);
    const repairBtn = rKeys.length
      ? '<button class="tile-btn repair" data-repair-unit="'+u.id+'" '+(rAfford?'':'disabled')+' type="button" title="Ремонт: '+rKeys.map(rid=>rCost[rid]+' '+resName(rid)).join(' + ')+'">'+miniIcon('wrench')+'</button>'
      : '<span class="tile-btn ok-mark" title="Исправно">✓</span>';
    return '<div class="unit-tile'+tileState+'">'+
      '<span class="unit-tile-id">#'+u.id+'</span>'+
      '<div class="unit-tile-icon">'+iconSvg(type.icon||outRes.id,statusCv)+'</div>'+
      '<div class="unit-tile-bar '+durClass+'"><div class="fill" style="width:'+durPct+'%"></div></div>'+
      '<span class="unit-tile-pct">'+durPct+'%</span>'+
      '<div class="unit-tile-actions">'+repairBtn+
        '<button class="tile-btn demolish" data-demolish-unit="'+u.id+'" type="button" title="Снести: вернёт '+dStr+'">'+miniIcon('trash')+'</button>'+
      '</div>'+
    '</div>';
  }).join('');
  return '<div class="bcard" style="--tier-color:var(--'+statusCv+')">'+
    '<div class="bcard-head">'+iconSvg(type.icon||outRes.id,statusCv)+
      '<div><h3>'+title+'</h3><div class="bcard-recipe">Построено: '+units.length+'</div></div>'+
    '</div>'+
    '<div class="unit-yard">'+tilesHtml+'</div>'+
  '</div>';
}
function renderBuildingsStatus(){
  const cards=BUILDINGS.filter(b=>unitsOf(b.id).length>0).map(renderBuildingStatusCard).join('');
  buildingsPanelEl.innerHTML = cards ? '<div class="bgrid">'+cards+'</div>' : '<div class="locked-banner">Пока ничего не построено — загляните во вкладку «Построить».</div>';
}

buildingsPanelEl.addEventListener('click', e=>{
  const repBtn=e.target.closest('[data-repair-unit]');
  if(repBtn){ tryRepairUnit(Number(repBtn.dataset.repairUnit)); return; }
  const demBtn=e.target.closest('[data-demolish-unit]');
  if(demBtn){ tryDemolishUnit(Number(demBtn.dataset.demolishUnit)); }
});
