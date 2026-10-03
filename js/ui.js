// Общий интерфейс: разделы и хотбар, значки (SVG), ссылки на панели,
// переключение вкладок, renderAll и анимация циклов (tickCycleBars).

const SECTIONS=[
  {id:'hq',label:'Штаб-квартира',short:'Штаб',color:'tier0'},
  {id:'buildings',label:'Здания',short:'Здания',color:'tier1'},
  {id:'build',label:'Построить',short:'Стройка',color:'tier2'},
  {id:'workers',label:'Рабочие',short:'Рабочие',color:'class1'},
  {id:'skills',label:'Навыки',short:'Навыки',color:'skill'},
  {id:'production',label:'Производство',short:'Цех',color:'tier3'},
  {id:'energy',label:'Энергия',short:'Энергия',color:'energy'},
  {id:'warehouse',label:'Склад',short:'Склад',color:'tier4'},
  {id:'planet',label:'Планета',short:'Планета',color:'planet'},
];
// Иконки разделов для хотбара — отдельный холст 48×48 (детальнее, чем ICONS 20×20).
// Тёмные/светлые детали красятся через style (--ink/--hi), основная заливка — currentColor.
const SECTION_ICONS={
  hq:'<rect x="5" y="41" width="38" height="2.5" rx="1.25" opacity=".3"/>'+
     '<path d="M7 41V26a2 2 0 0 1 2-2h9v17z" opacity=".6"/><path d="M30 41V24h9a2 2 0 0 1 2 2v15z" opacity=".6"/>'+
     '<path d="M17 41V15a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v26z"/>'+
     '<path d="M24 13V6.5" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="24" cy="5" r="2.2" style="fill:var(--hi)"/>'+
     '<path d="M8.6 23.2c0-4.3 3.1-7.2 7.3-7.2" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round"/><path d="M11 21.4l3.6-3.2" stroke="currentColor" stroke-width="1.2"/>'+
     '<g style="fill:var(--hi)" opacity=".85"><rect x="20" y="16" width="3" height="2.3" rx=".4"/><rect x="25" y="16" width="3" height="2.3" rx=".4"/><rect x="20" y="20.5" width="3" height="2.3" rx=".4"/><rect x="25" y="20.5" width="3" height="2.3" rx=".4"/><rect x="20" y="25" width="3" height="2.3" rx=".4"/><rect x="25" y="25" width="3" height="2.3" rx=".4"/></g>'+
     '<g style="fill:var(--hi)" opacity=".5"><rect x="10" y="28" width="5" height="2" rx=".4"/><rect x="10" y="32.5" width="5" height="2" rx=".4"/><rect x="33" y="28" width="5" height="2" rx=".4"/><rect x="33" y="32.5" width="5" height="2" rx=".4"/></g>'+
     '<rect x="21" y="33" width="6" height="8" rx="1" style="fill:var(--ink)" opacity=".55"/>',
  buildings:'<rect x="3" y="41" width="42" height="2.5" rx="1.25" opacity=".3"/>'+
     '<circle cx="30" cy="7" r="2.6" opacity=".32"/><circle cx="34.6" cy="4.2" r="1.9" opacity=".22"/>'+
     '<path d="M4 41V27l7-4.5V27l7-4.5V27l7-4.5V41z" opacity=".6"/>'+
     '<rect x="26.5" y="11" width="6" height="30" rx="1"/><rect x="26.5" y="15" width="6" height="1.6" style="fill:var(--ink)" opacity=".4"/>'+
     '<rect x="34" y="21" width="10" height="20" rx="1.5" opacity=".82"/>'+
     '<g style="fill:var(--hi)" opacity=".7"><rect x="7" y="31" width="3.5" height="3" rx=".4"/><rect x="13.5" y="31" width="3.5" height="3" rx=".4"/><rect x="20" y="31" width="3" height="3" rx=".4"/><rect x="7" y="36" width="3.5" height="3" rx=".4"/><rect x="13.5" y="36" width="3.5" height="3" rx=".4"/></g>'+
     '<g style="fill:var(--hi)" opacity=".8"><rect x="36" y="24" width="2.5" height="2.5" rx=".3"/><rect x="39.5" y="24" width="2.5" height="2.5" rx=".3"/><rect x="36" y="29" width="2.5" height="2.5" rx=".3"/><rect x="39.5" y="29" width="2.5" height="2.5" rx=".3"/><rect x="36" y="34" width="2.5" height="2.5" rx=".3"/><rect x="39.5" y="34" width="2.5" height="2.5" rx=".3"/></g>',
  build:'<rect x="8" y="41" width="14" height="2.5" rx="1.25" opacity=".35"/>'+
     '<path d="M13 41V12h4v29z"/>'+
     '<path d="M13 16l4 4M17 20l-4 4M13 24l4 4M17 28l-4 4M13 32l4 4M17 36l-4 4" style="stroke:var(--ink)" stroke-width="1" opacity=".45"/>'+
     '<path d="M13 12l2-7.5 2 7.5z" opacity=".9"/>'+
     '<path d="M15 4.5L6 10M15 4.5L42 10" stroke="currentColor" stroke-width="1" fill="none" opacity=".6"/>'+
     '<rect x="5" y="10" width="38" height="3" rx="1"/>'+
     '<rect x="5" y="13" width="6" height="5" rx="1" opacity=".75"/>'+
     '<rect x="17" y="13" width="4.5" height="4" rx="1" style="fill:var(--hi)" opacity=".8"/>'+
     '<rect x="32" y="13" width="4" height="2" opacity=".9"/>'+
     '<path d="M34 15v12" stroke="currentColor" stroke-width="1.1"/>'+
     '<path d="M34 27l-6 5M34 27l6 5" stroke="currentColor" stroke-width="1" fill="none" opacity=".75"/>'+
     '<rect x="26" y="32" width="16" height="4.2" rx="1" style="fill:var(--hi)" opacity=".85"/>'+
     '<path d="M30 32v4.2M34 32v4.2M38 32v4.2" style="stroke:var(--ink)" stroke-width="1" opacity=".3"/>',
  workers:'<path d="M26 35c1-6.5 4.8-9.5 9-9.5s8.2 3 9.2 9.5z" opacity=".28"/><circle cx="35" cy="18" r="5" opacity=".35"/><path d="M29.5 16a5.5 5.5 0 0 1 11 0z" opacity=".5"/><rect x="28.5" y="15.3" width="13" height="1.8" rx=".9" opacity=".5"/>'+
     '<path d="M7 44c0-9.5 7.5-14 17-14s17 4.5 17 14z" opacity=".68"/>'+
     '<path d="M11.5 38.8h25" style="stroke:var(--hi)" stroke-width="2" opacity=".65"/>'+
     '<circle cx="24" cy="22.5" r="7.5" opacity=".92"/>'+
     '<path d="M14.5 19.5a9.5 9.5 0 0 1 19 0z"/><rect x="12" y="18.5" width="24" height="3" rx="1.5"/>'+
     '<rect x="22.8" y="10.8" width="2.4" height="7.5" rx="1" style="fill:var(--hi)" opacity=".45"/>',
  skills:'<path d="M5 15.5c7-2.5 13-1.5 18 2.5v23c-5-3.5-11-4.5-18-2z" opacity=".6"/>'+
     '<path d="M43 15.5c-7-2.5-13-1.5-18 2.5v23c5-3.5 11-4.5 18-2z" opacity=".92"/>'+
     '<path d="M9 22.5c4-1 7-.6 10 1M9 27.5c4-1 7-.6 10 1M9 32.5c4-1 7-.6 10 1" style="stroke:var(--hi)" stroke-width="1.1" fill="none" opacity=".45"/>'+
     '<path d="M29 23.5c3-1.6 6-2 10-1M29 28.5c3-1.6 6-2 10-1M29 33.5c3-1.6 6-2 10-1" style="stroke:var(--ink)" stroke-width="1.1" fill="none" opacity=".35"/>'+
     '<polygon points="24,2 25.53,5.9 29.71,6.15 26.47,8.8 27.53,12.85 24,10.6 20.47,12.85 21.53,8.8 18.29,6.15 22.47,5.9" style="fill:var(--hi)"/>'+
     '<circle cx="13.5" cy="8" r="1.1" opacity=".7"/><circle cx="34.5" cy="9.5" r="1.3" opacity=".7"/><circle cx="38" cy="4.5" r=".8" opacity=".5"/>',
  production:'<path class="gear-sm" fill-rule="evenodd" opacity=".6" d="M34.03 5.87 L34.41 3.87 L36.59 3.87 L36.97 5.87 L38.79 6.63 L40.47 5.48 L42.02 7.03 L40.87 8.71 L41.63 10.53 L43.63 10.91 L43.63 13.09 L41.63 13.47 L40.87 15.29 L42.02 16.97 L40.47 18.52 L38.79 17.37 L36.97 18.13 L36.59 20.13 L34.41 20.13 L34.03 18.13 L32.21 17.37 L30.53 18.52 L28.98 16.97 L30.13 15.29 L29.37 13.47 L27.37 13.09 L27.37 10.91 L29.37 10.53 L30.13 8.71 L28.98 7.03 L30.53 5.48 L32.21 6.63 Z M37.9 12 A2.4 2.4 0 1 0 33.1 12 A2.4 2.4 0 1 0 37.9 12 Z"/>'+
     '<path class="gear-lg" fill-rule="evenodd" d="M15.98 10.39 L16.56 7.58 L19.44 7.58 L20.02 10.39 L22.60 11.23 L24.73 9.29 L27.05 10.99 L25.87 13.61 L27.46 15.80 L30.32 15.48 L31.21 18.22 L28.71 19.65 L28.71 22.35 L31.21 23.78 L30.32 26.52 L27.46 26.20 L25.87 28.39 L27.05 31.01 L24.73 32.71 L22.60 30.77 L20.02 31.61 L19.44 34.42 L16.56 34.42 L15.98 31.61 L13.40 30.77 L11.27 32.71 L8.95 31.01 L10.13 28.39 L8.54 26.20 L5.68 26.52 L4.79 23.78 L7.29 22.35 L7.29 19.65 L4.79 18.22 L5.68 15.48 L8.54 15.80 L10.13 13.61 L8.95 10.99 L11.27 9.29 L13.40 11.23 Z M22.2 21 A4.2 4.2 0 1 0 13.8 21 A4.2 4.2 0 1 0 22.2 21 Z"/>'+
     '<rect x="3" y="37.5" width="42" height="6" rx="3" opacity=".55"/>'+
     '<g style="fill:var(--hi)" opacity=".7"><circle cx="7" cy="40.5" r="1.3"/><circle cx="15" cy="40.5" r="1.3"/><circle cx="23" cy="40.5" r="1.3"/><circle cx="31" cy="40.5" r="1.3"/><circle cx="39" cy="40.5" r="1.3"/></g>'+
     '<rect x="33" y="28.5" width="8.5" height="8.5" rx="1" style="fill:var(--hi)" opacity=".85"/><path d="M33 32.7h8.5" style="stroke:var(--ink)" stroke-width="1" opacity=".3"/>',
  warehouse:'<rect x="3" y="41" width="42" height="2.5" rx="1.25" opacity=".3"/>'+
     '<rect x="5" y="25" width="18" height="16" rx="1.5" opacity=".7"/><rect x="25" y="25" width="18" height="16" rx="1.5" opacity=".86"/><rect x="15" y="8.5" width="18" height="16" rx="1.5"/>'+
     '<g style="stroke:var(--ink)" stroke-width="1.3" fill="none" opacity=".4">'+
       '<rect x="7.2" y="27.2" width="13.6" height="11.6" rx=".5"/><path d="M7.2 38.8L20.8 27.2"/>'+
       '<rect x="27.2" y="27.2" width="13.6" height="11.6" rx=".5"/><path d="M27.2 38.8L40.8 27.2"/>'+
       '<rect x="17.2" y="10.7" width="13.6" height="11.6" rx=".5"/><path d="M17.2 22.3L30.8 10.7"/></g>'+
     '<path d="M16 9.5h16" style="stroke:var(--hi)" stroke-width="1" opacity=".35"/>',
  // Энергия: два аккумулятора разной высоты (передний светлее/крупнее) плюс молния поперёк
  // и солнце в углу — намекает и на батареи, и на солнечные панели одновременно.
  energy:'<rect x="4" y="41" width="40" height="2.5" rx="1.25" opacity=".3"/>'+
     '<rect x="7" y="14" width="12" height="26" rx="2" opacity=".5"/><rect x="10.5" y="10" width="5" height="4" rx="1" opacity=".5"/>'+
     '<rect x="22" y="9" width="12" height="31" rx="2" opacity=".8"/><rect x="25.5" y="5" width="5" height="4" rx="1" opacity=".8"/>'+
     '<g style="fill:var(--hi)" opacity=".55"><rect x="9.5" y="24" width="7" height="3" rx=".6"/><rect x="9.5" y="30" width="7" height="3" rx=".6"/></g>'+
     '<path d="M29 12 21 25h6l-3 13 12-16h-7z" style="fill:var(--hi)"/>'+
     '<path d="M29 12 21 25h6l-2 9" style="stroke:var(--ink)" stroke-width="1" opacity=".3" fill="none"/>'+
     '<circle cx="39" cy="10" r="2.6" opacity=".4"/><path d="M39 5.5v2M39 12.5v2M34.5 10h2M41.5 10h2M35.9 6.9l1.4 1.4M40.7 12.7l1.4 1.4M35.9 13.1l1.4-1.4M40.7 7.3l1.4-1.4" stroke="currentColor" stroke-width="1" opacity=".4"/>',
  // Планета: административный центр — шар с «материками» и орбитальным кольцом плюс
  // маленькие часы в углу, намекающие на ручное управление временем суток.
  planet:'<rect x="4" y="41" width="40" height="2.5" rx="1.25" opacity=".3"/>'+
     '<ellipse cx="20" cy="25" rx="19" ry="5.2" opacity=".4" transform="rotate(-15 20 25)"/>'+
     '<circle cx="20" cy="24" r="13" opacity=".92"/>'+
     '<path d="M9 19c5 3 17 3 22 0" style="stroke:var(--ink)" stroke-width="1.3" opacity=".22" fill="none"/>'+
     '<path d="M11 29c5 2.4 14 2.4 19 0" style="stroke:var(--ink)" stroke-width="1.1" opacity=".18" fill="none"/>'+
     '<circle cx="15.5" cy="18.5" r="2.6" style="fill:var(--hi)" opacity=".22"/><circle cx="25" cy="30" r="1.8" style="fill:var(--hi)" opacity=".18"/>'+
     '<ellipse cx="20" cy="25" rx="19" ry="5.2" opacity=".85" transform="rotate(-15 20 25)" style="clip-path:polygon(0 50%,100% 50%,100% 100%,0 100%)"/>'+
     '<circle cx="38" cy="9" r="7.5" opacity=".92"/>'+
     '<path d="M38 9V4M38 9l3.4 2" style="stroke:var(--ink)" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".55"/>',
};
// Крупные (48×48) иллюстрации для «витринных» карточек одиночных построек — тот же язык,
// что у SECTION_ICONS (линия земли снизу, тело — currentColor, детали — var(--ink)/var(--hi)),
// но не привязаны к разделам хотбара.
const FEATURE_ICONS={
  // Отдел кадров: тот же бейдж-силуэт, что ICONS.hr, но в более детальном 48-пиксельном холсте.
  hrDept:'<rect x="4" y="41" width="40" height="2.5" rx="1.25" opacity=".3"/>'+
    '<rect x="9" y="7" width="30" height="34" rx="3" opacity=".92"/>'+
    '<rect x="16" y="3" width="16" height="7" rx="2" style="fill:var(--hi)" opacity=".85"/>'+
    '<circle cx="19" cy="20" r="5.2" style="fill:var(--ink)" opacity=".5"/>'+
    '<path d="M12.5 33c0-4.2 3-6.6 6.5-6.6s6.5 2.4 6.5 6.6" style="fill:var(--ink)" opacity=".5"/>'+
    '<g style="fill:var(--ink)" opacity=".35"><rect x="28" y="16" width="8" height="2.6" rx="1"/><rect x="28" y="21.5" width="8" height="2.6" rx="1"/><rect x="28" y="27" width="8" height="2.6" rx="1"/></g>'+
    '<circle cx="35" cy="11" r="6" style="fill:var(--hi)" opacity=".9"/>'+
    '<path d="M32.3 11l1.8 1.8 3.2-3.4" style="stroke:var(--ink)" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>',
  // Административный центр: купольное здание-«ратуша» с флагштоком и колоннадой — читается
  // как официальное учреждение, не рядовая производственная постройка.
  adminCenter:'<rect x="3" y="41" width="42" height="2.5" rx="1.25" opacity=".3"/>'+
    '<rect x="7" y="24" width="34" height="17" opacity=".9"/>'+
    '<path d="M5 24 24 11 43 24Z" opacity=".8"/>'+
    '<circle cx="24" cy="13" r="6.5" style="fill:var(--ink)" opacity=".28"/>'+
    '<path d="M24 6.5V2M24 2l5 1.6" style="stroke:currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/>'+
    '<path d="M24 2l6.5 2.2-6.5 2.2Z" style="fill:var(--hi)" opacity=".85"/>'+
    '<g style="fill:var(--ink)" opacity=".4"><rect x="11" y="27" width="3.4" height="14"/><rect x="17.3" y="27" width="3.4" height="14"/><rect x="23.6" y="27" width="3.4" height="14" opacity="0"/><rect x="29.9" y="27" width="3.4" height="14"/><rect x="36.2" y="27" width="3.4" height="14"/></g>'+
    '<rect x="21" y="31" width="6" height="10" rx="1" style="fill:var(--hi)" opacity=".55"/>',
};
const ICONS={
  // Ресурсы: разная форма силуэта на каждый (угловатая руда / гроздь самородков / капля),
  // цвет берётся отдельно через colorVar ресурса (--iron/--copper/--water), не общий tier0.
  iron_ore:'<polygon points="4,13 2,8 6,3 12,2 17,6 18,12 13,17 7,18 3,16" opacity="0.88"/><polygon points="6,8 10,5 14,8 12,12 8,12"/><polygon points="9,9 12,8 13,11 10,12" opacity="0.8"/><circle cx="14" cy="5.5" r="1.1"/>',
  copper_ore:'<circle cx="7" cy="8.5" r="4.3" opacity="0.88"/><circle cx="13.2" cy="7.6" r="3.7" opacity="0.88"/><circle cx="10" cy="13.3" r="4.7" opacity="0.88"/><polygon points="8,8 11.2,7 12.3,11 9,12.2"/><circle cx="15" cy="9.3" r="1"/>',
  water:'<path d="M10 2C10 2 4 10.5 4 14A6 6 0 0 0 16 14C16 10.5 10 2 10 2Z" opacity="0.9"/><ellipse cx="8.1" cy="9.6" rx="1.1" ry="1.8" transform="rotate(-20 8.1 9.6)"/>',
  // Уголь: не один обломок, а кучка из двух угловатых глянцевых кусков (маленький сзади, крупный спереди) — силуэт-«горка», не «глыба».
  coal:'<polygon points="2,12 1,8 4,5 7,5 8,8 6,11 4,12" opacity="0.8"/><polygon points="6,17 4,13 7,9 12,8 16,10 16,14 13,18 8,18" opacity="0.92"/><polygon points="8,12 11,10 13,13 10,15" opacity="0.65"/><circle cx="13" cy="10.5" r="1" opacity="0.9"/><circle cx="4" cy="8" r="0.6" opacity="0.7"/>',
  // Камень: округлый валун-«блоб» (кривые, не углы) плюс галька рядом — матовая порода без блика, читается сразу иначе, чем угловатая руда/уголь.
  stone:'<path d="M3,13C1,10 1.5,6 5,3.5C8.5,1 13,1 16,3.5C19,6 18.5,11 15,14C11.5,17 5,16.5 3,13Z" opacity="0.85"/><path d="M12,15.5C11,14.5 11,12.8 12.5,11.5C14,10.2 16.5,10.5 17.3,12C18,13.3 17,15.5 15,16.5C13.8,17 12.5,16.3 12,15.5Z" opacity="0.6"/><circle cx="7" cy="9" r="0.9" opacity="0.3"/><circle cx="11" cy="5.5" r="0.75" opacity="0.3"/><circle cx="10" cy="12.5" r="0.7" opacity="0.3"/>',
  // Нефть: широкая вязкая клякса-капля (шире и ниже, чем у воды) плюс пузырьки — читается
  // как густая тёмная жидкость, а не как вода.
  oil:'<path d="M10 2C10 2 3.5 10 3.5 14.2A6.5 5.6 0 0 0 16.5 14.2C16.5 10 10 2 10 2Z" opacity="0.92"/><ellipse cx="7.6" cy="10.3" rx="1.3" ry="2.1" transform="rotate(-18 7.6 10.3)" opacity="0.5"/><circle cx="12.4" cy="12.6" r="1" opacity="0.55"/><circle cx="10.6" cy="15.4" r="0.7" opacity="0.4"/>',
  // Урожай фермы: пшеница (колос из пар зёрен на стебле), картофель (неровный клубень
  // с глазками), кукуруза (узкий початок с рядами зёрен и листом обёртки), томат (круглый
  // плод с чашелистиком) — четыре разных силуэта, не перекрашенные копии друг друга.
  wheat:'<path d="M10 19V6" stroke="currentColor" stroke-width="1.2" fill="none"/><ellipse cx="8.3" cy="7" rx="1.3" ry="2" transform="rotate(-30 8.3 7)"/><ellipse cx="11.7" cy="7" rx="1.3" ry="2" transform="rotate(30 11.7 7)"/><ellipse cx="7.6" cy="10.2" rx="1.3" ry="2" transform="rotate(-30 7.6 10.2)"/><ellipse cx="12.4" cy="10.2" rx="1.3" ry="2" transform="rotate(30 12.4 10.2)"/><ellipse cx="7" cy="13.4" rx="1.3" ry="2" transform="rotate(-30 7 13.4)"/><ellipse cx="13" cy="13.4" rx="1.3" ry="2" transform="rotate(30 13 13.4)"/>',
  potato:'<path d="M4 9c-1-3 1.5-6 5-6.3C13 2.3 16 5 16 9c0 4-3.5 7-7 6.8C5 15.6 3 13 4 9Z"/><circle cx="7" cy="7.5" r="0.7" opacity="0.4"/><circle cx="11" cy="6.5" r="0.6" opacity="0.4"/><circle cx="9.5" cy="11" r="0.7" opacity="0.4"/><circle cx="12.5" cy="10" r="0.55" opacity="0.35"/>',
  corn:'<path d="M10 18c-2.2 0-3.6-4-3.6-8.5S7.8 2 10 2s3.6 3 3.6 7.5S12.2 18 10 18Z"/><path d="M6.4 9.5c-2-1-3.4 0-4 1.6 1.8 1 3.4 0.4 4-1.6Z" opacity="0.75"/><g opacity="0.35"><circle cx="8.4" cy="5.5" r="0.55"/><circle cx="11.6" cy="5.5" r="0.55"/><circle cx="7.6" cy="7.8" r="0.55"/><circle cx="10" cy="7.8" r="0.55"/><circle cx="12.4" cy="7.8" r="0.55"/><circle cx="8.4" cy="10.1" r="0.55"/><circle cx="11.6" cy="10.1" r="0.55"/><circle cx="7.4" cy="12.4" r="0.55"/><circle cx="10" cy="12.4" r="0.55"/><circle cx="12.6" cy="12.4" r="0.55"/><circle cx="8.6" cy="14.7" r="0.55"/><circle cx="11.4" cy="14.7" r="0.55"/></g>',
  tomato:'<circle cx="10" cy="11.5" r="6.3"/><path d="M10 5.2c-1 0-1.8-1-1.8-2.2M10 5.2c1 0 1.8-1 1.8-2.2M10 5.2v1.6" stroke="currentColor" stroke-width="1" fill="none" opacity="0.6"/><ellipse cx="8" cy="9" rx="1.4" ry="1" opacity="0.25" style="fill:var(--hi)"/>',
  // Паёк — жестяная банка-паёк с откинутой крышкой: явно готовый продукт, не сырьё.
  ration:'<rect x="3" y="7" width="14" height="10" rx="1.3" opacity="0.9"/><path d="M3.5 7c0-2.4 1.8-4 4-4h5c2.2 0 4 1.6 4 4" fill="none" stroke="currentColor" stroke-width="1.3" opacity="0.6"/><path d="M3 9.6h14" style="stroke:var(--ink)" stroke-width="1" opacity="0.3"/><circle cx="10" cy="13.3" r="1.6" style="fill:var(--ink)" opacity="0.35"/>',
  // Пластины — прокатанный лист металла: прямоугольная плита с бликом по верхнему краю
  // и двумя рёбрами жёсткости (железная) или рядом клёпок (медная) — тот же силуэт,
  // разные детали, чтобы не выглядели перекрашенной копией друг друга.
  iron_plate:'<rect x="3" y="6" width="14" height="8" rx="1.2" opacity="0.9"/><rect x="3" y="6" width="14" height="2" style="fill:var(--hi)" opacity="0.4"/><rect x="4.5" y="9" width="11" height="1.1" style="fill:var(--ink)" opacity="0.2"/><rect x="4.5" y="11.4" width="11" height="1.1" style="fill:var(--ink)" opacity="0.2"/>',
  copper_plate:'<rect x="3" y="6" width="14" height="8" rx="1.6" opacity="0.92"/><rect x="3" y="6" width="14" height="2" style="fill:var(--hi)" opacity="0.4"/><g style="fill:var(--ink)" opacity="0.28"><circle cx="5.4" cy="10" r="0.9"/><circle cx="14.6" cy="10" r="0.9"/><circle cx="10" cy="7.3" r="0.7"/><circle cx="10" cy="12.6" r="0.7"/></g>',
  // Хлопок — пушистая коробочка (гроздь перекрывающихся кружков) на стебле, как у урожая фермы.
  cotton:'<path d="M10 17V12" stroke="currentColor" stroke-width="1.3" fill="none"/><circle cx="7.3" cy="8.8" r="3.3" opacity="0.92"/><circle cx="12.7" cy="8.8" r="3.3" opacity="0.92"/><circle cx="10" cy="6" r="3.3" opacity="0.92"/><circle cx="10" cy="10.2" r="2.8" opacity="0.85"/><circle cx="8.3" cy="7" r="1" style="fill:var(--hi)" opacity="0.4"/>',
  // Одежда — силуэт футболки: явно готовый товар, не сырьё.
  clothing:'<path d="M7 2 4 5l1.6 2.4L7 6.5V17h6V6.5l1.4.9L16 5 13 2c-.5 1-1.6 1.6-3 1.6S7.5 3 7 2Z"/><path d="M7 2c1.2 1.6 3 2 3 2s1.8-.4 3-2" style="stroke:var(--hi)" stroke-width="0.8" fill="none" opacity="0.5"/>',
  class1:'<path d="M3 13a7 5 0 0 1 14 0v1H3z"/><rect x="2" y="13" width="16" height="2.2" rx="1"/><rect x="9" y="6" width="2" height="4" opacity="0.6"/>',
  skillT0:'<path d="M2 11c4-6 8-7.5 13-5.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8.7" y="8" width="2.2" height="11" rx="1" transform="rotate(28 8.7 8)"/>',
  // Агрономия — росток с двумя листьями, а не кирка: явно другой навык, не горное дело.
  skillAgro:'<path d="M10 18V9" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M10 12c0-3-3-4.5-6-4 .3 2.8 2.5 5 6 4Z"/><path d="M10 9c0-3 3-4.5 6-4-.3 2.8-2.5 5-6 4Z"/><circle cx="10" cy="18.6" r="1.3" opacity="0.6"/>',
  housing:'<path d="M10 2 2 8v10h16V8z"/><rect x="8" y="12" width="4" height="6" opacity="0.5"/>',
  academy:'<path d="M10 3 1 7l9 4 9-4z"/><path d="M5 9v4c0 1.5 2.5 3 5 3s5-1.5 5-3V9" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  // Отдел кадров — бейдж-планшет с силуэтом сотрудника слева и «строками анкеты» справа,
  // плюс маленькая печать-галочка в углу (утверждено/оформлено).
  hr:'<rect x="2" y="3" width="16" height="14" rx="2"/><circle cx="7.3" cy="8.1" r="2.3" style="fill:var(--ink)" opacity="0.55"/><path d="M4.3 13c0-1.7 1.3-2.7 3-2.7s3 1 3 2.7" style="fill:var(--ink)" opacity="0.55"/><rect x="12" y="6.4" width="4.3" height="1.5" rx="0.7" style="fill:var(--ink)" opacity="0.4"/><rect x="12" y="9.1" width="4.3" height="1.5" rx="0.7" style="fill:var(--ink)" opacity="0.4"/><circle cx="15.5" cy="3.6" r="2.1" style="fill:var(--hi)"/><path d="M14.6 3.6l0.6 0.6 1.1-1.2" stroke="var(--ink)" stroke-width="0.6" fill="none" stroke-linecap="round"/>',
  // Типы зданий: силуэт похож на саму установку, не на добываемый ресурс.
  // Шахтный копёр — колесо-шкив наверху, А-образная рама, линия земли внизу.
  rigMiner:'<circle cx="10" cy="4.3" r="2.1" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="4.3" r="0.6"/><path d="M10 6.3 L5.5 18 M10 6.3 L14.5 18" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8.3 9.2 L11.7 9.2" stroke="currentColor" stroke-width="1" fill="none" opacity="0.45"/><path d="M7 12.3 L13 12.3" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.6"/><path d="M3 18h14" stroke="currentColor" stroke-width="1.5"/><path d="M2 18 Q10 15.6 18 18 Z" opacity="0.3"/>',
  // Буровая вышка — та же А-рама, но уже и без колеса, заканчивается каплей у земли.
  rigDrill:'<path d="M10 2 L6.3 15.5 M10 2 L13.7 15.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8.5 6 L11.5 6" stroke="currentColor" stroke-width="1" fill="none" opacity="0.45"/><path d="M7.6 9.6 L12.4 9.6" stroke="currentColor" stroke-width="1.1" fill="none" opacity="0.6"/><path d="M10 13c0 0 -2.3 2.9 -2.3 4.6a2.3 2.3 0 0 0 4.6 0c0-1.7-2.3-4.6-2.3-4.6z"/>',
  // Солнечная панель — наклонная плита на стойке плюс маленькое солнце с лучами в углу.
  rigSolar:'<path d="M10 18V9" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M10 13.5 15 10.8" stroke="currentColor" stroke-width="1" fill="none" opacity="0.55"/><polygon points="2,11 11,6 18,9 8,14" opacity="0.92"/><path d="M4.5,10 15.5,7.3" style="stroke:var(--ink)" stroke-width="0.8" opacity="0.35" fill="none"/><path d="M6.5,12 13,8.7" style="stroke:var(--ink)" stroke-width="0.8" opacity="0.3" fill="none"/><circle cx="15.2" cy="3" r="1.6" opacity="0.9"/><path d="M15.2 0.3v1.1M15.2 4.6v1.1M12.5 3h1.1M16.8 3h1.1M13.4 1.2l0.8 0.8M15.4 4.2l0.8 0.8M13.4 4.8l0.8-0.8M16.4 1.9l0.8-0.8" stroke="currentColor" stroke-width="0.7" opacity="0.6"/>',
  // Ферма — арка теплицы с рёбрами каркаса и ростком внутри у основания: контур, а не
  // сплошной силуэт, как у копра/вышки — читается как остеклённая конструкция, не машина.
  rigFarm:'<path d="M2 17V10c0-4 3.6-7 8-7s8 3 8 7v7Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 17h16" stroke="currentColor" stroke-width="1.5"/><path d="M2 10c0-4 3.6-7 8-7s8 3 8 7" style="stroke:var(--ink)" stroke-width="1" opacity="0.3" fill="none"/><path d="M6 17V9.3M10 17V6.6M14 17V9.3" stroke="currentColor" stroke-width="0.9" opacity="0.4" fill="none"/><path d="M10 17V12" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M10 14c-1.3-1-2.2 0-2.4 1.2M10 13c1.1-0.9 2 0 2.1 1.1" stroke="currentColor" stroke-width="0.9" fill="none" opacity="0.7"/>',
  // Пищеблок — котёл на плите с дугой пара: кухонная утварь, не машина/рудник.
  rigKitchen:'<path d="M4 18h12" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="9" width="10" height="7" rx="1.2"/><path d="M5 9c0-2.8 2.2-5 5-5s5 2.2 5 5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 4c-.6-.8-.6-1.6 0-2.3M13 4c.6-.8.6-1.6 0-2.3" stroke="currentColor" stroke-width="1" fill="none" opacity="0.6"/><circle cx="10" cy="12.6" r="1.6" style="fill:var(--ink)" opacity="0.4"/>',
  // Угольная ТЭС — дымовая труба с дымком над кучей угля.
  rigTPP:'<rect x="8" y="2" width="4" height="12" rx="0.6"/><path d="M8 14h4l1.5 4h-7z" opacity="0.85"/><path d="M10 2c0-1.4-1-2-1.6-2.6M10 2c0 1.4 1 .6 1.8-.2" stroke="currentColor" stroke-width="0.9" fill="none" opacity="0.45"/><polygon points="2,18 3,15 6,14 8,15 8,18" opacity="0.75"/><path d="M4 18h13" stroke="currentColor" stroke-width="1.5"/>',
  // Металлургический завод — печь с дымовой трубой: тот же язык, что у ТЭС, но ниже и шире,
  // с решёткой топки вместо кучи угля.
  rigFactory:'<rect x="3" y="9" width="14" height="9" rx="1"/><rect x="7.5" y="1.5" width="3" height="8" rx="0.5"/><path d="M7.5 1.5c0-1.2-.9-1.7-1.5-2.2M10.5 1.5c0 1.2.9.5 1.6-.2" stroke="currentColor" stroke-width="0.8" fill="none" opacity="0.45"/><rect x="7" y="12.3" width="6" height="4" rx="0.5" style="fill:var(--ink)" opacity="0.35"/><path d="M8 12.3v4M10 12.3v4M12 12.3v4" style="stroke:var(--card)" stroke-width="0.6"/>',
  // Швейный цех — катушка нитки с иглой: явно текстильное производство, не металл/еда.
  rigTextile:'<rect x="6" y="3.5" width="8" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 6.8h8M6 9.5h8M6 12.2h8" stroke="currentColor" stroke-width="0.9" opacity="0.5"/><path d="M14.5 14.5l3.3 3.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="18" cy="18" r="0.9" style="fill:var(--hi)"/>',
  // Малый аккумулятор — корпус-таблетка с плюсовым контактом и молнией на лицевой стороне.
  battery:'<rect x="4" y="5" width="12" height="14" rx="2.2" opacity="0.9"/><rect x="7.3" y="2.3" width="5.4" height="2.6" rx="1" opacity="0.9"/><path d="M11.3 7.2 7.2 12.8h2.9l-0.9 4.3 4.6-6.1h-2.9z" style="fill:var(--ink)"/>',
  // Электроэнергия — молния с лёгким бликом вдоль края.
  energy:'<path d="M11.3 1 2.8 12.3h5.1l-1 6.7 8.8-11h-5z" opacity="0.92"/><path d="M11.3 1 2.8 12.3h5.1l-0.9 5.8" style="stroke:var(--hi)" stroke-width="0.6" opacity="0.4" fill="none"/>',
  // Мелкие функциональные значки для действий на плитке установки (ремонт/снос) — без своего colorVar, красятся через CSS color кнопки.
  wrench:'<path d="M13.7 2.3a4.2 4.2 0 0 0-5.6 5l-6 6 2.6 2.6 6-6a4.2 4.2 0 0 0 5-5.6l-2.5 2.5-2-.4-.4-2z"/>',
  trash:'<path d="M4 6.2h12" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M7.6 6.2V4.8a1.2 1.2 0 0 1 1.2-1.2h2.4a1.2 1.2 0 0 1 1.2 1.2v1.4" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5.4 6.2 6.1 16a1 1 0 0 0 1 .9h5.8a1 1 0 0 0 1-.9l.7-9.8z"/><path d="M8.3 8.6v6M10 8.6v6M11.7 8.6v6" stroke="var(--card)" stroke-width="1" fill="none"/>',
  // Кнопка включения/выключения установки — классический значок power (дуга + вертикальная черта).
  power:'<path d="M10 2.2v6.4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M5.8 4.6a6.2 6.2 0 1 0 8.4 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  // Площадь участка — план-сетка (вид сверху), используется в карточках «Стройки».
  area:'<rect x="2.3" y="2.3" width="15.4" height="15.4" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.3 8.3h15.4M2.3 12.3h15.4M8.3 2.3v15.4M12.3 2.3v15.4" stroke="currentColor" stroke-width="1" opacity="0.5"/>',
};
function iconSvg(key,colorVar){
  const inner=ICONS[key] || '<circle cx="10" cy="10" r="7"/>';
  return '<svg viewBox="0 0 20 20" width="26" height="26" style="color:var(--'+colorVar+')" fill="currentColor">'+inner+'</svg>';
}
function miniIcon(key){
  return '<svg viewBox="0 0 20 20" fill="currentColor">'+(ICONS[key]||'')+'</svg>';
}


