// Ядро игры: данные (ресурсы, здания, навыки, жильё), сохранение, симуляция,
// действия игрока (стройка, ремонт, снос, смена руды) и общие форматтеры.
// Ничего не рисует — только состояние и правила.

// Единый грузовой склад колонии — вес в кг, не отдельный лимит на ресурс (WAREHOUSE_BASE_KG ниже).
// Этап 1: только T0. Остальные тиры удалены до тех пор, пока эта цепочка не будет
// полностью проработана — см. README (v17) для деталей и что было убрано.
const RESOURCES=[
  {id:'iron_ore',name:'Железная руда',formula:'Fe₂O₃',tier:0,weight:2,shapeIdx:0,family:'iron',colorVar:'iron'},
  {id:'copper_ore',name:'Медная руда',formula:'Cu₂S',tier:0,weight:2.2,shapeIdx:1,family:'copper',colorVar:'copper'},
  {id:'water',name:'Вода',formula:'H₂O',tier:0,weight:1,shapeIdx:2,colorVar:'water',liquid:true},
  {id:'coal',name:'Уголь',formula:'C',tier:0,weight:1.6,shapeIdx:3,family:'coal',colorVar:'coal'},
  {id:'stone',name:'Камень',formula:'CaCO₃',tier:0,weight:2.4,shapeIdx:4,family:'stone',colorVar:'stone'},
  {id:'oil',name:'Нефть',formula:'CxHy',tier:0,weight:0.9,shapeIdx:5,family:'oil',colorVar:'oil',liquid:true},
  // Урожай с фермы (см. BUILDING_TYPES 'farm' ниже) — сырьё для будущей кухни, которая
  // будет готовить из них еду для рабочих (пока не реализовано, это следующий шаг).
  {id:'wheat',name:'Пшеница',formula:'Triticum',tier:0,weight:0.7,shapeIdx:6,colorVar:'wheat'},
  {id:'potato',name:'Картофель',formula:'Solanum tub.',tier:0,weight:1.1,shapeIdx:7,colorVar:'potato'},
  {id:'corn',name:'Кукуруза',formula:'Zea mays',tier:0,weight:0.9,shapeIdx:8,colorVar:'corn'},
  {id:'tomato',name:'Томаты',formula:'Solanum lyc.',tier:0,weight:0.6,shapeIdx:9,colorVar:'tomato'},
  // Паёк — готовое блюдо из пищеблока (см. BUILDING_TYPES 'kitchen'), заменяет собой
  // прямую раздачу сырого урожая рабочим (см. CLASSES/PER_WORKER_RATE/HR_RATION_COST ниже).
  {id:'ration',name:'Паёк',formula:'Паёк',tier:0,weight:1.2,shapeIdx:10,colorVar:'ration'},
];

const POP_GOODS=[];

// Единый грузовой склад колонии. Цены построек выросли примерно в 20 раз при интеграции
// новой экономики (см. designs/economy/economy-prototype.html) — 10 т при старом лимите не
// вмещали бы даже стартовый комплект материалов. 40 т — временная прикидка, чтобы база не
// блокировалась с первой секунды; полноценная система склада/логистики/биржи — отдельный
// следующий шаг (см. открытый вопрос №3 в прототипе).
const WAREHOUSE_BASE_KG=40000;
function totalCargoWeight(){
  let sum=0;
  // Жидкости (вода, нефть и т.д., см. RESOURCES[...].liquid) в общий весовой склад не входят —
  // у них свой резервуарный лимит, см. liquidCapacity() ниже.
  RESOURCES.forEach(r=>{ if(r.liquid) return; sum+=(state.resources[r.id]||0)*(r.weight||0); });
  POP_GOODS.forEach(r=>{ sum+=(state.resources[r.id]||0)*(r.weight||0); });
  return sum;
}
function warehouseCapacityKg(){ return WAREHOUSE_BASE_KG; }
function warehouseFreeKg(){ return Math.max(0, warehouseCapacityKg()-totalCargoWeight()); }

// Резервуары для жидкостей — отдельный от общего грузового склада лимит: свой объём на
// каждый вид жидкости (не общий на всех, чтобы воду и нефть не «смешивать» в одном баке).
// Резервуар каждой жидкости улучшается по трём уровням (малый → средний → большой) прямо со
// склада или из «Стройки»; уровень хранится в state.tankLevels[resId], по умолчанию 1. Ёмкость
// малого равна прежнему общему лимиту (1500), поэтому старые сохранения ничего не теряют.
// cost — цена перехода НА этот уровень (у первого её нет — он стоит с начала игры).
const LIQUID_TANK_LEVELS=[
  {lvl:1,name:'Малый резервуар',short:'Малый',capacity:1500,cost:null},
  {lvl:2,name:'Средний резервуар',short:'Средний',capacity:4000,cost:{iron_ore:250,copper_ore:120}},
  {lvl:3,name:'Большой резервуар',short:'Большой',capacity:10000,cost:{iron_ore:600,copper_ore:300,stone:200}},
];
const LIQUID_BASE_CAPACITY=LIQUID_TANK_LEVELS[0].capacity;
function liquidTankLevel(resId){
  const l=(state.tankLevels && state.tankLevels[resId])||1;
  return Math.max(1, Math.min(LIQUID_TANK_LEVELS.length, l));
}
function liquidTankInfo(resId){ return LIQUID_TANK_LEVELS[liquidTankLevel(resId)-1]; }
function liquidTankNext(resId){ return LIQUID_TANK_LEVELS[liquidTankLevel(resId)] || null; }
function liquidCapacity(resId){ return liquidTankInfo(resId).capacity; }
function tryUpgradeLiquidTank(resId){
  const next=liquidTankNext(resId);
  if(!next) return;
  if(!Object.entries(next.cost).every(([rid,q])=>(state.resources[rid]||0)>=q)) return;
  Object.entries(next.cost).forEach(([rid,q])=>{ state.resources[rid]-=q; });
  if(!state.tankLevels) state.tankLevels={};
  state.tankLevels[resId]=next.lvl;
  saveState();
  renderAll();
}
function liquidResourceIds(){ return RESOURCES.filter(r=>r.liquid).map(r=>r.id); }

