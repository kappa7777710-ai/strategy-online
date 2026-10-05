// Интерфейс V2 (в духе SAGE): верхняя полоса, шапка базы, меню слева, статус-бар и переключатель
// V1/V2. Разделы игры те же (SECTIONS, activeSection, openSection из ui.js). Стройка и энергия
// регистрируют свои экраны в V2_PAGES; остальные разделы показывают свои обычные панели,
// перенесённые в рамку V2 и перекрашенные css/v2/pages.css.

const V2=document.documentElement.dataset.ui==='v2';
const V2_PAGES={};   // id раздела → {subs, activeSub, onSub(id), focus(), render(), open(key)}
const V2_LEGACY={hq:'hqPanel',buildings:'buildingsPanel',workers:'popPanel',skills:'skillsPanel',
  production:'productionPanel',warehouse:'warehousePanel',planet:'planetPanel'};
const V2_ABOUT={
  hq:'Сводка колонии: склад, производство, персонал и энергия на одном экране.',
  buildings:'Все построенные объекты базы и их текущее состояние.',
  workers:'Жилые блоки, отдел кадров и распределение персонала по установкам.',
  skills:'Навыки колонии: что изучается сейчас и что откроется дальше.',
  production:'Цех: циклы установок, рецепты, загрузка и простои.',
  warehouse:'Запасы базы, вместимость склада и распределение по ресурсам.',
  planet:'Месторождения, сутки планеты и условия добычи.',
};

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=n=>Math.round(n).toLocaleString('ru-RU');
function ico(key,cv,size){ return '<svg class="bm-ico" viewBox="0 0 20 20" width="'+(size||16)+'" height="'+(size||16)+'" style="color:var(--'+cv+')" fill="currentColor" aria-hidden="true">'+(ICONS[key]||'<circle cx="10" cy="10" r="6"/>')+'</svg>'; }
function hms(sec){
  sec=Math.max(0,Math.round(sec));
  const p=n=>String(n).padStart(2,'0');
  return p(Math.floor(sec/3600))+'Ч : '+p(Math.floor(sec%3600/60))+'М : '+p(sec%60)+'С';
}
function hexPts(cx,cy,r){
  let p=[]; for(let k=0;k<6;k++){ const a=Math.PI/180*(60*k-90); p.push((cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1)); }
  return p.join(' ');
}
// Последние отрисованные строки по блокам — DOM трогаем только при изменениях.
const SG_LAST={};
function setHtml(id,html){
  if(SG_LAST[id]===html) return;
  const el=document.getElementById(id), f=document.activeElement;
  // Не перерисовываем блок, пока игрок печатает в его поле или держит открытым список.
  if(f && el.contains(f) && /^(INPUT|SELECT)$/.test(f.tagName)) return;
  SG_LAST[id]=html; el.innerHTML=html;
}
function sgText(id,t){ const el=document.getElementById(id); if(el && el.textContent!==t) el.textContent=t; }

// Переключатель версии есть в обеих шапках. Сохраняемся и перезагружаем страницу —
// так каждая версия стартует со своей разметкой, а колония ничего не теряет.
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-ui-set]'); if(!b) return;
  const v=b.dataset.uiSet;
  if(v===document.documentElement.dataset.ui) return;
  saveState();
  try{ localStorage.setItem('so-ui',v); sessionStorage.setItem('so-section',activeSection); }catch(_){}
  location.reload();
});
// После переключения версии открываем тот же раздел, что был открыт.
try{
  const s=sessionStorage.getItem('so-section'); sessionStorage.removeItem('so-section');
  if(SECTIONS.some(x=>x.id===s)) activeSection=s;
}catch(_){}

