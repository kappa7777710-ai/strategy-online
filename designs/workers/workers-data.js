// Общие демо-данные для 5 вариантов редизайна вкладки «Рабочие».
// Форма повторяет реальную модель игры (см. js/pages/4-workers.js, js/core.js):
// HR-статус, набор населения (только класс 1 — «с других планет», через жильё),
// по каждому классу: нужды (взвешенные для класса 1, extraNeeds для остальных),
// запасы/расход ресурсов, здание жилья и сервисные постройки (рецепт, загрузка, цена).
// Классы 2–4 (Техники/Инженеры/Администраторы) в игре пока не реализованы —
// здесь они иллюстративные, чтобы показать, как интерфейс ведёт себя при росте
// числа классов и построек (цвета --class1..4 уже зарезервированы в палитре игры).
const WORKERS_DATA = {
  hr: {
    total: 142, assigned: 118, free: 24,
    houseCount: 2, ceilPerDay: 48,
  },
  recruit: {
    pop: 118, cap: 160,
    maxRatePerDay: 48, actualRate: 1.42, wantRate: 2.0, fraction: 0.71, room: 42,
    rationLevel: 65,
    cost: { water: 6, ration: 2 },
    short: true,
  },
  classes: [
    {
      id: 1, color: 'class1', name: 'Разнорабочие', recruited: true,
      assigned: 96, demand: 110, cap: 120, staffing: 0.87, satisfaction: 0.81,
      needs: [
        { label: 'Вода', weight: 0.5, fraction: 0.92 },
        { label: 'Паёк', weight: 0.5, fraction: 0.70 },
      ],
      stock: [
        { id: 'water', name: 'Вода', amount: 3412, rate: 2.1, colorVar: 'water' },
        { id: 'ration', name: 'Паёк', amount: 186, rate: -0.4, colorVar: 'ration' },
      ],
      housing: { name: 'Жилой блок: разнорабочие', count: 2, capacity: 24, totalCap: 48, cost: { iron_ore: 220, stone: 650, water: 150 } },
      services: [
        { id: 'ration_a', name: 'Паёк «Хлеб и каша»', recipe: '2 Пшеница + 1 Кукуруза + 1 Вода → 4 Паёк', count: 3, cycle: '38 мин', util: 0.92, state: 'full', cost: { wood: 140, iron_ore: 90 } },
        { id: 'ration_b', name: 'Паёк «Картофельный»', recipe: '4 Картофель + 1 Томат + 1 Вода → 5 Паёк', count: 1, cycle: '52 мин', util: 0.48, state: 'input', cost: { wood: 120, stone: 80 } },
        { id: 'coal_power', name: 'Угольная ТЭС', recipe: '3 Уголь → 255 Энергии', count: 2, cycle: '25 мин', util: 1.0, state: 'full', cost: { iron_ore: 300, copper_ore: 150 } },
      ],
    },
    {
      id: 2, color: 'class2', name: 'Техники', recruited: false,
      assigned: 14, demand: 18, cap: 20, staffing: 0.78, satisfaction: 0.74,
      needs: [ { label: 'Базовые (как у разнорабочих)', weight: null, fraction: 0.81 }, { label: 'Инструменты', weight: null, fraction: 0.66, min: true } ],
      stock: [ { id: 'tool', name: 'Инструменты', amount: 54, rate: -0.12, colorVar: 'iron' } ],
      housing: { name: 'Жилой блок: техники', count: 1, capacity: 20, totalCap: 20, cost: { iron_ore: 340, stone: 500, copper_ore: 120 } },
      services: [
        { id: 'workshop', name: 'Мастерская', recipe: '3 Железо + 2 Медь → 4 Инструмент', count: 1, cycle: '19 мин', util: 0.66, state: 'input', cost: { iron_ore: 260, copper_ore: 180 } },
        { id: 'garage', name: 'Гараж техобслуживания', recipe: '2 Инструмент + 1 Нефть → ремонт зданий', count: 1, cycle: '—', util: 0.40, state: 'staff', cost: { iron_ore: 400, stone: 200 } },
      ],
    },
    {
      id: 3, color: 'class3', name: 'Инженеры', recruited: false,
      assigned: 6, demand: 8, cap: 9, staffing: 0.75, satisfaction: 0.88,
      needs: [ { label: 'Базовые (как у разнорабочих)', weight: null, fraction: 0.90 }, { label: 'Данные', weight: null, fraction: 0.95, min: true } ],
      stock: [ { id: 'data', name: 'Данные', amount: 212, rate: 0.08, colorVar: 'skill' } ],
      housing: { name: 'Жилой блок: инженеры', count: 1, capacity: 9, totalCap: 9, cost: { iron_ore: 500, copper_ore: 300, stone: 300 } },
      services: [
        { id: 'kb', name: 'Конструкторское бюро', recipe: '2 Данные + 1 Медь → чертежи T2', count: 1, cycle: '41 мин', util: 0.95, state: 'full', cost: { copper_ore: 420, iron_ore: 260 } },
        { id: 'lab', name: 'Лаборатория', recipe: '1 Данные + 1 Вода → исследования', count: 1, cycle: '63 мин', util: 0.58, state: 'power', cost: { copper_ore: 300, stone: 260 } },
      ],
    },
    {
      id: 4, color: 'class4', name: 'Администраторы', recruited: false,
      assigned: 2, demand: 4, cap: 4, staffing: 0.50, satisfaction: 0.63,
      needs: [ { label: 'Базовые (как у разнорабочих)', weight: null, fraction: 0.77 }, { label: 'Документооборот', weight: null, fraction: 0.52, min: true } ],
      stock: [ { id: 'docs', name: 'Документооборот', amount: 38, rate: -0.05, colorVar: 'tier3' } ],
      housing: { name: 'Жилой блок: администраторы', count: 1, capacity: 4, totalCap: 4, cost: { iron_ore: 600, stone: 400, copper_ore: 300 } },
      services: [
        { id: 'office', name: 'Офис управления', recipe: '1 Документооборот → координация строек', count: 1, cycle: '—', util: 0.77, state: 'full', cost: { iron_ore: 300, stone: 300 } },
        { id: 'hr_archive', name: 'Архив кадров', recipe: '1 Документооборот → учёт персонала', count: 1, cycle: '—', util: 0.52, state: 'staff', cost: { iron_ore: 260, stone: 220 } },
      ],
    },
  ],
};
const REASON_LABELS_DEMO = { full:'Работает на полную мощность', input:'Не хватает сырья', storage:'Склад заполнен', staff:'Не хватает персонала', comfort:'Персонал недоволен бытом', wear:'Изношено оборудование', power:'Не хватает электроэнергии', night:'Ночь — нет солнца' };