// Тип здания = универсальная установка (цена, рост цены, площадь). Рецепт = что она выпускает.
// Рецепт открывается уровнем навыка recipe.skill (по умолчанию навык своего тира) >= recipe.unlock.
// У рецептов T2+ пока нет type: каждый из них — сам себе тип со своей ценой (старая схема).
const BUILDING_TYPES=[
  {id:'miner',name:'Горнодобывающая установка',cost:{iron_ore:1150,stone:1200,copper_ore:420},area:25,icon:'rigMiner',neutralColor:'miner',category:'mining'},
  {id:'drill',name:'Буровая установка',cost:{iron_ore:650,stone:560,copper_ore:240},area:12,icon:'rigDrill',neutralColor:'water',category:'mining'},
  {id:'solar',name:'Малая солнечная панель',cost:{iron_ore:240,copper_ore:340},area:15,icon:'rigSolar',neutralColor:'energy',category:'energy'},
  {id:'farm',name:'Ферма',cost:{iron_ore:420,stone:1500,water:650,copper_ore:120},area:20,icon:'rigFarm',neutralColor:'farm',category:'farming'},
  // Пищеблок — готовит паёк из урожая фермы (см. BUILDINGS 'ration_a'/'ration_b' ниже).
  {id:'kitchen',name:'Пищеблок',cost:{iron_ore:500,stone:560,copper_ore:210},area:14,icon:'rigKitchen',neutralColor:'ration',category:'food'},
  // Угольная ТЭС — сжигает уголь, даёт стабильную электроэнергию круглосуточно (в отличие
  // от солнца, которое ночью не работает вовсе, см. sunFactor).
  {id:'tpp',name:'Угольная ТЭС',cost:{iron_ore:1550,stone:1700,copper_ore:720},area:30,icon:'rigTPP',neutralColor:'energy',category:'energy'},
];
// Категории вкладки «Стройка» — карточки группируются по ним с заголовком-разделителем.
const BUILD_CATEGORIES=[
  {id:'mining',label:'Добыча'},
  {id:'energy',label:'Энергия'},
  {id:'farming',label:'Ферма'},
  {id:'food',label:'Питание'},
  {id:'storage',label:'Хранение жидкостей'},
];
// Площадь участка базы: каждая построенная установка занимает area своего типа,
// суммарно не больше BASE_AREA. Отдельный лимит от весового склада — можно упереться
// в площадь, даже если по весу и ресурсам всё ещё есть запас.
const BASE_AREA=500;
// Площадь занимают не только производственные установки (state.units), но и жильё/аккумуляторы/
// отдел кадров — они строятся не через unit-объекты, а простым счётчиком state.buildings[id].
// Учебный центр (ACADEMY) площади не занимает — это единственная постройка, завязанная на
// систему навыков/СП, которую по условию не трогаем.
function usedArea(){
  let a=state.units.reduce((s,u)=>{ const b=BUILDINGS.find(x=>x.id===u.recipe); return s+(b?(typeOf(b).area||0):0); },0);
  HOUSING.forEach(h=>{ a+=(state.buildings[h.id]||0)*(h.area||0); });
  BATTERIES.forEach(bt=>{ a+=(state.buildings[bt.id]||0)*(bt.area||0); });
  WORKFORCE_BUILDINGS.forEach(w=>{ a+=(state.buildings[w.id]||0)*(w.area||0); });
  return a;
}
function freeArea(){ return Math.max(0, BASE_AREA-usedArea()); }

// Износ: прочность 0-100, падает со временем независимо от того, работает ли установка.
// Ссылочная точка: -30 п.п. за 45 суток непрерывной работы. Ниже пола установка не изнашивается
// дальше сама (иначе она бы совсем переставала работать) — чинится ремонтом за стройматериалы.
const DURABILITY_MAX=100;
const DURABILITY_FLOOR=20;
const DURABILITY_LIFE_DAYS=45;
const DURABILITY_LOSS_AT_LIFE=30;
const DURABILITY_DECAY_PER_SEC=DURABILITY_LOSS_AT_LIFE/(DURABILITY_LIFE_DAYS*86400);
const REPAIR_FACTOR=1; // ремонт 1% прочности = 1% ресурсов, потраченных на установку (полный ремонт = полная цена)
const DEMOLISH_REFUND=0.25; // снос возвращает 25% ресурсов, потраченных на последнюю построенную установку

// Циклы и выпуск за цикл — не одинаковые «3 мин на всё»: плотная и бедная руда (медь) добывается
// дольше и меньшими порциями, чем мягкий камень; культуры фермы отличаются сроком созревания.
// Суточный итог и структура затрат — см. designs/economy/economy-prototype.html (прототип
// экономики, откалиброван по образцу Prosperous Universe).
const BUILDINGS=[
  {id:'iron_ore',type:'miner',unlock:0,tier:0,cycle:1440,in:{},out:{iron_ore:2},workers:14,power:17},
  {id:'copper_ore',type:'miner',unlock:0,tier:0,cycle:1014,in:{},out:{copper_ore:1},workers:14,power:14},
  {id:'coal',type:'miner',unlock:0,tier:0,cycle:1211,in:{},out:{coal:2},workers:14,power:12},
  {id:'stone',type:'miner',unlock:0,tier:0,cycle:940,in:{},out:{stone:3},workers:14,power:8},
  {id:'water',type:'drill',unlock:0,tier:0,cycle:900,in:{},out:{water:2},workers:6,power:5},
  {id:'oil',type:'drill',unlock:0,tier:0,cycle:2360,in:{},out:{oil:1},workers:6,power:29},
  // Солнечная панель — такой же «рецепт», но вместо сырья выпускает электроэнергию, и вместо
  // богатства месторождения (richOf) её richMult — это текущая освещённость солнцем (sunFactor).
  {id:'solar',type:'solar',unlock:0,tier:0,cycle:60,in:{},out:{energy:2.5},workers:0},
  // Ферма — такой же T0-рецепт, что добыча, но со своим навыком (агрономия, не горное дело)
  // и с водой на входе (полив) — иначе то же самое richOf/workforce-плечо, что у руды.
  {id:'wheat',type:'farm',unlock:0,tier:0,cycle:15000,in:{water:15},out:{wheat:29},workers:9,power:50,skill:'agro'},
  {id:'potato',type:'farm',unlock:0,tier:0,cycle:20700,in:{water:23},out:{potato:59},workers:9,power:69,skill:'agro'},
  {id:'corn',type:'farm',unlock:0,tier:0,cycle:17550,in:{water:26},out:{corn:43},workers:9,power:59,skill:'agro'},
  {id:'tomato',type:'farm',unlock:0,tier:0,cycle:10976,in:{water:20},out:{tomato:20},workers:9,power:37,skill:'agro'},
  // Пищеблок — готовит паёк из урожая (см. CLASSES/PER_WORKER_RATE/HR_RATION_COST ниже, где
  // паёк заменил прямую раздачу сырого урожая рабочим). Два рецепта на выбор: зерновой быстрее
  // готовится, картофельный — дольше и дешевле сырьём. У обоих одна выходная позиция ('ration'),
  // поэтому свой label — иначе оба выглядели бы как одна и та же карточка.
  {id:'ration_a',label:'Паёк «Хлеб и каша»',type:'kitchen',unlock:0,tier:0,cycle:2293,in:{wheat:2,corn:1,water:1},out:{ration:4},workers:6,power:17,skill:'agro'},
  {id:'ration_b',label:'Паёк «Картофельный»',type:'kitchen',unlock:0,tier:0,cycle:3133,in:{potato:4,tomato:1,water:1},out:{ration:5},workers:6,power:23,skill:'agro'},
  // Угольная ТЭС — генератор, как солнечная панель (энергия не идёт через warehouse-лимит,
  // см. runProdBuilding), но топливо вместо солнца: жжёт уголь и даёт энергию и днём, и ночью.
  {id:'coal_power',label:'Сжигание угля',type:'tpp',unlock:0,tier:0,cycle:1525,in:{coal:3},out:{energy:255},workers:8},
];

const SERVICE_BUILDINGS=[];

// Жильё теперь занимает площадь участка (area), как любая другая постройка — иначе персонал
// ничего не стоил бы по месту на базе, и с производственными зданиями не за что конкурировать.
const HOUSING=[
  {id:'house_c1',name:'Жилой блок: разнорабочие',cls:1,capacity:24,area:12,cost:{iron_ore:220,stone:650,water:150}},
];

// Аккумуляторы — ёмкость энергосистемы базы, та же схема, что жильё: не «рецепт», а
// простой счётчик построенного, увеличивающий общий предел заряда energyCapacity().
const BASE_ENERGY_CAPACITY=150; // небольшой стартовый запас, чтобы база не глохла ещё до первой батареи
const BATTERIES=[
  {id:'battery_small',name:'Малый аккумулятор',category:'energy',icon:'battery',capacity:2000,area:4,cost:{iron_ore:200,copper_ore:340}},
];
function energyCapacity(){ return BASE_ENERGY_CAPACITY+BATTERIES.reduce((s,b)=>s+(state.buildings[b.id]||0)*b.capacity,0); }

