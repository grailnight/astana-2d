'use strict';
// Карта города: тайлы, здания, декор, остановки, полосы движения.

const World = (() => {
  const T = { GRASS: 0, ROAD: 1, WALK: 2, WATER: 3, PLAZA: 4, BRIDGE: 5, EMBANK: 6, PATH: 7, LOT: 8, BWALK: 9 };
  const N = MAP_W * MAP_H;
  const tiles = new Uint8Array(N);
  const rdir = new Uint8Array(N); // 1 горизонт., 2 вертик., 3 перекрёсток
  const hrow = new Int8Array(N).fill(-1); // 0 — полоса на запад, 1 — на восток
  const vcol = new Int8Array(N).fill(-1); // 0 — полоса на юг, 1 — на север
  const solid = new Uint8Array(N);
  const buildings = [];
  const byId = {};
  const decor = [];
  const busStops = [];
  const pedTiles = [];

  const idx = (x, y) => y * MAP_W + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  const tile = (x, y) => (inside(x, y) ? tiles[idx(x, y)] : T.GRASS);
  const set = (x, y, t) => { if (inside(x, y)) tiles[idx(x, y)] = t; };
  const roadDir = (x, y) => (inside(x, y) ? rdir[idx(x, y)] : 0);
  const isRoad = (x, y) => { const t = tile(x, y); return t === T.ROAD || t === T.BRIDGE; };
  const riverC = (x) => 35 + Math.round(Math.sin(x / 9) * 1.2);

  function fill(x0, y0, x1, y1, t, only) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) continue;
      if (only && !only.includes(tile(x, y))) continue;
      set(x, y, t);
    }
  }

  function hRoad(y0, x0, x1) {
    for (let x = x0; x <= x1; x++) for (let k = 0; k < 2; k++) {
      const y = y0 + k, i = idx(x, y);
      const w = tiles[i] === T.WATER || tiles[i] === T.EMBANK;
      tiles[i] = w ? T.BRIDGE : T.ROAD;
      rdir[i] |= 1; hrow[i] = k;
    }
  }
  function vRoad(x0, y0, y1) {
    for (let y = y0; y <= y1; y++) {
      for (let k = 0; k < 2; k++) {
        const x = x0 + k, i = idx(x, y);
        const w = tiles[i] === T.WATER || tiles[i] === T.EMBANK || tiles[i] === T.BRIDGE;
        tiles[i] = w ? T.BRIDGE : T.ROAD;
        rdir[i] |= 2; vcol[i] = k;
      }
      for (const x of [x0 - 1, x0 + 2]) if (tile(x, y) === T.WATER) set(x, y, T.BWALK);
    }
  }

  /* ---------- Здания ---------- */

  const DEFS = [
    // Правый берег
    { id: 'home', name: 'Дом 12 на Сарыарке', x: 2, y: 9, w: 9, h: 6, door: 4, label: 'Дом 12', spr: { style: 'panel', facade: 66, wall: '#d8c7a4', roof: '#7c7f86' } },
    { id: 'shop', name: 'Продукты 24/7', x: 11, y: 12, w: 5, h: 4, door: 2, label: 'Азық-түлік 24/7', spr: { style: 'shop', facade: 30, wall: '#e6e1d6', roof: '#8a8d92', awning: '#2a8f5a' } },
    { id: 'market', name: 'Центральный базар', x: 22, y: 10, w: 10, h: 6, door: 4, label: 'Орталық базар', spr: { style: 'shop', facade: 42, wall: '#c9774a', roof: '#6d6f74', awning: '#d9433a' } },
    { id: 'shawarma', name: 'Шаурма №1', x: 33, y: 13, w: 5, h: 3, door: 2, label: 'Шаурма №1', spr: { style: 'shop', facade: 30, wall: '#f0dfb8', roof: '#7a7c80', awning: '#e8a317' } },
    { id: 'lang', name: 'Тілдер орталығы', x: 39, y: 10, w: 7, h: 6, door: 3, label: 'Тілдер орталығы', spr: { style: 'classic', facade: 44, wall: '#e9e4d6', roof: '#6b7b8c' } },
    { id: 'coffee', name: 'Дала Кофе', x: 52, y: 12, w: 6, h: 4, door: 2, label: 'Дала Кофе', spr: { style: 'shop', facade: 30, wall: '#3e5c4f', roof: '#5d6166', awning: '#c8a26b' } },
    { id: 'courier', name: 'Курьерская служба «Жылдам»', x: 60, y: 11, w: 8, h: 5, door: 5, label: 'Жылдам · курьеры', spr: { style: 'warehouse', facade: 36, wall: '#e8e2d2', roof: '#8b8f94' } },
    { id: 'gym', name: 'Спортзал «Батыр»', x: 70, y: 11, w: 8, h: 5, door: 3, label: 'Батыр Gym', spr: { style: 'modern', facade: 42, wall: '#3b4252', roof: '#5b6170', accent: '#e5533d' } },
    { id: 'mosque', name: 'Мечеть Хазрет Султан', x: 84, y: 9, w: 14, h: 9, door: 7, landmark: 'mosque', label: 'Әзірет Сұлтан' },
    { id: 'hospital', name: 'Городская больница', x: 2, y: 23, w: 9, h: 6, door: 4, label: 'Емхана', spr: { style: 'panel', facade: 54, wall: '#eef1f2', roof: '#9aa5ad', cross: true, litRate: 0.8 } },
    { id: 'karaoke', name: 'Караоке «Әнші»', x: 51, y: 24, w: 7, h: 5, door: 3, label: 'Караоке «Әнші»', spr: { style: 'shop', facade: 30, wall: '#3a2350', roof: '#4a3a5a', awning: '#e84a8a', litRate: 0.9 } },
    { id: 'toyhana', name: 'Той-хана «Алтын Сарай»', x: 61, y: 23, w: 16, h: 6, door: 7, label: 'Алтын Сарай', spr: { style: 'palace', facade: 46, wall: '#f6efe0', roof: '#c9a24a', dome: true, litRate: 0.85 } },
    { id: 'pyramid', name: 'Дворец мира и согласия', x: 85, y: 23, w: 11, h: 7, door: 5, landmark: 'pyramid', label: 'Бейбітшілік сарайы' },
    // Левый берег
    { id: 'khan', name: 'Хан Шатыр', x: 2, y: 48, w: 14, h: 8, door: 7, landmark: 'khan', label: 'Хан Шатыр' },
    { id: 'baiterek', name: 'Байтерек', x: 47, y: 50, w: 4, h: 4, door: 1, landmark: 'baiterek', label: 'Бәйтерек' },
    { id: 'akorda', name: 'Акорда', x: 84, y: 48, w: 14, h: 8, door: 6, landmark: 'akorda', label: 'Ақорда' },
    { id: 'arena', name: 'Астана Арена', x: 2, y: 61, w: 15, h: 12, door: 7, landmark: 'arena', label: 'Астана Арена' },
    { id: 'university', name: 'Университет', x: 21, y: 61, w: 12, h: 9, door: 5, label: 'Университет', spr: { style: 'classic', facade: 56, wall: '#efe6d2', roof: '#7d6a58' } },
    { id: 'office', name: 'БЦ «Steppe Digital»', x: 35, y: 61, w: 7, h: 8, door: 3, label: 'Steppe Digital', spr: { style: 'glass', facade: 174, wall: '#cfd8de', roof: '#8d99a3', glass: '#4f86b0' } },
    { id: 'realty', name: 'Агентство «Жаңа Үй»', x: 42, y: 64, w: 5, h: 5, door: 2, label: 'Жаңа Үй', spr: { style: 'glass', facade: 42, wall: '#dfe6ea', roof: '#8d99a3', glass: '#7aa7c2' } },
    { id: 'expo', name: 'EXPO «Нұр Әлем»', x: 52, y: 61, w: 11, h: 11, door: 5, landmark: 'expo', label: 'Нұр Әлем' },
    { id: 'mall', name: 'ТРЦ «Самал Плаза»', x: 65, y: 62, w: 13, h: 8, door: 6, label: 'Самал Плаза', spr: { style: 'mall', facade: 54, wall: '#e9edf0', roof: '#a3acb4', accent: '#2ec4e6' } },
    { id: 'station', name: 'Вокзал «Нұрлы Жол»', x: 83, y: 61, w: 15, h: 11, door: 7, landmark: 'station', label: 'НҰРЛЫ ЖОЛ' },
    // Жилые дома (адреса для доставок)
    { id: 'r1', name: 'Дом на Абая, 3', x: 2, y: 1, w: 7, h: 4, door: 3, res: true, spr: { style: 'panel', facade: 114, wall: '#cdbf9f', roof: '#6f7378' } },
    { id: 'r2', name: 'ЖК «Сұңқар»', x: 10, y: 1, w: 7, h: 4, door: 3, res: true, spr: { style: 'modern', facade: 90, wall: '#e8e4dc', roof: '#7d838a', accent: '#e5533d' } },
    { id: 'r3', name: 'Дом на Республики, 8', x: 21, y: 1, w: 9, h: 4, door: 4, res: true, spr: { style: 'panel', facade: 102, wall: '#b9c3c9', roof: '#6f7378' } },
    { id: 'r4', name: 'ЖК «Көктем»', x: 31, y: 1, w: 8, h: 4, door: 4, res: true, spr: { style: 'modern', facade: 126, wall: '#f0ece6', roof: '#7d838a', accent: '#2ec4e6' } },
    { id: 'r5', name: 'Дом на Кенесары, 40', x: 40, y: 1, w: 7, h: 4, door: 3, res: true, spr: { style: 'panel', facade: 90, wall: '#d6b48c', roof: '#6f7378' } },
    { id: 'r6', name: 'ЖК «Жасыл Ел»', x: 51, y: 1, w: 8, h: 4, door: 4, res: true, spr: { style: 'modern', facade: 114, wall: '#eef0ea', roof: '#7d838a', accent: '#7cc66b' } },
    { id: 'r7', name: 'Дом на Бейбітшілік, 17', x: 60, y: 1, w: 9, h: 4, door: 4, res: true, spr: { style: 'panel', facade: 66, wall: '#c9b8a8', roof: '#6f7378' } },
    { id: 'r8', name: 'ЖК «Алтын Күн»', x: 70, y: 1, w: 9, h: 4, door: 4, res: true, spr: { style: 'modern', facade: 138, wall: '#f4efe4', roof: '#7d838a', accent: '#f6c343' } },
    { id: 'r9', name: 'Дом на Победы, 5', x: 83, y: 1, w: 8, h: 4, door: 4, res: true, spr: { style: 'panel', facade: 102, wall: '#c3ccd2', roof: '#6f7378' } },
    { id: 'r10', name: 'ЖК «Шаңырақ»', x: 92, y: 1, w: 7, h: 4, door: 3, res: true, spr: { style: 'modern', facade: 90, wall: '#ece6f0', roof: '#7d838a', accent: '#9b59b6' } },
    { id: 'r11', name: 'Общежитие на Сейфуллина', x: 12, y: 23, w: 5, h: 5, door: 2, res: true, spr: { style: 'panel', facade: 54, wall: '#d4c3a3', roof: '#6f7378' } },
  ];

  const LANDMARKS = { baiterek: Art.baiterek, khan: Art.khanShatyr, akorda: Art.akorda, mosque: Art.mosque, pyramid: Art.pyramid, expo: Art.expo, station: Art.station, arena: Art.arena };

  function addBuilding(d, i) {
    const b = Object.assign({}, d);
    b.doorX = d.x + d.door;
    b.doorY = d.y + d.h;
    b.base = (d.y + d.h) * TILE;
    const art = d.landmark ? LANDMARKS[d.landmark]() : Art.makeBuilding(Object.assign({ w: d.w, h: d.h, doorX: d.door, seed: i + 3 }, d.spr));
    b.sprite = art.cv; b.lights = art.lights;
    b.sx = d.x * TILE; b.sy = b.base - art.H; b.sw = art.W; b.sh = art.H;
    for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) solid[idx(x, y)] = 1;
    buildings.push(b);
    byId[b.id] = b;
  }

  function carveDoorPath(b) {
    let x = b.doorX, y = b.doorY;
    const walkable = [T.WALK, T.PLAZA, T.ROAD, T.EMBANK, T.LOT, T.BWALK];
    if (!walkable.includes(tile(x, y))) set(x, y, T.PATH);
    for (let k = 1; k < 8; k++) {
      const t = tile(x, y + k);
      if (walkable.includes(t) || t === T.PATH) break;
      if (solid[idx(x, y + k)]) break;
      set(x, y + k, T.PATH);
    }
  }

  function addDecor(kind, tx, ty, extra) {
    decor.push(Object.assign({ kind, x: tx * TILE + 8, y: ty * TILE + 15 }, extra));
  }

  function gen() {
    tiles.fill(T.GRASS);
    // река и набережные
    for (let x = 0; x < MAP_W; x++) {
      const c = riverC(x);
      for (let y = c - 2; y <= c + 2; y++) set(x, y, T.WATER);
      set(x, c - 3, T.EMBANK); set(x, c + 3, T.EMBANK);
      for (let y = 30; y <= c - 4; y++) set(x, y, T.PLAZA);
      set(x, c + 4, T.PATH);
    }
    // дороги
    for (const y of [6, 20, 45, 58]) hRoad(y, 1, 98);
    vRoad(18, 1, 74);
    vRoad(48, 1, 46);
    vRoad(48, 58, 74);
    vRoad(80, 1, 74);
    // пешеходный мост
    for (let y = 28; y < 42; y++) for (const x of [64, 65]) if (tile(x, y) === T.WATER) set(x, y, T.BWALK);
    // тротуары
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const t = tile(x, y);
      if (t !== T.GRASS && t !== T.PATH && t !== T.PLAZA) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (tile(x + dx, y + dy) === T.ROAD) { near = true; break; }
      if (near) set(x, y, T.WALK);
    }
    // бульвар Нұржол и площади
    fill(21, 48, 78, 56, T.PLAZA);
    fill(83, 72, 98, 74, T.PLAZA);
    fill(51, 72, 63, 74, T.PLAZA);
    fill(3, 73, 16, 74, T.PLAZA);
    fill(21, 70, 33, 74, T.PLAZA, [T.GRASS]);
    fill(64, 70, 78, 74, T.PLAZA, [T.GRASS]);
    fill(2, 17, 10, 18, T.LOT);
    // парк на правом берегу
    fill(21, 26, 46, 26, T.PATH, [T.GRASS]);
    fill(33, 23, 33, 29, T.PATH, [T.GRASS]);

    DEFS.forEach(addBuilding);
    buildings.forEach(carveDoorPath);

    // фонтаны и юрта
    for (const fx of [31, 63]) {
      addDecor('fountain', fx + 1, 53, { w: 3 });
      for (let y = 52; y <= 53; y++) for (let x = fx; x <= fx + 2; x++) solid[idx(x, y)] = 1;
    }
    addDecor('yurt', 41, 24);
    for (let y = 23; y <= 24; y++) for (let x = 40; x <= 42; x++) solid[idx(x, y)] = 1;

    // деревья вдоль бульвара
    for (let x = 22; x <= 77; x += 3) {
      if (x > 41 && x < 56) continue;
      for (const y of [48, 56]) { addDecor('tree', x, y, { tk: 'leaf', v: x % 4 }); solid[idx(x, y)] = 1; }
    }
    // скамейки и фонари
    for (const [x, y] of [[29, 50], [36, 50], [60, 50], [67, 50], [29, 55], [36, 55], [60, 55], [67, 55], [26, 26], [38, 26], [10, 41], [30, 41], [70, 41], [92, 41]]) addDecor('bench', x, y);
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const t = tile(x, y);
      if (t === T.WALK && (x * 7 + y * 3) % 9 === 0 && !solid[idx(x, y)]) {
        let road = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (tile(x + dx, y + dy) === T.ROAD) road = true;
        if (road) addDecor('lamp', x, y);
      }
      if ((t === T.EMBANK) && x % 6 === 0) addDecor('lamp', x, y);
      if (t === T.PLAZA && y >= 48 && y <= 56 && (y === 49 || y === 55) && x % 6 === 2) addDecor('lamp', x, y);
    }

    // остановки
    const stops = [
      ['sary', 'Сарыарка', 8, 19], ['bazar', 'Базар', 28, 19], ['mosque', 'Мечеть', 86, 19], ['naber', 'Набережная', 60, 22],
      ['khan', 'Хан Шатыр', 12, 57], ['baiterek', 'Бәйтерек', 44, 47], ['univer', 'Университет', 30, 60], ['expo', 'EXPO', 60, 60], ['vokzal', 'Вокзал', 86, 60],
    ];
    for (const [id, name, x, y] of stops) {
      busStops.push({ id, name, tx: x, ty: y, x: x * TILE + 8, y: y * TILE + 12 });
      addDecor('bus', x, y);
    }

    // деревья в парках и на свободной траве
    const doorNear = (x, y) => buildings.some((b) => Math.abs(b.doorX - x) <= 1 && y >= b.doorY && y <= b.doorY + 2);
    for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
      if (tile(x, y) !== T.GRASS || solid[idx(x, y)] || doorNear(x, y)) continue;
      const c = riverC(x);
      const park = (y >= 23 && y <= 29 && x >= 21 && x <= 46) || (y > c + 4 && y <= 43);
      const p = park ? 0.3 : 0.09;
      if (hash2(x, y, 42) < p) {
        const pine = hash2(x, y, 43) < (park ? 0.35 : 0.5);
        addDecor('tree', x, y, { tk: pine ? 'pine' : 'leaf', v: Math.floor(hash2(x, y, 44) * 4) });
        solid[idx(x, y)] = 1;
      }
    }
    // припаркованные машины у дома
    for (const x of [3, 5, 8]) addDecor('parked', x, 17, { color: pick(['#e9e9e9', '#2b2b2b', '#9aa4ad', '#8c1c1c']) });
    // кот для побочного задания
    addDecor('cat', 27, 28);

    // вода — непроходима
    for (let i = 0; i < N; i++) if (tiles[i] === T.WATER) solid[i] = 1;
    // клетки для прохожих
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
    if (ty >= c - 2 && ty <= c + 2) return 'Река Есиль';
    if (ty < c) {
      if (ty >= c - 5) return 'Правый берег · Набережная';
      return tx < 48 ? 'Правый берег · Сарыарка' : 'Правый берег · Старый центр';
    }
    if (ty <= c + 8) return 'Левый берег · Набережная';
    if (ty >= 47 && ty <= 57 && tx >= 20 && tx <= 80) return 'Левый берег · Нұржол бульвары';
    if (ty > 58 && tx >= 50 && tx < 80) return 'Левый берег · EXPO';
    return 'Левый берег · Есиль';
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

  function laneEntries() {
    const out = [];
    for (const y of [6, 20, 45, 58]) { out.push({ x: 1, y: y + 1, d: [1, 0] }); out.push({ x: 98, y, d: [-1, 0] }); }
    for (const x of [18, 80]) { out.push({ x, y: 1, d: [0, 1] }); out.push({ x: x + 1, y: 74, d: [0, -1] }); }
    out.push({ x: 48, y: 1, d: [0, 1] }); out.push({ x: 49, y: 74, d: [0, -1] });
    return out;
  }

  return {
    T, gen, tile, roadDir, isRoad, isSolidTile, isPedTile, district, laneDirs, laneEntries, riverC,
    buildings, byId, decor, busStops, pedTiles,
  };
})();
