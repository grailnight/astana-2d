'use strict';
// Карта города по мотивам настоящей Астаны (север сверху, как в 2ГИС):
// Есиль течёт с запада, у центра поворачивает на юго-восток. Правый берег — север и восток
// (вокзал «Астана-1», Центральный парк, Кенесары, мечеть Хазрет Султан и пирамида),
// левый берег — юг и запад (Хан Шатыр, бульвар с Байтереком, Акорда, Арена, EXPO, Бас мешіт, Нұрлы Жол).

const World = (() => {
  const T = { GRASS: 0, ROAD: 1, WALK: 2, WATER: 3, PLAZA: 4, BRIDGE: 5, EMBANK: 6, PATH: 7, LOT: 8, BWALK: 9 };
  const N = MAP_W * MAP_H;
  const tiles = new Uint8Array(N);
  const rdir = new Uint8Array(N); // 1 горизонт., 2 вертик., 3 перекрёсток
  const hrow = new Int8Array(N).fill(-1); // 0 — полоса на запад, 1 — на восток
  const vcol = new Int8Array(N).fill(-1); // 0 — полоса на юг, 1 — на север
  const solid = new Uint8Array(N);
  const reserved = new Uint8Array(N); // парки и площади, куда не ставим жилые дома
  const buildings = [];
  const byId = {};
  const decor = [];
  const busStops = [];
  const pedTiles = [];
  const streets = [];

  const idx = (x, y) => y * MAP_W + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  const tile = (x, y) => (inside(x, y) ? tiles[idx(x, y)] : T.GRASS);
  const set = (x, y, t) => { if (inside(x, y)) tiles[idx(x, y)] = t; };
  const roadDir = (x, y) => (inside(x, y) ? rdir[idx(x, y)] : 0);
  const isRoad = (x, y) => { const t = tile(x, y); return t === T.ROAD || t === T.BRIDGE; };

  // Русло Есиля: ломаная по точкам (x, центр реки по y)
  const RIVER = [[0, 36], [14, 35], [24, 37], [30, 38], [36, 35], [44, 34], [52, 38], [60, 42], [70, 46], [78, 50], [86, 55], [94, 61], [102, 67], [110, 71], [119, 74]];
  function riverC(x) {
    for (let i = 1; i < RIVER.length; i++) {
      const [x0, y0] = RIVER[i - 1], [x1, y1] = RIVER[i];
      if (x <= x1) return Math.round(lerp(y0, y1, (x - x0) / (x1 - x0)));
    }
    return RIVER[RIVER.length - 1][1];
  }

  function fill(x0, y0, x1, y1, t, only) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) continue;
      if (only && !only.includes(tile(x, y))) continue;
      set(x, y, t);
    }
  }
  function reserve(x0, y0, x1, y1) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y)) reserved[idx(x, y)] = 1;
  }

  function hRoad(y0, x0, x1, name) {
    for (let x = x0; x <= x1; x++) for (let k = 0; k < 2; k++) {
      const y = y0 + k, i = idx(x, y);
      const w = tiles[i] === T.WATER || tiles[i] === T.EMBANK;
      tiles[i] = w ? T.BRIDGE : T.ROAD;
      rdir[i] |= 1; hrow[i] = k;
    }
    streets.push({ dir: 'h', y: y0, x0, x1, name });
  }
  function vRoad(x0, y0, y1, nameN, nameS) {
    for (let y = y0; y <= y1; y++) {
      for (let k = 0; k < 2; k++) {
        const x = x0 + k, i = idx(x, y);
        const w = tiles[i] === T.WATER || tiles[i] === T.EMBANK || tiles[i] === T.BRIDGE;
        tiles[i] = w ? T.BRIDGE : T.ROAD;
        rdir[i] |= 2; vcol[i] = k;
      }
      for (const x of [x0 - 1, x0 + 2]) if (tile(x, y) === T.WATER) set(x, y, T.BWALK);
    }
    const c = riverC(x0);
    if (y0 < c && y1 > c && nameS) {
      streets.push({ dir: 'v', x: x0, y0, y1: c, name: nameN });
      streets.push({ dir: 'v', x: x0, y0: c, y1, name: nameS });
    } else streets.push({ dir: 'v', x: x0, y0, y1, name: nameN });
  }

  /* ---------- Ключевые здания ---------- */

  const DEFS = [
    // Правый берег: старый город
    { id: 'station1', name: 'Вокзал «Астана-1»', x: 14, y: 2, w: 15, h: 8, door: 7, landmark: 'oldStation', label: 'АСТАНА-1' },
    { id: 'r1', name: 'Дом на Абая, 3', x: 34, y: 3, w: 9, h: 5, door: 4, res: true, spr: { style: 'panel', facade: 102, wall: '#cdbf9f', roof: '#6f7378' } },
    { id: 'home', name: 'Дом 12 на Сарыарке', x: 12, y: 15, w: 9, h: 7, door: 4, label: 'Дом 12', spr: { style: 'panel', facade: 66, wall: '#d8c7a4', roof: '#7c7f86' } },
    { id: 'shop', name: 'Продукты 24/7', x: 22, y: 18, w: 5, h: 4, door: 2, label: 'Азық-түлік 24/7', spr: { style: 'shop', facade: 30, wall: '#e6e1d6', roof: '#8a8d92', awning: '#2a8f5a' } },
    { id: 'market', name: 'Центральный базар', x: 34, y: 15, w: 10, h: 7, door: 4, label: 'Орталық базар', spr: { style: 'shop', facade: 42, wall: '#c9774a', roof: '#6d6f74', awning: '#d9433a' } },
    { id: 'shawarma', name: 'Шаурма №1', x: 45, y: 18, w: 5, h: 4, door: 2, label: 'Шаурма №1', spr: { style: 'shop', facade: 30, wall: '#f0dfb8', roof: '#7a7c80', awning: '#e8a317' } },
    { id: 'lang', name: 'Тілдер орталығы', x: 51, y: 16, w: 6, h: 6, door: 3, label: 'Тілдер орталығы', spr: { style: 'classic', facade: 44, wall: '#e9e4d6', roof: '#6b7b8c' } },
    { id: 'coffee', name: 'Дала Кофе', x: 61, y: 18, w: 6, h: 4, door: 2, label: 'Дала Кофе', spr: { style: 'shop', facade: 30, wall: '#3e5c4f', roof: '#5d6166', awning: '#c8a26b' } },
    { id: 'courier', name: 'Курьерская служба «Жылдам»', x: 68, y: 17, w: 8, h: 5, door: 5, label: 'Жылдам · курьеры', spr: { style: 'warehouse', facade: 36, wall: '#e8e2d2', roof: '#8b8f94' } },
    { id: 'gym', name: 'Спортзал «Батыр»', x: 77, y: 17, w: 6, h: 5, door: 2, label: 'Батыр Gym', spr: { style: 'modern', facade: 42, wall: '#3b4252', roof: '#5b6170', accent: '#e5533d' } },
    { id: 'karaoke', name: 'Караоке «Әнші»', x: 34, y: 26, w: 7, h: 4, door: 3, label: 'Караоке «Әнші»', spr: { style: 'shop', facade: 30, wall: '#3a2350', roof: '#4a3a5a', awning: '#e84a8a', litRate: 0.9 } },
    { id: 'toyhana', name: 'Той-хана «Алтын Сарай»', x: 42, y: 26, w: 14, h: 4, door: 6, label: 'Алтын Сарай', spr: { style: 'palace', facade: 46, wall: '#f6efe0', roof: '#c9a24a', dome: true, litRate: 0.85 } },
    { id: 'hospital', name: 'Городская больница', x: 61, y: 26, w: 9, h: 6, door: 4, label: 'Емхана', spr: { style: 'panel', facade: 54, wall: '#eef1f2', roof: '#9aa5ad', cross: true, litRate: 0.8 } },
    { id: 'mosque', name: 'Мечеть Хазрет Султан', x: 88, y: 27, w: 14, h: 10, door: 7, landmark: 'mosque', label: 'Әзірет Сұлтан' },
    { id: 'pyramid', name: 'Дворец мира и согласия', x: 89, y: 45, w: 11, h: 7, door: 5, landmark: 'pyramid', label: 'Бейбітшілік сарайы' },
    // Левый берег: новый центр
    { id: 'khan', name: 'Хан Шатыр', x: 13, y: 53, w: 14, h: 8, door: 7, landmark: 'khan', label: 'Хан Шатыр' },
    { id: 'baiterek', name: 'Байтерек', x: 43, y: 55, w: 4, h: 4, door: 1, landmark: 'baiterek', label: 'Бәйтерек' },
    { id: 'akorda', name: 'Акорда', x: 61, y: 53, w: 14, h: 8, door: 6, landmark: 'akorda', label: 'Ақорда' },
    { id: 'arena', name: 'Астана Арена', x: 13, y: 66, w: 15, h: 12, door: 7, landmark: 'arena', label: 'Астана Арена' },
    { id: 'office', name: 'БЦ «Steppe Digital»', x: 34, y: 66, w: 7, h: 11, door: 3, label: 'Steppe Digital', spr: { style: 'glass', facade: 190, wall: '#cfd8de', roof: '#8d99a3', glass: '#4f86b0' } },
    { id: 'realty', name: 'Агентство «Жаңа Үй»', x: 42, y: 72, w: 5, h: 5, door: 2, label: 'Жаңа Үй', spr: { style: 'glass', facade: 42, wall: '#dfe6ea', roof: '#8d99a3', glass: '#7aa7c2' } },
    { id: 'mall', name: 'ТРЦ «Самал Плаза»', x: 14, y: 83, w: 13, h: 8, door: 6, label: 'Самал Плаза', spr: { style: 'mall', facade: 54, wall: '#e9edf0', roof: '#a3acb4', accent: '#2ec4e6' } },
    { id: 'expo', name: 'EXPO «Нұр Әлем»', x: 38, y: 83, w: 11, h: 11, door: 5, landmark: 'expo', label: 'Нұр Әлем' },
    { id: 'university', name: 'Университет', x: 13, y: 99, w: 12, h: 9, door: 5, label: 'Университет', spr: { style: 'classic', facade: 56, wall: '#efe6d2', roof: '#7d6a58' } },
    { id: 'grandmosque', name: 'Республиканская мечеть', x: 37, y: 99, w: 14, h: 10, door: 7, landmark: 'grandMosque', label: 'Бас мешіт' },
    { id: 'station', name: 'Вокзал «Нұрлы Жол»', x: 89, y: 99, w: 15, h: 10, door: 7, landmark: 'station', label: 'НҰРЛЫ ЖОЛ' },
  ];

  const LANDMARKS = {
    baiterek: () => Art.baiterek(), khan: () => Art.khanShatyr(), akorda: () => Art.akorda(), mosque: () => Art.mosque(),
    grandMosque: () => Art.mosque({ dome: '#3f7fd1', domeL: '#9cc8f2', domeD: '#1f4f95', trim: '#2a4f8a', w: 224 }),
    pyramid: () => Art.pyramid(), expo: () => Art.expo(), station: () => Art.station(), arena: () => Art.arena(), oldStation: () => Art.oldStation(),
  };

  const tplCache = new Map();
  function addBuilding(d, i) {
    const b = Object.assign({}, d);
    b.doorX = d.x + d.door;
    b.doorY = d.y + d.h;
    b.base = (d.y + d.h) * TILE;
    let art;
    if (d.landmark) art = LANDMARKS[d.landmark]();
    else {
      // одинаковые дома-заполнители рисуем один раз
      const key = d.tpl || null;
      art = key && tplCache.get(key);
      if (!art) {
        art = Art.makeBuilding(Object.assign({ w: d.w, h: d.h, doorX: d.door, seed: i + 3 }, d.spr));
        if (key) tplCache.set(key, art);
      }
    }
    b.sprite = art.cv; b.lights = art.lights;
    b.sx = d.x * TILE; b.sy = b.base - art.H; b.sw = art.W; b.sh = art.H;
    b.depth = d.landmark ? 0 : Math.max(10, d.h * TILE - (d.spr ? d.spr.facade : 0));
    for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) solid[idx(x, y)] = 1;
    buildings.push(b);
    byId[b.id] = b;
    return b;
  }

  function carveDoorPath(b) {
    let x = b.doorX, y = b.doorY;
    const walkable = [T.WALK, T.PLAZA, T.ROAD, T.EMBANK, T.LOT, T.BWALK];
    if (!walkable.includes(tile(x, y))) set(x, y, T.PATH);
    for (let k = 1; k < 10; k++) {
      const t = tile(x, y + k);
      if (walkable.includes(t) || t === T.PATH) break;
      if (solid[idx(x, y + k)]) break;
      set(x, y + k, T.PATH);
    }
  }

  function addDecor(kind, tx, ty, extra) {
    const d = Object.assign({ kind, x: tx * TILE + 8, y: ty * TILE + 15, tx, ty }, extra);
    decor.push(d);
    return d;
  }

  /* ---------- Жилые кварталы-заполнители ---------- */

  const OLD_WALLS = ['#d8c7a4', '#c9b8a8', '#cdbf9f', '#b9c3c9', '#d6b48c', '#c3ccd2', '#e0d6c2'];
  const NEW_WALLS = ['#f0ece6', '#eef0ea', '#f4efe4', '#ece6f0', '#e8e4dc', '#e4ecef'];
  const ACCENTS = ['#e5533d', '#2ec4e6', '#7cc66b', '#f6c343', '#9b59b6', '#e67e22'];
  const ADDR = { old: ['Абая', 'Кенесары', 'Бейбітшілік', 'Сейфуллина', 'Жеңіс', 'Республики', 'Иманова', 'Ауэзова'], new: ['Достык', 'Сығанақ', 'Орынбор', 'Мәңгілік Ел', 'Қабанбай батыр', 'Тұран', 'Ұлы Дала', 'Сауран'] };
  let resN = 0;

  function areaFree(x0, y0, x1, y1) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) return false;
      const i = idx(x, y);
      if (solid[i] || reserved[i] || tiles[i] !== T.GRASS) return false;
    }
    return true;
  }

  // Ставит ряд домов дверями к улице снизу; kind: 'old' (панельки) или 'new' (новые ЖК)
  function fillRow(x0, x1, top, bottom, kind, seed) {
    let x = x0;
    let n = 0;
    while (x <= x1 - 3) {
      const r = hash2(x, top, seed);
      const w = 5 + Math.floor(r * 5);
      if (x + w - 1 > x1) { x++; continue; }
      const maxH = bottom - top;
      if (maxH < 3) return;
      const h = Math.min(maxH, 3 + Math.floor(hash2(x, top, seed + 1) * 4));
      const y = bottom - h; // дверь на строке bottom
      if (!areaFree(x, y, x + w - 1, bottom)) { x++; continue; }
      const v = Math.floor(hash2(x, top, seed + 2) * 6);
      let spr, tpl;
      if (kind === 'old') {
        const floors = 4 + Math.floor(hash2(x, y, seed + 3) * 4);
        spr = { style: 'panel', facade: floors * 12 + 6, wall: OLD_WALLS[v % OLD_WALLS.length], roof: '#6f7378' };
      } else if (v === 5) {
        spr = { style: 'glass', facade: 96 + Math.floor(hash2(x, y, seed + 4) * 3) * 16, wall: '#d6dee4', roof: '#8d99a3', glass: pick(['#4f86b0', '#5d8fb3', '#3f7f8f', '#6a8fb8']) };
      } else {
        const floors = 5 + Math.floor(hash2(x, y, seed + 3) * 4);
        spr = { style: 'modern', facade: floors * 12 + 6, wall: NEW_WALLS[v % NEW_WALLS.length], roof: '#7d838a', accent: ACCENTS[(v + Math.floor(x / 7)) % ACCENTS.length] };
      }
      tpl = `${spr.style}|${w}|${h}|${spr.facade}|${spr.wall}|${spr.accent || spr.glass || ''}`;
      resN++;
      const street = ADDR[kind === 'old' ? 'old' : 'new'][Math.floor(hash2(x, y, 9) * 8)];
      addBuilding({ id: 'res' + resN, name: `${kind === 'old' ? 'Дом' : 'ЖК'} на ${street}, ${2 + Math.floor(hash2(x, y, 7) * 60)}`, x, y, w, h, door: Math.floor(w / 2), res: true, filler: true, spr, tpl }, 100 + resN);
      x += w + 1 + (hash2(x, y, 5) < 0.3 ? 1 : 0);
      n++;
    }
    return n;
  }

  // Заполняет квартал: нижний ряд дверями к улице снизу, верхний — ко двору, двор выводится к боковым тротуарам
  function fillBlock(x0, y0, x1, y1, kind, seed) {
    const H = y1 - y0 + 1;
    if (H >= 12) {
      const mid = y0 + Math.floor(H / 2) - 1;
      fillRow(x0, x1, y0, mid, kind, seed + 11);
      for (let x = x0 - 1; x <= x1 + 1; x++) if (tile(x, mid + 1) === T.GRASS && !solid[idx(x, mid + 1)] && !reserved[idx(x, mid + 1)]) set(x, mid + 1, T.PATH);
      fillRow(x0, x1, mid + 3, y1, kind, seed);
    } else fillRow(x0, x1, y0, y1, kind, seed);
  }

  /* ---------- Генерация ---------- */

  function gen() {
    tiles.fill(T.GRASS);
    // река и набережные
    for (let x = 0; x < MAP_W; x++) {
      const c = riverC(x);
      for (let y = c - 2; y <= c + 2; y++) set(x, y, T.WATER);
      set(x, c - 3, T.EMBANK); set(x, c + 3, T.EMBANK);
    }
    // прогулочная набережная на правом берегу у центра
    for (let x = 30; x < 60; x++) { const c = riverC(x); if (tile(x, c - 4) === T.GRASS) set(x, c - 4, T.PLAZA); }

    // улицы
    hRoad(13, 0, MAP_W - 1, 'пр. Богенбай батыра');
    hRoad(24, 0, MAP_W - 1, 'ул. Кенесары');
    hRoad(48, 0, 59, 'ул. Ақмешіт');
    hRoad(63, 0, 85, 'ул. Сығанақ');
    hRoad(80, 0, MAP_W - 1, 'пр. Қабанбай батыр');
    hRoad(96, 0, MAP_W - 1, 'пр. Ұлы Дала');
    hRoad(112, 0, MAP_W - 1, 'ул. Хусейн бен Талал');
    vRoad(9, 0, riverC(9) - 5, 'пр. Сарыарқа');
    vRoad(9, riverC(9) + 5, MAP_H - 1, 'ул. Әл-Фараби');
    vRoad(31, 0, MAP_H - 1, 'пр. Республики', 'пр. Тұран');
    vRoad(58, 0, MAP_H - 1, 'ул. Бейбітшілік', 'пр. Мәңгілік Ел');
    vRoad(84, 0, MAP_H - 1, 'пр. Тәуелсіздік', 'ул. Сауран');
    vRoad(110, 0, riverC(110) - 5, 'пр. Абылай хана');
    vRoad(110, riverC(110) + 5, MAP_H - 1, 'ул. Е-10');
    // пешеходный мост от бульвара к той-хане
    for (let y = 28; y < 44; y++) for (const x of [44, 45]) if (tile(x, y) === T.WATER) set(x, y, T.BWALK);

    // тротуары
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const t = tile(x, y);
      if (t !== T.GRASS && t !== T.PATH && t !== T.PLAZA) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (tile(x + dx, y + dy) === T.ROAD) { near = true; break; }
      if (near) set(x, y, T.WALK);
    }

    // площади, парки, бульвар Нұржол
    fill(33, 51, 56, 61, T.PLAZA); reserve(33, 50, 56, 62);
    fill(14, 10, 28, 11, T.PLAZA, [T.GRASS]); reserve(10, 10, 30, 11);
    fill(87, 38, 102, 40, T.PLAZA, [T.GRASS]); reserve(86, 37, 104, 41);
    fill(88, 109, 105, 110, T.PLAZA, [T.GRASS]);
    fill(36, 94, 50, 94, T.PLAZA, [T.GRASS]);
    reserve(11, 26, 29, 33);           // Центральный парк
    reserve(0, 39, 30, 46);            // Ботанический сад
    reserve(76, 49, 90, 62);           // Президентский парк
    reserve(60, 33, 82, 45);           // зелёная набережная
    fill(11, 29, 29, 29, T.PATH, [T.GRASS]); fill(20, 26, 20, 33, T.PATH, [T.GRASS]);
    fill(2, 43, 29, 43, T.PATH, [T.GRASS]);
    fill(0, 122, MAP_W - 1, 122, T.PATH, [T.GRASS]); // аллея вдоль южной окраины

    DEFS.forEach(addBuilding);
    // проходы от дверей ключевых зданий к улице не застраиваем
    for (const b of buildings) for (let k = 0; k < 10; k++) {
      const t = tile(b.doorX, b.doorY + k);
      if (t !== T.GRASS && t !== T.PATH) break;
      for (const dx of [-1, 0, 1]) if (inside(b.doorX + dx, b.doorY + k)) reserved[idx(b.doorX + dx, b.doorY + k)] = 1;
    }

    // кварталы с жилыми домами: правый берег — панельки, левый — новые ЖК
    const BLOCKS = [
      [0, 0, 7, 11, 'old'], [33, 0, 56, 11, 'old'], [60, 0, 82, 11, 'old'], [86, 0, 108, 11, 'old'], [112, 0, 119, 11, 'old'],
      [0, 15, 7, 22, 'old'], [86, 15, 108, 22, 'old'], [112, 15, 119, 22, 'old'],
      [0, 26, 7, 30, 'old'], [70, 26, 82, 32, 'old'], [104, 26, 108, 40, 'old'], [112, 26, 119, 64, 'old'],
      [0, 50, 7, 61, 'new'], [0, 65, 7, 78, 'new'], [48, 65, 56, 78, 'new'], [60, 65, 82, 78, 'new'], [86, 69, 108, 78, 'new'], [112, 78, 119, 78, 'new'],
      [0, 82, 7, 94, 'new'], [50, 82, 56, 94, 'new'], [60, 82, 82, 94, 'new'], [86, 82, 108, 94, 'new'], [112, 82, 119, 94, 'new'],
      [0, 98, 7, 110, 'new'], [26, 98, 29, 110, 'new'], [52, 98, 56, 110, 'new'], [60, 98, 82, 110, 'new'], [106, 98, 108, 110, 'new'], [112, 98, 119, 110, 'new'],
      [0, 114, 7, 121, 'new'], [11, 114, 29, 121, 'new'], [33, 114, 56, 121, 'new'], [60, 114, 82, 121, 'new'], [86, 114, 108, 121, 'new'], [112, 114, 119, 121, 'new'],
    ];
    BLOCKS.forEach(([x0, y0, x1, y1, kind], i) => fillBlock(x0, y0, Math.min(x1, MAP_W - 1), Math.min(y1, MAP_H - 1), kind, i * 13 + 1));
    buildings.forEach(carveDoorPath);

    // фонтаны, юрта, колесо обозрения, монумент «Қазақ Елі»
    for (const fx of [36, 50]) {
      addDecor('fountain', fx + 1, 58, { w: 3 });
      for (let y = 57; y <= 58; y++) for (let x = fx; x <= fx + 2; x++) solid[idx(x, y)] = 1;
    }
    addDecor('yurt', 26, 27);
    for (let y = 26; y <= 27; y++) for (let x = 25; x <= 27; x++) solid[idx(x, y)] = 1;
    addDecor('wheel', 16, 42, { id: 'wheel' });
    for (let x = 14; x <= 18; x++) solid[idx(x, 42)] = 1;
    addDecor('stele', 94, 39);
    solid[idx(94, 39)] = 1;

    // деревья вдоль бульвара
    for (let x = 34; x <= 55; x += 3) {
      if (x > 40 && x < 50) continue;
      for (const y of [51, 61]) { addDecor('tree', x, y, { tk: 'leaf', v: x % 4 }); solid[idx(x, y)] = 1; }
    }
    // скамейки и фонари
    for (const [x, y] of [[39, 55], [48, 55], [39, 60], [53, 60], [14, 29], [24, 29], [8, 43], [24, 43], [80, 57], [96, 40]]) addDecor('bench', x, y);
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const t = tile(x, y);
      if (t === T.WALK && (x * 7 + y * 3) % 9 === 0 && !solid[idx(x, y)]) {
        let road = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (tile(x + dx, y + dy) === T.ROAD) road = true;
        if (road) addDecor('lamp', x, y);
      }
      if (t === T.EMBANK && x % 6 === 0) addDecor('lamp', x, y);
      if (t === T.PLAZA && y >= 51 && y <= 61 && (y === 52 || y === 60) && x % 6 === 2) addDecor('lamp', x, y);
    }

    // остановки
    const stops = [
      ['st1', 'Вокзал Астана-1', 26, 12], ['sary', 'Сарыарка', 18, 23], ['bazar', 'Орталық базар', 40, 23],
      ['coffee', 'Кенесары', 64, 23], ['mosque', 'Әзірет Сұлтан', 86, 27], ['khan', 'Хан Шатыр', 23, 62], ['baiterek', 'Бәйтерек', 44, 50],
      ['akorda', 'Ақорда', 70, 62], ['arena', 'Астана Арена', 24, 79], ['expo', 'EXPO', 51, 95], ['univer', 'Университет', 22, 111], ['vokzal', 'Нұрлы Жол', 101, 111],
    ];
    for (const [id, name, x, y] of stops) {
      busStops.push({ id, name, tx: x, ty: y, x: x * TILE + 8, y: y * TILE + 12 });
      addDecor('bus', x, y);
    }
    // таблички с названиями улиц на перекрёстках
    for (const s of streets) if (s.dir === 'v') {
      for (const h of streets) if (h.dir === 'h' && h.y > s.y0 && h.y < s.y1 && s.x > h.x0 && s.x < h.x1) {
        const tx = s.x - 1, ty = h.y - 1;
        if (tile(tx, ty) === T.WALK) addDecor('sign', tx, ty, { a: h.name, b: s.name });
      }
    }

    // кот в Центральном парке
    addDecor('cat', 14, 29);

    // деревья на свободной траве
    const doorNear = (x, y) => buildings.some((b) => Math.abs(b.doorX - x) <= 1 && y >= b.doorY && y <= b.doorY + 2);
    for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
      if (tile(x, y) !== T.GRASS || solid[idx(x, y)] || doorNear(x, y)) continue;
      const park = reserved[idx(x, y)];
      const p = park ? 0.3 : 0.1;
      if (hash2(x, y, 42) < p) {
        const pine = hash2(x, y, 43) < (park ? 0.35 : 0.5);
        addDecor('tree', x, y, { tk: pine ? 'pine' : 'leaf', v: Math.floor(hash2(x, y, 44) * 4) });
        solid[idx(x, y)] = 1;
      }
    }

    // вода — непроходима
    for (let i = 0; i < N; i++) if (tiles[i] === T.WATER) solid[i] = 1;
    for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
      const t = tile(x, y);
      if ((t === T.WALK || t === T.PLAZA || t === T.EMBANK || t === T.PATH || t === T.BWALK) && !solid[idx(x, y)]) pedTiles.push([x, y]);
    }
    decor.sort((a, b) => a.y - b.y);
  }

  function isSolidTile(x, y) {
    if (!inside(x, y)) return true;
    return solid[idx(x, y)] === 1;
  }
  function isPedTile(x, y) {
    const t = tile(x, y);
    return (t === T.WALK || t === T.PLAZA || t === T.EMBANK || t === T.PATH || t === T.BWALK) && !isSolidTile(x, y);
  }

  function district(px, py) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    const c = riverC(tx);
    if (ty >= c - 2 && ty <= c + 2) return 'Река Есіл';
    if (ty < c) {
      if (ty >= c - 5) return 'Правый берег · Набережная';
      if (tx >= 84 && ty >= 26) return 'Правый берег · Площадь «Қазақ Елі»';
      return tx < 45 ? 'Правый берег · Сарыарка' : 'Правый берег · Алматы ауданы';
    }
    if (ty <= c + 8 && ty < 48) return 'Левый берег · Ботанический сад';
    if (ty >= 50 && ty <= 62 && tx >= 32 && tx <= 57) return 'Левый берег · Нұржол бульвары';
    if (ty >= 50 && ty <= 62 && tx >= 60 && tx <= 90) return 'Левый берег · Ақорда';
    if (ty > 80 && ty < 112 && tx >= 32 && tx < 58) return 'Левый берег · EXPO';
    if (tx >= 84 && ty > 80) return 'Левый берег · Нұра ауданы';
    return 'Левый берег · Есіл ауданы';
  }

  function streetAt(px, py) {
    const tx = px / TILE, ty = py / TILE;
    let best = null, bd = 3;
    for (const s of streets) {
      const d = s.dir === 'h' ? (tx >= s.x0 && tx <= s.x1 + 1 ? Math.abs(ty - (s.y + 1)) : 99) : (ty >= s.y0 && ty <= s.y1 + 1 ? Math.abs(tx - (s.x + 1)) : 99);
      if (d < bd) { bd = d; best = s; }
    }
    return best ? best.name : null;
  }

  // Допустимые направления движения машин на клетке
  function laneDirs(x, y) {
    if (!inside(x, y)) return [];
    const i = idx(x, y), out = [];
    if (hrow[i] === 0) out.push([-1, 0]);
    if (hrow[i] === 1) out.push([1, 0]);
    if (vcol[i] === 0) out.push([0, 1]);
    if (vcol[i] === 1) out.push([0, -1]);
    return out;
  }

  // Точки въезда машин на краях карты
  let entries = null;
  function laneEntries() {
    if (entries) return entries;
    entries = [];
    for (let y = 0; y < MAP_H; y++) {
      if (laneDirs(0, y).some((d) => d[0] === 1)) entries.push({ x: 0, y, d: [1, 0] });
      if (laneDirs(MAP_W - 1, y).some((d) => d[0] === -1)) entries.push({ x: MAP_W - 1, y, d: [-1, 0] });
    }
    for (let x = 0; x < MAP_W; x++) {
      if (laneDirs(x, 0).some((d) => d[1] === 1)) entries.push({ x, y: 0, d: [0, 1] });
      if (laneDirs(x, MAP_H - 1).some((d) => d[1] === -1)) entries.push({ x, y: MAP_H - 1, d: [0, -1] });
    }
    return entries;
  }

  return {
    T, gen, tile, roadDir, isRoad, isSolidTile, isPedTile, district, streetAt, laneDirs, laneEntries, riverC,
    buildings, byId, decor, busStops, pedTiles, streets,
  };
})();