// Цикл дня и ночи — завязан на игровое время (state.playSeconds), не на реальные часы:
// на ×1 сутки идут как в реальности, на ускорении — быстрее, ровно как остальная симуляция.
// 06:00–20:00 — световой день (14 ч), плавный подъём/спад освещённости по синусоиде.
const DAY_LENGTH_SEC=86400;
const DAY_START_SEC=6*3600;
const DAY_END_SEC=20*3600;
function gameClockSec(sec){ return ((sec%DAY_LENGTH_SEC)+DAY_LENGTH_SEC)%DAY_LENGTH_SEC; }
function sunFactor(sec){
  const t=gameClockSec(sec);
  if(t<DAY_START_SEC||t>DAY_END_SEC) return 0;
  const span=DAY_END_SEC-DAY_START_SEC;
  return Math.sin(((t-DAY_START_SEC)/span)*Math.PI);
}
function dayClockStr(sec){
  const t=gameClockSec(sec);
  const h=Math.floor(t/3600), m=Math.floor((t%3600)/60);
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}
// Админский рычаг: принудительно выставить игровые часы (0–24), не трогая ускорение
// симуляции — переносит state.playSeconds на нужное время суток текущих игровых суток.
function setGameHour(hour){
  const cur=state.playSeconds||0;
  const curClock=gameClockSec(cur);
  const targetClock=((hour*3600)%DAY_LENGTH_SEC+DAY_LENGTH_SEC)%DAY_LENGTH_SEC;
  const next=cur-curClock+targetClock;
  state.playSeconds=Math.max(0,next);
}
// UI-обёртка над setGameHour — как tryBuild/tryRetoolUnit, сама сохраняет и перерисовывает.
function adminSetGameHour(hour){
  setGameHour(hour);
  saveState();
  renderAll();
}

// Быт разнорабочих: вода и паёк, поровну по весу — раньше была только вода на всю
// удовлетворённость, теперь нехватка любой из двух половин одинаково режет производительность.
const CLASSES=[
  {id:1,name:'Разнорабочие',needsWeighted:[
    {id:'water',label:'Вода',weight:0.5},
    {id:'ration',label:'Паёк',weight:0.5},
  ]},
];

const CLASS_OF_TIER={0:1};
const BASE_FREE_CAPACITY={1:0};
// Даже при полностью нулевом быте (нет ни воды, ни пайков) производство не должно
// заглохнуть насмерть — иначе колонии неоткуда взять воду, чтобы восстановиться
// (буровые тоже на этом же персонале). Пол не красит сам показатель довольства
// (satisfaction/wf.satisfaction остаются честными 0%), только ограничивает снизу,
// насколько быт может притормозить производство.
const COMFORT_FLOOR=0.2;
const SEC_PER_DAY=86400;
const PER_WORKER_RATE={
  water:3/SEC_PER_DAY,
  ration:1/SEC_PER_DAY,
};

const SKILLS=[
  {id:'t0',tier:0,name:'Горное дело',icon:'skillT0'},
  {id:'agro',tier:0,name:'Агрономия',icon:'skillAgro'},
];
// 150 уровней вместо 5: тот же максимальный бонус (+40% скорость, −25% персонал),
// просто размазанный на длинную дистанцию, плюс новая линейная прибавка к богатству
// месторождения (до +100% на максимуме) — раньше richness была статичной на весь забег.
const MAX_SKILL_LEVEL=150;
const SKILL_SPEED_BONUS=0.40/MAX_SKILL_LEVEL;
const SKILL_WORKFORCE_CUT=0.25/MAX_SKILL_LEVEL;
const SKILL_RICHNESS_BONUS=1.0/MAX_SKILL_LEVEL;
// SP на T0 = фактически добытые ресурсы (1 добытая единица = 1 SP, с учётом реальной
// загрузки/богатства/бонуса скорости), а не плоская ставка за факт существования здания.
const SP_PER_UNIT_T0=1;
const ACADEMY_SP_PER_HOUR=90;
const ACADEMY={id:'academy',name:'Учебный центр',cost:{iron_ore:80,copper_ore:40}};
const SKILL_BUILDINGS=[ACADEMY];

// Отдел кадров — здание вкладки «Рабочие»: та же схема, что учебный центр (масштабируемая
// постройка без своего рецепта). Он не даёт мгновенный персонал до потолка жилья — рабочие
// приезжают с других планет постепенно (см. tickRecruitment/state.population), а отдел кадров
// поднимает потолок скорости этого найма. Дополнительно можно тратить бонусные пайки (еду
// с фермы) — ползунок «Бонусные пайки» на вкладке «Рабочие» — чтобы приблизиться к этому потолку.
const HR_DEPT={id:'hr_dept',name:'Отдел кадров',area:8,cost:{iron_ore:400,stone:480,copper_ore:160}};
const WORKFORCE_BUILDINGS=[HR_DEPT];
const HR_MAX_RECRUIT_PER_HOUR_PER_UNIT=10/24; // потолок найма при ползунке на 100%, 10 чел/сутки за 1 жилой блок
const HR_RATION_COST={water:6, ration:2}; // цена переезда 1 работника — 2-дневная норма (вода + паёк)

// Каждый следующий уровень дороже предыдущего на 70%: level 1 = 20 SP, level 2 = 34,
// ..., level 20 уже ~478 тыс., level 50 — триллионы. Выше ~25-30 уровня — не про то,
// чтобы туда реально дойти: рост чисто экспоненциальный без потолка, 150 — формальный
// максимум переменной MAX_SKILL_LEVEL, а не ориентир прокачки.
const SKILL_LEVEL_BASE_SP=20;
const SKILL_LEVEL_GROWTH=1.7;
function skillLevelCost(level){ return Math.round(SKILL_LEVEL_BASE_SP*Math.pow(SKILL_LEVEL_GROWTH,level-1)); }
function skillLevelById(id){ return (state.skills && state.skills[id] && state.skills[id].level) || 0; }
function skillName(id){ const sk=SKILLS.find(x=>x.id===id); return sk?sk.name:id; }
function recipeSkillId(b){ return b.skill || ('t'+b.tier); }
function recipeUnlocked(b){ return skillLevelById(recipeSkillId(b))>=(b.unlock||0); }
function speedMultForRecipe(b){ return 1+SKILL_SPEED_BONUS*skillLevelById(recipeSkillId(b)); }
function workforceCutForRecipe(b){ return SKILL_WORKFORCE_CUT*skillLevelById(recipeSkillId(b)); }
function outId(b){ return Object.keys(b.out)[0]; }
function recipeLabel(b){ return b.label || resName(outId(b)); }
function richOf(b){
  // У солнечной панели нет месторождения — её richMult это текущая освещённость солнцем.
  if(b.type==='solar') return sunFactor(state.playSeconds);
  const r=resById(outId(b));
  const base=state.richness[(r&&r.family)||outId(b)]||1;
  return base+SKILL_RICHNESS_BONUS*skillLevelById(recipeSkillId(b));
}
function richLabel(b){
  if(b.type==='solar') return 'Освещённость';
  if(b.type==='farm') return 'Плодородие почвы';
  if(b.type==='kitchen') return 'Слаженность кухни';
  if(b.type==='tpp') return 'Настройка топки';
  return 'Богатство месторождения';
}
function skillAffectsRichness(skId){ return BUILDINGS.some(b=>b.tier===0 && b.type!=='solar' && recipeSkillId(b)===skId); }
function resourceVisible(r){
  if((state.resources[r.id]||0)>0.05) return true;
  if(Math.abs(netRate(r.id))>1e-6) return true;
  return BUILDINGS.some(b=>outId(b)===r.id && recipeUnlocked(b));
}
function recipeVisible(b){
  if(!b.optional) return true;
  return Object.keys(b.in).every(rid=>{ const r=resById(rid); return r && resourceVisible(r); });
}
function typeKey(b){ return b.type || b.id; }
function typeOf(b){ return b.type ? BUILDING_TYPES.find(t=>t.id===b.type) : b; }
function typeCount(b){ const k=typeKey(b); return BUILDINGS.filter(x=>typeKey(x)===k).reduce((sum,x)=>sum+(state.buildings[x.id]||0),0); }
// Каждая установка — отдельный объект в state.units: {id, recipe, builtAt, durability}.
// state.buildings[recipeId] остаётся синхронным кэшем количества (используется везде,
// где нужна просто цифра: наём персонала, разблокировка тиров, очки навыков, бейджи).
function unitsOf(recipeId){ return state.units.filter(u=>u.recipe===recipeId); }
// Вручную отключённая установка (u.active===false) не производит, не ест сырьё/энергию
// и не занимает персонал — но остаётся в state.units, так что её можно включить обратно.
function activeUnitsOf(recipeId){ return unitsOf(recipeId).filter(u=>u.active!==false); }
function syncBuildingCount(recipeId){ state.buildings[recipeId]=unitsOf(recipeId).length; }
function tryToggleUnit(unitId){
  const u=state.units.find(x=>x.id===unitId);
  if(!u) return;
  u.active = u.active===false ? true : false;
  saveState();
  renderAll();
}
function baseCostOf(b){ return (b.type?typeOf(b):b).cost; }
function repairCost(u,b){
  const wear=Math.max(0,(DURABILITY_MAX-u.durability)/100);
  const result={};
  if(wear<=0.001) return result;
  Object.entries(baseCostOf(b)).forEach(([rid,q])=>{
    const amt=Math.ceil(q*wear*REPAIR_FACTOR);
    if(amt>0) result[rid]=amt;
  });
  return result;
}