let activeTier=0;
let activeSection='hq';

const sectionsEl=document.getElementById('sections');
const tabsEl=document.getElementById('tabs');
const bgridEl=document.getElementById('bgrid');
const hqPanelEl=document.getElementById('hqPanel');
const buildingsPanelEl=document.getElementById('buildingsPanel');
const productionPanelEl=document.getElementById('productionPanel');
const warehousePanelEl=document.getElementById('warehousePanel');
const popPanelEl=document.getElementById('popPanel');
const skillsPanelEl=document.getElementById('skillsPanel');
const energyPanelEl=document.getElementById('energyPanel');
const planetPanelEl=document.getElementById('planetPanel');
const modalEl=document.getElementById('offlineModal');

function sectionInfo(id){
  const units=state.units.length;
  if(id==='hq') return {stat:'Обзор базы'};
  if(id==='buildings') return {stat:'Построено объектов: '+units, badge:units||null};
  if(id==='build') return {stat:'Площадь участка: '+usedArea()+' / '+BASE_AREA};
  if(id==='workers'){
    const assigned=Object.values(lastWorkforce).reduce((s,c)=>s+Math.floor(c.assigned),0);
    const cap=Object.values(lastWorkforce).reduce((s,c)=>s+Math.floor(c.cap),0);
    return {stat:'Персонал: '+assigned+' / '+cap+' чел.', badge:assigned||null};
  }
  if(id==='skills'){
    const sk=SKILLS.find(x=>x.id===state.training);
    return {stat:sk?('Изучается: '+sk.name+' · ур. '+skillLevelById(sk.id)):'Ничего не изучается'};
  }
  if(id==='production') return {stat:'Установок в цеху: '+units, badge:units||null};
  if(id==='energy'){
    const cap=energyCapacity(), cur=state.resources.energy||0;
    return {stat:fmtStoredEnergyKwh(cur)+' / '+fmtStoredEnergyKwh(cap), fill:Math.min(100,cur/cap*100)};
  }
  if(id==='warehouse'){
    const used=totalCargoWeight(), cap=warehouseCapacityKg();
    return {stat:Math.round(used).toLocaleString('ru-RU')+' / '+cap.toLocaleString('ru-RU')+' кг', fill:Math.min(100,used/cap*100)};
  }
  if(id==='planet') return {stat:'Игровое время: '+dayClockStr(state.playSeconds)};
  return {stat:''};
}
let lastSectionsKey='';
function renderSections(){
  const infos=SECTIONS.map(s=>sectionInfo(s.id));
  const prodActive=BUILDINGS.some(b=>util[b.id] && util[b.id].frac>0.001);
  const cur=SECTIONS.find(s=>s.id===activeSection);
  const curInfo=infos[SECTIONS.indexOf(cur)];
  // Хотбар вызывается каждый тик. Пересоздаём кнопки только при смене структуры
  // (активный раздел, счётчики, работа цеха) — иначе сбрасывалась бы анимация
  // шестерёнок и терялся клик между mousedown и mouseup. Остальное правим на месте.
  const key=activeSection+'|'+prodActive+'|'+infos.map(i=>i.badge==null?'':i.badge).join(',');
  if(key===lastSectionsKey){
    infos.forEach((info,i)=>{
      if(info.fill==null) return;
      const el=sectionsEl.querySelector('[data-section="'+SECTIONS[i].id+'"] .hb-fill i');
      if(el) el.style.width=info.fill.toFixed(1)+'%';
    });
    const statEl=sectionsEl.querySelector('.hb-stat');
    if(statEl && statEl.textContent!==curInfo.stat) statEl.textContent=curInfo.stat;
    return;
  }
  lastSectionsKey=key;
  let slots='';
  SECTIONS.forEach((s,i)=>{
    const info=infos[i];
    const spin = s.id==='production' && prodActive ? ' spinning' : '';
    slots+='<button type="button" class="hb-slot'+(s.id===activeSection?' active':'')+spin+'" style="--c:var(--'+s.color+')" data-section="'+s.id+'" title="'+s.label+' ('+(i+1)+')">'+
      '<span class="hb-key">'+(i+1)+'</span>'+
      '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">'+SECTION_ICONS[s.id]+'</svg>'+
      '<span class="hb-name">'+s.short+'</span>'+
      (info.badge!=null?'<span class="hb-dot">'+info.badge+'</span>':'')+
      (info.fill!=null?'<span class="hb-fill"><i style="width:'+info.fill.toFixed(1)+'%"></i></span>':'')+
    '</button>';
  });
  sectionsEl.innerHTML='<div class="hotbar">'+slots+'</div>'+
    '<div class="hb-caption" style="--c:var(--'+cur.color+')"><b>'+cur.label+'</b><span class="hb-stat">'+curInfo.stat+'</span>'+
    '<span class="hb-hint">клавиши <kbd>1</kbd>–<kbd>'+SECTIONS.length+'</kbd></span></div>';
}