function v2Shell(){
  const page=V2_PAGES[activeSection];
  const cur=SECTIONS.find(s=>s.id===activeSection);
  let nav='';
  SECTIONS.forEach(s=>{
    const on=s.id===activeSection;
    nav+='<button class="bm-nav-btn'+(on?' active':'')+'" data-section="'+s.id+'">'+s.label+'</button>';
    if(on && page && page.subs) nav+='<div class="bm-nav-sub">'+page.subs.map(x=>
      '<button class="bm-nav-subbtn'+(page.activeSub()===x.id?' active':'')+'" data-sub="'+x.id+'">'+x.label+'</button>').join('')+'</div>';
  });
  setHtml('bmNav',nav);
  setHtml('bmQuick',SECTIONS.map(s=>
    '<button class="'+(s.id===activeSection?'active':'')+'" data-section="'+s.id+'" title="'+s.label+'"><svg viewBox="0 0 48 48" fill="currentColor">'+(SECTION_ICONS[s.id]||'')+'</svg></button>').join(''));

  const used=usedArea(), cap=energyCapacity(), en=state.resources.energy||0;
  const units=state.units.length;
  const assigned=Object.values(lastWorkforce).reduce((s,c)=>s+Math.floor(c.assigned),0);
  const hasMiner=BUILDINGS.some(b=>b.type==='miner' && (state.buildings[b.id]||0)>0);
  const hasPower=['solar','coal_power'].some(id=>(state.buildings[id]||0)>0);
  sgText('bmObjective',!hasMiner?'Построить горнодобывающую установку':!hasPower?'Обеспечить базу энергией':'Расширить колонию');
  sgText('bmRank',String(1+Math.floor(units/5)));
  document.getElementById('bmRankBar').style.width=((units%5)/5*100)+'%';
  sgText('bmSaved','Сохранено '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));
  sgText('bmAreaLbl','Площадь '+num(used)+' / '+num(BASE_AREA));
  document.getElementById('bmAreaBar').style.width=Math.min(100,used/BASE_AREA*100)+'%';
  sgText('bmEnergyLbl','Заряд '+fmtStoredEnergyKwh(en)+' / '+fmtStoredEnergyKwh(cap));
  document.getElementById('bmEnergyBar').style.width=(cap>0?Math.min(100,en/cap*100):0)+'%';
  setHtml('bmTags',
    '<div><span class="bm-chip red">Индустриальный пояс</span><span class="bm-chip">Ярус T0</span>'+
      '<span class="bm-chip">Время '+dayClockStr(state.playSeconds||0)+'</span><span class="bm-chip">'+(sunFactor(state.playSeconds||0)>0?'День':'Ночь')+'</span></div>'+
    '<div><span class="bm-chip">'+units+' установок</span><span class="bm-chip">Персонал '+assigned+' / '+(state.population||0)+'</span></div>');
  const pct=Math.round(used/BASE_AREA*40);
  setHtml('bmTicks',Array.from({length:40},(_,i)=>'<i'+(i<pct?' class="on"':'')+'></i>').join(''));
  sgText('bmAreaTxt',num(used)+' / '+num(BASE_AREA)+' м²');
  sgText('v2Time',fmtElapsed(Date.now()-state.startTs));
  sgText('v2Tab',cur.short);
  sgText('v2Crumb',cur.short);
  const sub=page&&page.subs&&page.subs.find(x=>x.id===page.activeSub());
  sgText('v2CrumbSub',page?(page.crumb||(sub?sub.label:cur.label)):cur.label);
  sgText('bmFocus',page?page.focus():sectionInfo(activeSection).stat||'—');
}

// Шапка обычного раздела: название, короткое описание и главный показатель раздела.
function v2Head(){
  const cur=SECTIONS.find(s=>s.id===activeSection), info=sectionInfo(activeSection);
  setHtml('v2Head',
    '<div class="bm-title-main"><h1>'+cur.label+'</h1><div class="bm-title-tags"><b>T0</b><span class="v2-about">'+V2_ABOUT[activeSection]+'</span></div></div>'+
    '<div class="bm-through"><div><label>'+cur.short+'</label><b>'+esc(info.stat||'—')+'</b></div>'+
    (info.fill!=null?'<div class="r"><label class="'+(info.fill>=95?'bad':'ok')+'">Заполнено</label><b>'+Math.round(info.fill)+'%</b></div>':'')+'</div>');
}

let v2LastSection='';
function v2Render(){
  const page=V2_PAGES[activeSection];
  document.getElementById('v2Build').hidden=activeSection!=='build';
  document.getElementById('v2Energy').hidden=activeSection!=='energy';
  document.getElementById('v2Page').hidden=!!page;
  if(page) page.render(); else v2Head();
  v2Shell();
  if(v2LastSection && v2LastSection!==activeSection) window.scrollTo({top:0});
  v2LastSection=activeSection;
}
// Переход в раздел V2; key — что сразу выбрать на экране раздела (например, проект в стройке).
function v2Go(id,key){
  if(key && V2_PAGES[id] && V2_PAGES[id].open) V2_PAGES[id].open(key);
  openSection(id);
}

if(V2){
  // Панели разделов и тестовая панель переезжают в рамку V2. Ссылки на них в ui.js
  // остаются прежними — меняется только место в документе.
  const box=document.getElementById('v2Panels');
  Object.values(V2_LEGACY).forEach(id=>box.appendChild(document.getElementById(id)));
  document.getElementById('v2Dev').appendChild(document.getElementById('devbar'));

  const _v2RenderAll=renderAll;
  renderAll=function(){ _v2RenderAll(); v2Render(); };
  const _v2OpenSection=openSection;
  openSection=function(id){ _v2OpenSection(id); v2Render(); };

  document.getElementById('v2root').addEventListener('click',e=>{
    const go=e.target.closest('[data-goto]');
    if(go){ e.preventDefault(); v2Go(go.dataset.goto,go.dataset.key); return; }
    const sec=e.target.closest('[data-section]');
    if(sec && (sec.closest('#bmNav')||sec.closest('#bmQuick')||sec.classList.contains('bm-brand'))){ openSection(sec.dataset.section); return; }
    const sub=e.target.closest('#bmNav [data-sub]');
    if(sub && V2_PAGES[activeSection]){ V2_PAGES[activeSection].onSub(sub.dataset.sub); v2Render(); }
  });
}