const TAB_LABELS=['Добыча'];
const SAVE_KEY='industrial_belt_v19'; // оригинальная версия — отдельные сохранения от тестовой
const OFFLINE_CAP_SEC=12*3600;
const OFFLINE_STEP=30;

// Электроэнергия — не физический груз (вес 0, в склад/RESOURCES не входит, свой предел —
// ёмкость аккумуляторов, а не кг склада), но хранится в том же state.resources, чтобы вся
// готовая логика производства/потребления (runProdBuilding, simulateStep) работала как есть.
const ENERGY_RES={id:'energy',name:'Электроэнергия',formula:'⚡',weight:0,colorVar:'energy'};
function resById(id){ if(id==='energy') return ENERGY_RES; return RESOURCES.find(r=>r.id===id) || POP_GOODS.find(r=>r.id===id); }
// Электроэнергия отображается в реальных физических единицах, а не абстрактных «⚡»:
// потоки (выработка/расход установки в час) — в кВт (с авто-переходом на МВт/ГВт при росте
// базы), запасённый в аккумуляторах заряд — в джоулях (с авто-переходом на кДж/МДж/ГДж/ТДж).
// Игровое число «⚡» без пересчёта равно кВт для потоков и кВт·ч для запаса — только подпись
// и масштаб меняются, баланс построек не трогаем.
const J_PER_KWH=3.6e6;
const POWER_SCALE=[[1e-3,'Вт'],[1,'кВт'],[1e3,'МВт'],[1e6,'ГВт']];
const JOULE_SCALE=[[1,'Дж'],[1e3,'кДж'],[1e6,'МДж'],[1e9,'ГДж'],[1e12,'ТДж']];
function pickUnitScale(sc,v){
  const a=Math.abs(v); let i=0;
  for(let k=0;k<sc.length;k++) if(a>=sc[k][0]) i=k;
  return i;
}
function fmtByScale(sc,v){
  if(Math.abs(v)<1e-9) v=0;
  const i=pickUnitScale(sc,v), x=v/sc[i][0], d=Math.abs(x)>=100?0:Math.abs(x)>=10?1:2;
  const num=(v===0)?'0':x.toFixed(d);
  return num+' '+sc[i][1];
}
function fmtPowerKw(kw){ return kw===0?'0 кВт':fmtByScale(POWER_SCALE,kw); }
function fmtStoredEnergyKwh(kwh){ return kwh===0?'0 МДж':fmtByScale(JOULE_SCALE,kwh*J_PER_KWH); }
// В интерфейсе ресурс подписан химической формулой (руда — формулой минерала: Fe₂O₃ гематит,
// Cu₂S халькозин — чтобы голые Fe/Cu остались за чистым металлом). Полное название — во всплывающей подсказке.
function resName(id){ const r=resById(id); return r?(r.formula||r.name):id; }
function resFullName(id){ const r=resById(id); return r?r.name:id; }
function resTag(id){ return '<span class="res-f" title="'+resFullName(id)+'">'+resName(id)+'</span>'; }
function colorVarOf(res){ return res.colorVar || ('tier'+res.tier); }

function freshState(){
  const resources={};
  // Тестовый стартовый набор: все базовые ресурсы по 500 — чтобы сразу было с чем тестировать
  // любую постройку/рецепт, без ручной правки через консоль.
  RESOURCES.forEach(r=>resources[r.id]=500);
  POP_GOODS.forEach(r=>resources[r.id]=0);
  const richness={};
  RESOURCES.filter(r=>r.tier===0).forEach(r=>{ const k=r.family||r.id; if(richness[k]==null) richness[k]=Math.round((0.8+Math.random()*0.5)*100)/100; });
  const skills={};
  SKILLS.forEach(s=>skills[s.id]={level:0,sp:0});
  const now=Date.now();
  // Тестовый стартовый набор: 30 рабочих, 2 жилых блока, 1 отдел кадров — чтобы вкладка
  // «Рабочие» сразу была с чем тестировать, без ручной правки через консоль.
  return {resources,buildings:{house_c1:2,hr_dept:1},richness,skills,units:[],nextUnitId:1,training:'t0',lastTs:now,startTs:now,playSeconds:0,
    population:30, hrRationLevel:0, testSeeded:true};
}

function loadState(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return null;
}
function saveState(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }catch(e){}
}

let state=loadState();
let isNew=!state;
if(!state) state=freshState();
POP_GOODS.forEach(r=>{ if(state.resources[r.id]==null) state.resources[r.id]=0; });
// Ресурсы, добавленные после того, как сейв уже существовал (например, уголь/камень),
// в старом state.resources отсутствуют — досоздаём их нулями, а не ждём undefined.
RESOURCES.forEach(r=>{ if(state.resources[r.id]==null) state.resources[r.id]=0; });
// Электроэнергия хранится отдельно от RESOURCES (см. ENERGY_RES) — досоздаём точно так же.
if(state.resources.energy==null) state.resources.energy=0;
if(!state.richness) state.richness={};
RESOURCES.filter(r=>r.tier===0).forEach(r=>{ const k=r.family||r.id; if(state.richness[k]==null) state.richness[k]=1; });
// Навыки, добавленные после того, как сейв уже существовал (например, агрономия) — досоздаём
// нулевым уровнем, той же схемой, что freshState() делает для новой игры.
if(!state.skills) state.skills={};
SKILLS.forEach(s=>{ if(!state.skills[s.id]) state.skills[s.id]={level:0,sp:0}; });
if(!state.units) state.units=[];
if(!state.nextUnitId) state.nextUnitId=1;
// Набранный персонал — новое поле, отдельное от жилого потолка (state.buildings через HOUSING).
// Старым сейвам не занижаем штат задним числом: сразу выдаём весь уже отстроенный жилой потолок,
// как будто он был набран заранее, а не откатываем до базового BASE_FREE_CAPACITY.
if(state.population==null) state.population=housingCapacityTotal();
if(state.hrRationLevel==null) state.hrRationLevel=0;
if(!state.tankLevels) state.tankLevels={};
// Жёсткий пол населения для тестовой версии: если рабочих меньше 30 — всегда до-накидываем
// до 30 (и минимум жильё/отдел кадров под них) прямо при загрузке страницы, каждый раз,
// а не один раз по флагу — так сейв не может «застрять» на нуле ни при каких обстоятельствах.
if((state.population||0)<30){
  if((state.buildings.house_c1||0)<1) state.buildings.house_c1=2;
  if((state.buildings.hr_dept||0)<1) state.buildings.hr_dept=1;
  state.population=30;
  saveState();
}
// Жёсткий пол базовых ресурсов для тестовой версии: каждый раз при загрузке поднимаем то,
// что ниже 500, не трогая то, что уже выше (наработанные запасы не срезаем).
let resourcesTopUp=false;
RESOURCES.forEach(r=>{ if((state.resources[r.id]||0)<500){ state.resources[r.id]=500; resourcesTopUp=true; } });
if(resourcesTopUp) saveState();