const RES48={
  iron_ore:'<ellipse cx="24" cy="42.5" rx="17" ry="2.6" opacity=".22"/>'+
    '<polygon points="8,34 5,24 11,13 22,7 34,9 42,18 43,30 35,39 18,41" opacity=".92"/>'+
    '<polygon points="11,13 22,7 34,9 27,17 16,19" style="fill:var(--hi)" opacity=".28"/>'+
    '<polygon points="35,39 43,30 42,18 34,24 30,36" style="fill:var(--ink)" opacity=".28"/>'+
    '<polygon points="8,34 5,24 11,13 16,19 14,31" style="fill:var(--ink)" opacity=".14"/>'+
    '<g style="fill:var(--hi)" opacity=".85"><polygon points="18,24 22,21 25,25 21,28"/><polygon points="28,28 31,26 33,29 30,31"/><polygon points="24,33 26,32 27,34 25,35"/><circle cx="37" cy="15" r="1.3"/></g>'+
    '<path d="M11 13 22 7 34 9" style="stroke:var(--hi)" stroke-width="1.2" fill="none" opacity=".5"/>',
  copper_ore:'<ellipse cx="24" cy="42.5" rx="17" ry="2.6" opacity=".22"/>'+
    '<circle cx="24" cy="16" r="8.5" opacity=".78"/><circle cx="15" cy="28" r="10.5" opacity=".92"/><circle cx="32.5" cy="28.5" r="9.5"/>'+
    '<g style="fill:var(--hi)" opacity=".55"><ellipse cx="21" cy="12.5" rx="2.6" ry="1.5" transform="rotate(-30 21 12.5)"/><ellipse cx="11" cy="23.5" rx="3.2" ry="1.9" transform="rotate(-30 11 23.5)"/><ellipse cx="29" cy="24.5" rx="2.8" ry="1.7" transform="rotate(-30 29 24.5)"/></g>'+
    '<path d="M22 33c3 2.5 6 2.5 8 .5M20 20c2 1.5 4.5 1.5 6.5 0" style="stroke:var(--ink)" stroke-width="1.2" fill="none" opacity=".3"/>'+
    '<path d="M39 8.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" style="fill:var(--hi)" opacity=".85"/>',
  water:'<ellipse cx="24" cy="44" rx="12" ry="2.2" opacity=".22"/>'+
    '<path d="M24 3C24 3 9.5 19.5 9.5 29a14.5 14.5 0 0 0 29 0C38.5 19.5 24 3 24 3z" opacity=".9"/>'+
    '<path d="M10.8 32.5c4.2-2.6 8.8-2.6 13.2 0s9 2.6 13.2 0A14.5 14.5 0 0 1 10.8 32.5z" style="fill:var(--ink)" opacity=".18"/>'+
    '<path d="M11.5 29c4-2.4 8.4-2.4 12.5 0s8.5 2.4 12.5 0" style="stroke:var(--hi)" stroke-width="1.5" fill="none" opacity=".45"/>'+
    '<ellipse cx="17.5" cy="22" rx="2.3" ry="4.8" transform="rotate(-25 17.5 22)" style="fill:var(--hi)" opacity=".75"/><circle cx="16" cy="30" r="1.2" style="fill:var(--hi)" opacity=".6"/>',
  // Уголь: кучка из двух глыб — меньшая позади-слева, крупная спереди-справа — а не один
  // цельный обломок, как у iron_ore. Грани глянцевые (раковистый излом угля).
  coal:'<ellipse cx="24" cy="42.5" rx="17" ry="2.6" opacity=".22"/>'+
    '<polygon points="6,26 3,18 9,10 17,9 21,15 18,23 12,26" opacity=".8"/>'+
    '<polygon points="9,10 17,9 21,15 14,17" style="fill:var(--ink)" opacity=".12"/>'+
    '<polygon points="14,41 9,30 16,19 30,16 41,21 43,31 36,41 22,44" opacity=".93"/>'+
    '<polygon points="16,19 30,16 41,21 33,27 22,29" style="fill:var(--hi)" opacity=".42"/>'+
    '<polygon points="36,41 43,31 41,21 34,28 29,39" style="fill:var(--ink)" opacity=".34"/>'+
    '<polygon points="14,41 9,30 16,19 22,29 19,38" style="fill:var(--ink)" opacity=".16"/>'+
    '<g style="fill:var(--hi)" opacity=".92"><polygon points="20,29 25,25 29,30 24,33"/><polygon points="32,32 36,30 38,34 34,36"/><circle cx="39" cy="18" r="1.5"/><circle cx="8" cy="16" r="1"/></g>'+
    '<path d="M16 19 30 16 41 21" style="stroke:var(--hi)" stroke-width="1.3" fill="none" opacity=".65"/>',
  // Камень: округлый валун (кривые, не полигоны) плюс галька поменьше рядом — трещины
  // и щербинки вместо глянцевых граней. Силуэт нарочно «мягкий», не похож на руду/уголь.
  stone:'<ellipse cx="24" cy="42.5" rx="17" ry="2.6" opacity=".22"/>'+
    '<path d="M6,32 C2,25 3,15 11,9 C19,3 32,3 39,10 C46,17 45,28 38,35 C31,42 12,41 6,32 Z" opacity=".88"/>'+
    '<path d="M11,9 C19,3 32,3 39,10 C36,14 28,16 20,14 C15,13 12,11 11,9 Z" style="fill:var(--hi)" opacity=".16"/>'+
    '<path d="M38,35 C45,28 46,17 39,10 C38,17 35,24 29,29 C33,33 36,34 38,35 Z" style="fill:var(--ink)" opacity=".22"/>'+
    '<path d="M6,32 C2,25 3,15 11,9 C11,17 13,25 18,31 C13,33 9,33 6,32 Z" style="fill:var(--ink)" opacity=".14"/>'+
    '<path d="M30,38 C27,36 27,32 30,29 C33,26 38,27 40,30 C42,33 40,38 36,40 C34,41 32,40 30,38 Z" opacity=".7"/>'+
    '<path d="M14,17 C18,15 23,17 26,21 M12,24 C16,23 19,26 20,29" style="stroke:var(--ink)" stroke-width="1.1" fill="none" opacity=".3"/>'+
    '<g style="fill:var(--ink)" opacity=".22"><circle cx="17" cy="22" r="1.6"/><circle cx="27" cy="18" r="1.2"/><circle cx="22" cy="31" r="1.3"/><circle cx="33" cy="33" r="1"/><circle cx="14" cy="14" r="1"/></g>',
  // Нефть: широкая вязкая клякса-капля (шире и площе, чем у воды), с фиолетовым радужным
  // отливом на плёнке — та же «капельная» семья, что вода, но гуще и тёмнее, плюс пузырьки.
  oil:'<ellipse cx="24" cy="43" rx="15" ry="3" opacity=".28"/>'+
    '<path d="M24 4C24 4 8 21 8 30.5a16 15 0 0 0 32 0C40 21 24 4 24 4z" opacity=".95"/>'+
    '<path d="M9.5 33c4.6-2.8 9.6-2.8 14.5 0s9.9 2.8 14.5 0A16 15 0 0 1 9.5 33z" style="fill:var(--ink)" opacity=".28"/>'+
    '<path d="M10.5 29.5c4.2-2.5 8.9-2.5 13.2 0s9 2.5 13.2 0" style="stroke:rgba(178,150,255,.45)" stroke-width="1.6" fill="none"/>'+
    '<ellipse cx="17" cy="21" rx="2.6" ry="5.4" transform="rotate(-24 17 21)" style="fill:var(--hi)" opacity=".55"/>'+
    '<g style="fill:var(--hi)" opacity=".5"><circle cx="30" cy="28" r="1.6"/><circle cx="26" cy="36" r="1.1"/><circle cx="33" cy="20" r="1"/></g>',
  // Электроэнергия — молния с бликом по переднему ребру и искрами по бокам, без «капельной»
  // или «глыбовой» геометрии, чтобы сразу читаться отдельно от сырья.
  energy:'<ellipse cx="24" cy="43" rx="13" ry="2.4" opacity=".22"/>'+
    '<path d="M27 3 8 27h13l-3 18 23-27H28z" opacity=".95"/>'+
    '<path d="M27 3 8 27h13l-2 12" style="stroke:var(--hi)" stroke-width="1.6" fill="none" opacity=".55"/>'+
    '<path d="M21 27 28 27 24 39" style="fill:var(--ink)" opacity=".22"/>'+
    '<g style="fill:var(--hi)" opacity=".7"><circle cx="34" cy="12" r="1.3"/><circle cx="12" cy="33" r="1"/><circle cx="38" cy="30" r="1"/></g>',
  // Пшеница: колос из шести зёрен-эллипсов на центральном стебле плюс два теневых стебля
  // по бокам — сноп, а не единичная травинка.
  wheat:'<ellipse cx="24" cy="43" rx="15" ry="2.6" opacity=".22"/>'+
    '<path d="M24 40V10" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/>'+
    '<path d="M17 40V16" style="stroke:var(--ink)" stroke-width="2" opacity=".18" fill="none" stroke-linecap="round"/>'+
    '<path d="M31 40V16" style="stroke:var(--ink)" stroke-width="2" opacity=".18" fill="none" stroke-linecap="round"/>'+
    '<g opacity=".95"><ellipse cx="19.5" cy="15" rx="3" ry="4.6" transform="rotate(-28 19.5 15)"/><ellipse cx="28.5" cy="15" rx="3" ry="4.6" transform="rotate(28 28.5 15)"/>'+
    '<ellipse cx="18" cy="21.5" rx="3" ry="4.6" transform="rotate(-28 18 21.5)"/><ellipse cx="30" cy="21.5" rx="3" ry="4.6" transform="rotate(28 30 21.5)"/>'+
    '<ellipse cx="16.8" cy="28" rx="3" ry="4.6" transform="rotate(-28 16.8 28)"/><ellipse cx="31.2" cy="28" rx="3" ry="4.6" transform="rotate(28 31.2 28)"/></g>'+
    '<path d="M24 10 22.5 13 25.5 13Z" style="fill:var(--hi)" opacity=".6"/>',
  // Картофель: неровный клубень-блоб (кривые, не полигоны) с глазками-вмятинами — тот же
  // приём «мягкого» силуэта, что у камня, но своя форма и цвет.
  potato:'<ellipse cx="24" cy="42.5" rx="16" ry="2.6" opacity=".22"/>'+
    '<path d="M9 24C7 16 13 8 22 7.5C31 7 39 13 39 23C39 33 31 40 22 39.5C13 39 7 32 9 24Z" opacity=".92"/>'+
    '<path d="M22 7.5C31 7 39 13 39 23" style="stroke:var(--hi)" stroke-width="1.4" opacity=".22" fill="none"/>'+
    '<path d="M9 24C7 16 13 8 22 7.5" style="stroke:var(--ink)" stroke-width="1.4" opacity=".16" fill="none"/>'+
    '<g style="fill:var(--ink)" opacity=".3"><ellipse cx="18" cy="18" rx="1.6" ry="1.1"/><ellipse cx="28" cy="16" rx="1.4" ry="1"/><ellipse cx="24" cy="26" rx="1.6" ry="1.1"/><ellipse cx="30" cy="27" rx="1.3" ry="0.9"/><ellipse cx="16" cy="29" rx="1.3" ry="0.9"/></g>',
  // Кукуруза: узкий вытянутый початок (в отличие от круглого/овального у остального урожая)
  // с рядами зёрен-точек и отогнутым листом обёртки сбоку.
  corn:'<ellipse cx="24" cy="43" rx="12" ry="2.4" opacity=".22"/>'+
    '<path d="M24 41c-5.2 0-8.6-9-8.6-19S18.8 4 24 4s8.6 8 8.6 18-3.4 19-8.6 19Z" opacity=".93"/>'+
    '<path d="M15.4 21c-4.5-2-7.5 1-8.5 4.2 4 2 7.5 0.6 8.5-4.2Z" opacity=".8"/>'+
    '<path d="M15.4 21c-4.5-2-7.5 1-8.5 4.2" style="stroke:var(--ink)" stroke-width="1" opacity=".2" fill="none"/>'+
    '<g style="fill:var(--ink)" opacity=".32">'+
    '<circle cx="20" cy="11" r="1.3"/><circle cx="27.5" cy="11" r="1.3"/><circle cx="18" cy="16" r="1.3"/><circle cx="24" cy="16" r="1.3"/><circle cx="30" cy="16" r="1.3"/>'+
    '<circle cx="17.5" cy="21" r="1.3"/><circle cx="24" cy="21" r="1.3"/><circle cx="30.5" cy="21" r="1.3"/>'+
    '<circle cx="18" cy="26" r="1.3"/><circle cx="24" cy="26" r="1.3"/><circle cx="30" cy="26" r="1.3"/>'+
    '<circle cx="19" cy="31" r="1.3"/><circle cx="25" cy="31" r="1.3"/><circle cx="29.5" cy="31.5" r="1.1"/>'+
    '<circle cx="21" cy="36" r="1.1"/><circle cx="26" cy="36" r="1.1"/></g>',
  // Томат: круглый плод (единственный из четырёх — не вытянутый и не блоб) с чашелистиком
  // сверху и мягким бликом — читается как гладкий сочный овощ, а не клубень/початок.
  tomato:'<ellipse cx="24" cy="42.5" rx="13" ry="2.6" opacity=".22"/>'+
    '<circle cx="24" cy="27" r="15"/>'+
    '<path d="M24 12c-2.3 0-4-2.2-4-4.8M24 12c2.3 0 4-2.2 4-4.8M24 12v4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>'+
    '<path d="M20 5c1.4 1 2.6 1 4 0M28 5c-1.4 1-2.6 1-4 0" style="stroke:var(--ink)" stroke-width="1.2" opacity=".3" fill="none"/>'+
    '<ellipse cx="18" cy="21" rx="3.4" ry="2.4" style="fill:var(--hi)" opacity=".3"/>'+
    '<path d="M24 12c-6 4-9 10-9 15" style="stroke:var(--ink)" stroke-width="1" opacity=".14" fill="none"/>',
  // Паёк — та же жестяная банка, что в ICONS.ration, но в 48-пиксельном холсте склада.
  ration:'<ellipse cx="24" cy="43" rx="14" ry="2.4" opacity=".22"/><rect x="9" y="16" width="30" height="25" rx="3" opacity=".92"/>'+
    '<path d="M9 16c0-6.6 4.8-11 15-11s15 4.4 15 11" fill="none" stroke="currentColor" stroke-width="2.2" opacity=".7"/>'+
    '<path d="M9 24h30" style="stroke:var(--ink)" stroke-width="1.4" opacity=".24"/>'+
    '<circle cx="24" cy="31" r="4.2" style="fill:var(--ink)" opacity=".32"/>'+
    '<path d="M17 10.5h14" style="stroke:var(--hi)" stroke-width="1.2" opacity=".35"/>',
  // Пластины — прокатанный лист с бликом по верхнему краю. Железная — рёбра жёсткости
  // (прямые линии), медная — клёпки по углам (круги) — та же пара различий, что в ICONS.
  iron_plate:'<ellipse cx="24" cy="42.5" rx="16" ry="2.6" opacity=".22"/>'+
    '<rect x="8" y="16" width="32" height="18" rx="2.5" opacity=".92"/>'+
    '<rect x="8" y="16" width="32" height="5" rx="2.5" style="fill:var(--hi)" opacity=".32"/>'+
    '<rect x="12" y="23" width="24" height="2.2" style="fill:var(--ink)" opacity=".18"/>'+
    '<rect x="12" y="28" width="24" height="2.2" style="fill:var(--ink)" opacity=".18"/>'+
    '<circle cx="13" cy="19.5" r="1.3" style="fill:var(--ink)" opacity=".25"/><circle cx="35" cy="19.5" r="1.3" style="fill:var(--ink)" opacity=".25"/>',
  copper_plate:'<ellipse cx="24" cy="42.5" rx="16" ry="2.6" opacity=".22"/>'+
    '<rect x="8" y="15" width="32" height="19" rx="3" opacity=".92"/>'+
    '<rect x="8" y="15" width="32" height="5.5" rx="3" style="fill:var(--hi)" opacity=".36"/>'+
    '<g style="fill:var(--ink)" opacity=".24"><circle cx="13" cy="24.5" r="1.6"/><circle cx="35" cy="24.5" r="1.6"/><circle cx="24" cy="18.7" r="1.4"/><circle cx="24" cy="30.3" r="1.4"/></g>',
  // Хлопок — та же пушистая коробочка, что в ICONS, увеличенная до 48-пиксельного холста.
  cotton:'<ellipse cx="24" cy="42.5" rx="14" ry="2.4" opacity=".22"/>'+
    '<path d="M24 40V27" stroke="currentColor" stroke-width="2" fill="none" opacity=".6"/>'+
    '<circle cx="16" cy="19" r="8" opacity=".92"/><circle cx="32" cy="19" r="8" opacity=".92"/><circle cx="24" cy="12" r="8" opacity=".92"/><circle cx="24" cy="22" r="7" opacity=".85"/>'+
    '<g style="fill:var(--hi)" opacity=".4"><circle cx="13" cy="16" r="2"/><circle cx="21" cy="9" r="2"/><circle cx="29" cy="16" r="2"/></g>',
  // Одежда — та же футболка, что в ICONS, со швом-подсказкой по вороту.
  clothing:'<ellipse cx="24" cy="43" rx="13" ry="2.4" opacity=".22"/>'+
    '<path d="M17 6 10 12l4 5 3-2V40h14V15l3 2 4-5-7-6c-1.2 2-3 3-7 3s-5.8-1-7-3Z" opacity=".92"/>'+
    '<path d="M17 6c1.2 2 3 3 7 3s5.8-1 7-3" style="stroke:var(--hi)" stroke-width="1.4" fill="none" opacity=".4"/>'+
    '<path d="M20 15v9M28 15v9" style="stroke:var(--ink)" stroke-width="1" opacity=".18" fill="none"/>',
};
// Крупные силуэты установок. Колесо/шкив (.rig-wheel) крутится, пока установка работает;
// руда в вагонетке и вода в баке красятся в цвет того, что сейчас добывается (--oc).
const TYPE48={
  miner:'<rect x="2" y="41" width="44" height="2.5" rx="1.25" opacity=".3"/>'+
    '<path d="M12 30 17 10M26 30 21 10" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>'+
    '<path d="M14.2 22.5h9.6M15.8 16h6.4" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".7"/>'+
    '<path d="M19 12.4V30" stroke="currentColor" stroke-width="1" opacity=".7"/>'+
    '<g class="rig-wheel"><circle cx="19" cy="8" r="4.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 3.6v8.8M14.6 8h8.8" stroke="currentColor" stroke-width="1" opacity=".65"/><circle cx="19" cy="8" r="1.3" style="fill:var(--hi)"/></g>'+
    '<rect x="4" y="30" width="30" height="11" rx="1.5" opacity=".62"/>'+
    '<g style="fill:var(--hi)" opacity=".7"><rect x="7" y="33" width="3.2" height="2.6" rx=".4"/><rect x="12" y="33" width="3.2" height="2.6" rx=".4"/><rect x="27" y="33" width="3.2" height="2.6" rx=".4"/></g>'+
    '<rect x="17.5" y="34" width="4" height="7" rx=".8" style="fill:var(--ink)" opacity=".5"/>'+
    '<path d="M34 41.8h12" stroke="currentColor" stroke-width="1" opacity=".5"/>'+
    '<g style="fill:var(--oc,var(--hi))"><circle cx="37.6" cy="32.4" r="1.7"/><circle cx="40.6" cy="31.6" r="1.9"/><circle cx="43.2" cy="32.6" r="1.5"/></g>'+
    '<path d="M35 33.2h10.4l-1.6 5.8h-7.2z"/>'+
    '<circle cx="37.8" cy="40.2" r="1.4" style="fill:var(--ink)"/><circle cx="42.6" cy="40.2" r="1.4" style="fill:var(--ink)"/>',
  drill:'<rect x="2" y="41" width="44" height="2.5" rx="1.25" opacity=".3"/>'+
    '<path d="M11 37 18 8M29 37 22 8" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>'+
    '<path d="M13 30h14M15 22h10M17 14.5h6M13 30l12-8M27 30l-12-8M15 22l8-7.5M25 22l-8-7.5" stroke="currentColor" stroke-width="1.1" fill="none" opacity=".55"/>'+
    '<path d="M20 7.5V36" stroke="currentColor" stroke-width="1" opacity=".7"/>'+
    '<g class="rig-wheel"><circle cx="20" cy="5" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M20 2v6M17 5h6" stroke="currentColor" stroke-width=".9" opacity=".65"/></g>'+
    '<rect x="6" y="36" width="28" height="5" rx="1" opacity=".65"/>'+
    '<path d="M34 38.5h3" stroke="currentColor" stroke-width="2"/>'+
    '<rect x="36.5" y="24" width="9.5" height="17" rx="2" opacity=".45"/>'+
    '<rect x="38" y="31" width="6.5" height="8.5" rx="1" style="fill:var(--oc,var(--hi))"/>'+
    '<path d="M38.8 27v10" style="stroke:var(--hi)" stroke-width=".9" opacity=".45"/>',
  // Солнечная панель — наклонный щит на мачте, повёрнутый к солнцу в углу; вместо колеса
  // «рабочим» индикатором служит .sun-glow (пульсация), см. css/pages/8-energy.css.
  solar:'<rect x="2" y="41" width="44" height="2.5" rx="1.25" opacity=".3"/>'+
    '<path d="M23 41V22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>'+
    '<path d="M23 28 32 22" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".6"/>'+
    '<polygon points="6,25 32,15 45,21 18,31" opacity=".92"/>'+
    '<path d="M9.8,24.2 36.5,18.6" style="stroke:var(--ink)" stroke-width="1" opacity=".3" fill="none"/>'+
    '<path d="M13.5,27 27,20.5" style="stroke:var(--ink)" stroke-width="1" opacity=".25" fill="none"/>'+
    '<path d="M7.5,24.3 31.5,15.3" style="stroke:var(--hi)" stroke-width="1.3" opacity=".55" fill="none"/>'+
    '<g class="sun-glow"><circle cx="10" cy="8" r="4" style="fill:var(--hi)" opacity=".85"/><path d="M10 1.5v2.4M10 12v2.4M3.5 8h2.4M14.1 8h2.4M5.4 3.4l1.7 1.7M13 12l1.7 1.7M5.4 12.6l1.7-1.7M13 4l1.7-1.7" stroke="var(--hi)" stroke-width="1" opacity=".6"/></g>',
  // Ферма — арка теплицы (контур, не сплошная заливка — читается как остеклённая
  // конструкция), внутри ящик с текущей культурой, окрашенный в --oc, как вагонетка у
  // горнодобывающей установки, плюс росток над ним вместо колеса как «рабочий» акцент.
  farm:'<rect x="2" y="41" width="44" height="2.5" rx="1.25" opacity=".3"/>'+
    '<path d="M4 41V21c0-9 8.5-16 20-16s20 7 20 16v20Z" fill="none" stroke="currentColor" stroke-width="2.4"/>'+
    '<path d="M4 21c0-9 8.5-16 20-16s20 7 20 16" style="stroke:var(--ink)" stroke-width="1.4" opacity=".22" fill="none"/>'+
    '<path d="M12 41V16.4M20 41V8.6M28 41V8.6M36 41V16.4" stroke="currentColor" stroke-width="1.3" opacity=".45" fill="none"/>'+
    '<rect x="15" y="30" width="18" height="11" rx="1.5" style="fill:var(--oc,var(--hi))" opacity=".85"/>'+
    '<path d="M24 30V22" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>'+
    '<path d="M24 26c-3-2.4-5.4 0-5.7 3M24 23.5c2.6-2.2 4.8 0 5 2.7" stroke="currentColor" stroke-width="1.4" fill="none" opacity=".85"/>'+
    '<g style="fill:var(--ink)" opacity=".25"><rect x="18" y="33" width="3" height="2" rx=".4"/><rect x="23" y="33" width="3" height="2" rx=".4"/><rect x="28" y="33" width="3" height="2" rx=".4"/></g>',
  // Пищеблок — котёл на плите с дугой пара (те же пропорции, что TYPE48.farm/miner: плита-арка
  // + окрашенная в --oc «начинка», как вагонетка/грядка у других установок).
  kitchen:'<rect x="2" y="41" width="44" height="2.5" rx="1.25" opacity=".3"/>'+
    '<rect x="10" y="18" width="28" height="23" rx="2" opacity=".85"/>'+
    '<path d="M10 18c0-8 6.3-14 14-14s14 6 14 14" fill="none" stroke="currentColor" stroke-width="2.4"/>'+
    '<path d="M10 18c0-8 6.3-14 14-14" style="stroke:var(--ink)" stroke-width="1.4" opacity=".22" fill="none"/>'+
    '<rect x="16" y="26" width="16" height="11" rx="1.5" style="fill:var(--oc,var(--hi))" opacity=".85"/>'+
    '<path d="M18 22c-1-2 0-3.4 1.4-4.6M24 22c-1-2.4 0-4 1.6-5.4M30 22c-1-2 0-3.4 1.4-4.6" stroke="currentColor" stroke-width="1.3" fill="none" opacity=".7"/>',
  // Угольная ТЭС — дымовая труба над кучей угля (--oc), без колеса-индикатора (в отличие от
  // miner/drill — можно добавить анимацию дыма позже по тому же принципу, что .rig-wheel).
  tpp:'<rect x="2" y="41" width="44" height="2.5" rx="1.25" opacity=".3"/>'+
    '<rect x="30" y="6" width="8" height="26" rx="1" opacity=".85"/>'+
    '<path d="M31 6c1.5-2.6.5-4.6-1-6.4M37 6c-1.5-2.4-.4-4.2 1-5.8" stroke="currentColor" stroke-width="1.2" fill="none" opacity=".45"/>'+
    '<path d="M6 24 14 15h16l6 9Z" opacity=".55"/>'+
    '<rect x="6" y="24" width="22" height="17" rx="2" opacity=".7"/>'+
    '<g style="fill:var(--oc,var(--hi))" opacity=".9"><circle cx="12" cy="34" r="2.2"/><circle cx="18" cy="35.6" r="2.6"/><circle cx="24" cy="34.4" r="2"/></g>',
  // Металлургический завод — печь с дымовой трубой (те же пропорции-«арка+начинка», что у
  // kitchen, но труба вместо купола), заслонка топки окрашена в --oc текущего рецепта.
  factory:'<rect x="2" y="41" width="44" height="2.5" rx="1.25" opacity=".3"/>'+
    '<rect x="10" y="18" width="28" height="23" rx="2" opacity=".85"/>'+
    '<rect x="20" y="3" width="8" height="16" rx="1" opacity=".8"/>'+
    '<path d="M20 3c1.6-2.6.5-4.6-1-6.2M28 3c-1.6-2.4-.4-4.2 1-5.8" stroke="currentColor" stroke-width="1.1" fill="none" opacity=".4"/>'+
    '<rect x="16" y="27" width="16" height="11" rx="1.5" style="fill:var(--oc,var(--hi))" opacity=".85"/>'+
    '<path d="M18 22c-1-2 0-3.4 1.4-4.6M24 22c-1-2.4 0-4 1.6-5.4M30 22c-1-2 0-3.4 1.4-4.6" stroke="currentColor" stroke-width="1.2" fill="none" opacity=".55"/>',
  // Швейный цех — катушка с нитью (ряды --oc-окрашенной нити вместо «начинки») и игла на боку.
  textile:'<rect x="2" y="41" width="44" height="2.5" rx="1.25" opacity=".3"/>'+
    '<rect x="14" y="8" width="20" height="30" rx="8" fill="none" stroke="currentColor" stroke-width="2.4"/>'+
    '<g style="fill:var(--oc,var(--hi))" opacity=".85"><rect x="16" y="14" width="16" height="4" rx="1.5"/><rect x="16" y="21" width="16" height="4" rx="1.5"/><rect x="16" y="28" width="16" height="4" rx="1.5"/></g>'+
    '<path d="M34 34l8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="43" cy="43" r="1.6" style="fill:var(--hi)" opacity=".7"/>',
};
const UI20={
  worker:'<path d="M4.5 9a5.5 5.5 0 0 1 11 0z"/><rect x="3" y="8.3" width="14" height="2" rx="1"/><circle cx="10" cy="12" r="2.6" opacity=".85"/><path d="M4 19.5c0-3.6 2.6-5.3 6-5.3s6 1.7 6 5.3z" opacity=".7"/>',
  gem:'<path d="M5 3h10l3.5 5L10 18 1.5 8z" opacity=".9"/><path d="M1.5 8h17M7 3 5.8 8 10 18M13 3l1.2 5L10 18" style="stroke:var(--ink)" stroke-width=".9" fill="none" opacity=".4"/>',
};
function svg48(inner,colorVar,cls,extraStyle){ return '<svg class="'+(cls||'')+'" viewBox="0 0 48 48" fill="currentColor" style="color:var(--'+colorVar+')'+(extraStyle||'')+'" aria-hidden="true">'+inner+'</svg>'; }
function resIcon48(id){ const r=resById(id); return svg48(RES48[id]||'<circle cx="24" cy="24" r="16"/>',colorVarOf(r)); }
function ui20(k,colorVar){ return '<svg viewBox="0 0 20 20" fill="currentColor" style="color:var(--'+colorVar+')" aria-hidden="true">'+UI20[k]+'</svg>'; }
// Резервуар для жидкости — классическая вертикальная цистерна (вариант №1 из предложенных),
// заливка уровня — реальный процент от liquidCapacity(id), а не декоративный узор.
function tankSvg(resId){
  const cv=colorVarOf(resById(resId));
  const cap=liquidCapacity(resId), amt=state.resources[resId]||0;
  const pct=cap>0?Math.max(0,Math.min(100,(amt/cap)*100)):0;
  const bx=14, by=10, bw=36, bh=44;
  const fillH=bh*(pct/100), fillY=by+bh-fillH;
  const cid='lt-'+resId;
  return '<svg viewBox="0 0 48 64" fill="currentColor" aria-hidden="true">'+
    '<clipPath id="'+cid+'"><rect x="'+bx+'" y="'+fillY.toFixed(2)+'" width="'+bw+'" height="'+fillH.toFixed(2)+'"/></clipPath>'+
    '<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="3" style="fill:var(--border-strong)" opacity=".22"/>'+
    '<rect x="'+bx+'" y="'+fillY.toFixed(2)+'" width="'+bw+'" height="'+fillH.toFixed(2)+'" clip-path="url(#'+cid+')" style="fill:var(--'+cv+')" opacity=".88"/>'+
    '<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="3" fill="none" style="stroke:var(--border-strong)" stroke-width="1.6"/>'+
    '<rect x="'+bx+'" y="'+(by+10)+'" width="'+bw+'" height="1.6" style="fill:var(--border-strong)" opacity=".8"/>'+
    '<rect x="'+bx+'" y="'+(by+28)+'" width="'+bw+'" height="1.6" style="fill:var(--border-strong)" opacity=".8"/>'+
    '<circle cx="24" cy="'+(by+4)+'" r="2" style="fill:var(--'+cv+')" opacity=".9"/>'+
    '<rect x="19" y="'+(by+bh)+'" width="4" height="6" style="fill:var(--border-strong)"/><rect x="25" y="'+(by+bh)+'" width="4" height="6" style="fill:var(--border-strong)"/>'+
  '</svg>';
}
function renderStats(){
  document.getElementById('statTime').textContent=fmtElapsed(Date.now()-state.startTs);
  document.getElementById('statBuilt').textContent=Object.values(state.buildings).reduce((s,n)=>s+n,0);
  document.getElementById('statWorkers').textContent=Object.values(lastWorkforce).reduce((s,c)=>s+Math.floor(c.assigned),0);
  document.getElementById('statSaved').textContent=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
}

