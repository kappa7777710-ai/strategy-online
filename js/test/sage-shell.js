// Общая рамка тестовых страниц в стиле SAGE (стройка, энергия): верхняя полоса, шапка базы,
// меню слева, статус-бар и мелкие помощники. Каждая страница вызывает sgShell() на каждом тике.

// Куда ведут разделы. Страницы без своего тестового экрана открывают обычную игру.
// Сборка в один файл может переопределить ссылки, задав window.SAGE_LINKS до этого скрипта.
const SG_LINKS=Object.assign({build:'build-menu-test.html', energy:'energy-test.html', game:'index.html'}, window.SAGE_LINKS||{});
const SG_NAV=[
  {id:'hq',label:'Штаб'},{id:'buildings',label:'Здания'},{id:'warehouse',label:'Склад'},
  {id:'build',label:'Стройка'},{id:'workers',label:'Рабочие'},{id:'skills',label:'Навыки'},{id:'energy',label:'Энергия'},
];
function sgHref(id){ return SG_LINKS[id] || SG_LINKS.game; }

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=n=>Math.round(n).toLocaleString('ru-RU');
function ico(key,cv,size){ return '<svg class="bm-ico" viewBox="0 0 20 20" width="'+(size||16)+'" height="'+(size||16)+'" style="color:var(--'+cv+')" fill="currentColor" aria-hidden="true">'+(ICONS[key]||'<circle cx="10" cy="10" r="6"/>')+'</svg>'; }
function hms(sec){
  sec=Math.max(0,Math.round(sec));
  const p=n=>String(n).padStart(2,'0');
  return p(Math.floor(sec/3600))+'Ч : '+p(Math.floor(sec%3600/60))+'М : '+p(sec%60)+'С';
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

// opts: page — id активного раздела; mainSub — data-sub главной кнопки; subs — [{id,label}];
// activeSub — выделенный подпункт; focus — подпись «Фокус» в статус-баре.
function sgShell(opts){
  // Меню слева: активный раздел раскрыт подпунктами, остальные — ссылки.
  let nav='';
  SG_NAV.forEach(n=>{
    if(n.id!==opts.page){ nav+='<a class="bm-nav-btn" href="'+sgHref(n.id)+'">'+n.label+'</a>'; return; }
    nav+='<button class="bm-nav-btn active" data-sub="'+opts.mainSub+'">'+n.label+'</button><div class="bm-nav-sub">'+
      opts.subs.map(s=>'<button class="bm-nav-subbtn'+(opts.activeSub===s.id?' active':'')+'" data-sub="'+s.id+'">'+s.label+'</button>').join('')+'</div>';
  });
  setHtml('bmNav',nav);
  const keys=['hq','buildings','build','workers','skills','production','energy','warehouse','planet'];
  setHtml('bmQuick',keys.map(k=>{
    const s=SECTIONS.find(x=>x.id===k);
    return '<a href="'+sgHref(k)+'" class="'+(k===opts.page?'active':'')+'" title="'+(s?s.label:k)+'"><svg viewBox="0 0 48 48" fill="currentColor">'+(SECTION_ICONS[k]||'')+'</svg></a>';
  }).join(''));

  const used=usedArea(), cap=energyCapacity(), en=state.resources.energy||0;
  const units=state.units.length;
  const assigned=Object.values(lastWorkforce).reduce((s,c)=>s+Math.floor(c.assigned),0);
  const hasMiner=BUILDINGS.some(b=>b.type==='miner' && (state.buildings[b.id]||0)>0);
  const hasPower=['solar','coal_power'].some(id=>(state.buildings[id]||0)>0);
  sgText('bmObjective',!hasMiner?'Построить горнодобывающую установку':!hasPower?'Обеспечить базу энергией':'Расширить колонию');
  sgText('bmRank',String(1+Math.floor(units/5)));
  document.getElementById('bmRankBar').style.width=((units%5)/5*100)+'%';
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
  sgText('bmFocus',opts.focus||'—');
}