const util={};
// Доля покрытия расхода энергии за последний тик (1 = всем хватило, 0 = блэкаут) — тот же
// powerFraction, которым simulateStep урезает производство ниже; выставляется там же,
// читается вкладкой «Энергия» для показателя «обеспечено», без повторного расчёта.
let lastPowerFraction=1;
function blankWf(){ return {cap:0,population:0,demand:0,assigned:0,staffing:1,satisfaction:1,weighted:[],extras:[],base:null}; }
let lastWorkforce={}; CLASSES.forEach(c=>{ lastWorkforce[c.id]=blankWf(); });

function runProdBuilding(b, dt, richMult, speedMult, countOverride){
  if(speedMult==null) speedMult=1;
  const count = countOverride!=null ? countOverride : (state.buildings[b.id]||0);
  if(count<=0){ return {frac:0, reason:'idle'}; }
  const outQty=b.out[outId(b)];
  const outPerSec=outQty*count/b.cycle*speedMult;
  const desiredOut=outPerSec*dt*richMult;
  const entries=Object.entries(b.in||{});
  const desiredIns={};
  let inputFraction=1;
  entries.forEach(([rid,q])=>{
    const perSec=q*count/b.cycle*speedMult;
    const desired=perSec*dt;
    desiredIns[rid]=desired;
    if(desired>0){
      const avail=state.resources[rid]||0;
      inputFraction=Math.min(inputFraction, avail/desired);
    }
  });
  // Электроэнергия у потребителей больше не делится на «хватает/не хватает» здесь —
  // это отдельный общий проход в simulateStep (производство имеет первый приоритет на
  // энергию, излишки заряжают аккумулятор, полный аккумулятор не блокирует работу).
  // Здесь только считаем «сколько бы хотелось» энергии за тик, без деления на факт.
  let desiredPower=0;
  if(b.power){
    const perSec=b.power*count/b.cycle*speedMult;
    desiredPower=perSec*dt;
  }
  const outId_=outId(b);
  const outMeta=resById(outId_);
  // У электроэнергии нет предела по складу на уровне отдельной установки — куда девать
  // излишек (в аккумулятор или в никуда) решает общий энергобаланс в simulateStep.
  // У жидкостей — свой резервуарный лимит (liquidCapacity), а не вес общего склада.
  let outCapFraction=1;
  if(outId_!=='energy' && desiredOut>0){
    let capSpaceUnits;
    if(outMeta.liquid){
      capSpaceUnits=Math.max(0, liquidCapacity(outId_)-(state.resources[outId_]||0));
    }else{
      capSpaceUnits=warehouseFreeKg()/(outMeta.weight||1);
    }
    outCapFraction=Math.min(1, Math.max(0,capSpaceUnits)/desiredOut);
  }
  return {inputFraction, outCapFraction, desiredOut, desiredIns, desiredPower, entries};
}

// Суммарная жилая ёмкость (потолок, до которого вообще можно набрать персонал этого класса) —
// отдельно от того, сколько персонала УЖЕ набрано (state.population, см. tickRecruitment).
function housingCapacityTotal(cls){
  const c=cls==null?1:cls;
  const housing=HOUSING.find(h=>h.cls===c);
  const builtCap=housing?(state.buildings[housing.id]||0)*housing.capacity:0;
  return builtCap+(BASE_FREE_CAPACITY[c]||0);
}
// Набор персонала с других планет: каждый построенный жилой блок задаёт потолок скорости
// найма (чел/ч за блок) — больше жилья означает больше мест для переселенцев И быстрее их
// набор. Ползунок «Бонусные пайки» (state.hrRationLevel, 0..1) определяет, какая доля этого
// потолка реально используется — чем дальше вправо, тем быстрее едут рабочие, но тем больше
// фермерской еды тратится на пайки. Набор никогда не превышает текущую жилую ёмкость.
let lastRecruit={maxRate:0, wantRate:0, actualRate:0, fraction:1, cap:0, population:0, room:0};
function tickRecruitment(dt){
  const housing=HOUSING.find(h=>h.cls===1);
  const houseCount=housing?(state.buildings[housing.id]||0):0;
  const cap=housingCapacityTotal(1);
  const population=Math.min(cap, state.population||0);
  const room=Math.max(0,cap-population);
  const level=Math.max(0,Math.min(1,state.hrRationLevel||0));
  const maxRate=houseCount*HR_MAX_RECRUIT_PER_HOUR_PER_UNIT; // потолок при ползунке на 100%, чел/ч
  const wantRate=maxRate*level; // чел/ч при текущем положении ползунка
  const wantThisTick=Math.min(room, wantRate/3600*dt);
  let fraction=1;
  if(wantThisTick>0){
    Object.entries(HR_RATION_COST).forEach(([rid,perWorker])=>{
      const desired=perWorker*wantThisTick;
      if(desired>0){
        const avail=state.resources[rid]||0;
        fraction=Math.min(fraction, avail/desired);
      }
    });
  }
  fraction=Math.max(0,fraction);
  const actualThisTick=wantThisTick*fraction;
  Object.entries(HR_RATION_COST).forEach(([rid,perWorker])=>{
    const consume=perWorker*actualThisTick;
    state.resources[rid]=Math.max(0,(state.resources[rid]||0)-consume);
  });
  state.population=Math.min(cap, population+actualThisTick);
  lastRecruit={maxRate, wantRate, actualRate: dt>0?actualThisTick/dt*3600:0, fraction, cap, population:state.population, room};
}

function computeWorkforce(dt){
  const wf={};
  let class1Sat=1;
  CLASSES.map(c=>c.id).forEach(c=>{
    const cap=housingCapacityTotal(c);
    const pool=c===1?Math.min(cap, state.population||0):cap;
    const demand=BUILDINGS.filter(b=>CLASS_OF_TIER[b.tier]===c).reduce((s,b)=>s+activeUnitsOf(b.id).length*b.workers*(1-workforceCutForRecipe(b)),0);
    const staffing=demand>0?Math.min(1,pool/demand):1;
    const assigned=Math.min(pool,demand);
    const cls=CLASSES.find(x=>x.id===c);
    let satisfaction;
    const weighted=[];
    const extras=[];
    if(c===1){
      satisfaction=0;
      cls.needsWeighted.forEach(n=>{
        const rate=PER_WORKER_RATE[n.id];
        const desired=rate*assigned*dt;
        let fraction=1;
        if(desired>0){
          const avail=state.resources[n.id]||0;
          fraction=Math.max(0,Math.min(1, avail/desired));
        }
        satisfaction+=n.weight*fraction;
        const consume=desired*fraction;
        state.resources[n.id]=Math.max(0,(state.resources[n.id]||0)-consume);
        weighted.push({id:n.id,label:n.label,weight:n.weight,fraction});
      });
      satisfaction=Math.max(0,Math.min(1,satisfaction));
      class1Sat=satisfaction;
    }else{
      satisfaction=class1Sat;
      (cls.extraNeeds||[]).forEach(gid=>{
        const rate=PER_WORKER_RATE[gid];
        const desired=rate*assigned*dt;
        let fraction=1;
        if(desired>0){
          const avail=state.resources[gid]||0;
          fraction=Math.max(0,Math.min(1, avail/desired));
        }
        satisfaction=Math.min(satisfaction, fraction);
        extras.push({id:gid,fraction});
      });
      satisfaction=Math.max(0,Math.min(1,satisfaction));
      (cls.extraNeeds||[]).forEach(gid=>{
        const rate=PER_WORKER_RATE[gid];
        const desired=rate*assigned*dt;
        const consume=desired*satisfaction;
        state.resources[gid]=Math.max(0,(state.resources[gid]||0)-consume);
      });
    }
    wf[c]={cap,population:pool,demand,assigned,staffing,satisfaction,weighted,extras,base:c===1?null:class1Sat};
  });
  return wf;
}