function renderView(){
  hqPanelEl.hidden = activeSection!=='hq';
  buildingsPanelEl.hidden = activeSection!=='buildings';
  bgridEl.hidden = activeSection!=='build';
  tabsEl.style.display = (activeSection==='build' && TAB_LABELS.length>1) ? '' : 'none';
  productionPanelEl.hidden = activeSection!=='production';
  popPanelEl.hidden = activeSection!=='workers';
  skillsPanelEl.hidden = activeSection!=='skills';
  energyPanelEl.hidden = activeSection!=='energy';
  warehousePanelEl.hidden = activeSection!=='warehouse';
  planetPanelEl.hidden = activeSection!=='planet';
  if(activeSection==='hq') renderHQ();
  else if(activeSection==='buildings') renderBuildingsStatus();
  else if(activeSection==='build') renderBuildings();
  else if(activeSection==='production') renderProduction();
  else if(activeSection==='workers'){ if(!hrSliderDragging) renderPopulation(); }
  else if(activeSection==='skills') renderSkills();
  else if(activeSection==='energy') renderEnergy();
  else if(activeSection==='warehouse'){ if(!warehouseDragging) renderWarehouse(); }
  else if(activeSection==='planet') renderPlanet();
}

function renderAll(){
  renderSections();
  if(activeSection==='build') renderTabs();
  renderView();
  renderStats();
}

