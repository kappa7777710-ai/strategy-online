// Вкладка 7 · «Склад» — голографическая сетка ресурсов с перетаскиванием.

function defaultWarehouseOrder(){
  const ids=[];
  // Жидкости в общую сетку склада не попадают — у них своя секция «Резервуары» ниже
  // (см. renderLiquidTanks), со своим лимитом и цистерновой визуализацией.
  [0,1,2,3,4].forEach(t=>{ RESOURCES.filter(r=>r.tier===t && !r.liquid).forEach(r=>ids.push(r.id)); });
  POP_GOODS.forEach(r=>ids.push(r.id));
  return ids;
}
function warehouseOrder(){
  const all=defaultWarehouseOrder();
  if(!state.warehouseOrder) state.warehouseOrder=all.slice();
  const known=new Set(all);
  let order=state.warehouseOrder.filter(id=>known.has(id));
  all.forEach(id=>{ if(!order.includes(id)) order.push(id); });
  state.warehouseOrder=order;
  return order;
}
// Склад — голографическая сетка: прозрачные ячейки с уголками, строками развёртки и
// светящимся значком. Число и полоса веса правятся на месте, DOM пересоздаётся только при
// смене набора/порядка ресурсов — иначе развёртка и мерцание сбрасывались бы каждый тик.
const WH_MIN_CELLS=12;
function whFillKey(){ return warehouseOrder().filter(id=>{ const r=resById(id); return r && (POP_GOODS.some(p=>p.id===id) || resourceVisible(r)); }); }
function whTip(r){
  const amt=state.resources[r.id]||0;
  const rate=netRate(r.id)*3600;
  return r.name+' · '+Math.round(amt*(r.weight||0)).toLocaleString('ru-RU')+' кг'+(Math.abs(rate)>0.05?' · '+(rate>0?'+':'−')+fmtRate(Math.abs(rate))+'/ч':'');
}
function whTile(r,i){
  const amt=state.resources[r.id]||0;
  const tip=whTip(r);
  return '<div class="wh-tile'+(amt<0.05?' empty':'')+'" draggable="true" data-res="'+r.id+'" style="--rc:var(--'+colorVarOf(r)+');--dl:'+(i*1.7%5).toFixed(1)+'s" title="'+tip+'">'+
    resIcon48(r.id)+'<span class="wh-amt">'+Math.floor(amt)+'</span><span class="wh-name">'+resName(r.id)+'</span></div>';
}
// Резервуары для жидкостей — отдельная секция под основной сеткой: у каждой жидкости (вода,
// нефть и т.д.) своя стеклянная капсула со своим лимитом (liquidCapacity), а не строчка общего
// склада. Капсула бывает трёх размеров по уровню резервуара (LIQUID_TANK_LEVELS в core.js):
// чем выше уровень, тем крупнее сосуд и тем больше на нём металла — бандажи, опорная рама,
// шкала, маячок. Все размеры рисуются в одном viewBox с общим «полом», поэтому разница в
// габаритах видна сразу. DOM строится один раз и пересоздаётся только при смене набора жидкостей
// или уровня бака; каждый тик правятся лишь уровень и подписи — иначе волна дёргалась бы.
const CAPSULE_CX=70;
function capsulePath(x0,x1,top,bot){
  const r=(x1-x0)/2;
  return 'M'+x0+' '+(top+r)+' A'+r+' '+r+' 0 0 1 '+x1+' '+(top+r)+' V'+(bot-r)+' A'+r+' '+r+' 0 0 1 '+x0+' '+(bot-r)+' Z';
}
function rivetRow(xs,y,r){ return xs.map(x=>'<circle class="tk-rivet" cx="'+x+'" cy="'+y+'" r="'+(r||1.5)+'"/>').join(''); }
// top/bottom — y уровня 100% и 0%; w — ширина, в пределах которой всплывают пузырьки.
const CAPSULE_SIZES={
  1:{x0:50,x1:90,top:64,bottom:150,
    back:'<rect class="tk-metal" x="56" y="154" width="28" height="6" rx="2"/>',
    front:'<rect class="tk-metal" x="45" y="57" width="50" height="9" rx="3"/><rect class="tk-metal" x="45" y="146" width="50" height="9" rx="3"/>'+
      '<path class="tk-gloss" d="M58 80 V132"/>'},
  2:{x0:42,x1:98,top:38,bottom:150,
    back:'<rect class="tk-metal" x="40" y="155" width="60" height="6" rx="2"/>',
    front:'<rect class="tk-metal" x="36" y="30" width="68" height="10" rx="3"/><rect class="tk-metal" x="36" y="146" width="68" height="10" rx="3"/>'+
      rivetRow([43,56,70,84,97],35)+rivetRow([43,56,70,84,97],151)+
      '<rect class="tk-metal" x="42" y="92" width="56" height="4" opacity=".8"/>'+
      '<rect class="tk-metal" x="98" y="126" width="9" height="6"/><rect class="tk-metal2" x="105" y="122" width="6" height="14" rx="1.5"/>'+
      '<path class="tk-gloss" d="M53 56 V132"/>'},
  3:{x0:32,x1:108,top:14,bottom:150,
    back:'<rect class="tk-metal" x="18" y="12" width="6" height="146"/><rect class="tk-metal" x="116" y="12" width="6" height="146"/>'+
      '<path class="tk-strut" d="M24 40 L32 46 M24 124 L32 118 M116 40 L108 46 M116 124 L108 118"/>'+
      '<rect class="tk-metal" x="12" y="156" width="116" height="7" rx="2"/>',
    front:'<rect class="tk-metal" x="26" y="6" width="88" height="11" rx="3"/><rect class="tk-metal" x="26" y="146" width="88" height="11" rx="3"/>'+
      rivetRow([33,47,61,79,93,107],11.5)+rivetRow([33,47,61,79,93,107],151.5)+
      '<rect class="tk-metal" x="32" y="58" width="76" height="5"/><rect class="tk-metal" x="32" y="104" width="76" height="5"/>'+
      rivetRow([40,55,70,85,100],60.5,1.3)+rivetRow([40,55,70,85,100],106.5,1.3)+
      '<path class="tk-scale" d="M18 36 H14 M18 57 H15 M18 78 H14 M18 99 H15 M18 120 H14"/>'+
      '<rect class="tk-metal2" x="66" y="0" width="8" height="6" rx="1"/><circle class="tk-beacon" cx="70" cy="2" r="2.6"/>'+
      '<path class="tk-gloss" d="M44 40 V124"/>'},
};
Object.values(CAPSULE_SIZES).forEach(sz=>{ sz.path=capsulePath(sz.x0,sz.x1,sz.top,sz.bottom); sz.w=sz.x1-sz.x0; });
// Волна шириной 280 с периодом 20: CSS сдвигает её на 40 по кругу — шов не виден.
const TANK_WAVE=(function(){ let d='M-60 0'; for(let x=-60;x<=210;x+=10) d+=' Q'+(x+5)+' '+((x/10)%2===0?-3:3)+' '+(x+10)+' 0'; return d+' V220 H-60 Z'; })();
function tankState(r){
  const amt=state.resources[r.id]||0, cap=liquidCapacity(r.id);
  const pct=cap>0?Math.max(0,Math.min(100,(amt/cap)*100)):0;
  return {amt,cap,pct,rate:netRate(r.id)*3600};
}
function tankLevelY(sz,pct){
  // При пустом баке прячем и гребни волны, иначе на дне оставалась бы «рябь».
  return pct<0.5 ? sz.bottom+6 : sz.bottom-(sz.bottom-sz.top)*pct/100;
}
function fmtEtaH(h){
  if(!isFinite(h) || h<=0) return '';
  if(h>=48) return Math.round(h/24)+' д';
  const m=Math.round(h*60);
  return m>=60 ? Math.floor(m/60)+' ч'+(m%60?' '+m%60+' м':'') : Math.max(1,m)+' м';
}
function tankFlowText(t){
  if(Math.abs(t.rate)<0.05) return {cls:'zero',txt:'без изменений'};
  const sign=t.rate>0?'+':'−';
  let eta='';
  if(t.rate>0 && t.pct<99.5) eta=' · полон через '+fmtEtaH((t.cap-t.amt)/t.rate);
  if(t.rate<0 && t.amt>0.5) eta=' · пуст через '+fmtEtaH(t.amt/-t.rate);
  return {cls:t.rate>0?'pos':'neg',txt:sign+fmtRate(Math.abs(t.rate))+'/ч'+eta};
}
// idPrefix разводит id маски, когда одна и та же жидкость нарисована и на складе, и в «Стройке».
function capsuleSvg(resId,lvl,pct,idPrefix){
  const sz=CAPSULE_SIZES[lvl], cid='tk'+(idPrefix||'c')+'-'+resId, H=sz.bottom-sz.top;
  const marks=[25,50,75].map(p=>'<path class="tk-mark" d="M0 '+(sz.bottom-H*p/100).toFixed(1)+' H140"/>').join('');
  // Пузырьки: позиция стабильна для жидкости и уровня (псевдослучайно от индекса), чтобы при
  // перестройке DOM они не «прыгали».
  let bub='';
  const n=2+lvl*2;
  for(let i=0;i<n;i++){
    const f=((i*0.618+resId.length*0.13)%1);
    const x=(sz.x0+6+f*(sz.w-12)).toFixed(1), depth=Math.min(H-4,18+((i*37)%70)*H/100);
    bub+='<circle class="tk-bub" cx="'+x+'" cy="'+depth.toFixed(1)+'" r="'+(1+(i%3)*0.5)+'" style="--d:'+Math.round(depth-3)+';--dur:'+(2.6+(i%4)*0.7).toFixed(1)+'s;--dl:-'+(i*0.9).toFixed(1)+'s"/>';
  }
  return '<svg viewBox="0 0 140 166" aria-hidden="true">'+
    '<defs><clipPath id="'+cid+'"><path d="'+sz.path+'"/></clipPath></defs>'+
    sz.back+
    '<path class="tk-glass" d="'+sz.path+'"/>'+
    '<g clip-path="url(#'+cid+')">'+
      '<g class="tk-liquid" style="transform:translateY('+tankLevelY(sz,pct).toFixed(1)+'px)">'+
        '<path class="tk-wave back" d="'+TANK_WAVE+'"/><path class="tk-wave front" d="'+TANK_WAVE+'"/>'+
        '<rect class="tk-sheen" x="-60" y="3" width="280" height="1.6"/>'+bub+
      '</g>'+marks+
    '</g>'+
    '<path class="tk-outline" d="'+sz.path+'"/>'+sz.front+
  '</svg>';
}
function tankCostHtml(cost){
  return Object.entries(cost).map(([rid,q])=>{
    const ok=(state.resources[rid]||0)>=q;
    return '<span class="'+(ok?'ok':'bad')+'">'+q+' '+resTag(rid)+'</span>';
  }).join('');
}
function tankUpgradeHtml(resId){
  const next=liquidTankNext(resId);
  if(!next) return '<div class="wh-tank-max">Максимальный уровень</div>';
  const afford=Object.entries(next.cost).every(([rid,q])=>(state.resources[rid]||0)>=q);
  return '<div class="wh-tank-up">'+
    '<div class="wh-tank-cost">'+tankCostHtml(next.cost)+'</div>'+
    '<button type="button" class="wh-tank-btn" data-tank-up="'+resId+'"'+(afford?'':' disabled')+'>'+
      'Улучшить: '+next.short.toLowerCase()+'<small>ёмкость '+next.capacity.toLocaleString('ru-RU')+'</small></button>'+
  '</div>';
}
function liquidTankTile(r){
  const info=liquidTankInfo(r.id), t=tankState(r), flow=tankFlowText(t);
  const pips=LIQUID_TANK_LEVELS.map(l=>'<i class="'+(l.lvl<=info.lvl?'on':'')+'"></i>').join('');
  return '<div class="wh-tank lvl'+info.lvl+(t.pct>=99.5?' full':'')+(t.pct<15?' low':'')+'" data-res="'+r.id+'" style="--rc:var(--'+colorVarOf(r)+')">'+
    '<div class="wh-tank-view">'+capsuleSvg(r.id,info.lvl,t.pct)+'<span class="wh-tank-pct">'+Math.floor(t.pct)+'%</span></div>'+
    '<div class="wh-tank-body">'+
      '<div class="wh-tank-name">'+r.name+' <span class="wh-tank-f">'+(r.formula||'')+'</span></div>'+
      '<div class="wh-tank-lvl"><span class="wh-tank-pips" aria-label="Уровень '+info.lvl+' из '+LIQUID_TANK_LEVELS.length+'">'+pips+'</span>'+info.name+'</div>'+
      '<div class="wh-tank-bar sunk"><i style="width:'+t.pct.toFixed(1)+'%"></i></div>'+
      '<div class="wh-tank-val"><b>'+Math.round(t.amt).toLocaleString('ru-RU')+'</b> / '+t.cap.toLocaleString('ru-RU')+'</div>'+
      '<div class="wh-tank-flow '+flow.cls+'">'+flow.txt+'</div>'+
      '<div class="wh-tank-upwrap">'+tankUpgradeHtml(r.id)+'</div>'+
    '</div></div>';
}
function liquidTanksKey(){ return liquidResourceIds().map(id=>id+':'+liquidTankLevel(id)).join(','); }
function renderLiquidTanks(){
  const ids=liquidResourceIds();
  if(!ids.length) return '';
  const tiles=ids.map(id=>liquidTankTile(resById(id))).join('');
  return '<h2 class="wh-sub-head">Резервуары для жидкостей</h2><div class="wh-tanks">'+tiles+'</div>';
}
let lastTanksKey='';
function updateLiquidTanks(){
  const wrap=warehousePanelEl.querySelector('#whTanksWrap');
  if(!wrap) return;
  const key=liquidTanksKey();
  if(key!==lastTanksKey || !wrap.querySelector('.wh-tank')){ lastTanksKey=key; wrap.innerHTML=renderLiquidTanks(); return; }
  liquidResourceIds().forEach(id=>{
    const el=wrap.querySelector('.wh-tank[data-res="'+id+'"]');
    if(!el) return;
    const r=resById(id), sz=CAPSULE_SIZES[liquidTankLevel(id)], t=tankState(r), flow=tankFlowText(t);
    el.querySelector('.tk-liquid').style.transform='translateY('+tankLevelY(sz,t.pct).toFixed(1)+'px)';
    el.classList.toggle('full',t.pct>=99.5);
    el.classList.toggle('low',t.pct<15);
    const pct=el.querySelector('.wh-tank-pct'), ps=Math.floor(t.pct)+'%'; if(pct.textContent!==ps) pct.textContent=ps;
    el.querySelector('.wh-tank-bar i').style.width=t.pct.toFixed(1)+'%';
    const val=el.querySelector('.wh-tank-val b'), vs=Math.round(t.amt).toLocaleString('ru-RU'); if(val.textContent!==vs) val.textContent=vs;
    const fl=el.querySelector('.wh-tank-flow'); if(fl.textContent!==flow.txt) fl.textContent=flow.txt; fl.className='wh-tank-flow '+flow.cls;
    // Цена улучшения подсвечивается по наличию ресурсов, которые меняются каждый тик.
    // Сравниваем с последней своей строкой, а не с innerHTML: браузер сериализует разметку иначе
    // (disabled → disabled=""), и кнопка пересоздавалась бы каждый тик, теряя наведение и клик.
    const up=el.querySelector('.wh-tank-upwrap'), html=tankUpgradeHtml(id); if(up._html!==html){ up._html=html; up.innerHTML=html; }
  });
}
warehousePanelEl.addEventListener('click', e=>{
  const btn=e.target.closest('[data-tank-up]');
  if(!btn || btn.disabled) return;
  tryUpgradeLiquidTank(btn.dataset.tankUp);
});
let lastWhKey='';
function renderWarehouse(){
  const used=totalCargoWeight(), cap=warehouseCapacityKg();
  const pct=Math.max(0,Math.min(100,(used/cap)*100));
  const ids=whFillKey();
  const valStr=Math.round(used).toLocaleString('ru-RU')+' / '+cap.toLocaleString('ru-RU')+' кг';
  if(ids.join(',')===lastWhKey && warehousePanelEl.querySelector('.wh-grid')){
    ids.forEach(id=>{
      const el=warehousePanelEl.querySelector('.wh-tile[data-res="'+id+'"]');
      if(!el) return;
      const r=resById(id), amt=state.resources[id]||0;
      const n=el.querySelector('.wh-amt'), t=String(Math.floor(amt));
      if(n.textContent!==t) n.textContent=t;
      el.classList.toggle('empty',amt<0.05);
      el.title=whTip(r);
    });
    const fill=warehousePanelEl.querySelector('.wh-cap-fill'); if(fill) fill.style.width=pct.toFixed(1)+'%';
    const bar=warehousePanelEl.querySelector('.wh-cap-bar'); if(bar) bar.classList.toggle('full',pct>=99.5);
    const val=warehousePanelEl.querySelector('.wh-cap-val'); if(val && val.textContent!==valStr) val.textContent=valStr;
    updateLiquidTanks();
    return;
  }
  lastWhKey=ids.join(',');
  const tiles=ids.map((id,i)=>whTile(resById(id),i)).join('');
  const empties='<div class="wh-empty"></div>'.repeat(Math.max(0,WH_MIN_CELLS-ids.length));
  warehousePanelEl.innerHTML=
    '<div class="wh-cap bevel-frame"><svg class="wh-cap-icon" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">'+SECTION_ICONS.warehouse+'</svg>'+
      '<div class="wh-cap-bar sunk'+(pct>=99.5?' full':'')+'"><i class="wh-cap-fill" style="width:'+pct.toFixed(1)+'%"></i></div>'+
      '<span class="wh-cap-val">'+valStr+'</span></div>'+
    '<div class="wh-grid" id="whGrid">'+tiles+empties+'</div>'+
    '<div id="whTanksWrap" style="margin-top:18px;"></div>';
  lastTanksKey='';
  updateLiquidTanks();
}
let dragSrcId=null;
let warehouseDragging=false;
warehousePanelEl.addEventListener('dragstart', e=>{
  const tile=e.target.closest('.wh-tile');
  if(!tile) return;
  dragSrcId=tile.dataset.res;
  warehouseDragging=true;
  tile.classList.add('dragging');
  e.dataTransfer.effectAllowed='move';
  try{ e.dataTransfer.setData('text/plain', dragSrcId); }catch(err){}
});
warehousePanelEl.addEventListener('dragover', e=>{
  const tile=e.target.closest('.wh-tile');
  if(!tile) return;
  e.preventDefault();
  document.querySelectorAll('.wh-tile.drag-over').forEach(t=>{ if(t!==tile) t.classList.remove('drag-over'); });
  if(tile.dataset.res!==dragSrcId) tile.classList.add('drag-over');
});
warehousePanelEl.addEventListener('drop', e=>{
  const tile=e.target.closest('.wh-tile');
  warehouseDragging=false;
  if(!tile || !dragSrcId){ return; }
  e.preventDefault();
  const targetId=tile.dataset.res;
  tile.classList.remove('drag-over');
  if(targetId!==dragSrcId){
    const order=warehouseOrder().slice();
    const from=order.indexOf(dragSrcId);
    const to=order.indexOf(targetId);
    if(from>=0 && to>=0){
      order.splice(from,1);
      order.splice(to,0,dragSrcId);
      state.warehouseOrder=order;
      saveState();
    }
  }
  dragSrcId=null;
  renderWarehouse();
});
warehousePanelEl.addEventListener('dragend', e=>{
  warehouseDragging=false;
  dragSrcId=null;
  document.querySelectorAll('.wh-tile.dragging,.wh-tile.drag-over').forEach(t=>t.classList.remove('dragging','drag-over'));
});