// Фактический выпуск ресурса всеми установками рецепта в час — то же, что видно
// в netRate: простаивающая установка (нет персонала/сырья/места на складе) даёт 0.
function recipeRatePerHour(b){
  const count=state.buildings[b.id]||0;
  if(count<=0) return 0;
  const u=(util[b.id]&&util[b.id].frac)||0;
  if(u<=0) return 0;
  return (b.out[outId(b)]*count/b.cycle)*3600*richOf(b)*speedMultForRecipe(b)*u;
}
// Электроэнергия расходуется через b.power, а не b.in (см. runProdBuilding) — отдельная
// функция для «сколько ед/ч сейчас реально потребляет установка», по той же логике, что
// recipeRatePerHour выше для выпуска.
function powerDrawPerHour(b){
  if(!b.power) return 0;
  const count=state.buildings[b.id]||0;
  if(count<=0) return 0;
  const u=(util[b.id]&&util[b.id].frac)||0;
  if(u<=0) return 0;
  return (b.power*count/b.cycle)*3600*speedMultForRecipe(b)*u;
}
// Сводный баланс энергосистемы базы — выработка солнечных панелей минус расход всех
// остальных установок, для вкладки «Энергия».
function energyBalance(){
  let gen=0, draw=0;
  BUILDINGS.forEach(b=>{
    if(b.type==='solar'||b.type==='tpp') gen+=recipeRatePerHour(b);
    if(b.power) draw+=powerDrawPerHour(b);
  });
  return {gen, draw, net:gen-draw};
}
// История энергосистемы для журнала на вкладке «Энергия». Каждый тик складывается в корзины
// четырёх разрешений — хватает на самый длинный период и такой же предыдущий для сравнения,
// а сейв остаётся небольшим. Время — свой монотонный счётчик clock (идёт вместе с playSeconds,
// но админский перевод часов его не двигает); off = playSeconds − clock для подписей времени суток.
// Корзина: [номер, выработка, потребность, получено, сброс, заряд на конец, ёмкость,
//           сек дефицита, пик выработки кВт, пик нагрузки кВт, сек покрыто]; энергия — в кВт·ч.
const EH_TIERS=[{id:'m1',sec:60,keep:120},{id:'m10',sec:600,keep:288},{id:'h1',sec:3600,keep:336},{id:'h4',sec:14400,keep:1080}];
const EH_LIVE={id:'live',sec:5,keep:72}; // «реальное время» — только в памяти, в сейв не пишется
const energyLiveHist={open:null,rows:[]};
function ehInit(){
  if(!state.energyHist||!state.energyHist.tiers) state.energyHist={clock:0,off:state.playSeconds||0,tiers:{}};
  EH_TIERS.forEach(t=>{ if(!state.energyHist.tiers[t.id]) state.energyHist.tiers[t.id]={open:null,rows:[]}; });
  return state.energyHist;
}
function ehAdd(tier,def,at,s){
  const t=Math.floor(at/def.sec);
  let o=tier.open;
  if(o && o[0]!==t){
    tier.rows.push(o.map((v,i)=>i===0?v:+v.toPrecision(5)));
    if(tier.rows.length>def.keep) tier.rows.splice(0,tier.rows.length-def.keep);
    o=null;
  }
  if(!o) o=tier.open=[t,0,0,0,0,0,0,0,0,0,0];
  o[1]+=s.gen; o[2]+=s.demand; o[3]+=s.supply; o[4]+=s.curtail; o[5]=s.stored; o[6]=s.cap; o[7]+=s.deficit;
  if(s.pGen>o[8]) o[8]=s.pGen;
  if(s.pDem>o[9]) o[9]=s.pDem;
  o[10]+=s.dt;
}
function recordEnergyHistory(s){
  if(!(s.dt>0)) return;
  const h=ehInit();
  h.clock+=s.dt;
  h.off=(state.playSeconds||0)+s.dt-h.clock;
  const at=h.clock-1e-6;
  EH_TIERS.forEach(t=>ehAdd(h.tiers[t.id],t,at,s));
  ehAdd(energyLiveHist,EH_LIVE,at,s);
}
// Установленная мощность источника «на полную» (богатство/освещённость = 100%, простоя нет,
// с бонусом скорости от навыка) — в кВт. Для солнца это пиковая выработка в полдень; фактическая (recipeRatePerHour) обычно
// ниже из-за текущего sunFactor и загрузки, отсюда и бар «сейчас / установлено» на вкладке.
function energyNameplateKw(b){
  const count=state.buildings[b.id]||0;
  if(count<=0) return 0;
  return (b.out[outId(b)]*count/b.cycle)*3600*speedMultForRecipe(b);
}
// T0 больше не даёт плоскую ставку СП — она равна фактическому выпуску (см. выше),
// т.е. простаивающая установка добывает 0 СП, а не свою "долю" просто за факт существования.
function spFromT0PerHour(){
  return BUILDINGS.filter(b=>b.tier===0).reduce((s,b)=>s+recipeRatePerHour(b)*SP_PER_UNIT_T0,0);
}
function spFromOtherTiersPerHour(){
  const academies=state.buildings[ACADEMY.id]||0;
  return {fromTiers:0, fromAcademy:academies*ACADEMY_SP_PER_HOUR};
}
function spPerHourTotal(){
  const fromT0=spFromT0PerHour();
  const other=spFromOtherTiersPerHour();
  const fromBuildings=fromT0+other.fromTiers;
  return {fromBuildings, fromAcademy:other.fromAcademy, total:fromBuildings+other.fromAcademy};
}

function tickSkills(dt, t0OutputUnits){
  const other=spFromOtherTiersPerHour();
  const otherSpPerSec=(other.fromTiers+other.fromAcademy)/3600;
  const spGain=(t0OutputUnits||0)*SP_PER_UNIT_T0+otherSpPerSec*dt;
  if(!state.training) return;
  const sk=state.skills[state.training];
  if(!sk || sk.level>=MAX_SKILL_LEVEL) return;
  sk.sp+=spGain;
  while(sk.level<MAX_SKILL_LEVEL && sk.sp>=skillLevelCost(sk.level+1)){
    sk.sp-=skillLevelCost(sk.level+1);
    sk.level+=1;
  }
}

function decayDurability(dt){
  state.units.forEach(u=>{
    if(u.durability<=DURABILITY_FLOOR) return;
    u.durability=Math.max(DURABILITY_FLOOR, u.durability-DURABILITY_DECAY_PER_SEC*dt);
  });
}