function openSection(id){
  activeSection=id;
  renderSections();
  if(activeSection==='production') renderTabs();
  renderView();
}
sectionsEl.addEventListener('click', e=>{
  const btn=e.target.closest('[data-section]');
  if(!btn) return;
  openSection(btn.dataset.section);
});
document.addEventListener('keydown', e=>{
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  const tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select'||e.target.isContentEditable) return;
  const n=parseInt(e.key,10);
  if(n>=1 && n<=SECTIONS.length) openSection(SECTIONS[n-1].id);
});
const lastCyclePhase={};
function tickCycleBars(){
  const now=Date.now()/1000;
  document.querySelectorAll('[data-cycle-unit]').forEach(el=>{
    const uid=Number(el.dataset.cycleUnit);
    const st=unitCycleState(uid,now);
    el.style.setProperty('--p', st.p.toFixed(4));
    if(!el.classList.contains('cv-row')) return;
    // Прошлая фаза хранится по номеру установки, а не на элементе — строка может
    // перерисоваться прямо в момент конца цикла, и «+N» тогда потерялся бы.
    const prev=lastCyclePhase[uid];
    lastCyclePhase[uid]=st.p;
    // Цикл замкнулся — партия руды ушла на склад: всплывает «+N», значок на выходе подпрыгивает.
    if(!st.idle && prev!=null && prev-st.p>0.5){
      const out=el.querySelector('[data-cycle-out]');
      const b=out && out.querySelector('b');
      if(b){
        const g=document.createElement('span'); g.className='cv-gain'; g.textContent=b.textContent; el.appendChild(g);
        setTimeout(()=>g.remove(),1000);
        out.classList.remove('pop'); void out.offsetWidth; out.classList.add('pop');
      }
    }
  });
  document.querySelectorAll('[data-cycle-time]').forEach(el=>{
    const st=unitCycleState(Number(el.dataset.cycleTime),now);
    const t=st.idle?'—:—':fmtLeft(st.left);
    if(el.textContent!==t) el.textContent=t;
  });
}
