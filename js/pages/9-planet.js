// Вкладка 9 · «Планета» — административный центр базы. Пока здесь только ручное
// управление игровым временем суток (для администратора); остальные разделы центра
// появятся позже — сам пользователь предупредил, что доскажет их состав отдельно.

const HOUR_PRESETS=[
  {h:0, label:'00:00', sub:'Полночь'},
  {h:6, label:'06:00', sub:'Рассвет'},
  {h:12, label:'12:00', sub:'Полдень'},
  {h:18, label:'18:00', sub:'Вечер'},
  {h:20, label:'20:00', sub:'Закат'},
];

function renderPlanet(){
  const sun=sunFactor(state.playSeconds);
  const isDay=sun>0.001;
  const clock=dayClockStr(state.playSeconds);
  // Текущий час (с округлением вниз) — чтобы подсветить ближайшую активную пресет-кнопку.
  const curHour=Math.floor(gameClockSec(state.playSeconds)/3600);

  const presetHtml=HOUR_PRESETS.map(p=>
    '<button type="button" class="'+(curHour===p.h?'active':'')+'" data-set-hour="'+p.h+'">'+p.label+' · '+p.sub+'</button>'
  ).join('');

  const html=
    '<div class="pl-building bevel-frame">'+
      '<svg class="pl-building-icon" viewBox="0 0 48 48" fill="currentColor" style="color:var(--planet)" aria-hidden="true">'+FEATURE_ICONS.adminCenter+'</svg>'+
      '<div class="pl-building-body">'+
        '<h3>Административный центр</h3>'+
        '<div class="pl-building-desc">Здание управления базой: отсюда администратор задаёт игровые правила напрямую, в обход обычного производственного цикла — начиная с времени суток ниже. Остальные полномочия появятся здесь по мере развития центра.</div>'+
      '</div>'+
    '</div>'+
    '<div class="pl-clock bevel-frame" style="margin-top:14px;">'+
      '<svg class="pl-clock-icon" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">'+SECTION_ICONS.planet+'</svg>'+
      '<div class="pl-clock-body">'+
        '<div class="pl-clock-time">'+clock+'</div>'+
        '<div class="pl-clock-sub">'+(isDay?'День · освещённость '+Math.round(sun*100)+'%':'Ночь · солнца нет')+'</div>'+
      '</div>'+
    '</div>'+
    '<div class="panel" style="margin-top:14px;"><h2>Управление временем суток</h2>'+
      '<div class="pl-presets">'+presetHtml+'</div>'+
      '<div class="pl-nudge">'+
        '<button type="button" data-nudge-hour="-1">− 1 час</button>'+
        '<button type="button" data-nudge-hour="1">+ 1 час</button>'+
      '</div>'+
      '<div class="pl-admin-note">Доступно только администратору базы: мгновенно переводит игровые часы (и вместе с ними — освещённость солнечных панелей), не трогая скорость самой симуляции.</div>'+
    '</div>'+
    '<div class="locked-banner" style="margin-top:14px;">Административный центр только открылся — остальные его разделы появятся здесь позже.</div>';
  planetPanelEl.innerHTML=html;
}

planetPanelEl.addEventListener('click', e=>{
  const setBtn=e.target.closest('[data-set-hour]');
  if(setBtn){ adminSetGameHour(Number(setBtn.dataset.setHour)); return; }
  const nudgeBtn=e.target.closest('[data-nudge-hour]');
  if(nudgeBtn){
    const curHour=gameClockSec(state.playSeconds)/3600;
    adminSetGameHour(curHour+Number(nudgeBtn.dataset.nudgeHour));
  }
});