function simulateStep(dt){
  decayDurability(dt);
  SERVICE_BUILDINGS.forEach(sb=>{
    const count=state.buildings[sb.id]||0;
    if(count<=0){ util[sb.id]={frac:0,reason:'idle'}; return; }
    const calc=runProdBuilding(sb, dt, 1);
    const fraction=Math.max(0,Math.min(1,calc.inputFraction,calc.outCapFraction));
    calc.entries.forEach(([rid,q])=>{
      const next=(state.resources[rid]||0)-calc.desiredIns[rid]*fraction;
      state.resources[rid]=next<0?0:next;
    });
    state.resources[sb.id]=(state.resources[sb.id]||0)+calc.desiredOut*fraction;
    let reason='full';
    if(fraction<0.999){
      reason = calc.inputFraction<=calc.outCapFraction ? 'input' : 'storage';
    }
    util[sb.id]={frac:fraction,reason};
  });

  tickRecruitment(dt);
  const wf=computeWorkforce(dt);
  lastWorkforce=wf;

  let t0OutputUnits=0;

  // Тир 0 (добыча + солнечные панели) считается в два прохода, а не как остальные тиры.
  // Проход 1: для каждой установки — «базовая» доля работы (штат/быт/сырьё/склад,
  // БЕЗ учёта энергии) и её желаемые энергорасход/энерговыработку за этот тик.
  // Проход 2 — общий энергобаланс базы: сначала вся имеющаяся + свежесгенерированная
  // энергия идёт на покрытие производства (пропорционально, если её не хватает на всех),
  // и только настоящий излишек — то, что осталось ПОСЛЕ производства — заряжает
  // аккумулятор. Полный аккумулятор никогда не тормозит добычу или генерацию: если
  // излишек больше свободной ёмкости, он просто не запасается, а не блокирует работу.
  const t0Calcs=[];
  BUILDINGS.filter(b=>b.tier===0).forEach(b=>{
    const units=activeUnitsOf(b.id);
    const unitCount=units.length;
    if(unitCount<=0){ util[b.id]={frac:0,reason:unitsOf(b.id).length>0?'off':'idle'}; t0Calcs.push(null); return; }
    const effCapacity=units.reduce((s,u)=>s+Math.max(0,u.durability)/100,0);
    const richMult=richOf(b);
    const speedMult=speedMultForRecipe(b);
    const calc=runProdBuilding(b, dt, richMult, speedMult, effCapacity);
    const cls=wf[CLASS_OF_TIER[0]];
    // Установкам без персонала (солнечные панели) нехватка/недовольство рабочих не мешает.
    const crewed=(b.workers||0)>0;
    const factors={staff:crewed?cls.staffing:1, comfort:crewed?Math.max(COMFORT_FLOOR,cls.satisfaction):1, input:calc.inputFraction, storage:calc.outCapFraction};
    let baseFraction=1, baseReason='full';
    ['staff','comfort','input','storage'].forEach(k=>{
      if(factors[k]<baseFraction-1e-6){ baseFraction=factors[k]; baseReason=k; }
    });
    baseFraction=Math.max(0,Math.min(1,baseFraction));
    // Солнечная панель ночью: остальные факторы могут быть в норме, но выработка всё равно 0.
    if(b.type==='solar' && richMult<=0.001){ baseFraction=Math.min(baseFraction,0); baseReason='night'; }
    const avgWear=unitCount>0?effCapacity/unitCount:1;
    t0Calcs.push({b, unitCount, avgWear, calc, baseFraction, baseReason});
  });

  let totalDesiredPower=0, totalDesiredGen=0;
  t0Calcs.forEach(c=>{
    if(!c) return;
    if(c.calc.desiredPower>0) totalDesiredPower+=c.calc.desiredPower*c.baseFraction;
    // Угольная ТЭС — второй источник энергии, наравне с солнцем: тоже уходит в общий пул
    // ДО того, как энергия распределяется по потребителям (см. ниже), а не как обычный выход.
    if(c.b.type==='solar'||c.b.type==='tpp') totalDesiredGen+=c.calc.desiredOut*c.baseFraction;
  });
  const storedEnergy=state.resources.energy||0;
  const availablePool=storedEnergy+totalDesiredGen; // накопленное + то, что панели готовы дать в этот тик
  const powerFraction = totalDesiredPower>0 ? Math.max(0,Math.min(1, availablePool/totalDesiredPower)) : 1;
  lastPowerFraction=powerFraction;
  const actualConsumed=totalDesiredPower*powerFraction;
  const leftover=availablePool-actualConsumed; // излишек после того, как производство забрало своё
  const capNow=energyCapacity();
  state.resources.energy=Math.min(capNow, Math.max(0, leftover));
  recordEnergyHistory({dt, gen:totalDesiredGen, demand:totalDesiredPower, supply:actualConsumed,
    curtail:Math.max(0,leftover-capNow), stored:state.resources.energy, cap:capNow,
    deficit:powerFraction<0.999?dt:0, pGen:dt>0?totalDesiredGen/dt*3600:0, pDem:dt>0?totalDesiredPower/dt*3600:0});

  t0Calcs.forEach(c=>{
    if(!c) return;
    const {b, calc, avgWear}=c;
    let fraction=c.baseFraction, reason=c.baseReason;
    if(calc.desiredPower>0 && powerFraction<fraction-1e-6){ fraction=powerFraction; reason='power'; }
    fraction=Math.max(0,Math.min(1,fraction));
    if(fraction>=0.999 && avgWear<0.999-1e-6){ reason='wear'; }
    calc.entries.forEach(([rid,q])=>{
      const next=(state.resources[rid]||0)-calc.desiredIns[rid]*fraction;
      state.resources[rid]=next<0?0:next;
    });
    const producedNow=calc.desiredOut*fraction;
    // Выработку солнечных панелей и угольной ТЭС в state.resources.energy уже целиком учёл
    // общий энергобаланс чуть выше (production first, излишек — в аккумулятор) — повторно
    // прибавлять её здесь нельзя, иначе энергия задваивается. Уголь как сырьё («in») эти
    // установки всё равно списывают ниже вместе со всеми остальными — это не energy-выход.
    if(b.type!=='solar' && b.type!=='tpp'){
      state.resources[outId(b)]=(state.resources[outId(b)]||0)+producedNow;
      t0OutputUnits+=producedNow;
    }
    util[b.id]={frac:fraction*avgWear,reason};
  });

  [1,2,3,4].forEach(t=>{
    BUILDINGS.filter(b=>b.tier===t).forEach(b=>{
      const units=activeUnitsOf(b.id);
      const unitCount=units.length;
      if(unitCount<=0){ util[b.id]={frac:0,reason:unitsOf(b.id).length>0?'off':'idle'}; return; }
      const effCapacity=units.reduce((s,u)=>s+Math.max(0,u.durability)/100,0);
      const speedMult=speedMultForRecipe(b);
      const calc=runProdBuilding(b, dt, 1, speedMult, effCapacity);
      const cls=wf[CLASS_OF_TIER[t]];
      const factors={staff:cls.staffing, comfort:Math.max(COMFORT_FLOOR,cls.satisfaction), input:calc.inputFraction, storage:calc.outCapFraction};
      let fraction=1, reason='full';
      ['staff','comfort','input','storage'].forEach(k=>{
        if(factors[k]<fraction-1e-6){ fraction=factors[k]; reason=k; }
      });
      fraction=Math.max(0,Math.min(1,fraction));
      const avgWear=unitCount>0?effCapacity/unitCount:1;
      if(fraction>=0.999 && avgWear<0.999-1e-6){ reason='wear'; }
      calc.entries.forEach(([rid,q])=>{
        const next=(state.resources[rid]||0)-calc.desiredIns[rid]*fraction;
        state.resources[rid]=next<0?0:next;
      });
      const producedNow=calc.desiredOut*fraction;
      state.resources[outId(b)]=(state.resources[outId(b)]||0)+producedNow;
      util[b.id]={frac:fraction*avgWear,reason};
    });
  });

  tickSkills(dt, t0OutputUnits);
  state.playSeconds=(state.playSeconds||0)+dt;
}

