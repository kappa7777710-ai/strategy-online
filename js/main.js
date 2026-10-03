// Запуск: догоняем время, пока игра была закрыта, показываем окно «Пока вас не было»,
// первый рендер, тестовое ускорение времени и игровые таймеры. Подключается последним.

let offlineInfo=null;
if(!isNew){
  const now=Date.now();
  const elapsedSec=(now-state.lastTs)/1000;
  if(elapsedSec>5){
    // Колония считает производство за ВСЁ время отсутствия, без ограничения — никакого
    // потолка в 12 часов больше нет, OFFLINE_CAP_SEC не используется для обрезания.
    // Шаг досчёта растёт для больших промежутков, чтобы не зависать на тясячах мелких тиков.
    const before={}; RESOURCES.concat(POP_GOODS).forEach(r=>before[r.id]=state.resources[r.id]||0);
    let remaining=elapsedSec;
    const bigStep=Math.max(OFFLINE_STEP, Math.floor(elapsedSec/2000));
    while(remaining>0){
      const step=Math.min(bigStep,remaining);
      simulateStep(step);
      remaining-=step;
    }
    const deltas={};
    RESOURCES.concat(POP_GOODS).forEach(r=>{
      const d=(state.resources[r.id]||0)-before[r.id];
      if(Math.abs(d)>0.05) deltas[r.id]=d;
    });
    offlineInfo={deltas,elapsedSec,capped:false};
  }
}
state.lastTs=Date.now();
saveState();
if(offlineInfo){
  const entries=Object.entries(offlineInfo.deltas).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,8);
  const rows=entries.length ? entries.map(([rid,d])=>{
    const r=resById(rid);
    const cls=d>=0?'pos':'neg';
    return '<div class="delta-row">'+iconSvg(r.id,colorVarOf(r))+'<span class="delta-name" title="'+r.name+'">'+resName(r.id)+'</span><span class="delta-val '+cls+'">'+(d>=0?'+':'')+Math.round(d)+'</span></div>';
  }).join('') : '<div class="delta-row muted">Производство простаивало — не хватало сырья или персонала.</div>';
  document.getElementById('modalTime').textContent='Пока вас не было: '+fmtElapsed(offlineInfo.elapsedSec*1000);
  document.getElementById('modalRows').innerHTML=rows;
  document.getElementById('modalCapNote').style.display = offlineInfo.capped ? 'block' : 'none';
  modalEl.hidden=false;
}
document.getElementById('modalClose').addEventListener('click', ()=>{ modalEl.hidden=true; });

renderAll();

let tickCount=0;
let timeScale=1;
document.getElementById('devbar').addEventListener('click', e=>{
  const btn=e.target.closest('[data-speed]');
  if(!btn) return;
  timeScale=parseInt(btn.dataset.speed,10);
  document.querySelectorAll('#devbar [data-speed]').forEach(b=>b.classList.toggle('active', b===btn));
  const HINTS={1:'1 с = 1 с игры',60:'1 с = 1 мин игры',600:'1 с = 10 мин игры',3600:'1 с = 1 ч игры'};
  document.getElementById('devHint').textContent=HINTS[timeScale]||'';
});
setInterval(()=>{
  let left=timeScale;
  while(left>0){ const st=Math.min(OFFLINE_STEP,left); simulateStep(st); left-=st; }
  state.lastTs=Date.now();
  renderAll();
  tickCount++;
  if(tickCount%5===0) saveState();
}, 1000);

setInterval(tickCycleBars, 250);
tickCycleBars();

window.addEventListener('pagehide', saveState);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) saveState(); });