function netRate(resId){
  let rate=0;
  BUILDINGS.concat(SERVICE_BUILDINGS).forEach(b=>{
    const count=state.buildings[b.id]||0;
    if(count<=0) return;
    const u=(util[b.id]&&util[b.id].frac)||0;
    if(b.out && b.out[resId]!=null){
      const rich = (b.tier===0) ? richOf(b) : 1;
      rate += (b.out[resId]*count/b.cycle)*u*rich;
    }
    if(b.in && b.in[resId]!=null){
      rate -= (b.in[resId]*count/b.cycle)*u;
    }
  });
  return rate;
}

function scaledCost(b,count){
  return {...b.cost};
}

function fmtDuration(sec){
  sec=Math.round(sec);
  const m=Math.floor(sec/60), r=sec%60;
  return m+':'+String(r).padStart(2,'0');
}
function fmtDurationWords(sec){
  sec=Math.round(sec);
  const m=Math.floor(sec/60), r=sec%60;
  if(m<=0) return r+' сек';
  if(r<=0) return m+' мин';
  return m+' мин '+r+' сек';
}
function fmtElapsed(ms){
  let s=Math.floor(ms/1000);
  const d=Math.floor(s/86400); s%=86400;
  const h=Math.floor(s/3600); s%=3600;
  const m=Math.floor(s/60);
  if(d>0) return d+'д '+h+'ч '+m+'м';
  if(h>0) return h+'ч '+m+'м';
  return m+'м';
}

function tierUnlocked(t){
  if(t===0) return true;
  return BUILDINGS.filter(b=>b.tier===t-1).some(b=>(state.buildings[b.id]||0)>0);
}

const REASON_LABELS={
  full:'Работает на полную мощность',
  input:'Не хватает сырья',
  storage:'Склад заполнен',
  staff:'Не хватает персонала',
  comfort:'Персонал недоволен бытом',
  wear:'Изношено оборудование',
  power:'Не хватает электроэнергии',
  night:'Ночь — нет солнца',
  idle:'Ожидает первого тика симуляции',
  off:'Отключено вручную',
};

function fmtRate(r){ return r>=10?String(Math.round(r)):r.toFixed(1); }
function unitPotentialPerHour(b){ return b.out[outId(b)]*3600/b.cycle*richOf(b)*speedMultForRecipe(b); }
function unitWorking(b){ const u=util[b.id]; return !!(u && u.frac>0.001); }
function tryBuild(id){
  let b=BUILDINGS.find(x=>x.id===id) || SERVICE_BUILDINGS.find(x=>x.id===id) || HOUSING.find(x=>x.id===id) || SKILL_BUILDINGS.find(x=>x.id===id) || BATTERIES.find(x=>x.id===id) || WORKFORCE_BUILDINGS.find(x=>x.id===id);
  if(!b) return;
  let unlocked=true;
  if(b.tier!=null) unlocked=tierUnlocked(b.tier);
  else if(b.cls!=null) unlocked=popUnlocked(b.cls);
  if(!unlocked) return;
  const isRecipe=BUILDINGS.includes(b);
  if(isRecipe && !recipeUnlocked(b)) return;
  const bArea = isRecipe ? (typeOf(b).area||0) : (b.area||0);
  if(bArea>freeArea()) return;
  const count=state.buildings[id]||0;
  const cost=isRecipe ? scaledCost(typeOf(b),typeCount(b)) : scaledCost(b,count);
  const afford=Object.entries(cost).every(([rid,q])=>(state.resources[rid]||0)>=q);
  if(!afford) return;
  Object.entries(cost).forEach(([rid,q])=>{ state.resources[rid]-=q; });
  if(isRecipe){
    const uid=state.nextUnitId++;
    state.units.push({id:uid, recipe:id, builtAt:Date.now(), durability:DURABILITY_MAX});
    syncBuildingCount(id);
  }else{
    state.buildings[id]=count+1;
  }
  saveState();
  renderAll();
}

function tryRepairUnit(unitId){
  const u=state.units.find(x=>x.id===unitId);
  if(!u) return;
  const b=BUILDINGS.find(x=>x.id===u.recipe);
  if(!b) return;
  const cost=repairCost(u,b);
  if(!Object.keys(cost).length) return;
  if(!Object.entries(cost).every(([rid,q])=>(state.resources[rid]||0)>=q)) return;
  Object.entries(cost).forEach(([rid,q])=>{ state.resources[rid]-=q; });
  u.durability=DURABILITY_MAX;
  saveState();
  renderAll();
}

function tryDemolishUnit(unitId){
  const idx=state.units.findIndex(x=>x.id===unitId);
  if(idx<0) return;
  const u=state.units[idx];
  const b=BUILDINGS.find(x=>x.id===u.recipe);
  if(!b) return;
  const refund=demolishCost(b);
  state.units.splice(idx,1);
  syncBuildingCount(u.recipe);
  const refundKg=Object.entries(refund).reduce((sum,[rid,q])=>sum+q*(resById(rid).weight||0),0);
  const free=warehouseFreeKg();
  const scale = (refundKg>free && refundKg>0) ? free/refundKg : 1;
  Object.entries(refund).forEach(([rid,q])=>{
    const add=Math.floor(q*scale);
    if(add>0) state.resources[rid]=(state.resources[rid]||0)+add;
  });
  saveState();
  renderAll();
}

function tryRetoolUnit(unitId,toId){
  const u=state.units.find(x=>x.id===unitId);
  if(!u) return;
  const from=BUILDINGS.find(x=>x.id===u.recipe), to=BUILDINGS.find(x=>x.id===toId);
  if(!from || !to || !from.type || from.type!==to.type) return;
  if(!recipeUnlocked(to)) return;
  const oldRecipe=u.recipe;
  u.recipe=toId;
  u.builtAt=Date.now(); // цикл новой руды начинается заново, а не с фазы старой
  syncBuildingCount(oldRecipe);
  syncBuildingCount(toId);
  saveState();
  renderAll();
}

function fmtMMSS(sec){
  sec=Math.max(0,Math.round(sec));
  const m=Math.floor(sec/60), r=sec%60;
  return String(m).padStart(2,'0')+':'+String(r).padStart(2,'0');
}
// При сильной нехватке персонала/энергии цикл может растягиваться на часы и дни —
// «112:34» нечитаемо, поэтому длинные интервалы показываем как дни/часы/минуты.
function fmtLeft(sec){
  sec=Math.max(0,Math.round(sec));
  if(sec<3600) return fmtMMSS(sec);
  const days=Math.floor(sec/86400);
  const hours=Math.floor((sec%86400)/3600);
  const mins=Math.floor((sec%3600)/60);
  if(days>0) return days+'д '+hours+'ч';
  return hours+'ч '+mins+'м';
}
function unitCycleState(uid,now){
  const unit=state.units.find(x=>x.id===uid);
  const b=unit && BUILDINGS.find(x=>x.id===unit.recipe);
  if(!b || unit.active===false || !unitWorking(b)) return {p:0,left:0,idle:true};
  // Если установке не хватает персонала/быта/сырья, она не стоит, а просто работает
  // медленнее — цикл растягивается во столько раз, во сколько не хватает (util.frac).
  const frac=Math.max(0.001,Math.min(1,(util[b.id]||{}).frac||1));
  const eff=Math.max(0.5, b.cycle/speedMultForRecipe(b))/frac;
  const phase=(((now-unit.builtAt/1000)%eff)+eff)%eff/eff;
  return {p:phase,left:eff-phase*eff,idle:false};
}
