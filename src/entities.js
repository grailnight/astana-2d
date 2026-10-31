'use strict';
// Игрок, прохожие и машины.

const Ents = (() => {
  const SKINS = ['#f1c9a5', '#e0b38c', '#d4a07a', '#c68c63', '#a8714f'];
  const HAIRS = ['#1d1612', '#2b1d16', '#3b2a20', '#5a3d28', '#7a5a3a', '#b08a5a', '#8a8a8a'];
  const TOPS = ['#2f6fd1', '#c0392b', '#27ae60', '#8e44ad', '#e67e22', '#16a085', '#34495e', '#d35400', '#7f8c8d', '#f1c40f', '#e84393'];
  const BOTTOMS = ['#2a3550', '#3b3b3b', '#5a4a3a', '#1f2a44', '#4a5568'];
  const CAR_COLORS = ['#e9e9e9', '#e9e9e9', '#2b2b2b', '#9aa4ad', '#8c1c1c', '#1f4e8c', '#f0c419', '#3d5a40', '#d9d4c7'];

  const LIPS = ['#c24d68', '#b03a48', '#d46a7e', '#a8505f', '#c75b5b'];
  const SKIRTS = ['#2b2b2b', '#5b3a6e', '#7a2e2e', '#2a3550', '#6b4a32', '#3f5f3f', '#c9b79c'];
  const FEM_TOPS = ['#e84393', '#f2a7c3', '#c0392b', '#8e44ad', '#f4f0e6', '#16a085', '#e67e22', '#5b9bd5', '#f1c40f'];
  function randomLook(winter) {
    const female = chance(0.5);
    const L = {
      female, skin: pick(SKINS), hair: pick(HAIRS),
      shoes: pick(['#2a2420', '#3b3b3b', '#e8e8e8', '#5a3d28']),
      outer: winter && chance(0.85) ? 'puffer' : null, outerColor: pick(['#2d4f7c', '#1b1b1b', '#7a2e2e', '#3f5f3f', '#c9b79c', '#5b4b7a']),
      hat: null, hatColor: pick(['#6b4a32', '#2b2b2b', '#c0392b', '#3a5a8a', '#8a8a8a']),
      glasses: chance(0.12),
    };
    if (female) {
      // женщины: длинные волосы/хвост/пучок, юбки и платья, серьги, помада
      L.hairStyle = pick(['long', 'long', 'pony', 'bun', 'bob']);
      L.outfit = pick(['casual', 'casual', 'suit', 'hoodie', 'sport']);
      L.top = pick(FEM_TOPS);
      L.bottom = L.outfit === 'casual' || L.outfit === 'suit' ? pick(SKIRTS) : pick(BOTTOMS);
      L.earrings = chance(0.55);
      L.lips = pick(LIPS);
      if (winter && (L.outfit === 'casual' || L.outfit === 'suit')) L.tights = pick(['#2b2b2b', '#3b2f2f', '#4a3b4a']);
      if (L.outer) L.outerColor = pick(['#f4f0e6', '#c9b79c', '#7a2e2e', '#5b4b7a', '#1b1b1b', '#d98ca8']);
      if (winter) L.hat = pick(['beanie', 'beanie', null, null]);
      if (chance(0.06)) { L.hat = 'kerchief'; L.hatColor = pick(['#c0392b', '#2a6f97', '#5b3a6e', '#f4f0f0']); L.hair = '#8a8a8a'; }
      if (L.hat === 'beanie') L.hatColor = pick(['#f4f0e6', '#d98ca8', '#c0392b', '#8e44ad', '#2b2b2b']);
    } else {
      // мужчины: короткие стрижки, бороды/усы, брюки
      L.hairStyle = pick(['short', 'short', 'buzz', 'side']);
      L.outfit = pick(['casual', 'hoodie', 'sport', 'suit', 'casual']);
      L.top = pick(TOPS); L.bottom = pick(BOTTOMS);
      if (L.outfit === 'suit') { L.top = pick(['#2b2f3a', '#3b4a5a', '#1f2a44', '#4a4a4a']); L.tie = pick(['#a83232', '#2f6fd1', '#f2c14e', '#3d5a40']); }
      const r = Math.random();
      if (r < 0.16) L.beard = true; else if (r < 0.28) L.mustache = true;
      if (winter) L.hat = pick(['ushanka', 'beanie', 'beanie', null]);
      else if (chance(0.12)) L.hat = 'cap';
      if (L.hair === '#8a8a8a' && chance(0.3)) L.hat = 'kalpak';
    }
    return L;
  }

  const player = { x: 0, y: 0, dir: 0, moving: false, anim: 0, sit: false };
  const peds = [];
  const cars = [];

  // в помещении проходимость задаёт комната, а не карта города
  let solidAt = null, leaveHook = null;
  function setSolid(fn, onLeave) { solidAt = fn; leaveHook = onLeave || null; }
  function boxBlocked(x, y, hw = 5, hh = 6) {
    const x0 = Math.floor((x - hw) / TILE), x1 = Math.floor((x + hw) / TILE);
    const y0 = Math.floor((y - hh) / TILE), y1 = Math.floor((y - 1) / TILE);
    const solid = solidAt || World.isSolidTile;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) return true;
    return false;
  }

  function carBlocks(x, y) {
    if (solidAt) return false;
    for (const c of cars) {
      const hw = c.d[0] ? 12 : 7, hh = c.d[0] ? 6 : 12;
      if (Math.abs(c.x - x) < hw + 4 && Math.abs(c.y + 2 - (y - 3)) < hh + 3) return true;
    }
    return false;
  }

  function movePlayer(vx, vy, dt, speed) {
    const p = player;
    p.moving = vx !== 0 || vy !== 0;
    if (!p.moving) { p.anim = 0; return; }
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    if (Math.abs(vx) > Math.abs(vy)) p.dir = vx < 0 ? 1 : 2; else p.dir = vy < 0 ? 3 : 0;
    const dx = vx * speed * dt, dy = vy * speed * dt;
    const blocked = (x, y) => boxBlocked(x, y) || carBlocks(x, y);
    if (!blocked(p.x + dx, p.y)) p.x += dx;
    else if (dy === 0) { // скольжение вдоль углов
      if (!blocked(p.x + dx, p.y - 4)) p.y -= 40 * dt; else if (!blocked(p.x + dx, p.y + 4)) p.y += 40 * dt;
    }
    if (!blocked(p.x, p.y + dy)) p.y += dy;
    else if (dx === 0) {
      if (!blocked(p.x - 4, p.y + dy)) p.x -= 40 * dt; else if (!blocked(p.x + 4, p.y + dy)) p.x += 40 * dt;
    }
    p.x = clamp(p.x, 8, MAP_W * TILE - 8);
    p.y = clamp(p.y, 10, MAP_H * TILE - 2);
    p.anim += dt * speed / 9;
  }

  function placePlayer(tx, ty) {
    // перенос в город (такси, автобус, обморок) из помещения — выходим из комнаты
    if (solidAt) { const h = leaveHook; solidAt = null; leaveHook = null; if (h) h(); }
    player.x = tx * TILE + 8; player.y = ty * TILE + 12;
    // если клетка занята, ищем свободную рядом
    if (boxBlocked(player.x, player.y)) {
      for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = (tx + dx) * TILE + 8, y = (ty + dy) * TILE + 12;
        if (!boxBlocked(x, y)) { player.x = x; player.y = y; return; }
      }
    }
  }

  /* ---------- Прохожие ---------- */

  function spawnPeds(n, winter) {
    peds.length = 0;
    for (let i = 0; i < n; i++) {
      const [tx, ty] = pick(World.pedTiles);
      peds.push({ x: tx * TILE + 8, y: ty * TILE + 12, tx, ty, dir: randi(0, 3), look: randomLook(winter), speed: rand(20, 32), tgt: null, anim: 0, pause: rand(0, 2), lineIdx: randi(0, 999) });
    }
    // патрульные: ходят по центру, следят за переходами
    for (let i = 0; i < 4; i++) {
      const [tx, ty] = pick(World.pedTiles.filter(([x, y]) => x > 10 && x < 110 && y > 10 && y < 118));
      const look = City.policeLook();
      if (winter) { look.outer = 'puffer'; look.outerColor = '#1f2a44'; }
      peds.push({ x: tx * TILE + 8, y: ty * TILE + 12, tx, ty, dir: randi(0, 3), look, police: true, speed: rand(16, 22), tgt: null, anim: 0, pause: rand(0, 2), lineIdx: randi(0, 999) });
    }
  }

  const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];

  function updatePeds(dt) {
    for (const p of peds) {
      if (p.pause > 0) { p.pause -= dt; p.anim = 0; continue; }
      if (!p.tgt) {
        const opts = [];
        for (let d = 0; d < 4; d++) {
          const nx = p.tx + DIRV[d][0], ny = p.ty + DIRV[d][1];
          if (World.isPedTile(nx, ny)) opts.push(d);
        }
        if (!opts.length) { p.pause = 2; continue; }
        let d = opts.includes(p.dir) && chance(0.75) ? p.dir : pick(opts);
        const back = [3, 2, 1, 0][p.dir];
        if (d === back && opts.length > 1 && chance(0.8)) d = pick(opts.filter((o) => o !== back));
        p.dir = d;
        p.tx += DIRV[d][0]; p.ty += DIRV[d][1];
        p.tgt = [p.tx * TILE + 8, p.ty * TILE + 12];
      }
      const dx = p.tgt[0] - p.x, dy = p.tgt[1] - p.y;
      const L = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (L <= step) {
        p.x = p.tgt[0]; p.y = p.tgt[1]; p.tgt = null;
        if (chance(0.04)) p.pause = rand(1, 4);
      } else {
        p.x += dx / L * step; p.y += dy / L * step;
      }
      p.anim += dt * p.speed / 9;
    }
  }

  /* ---------- Машины ---------- */

  function newCar(entry) {
    const e = entry || pick(World.laneEntries());
    const bus = chance(0.12);
    return {
      x: e.x * TILE + 8, y: e.y * TILE + 8, tx: e.x, ty: e.y, d: e.d.slice(), speed: bus ? rand(40, 50) : rand(55, 78),
      color: bus ? pick(['#2a9d8f', '#3a7bd5']) : pick(CAR_COLORS), bus, wait: 0, honk: 0, nx: e.x + e.d[0], ny: e.y + e.d[1],
    };
  }

  function spawnCars(n) {
    cars.length = 0;
    // распределяем машины по дорогам, чтобы город не был пустым на старте
    const roadTiles = [];
    for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
      const dirs = World.laneDirs(x, y);
      if (dirs.length === 1) roadTiles.push({ x, y, d: dirs[0] });
    }
    for (let i = 0; i < n; i++) {
      const e = pick(roadTiles);
      if (cars.some((c) => Math.abs(c.x - (e.x * TILE + 8)) < 40 && Math.abs(c.y - (e.y * TILE + 8)) < 40)) continue;
      cars.push(newCar(e));
    }
  }

  function updateCars(dt, onHonk) {
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      c.honk = Math.max(0, c.honk - dt);
      // впереди?
      const ax = c.x + c.d[0] * 20, ay = c.y + c.d[1] * 20;
      let stop = false;
      for (const o of cars) {
        if (o === c) continue;
        if (Math.abs(o.x - ax) < 13 && Math.abs(o.y - ay) < 13) { stop = true; break; }
      }
      // не въезжаем на перекрёсток, пока там кто-то есть
      if (!stop && World.laneDirs(c.nx, c.ny).length === 2 && World.laneDirs(c.tx, c.ty).length < 2) {
        const cx = c.nx * TILE + 8, cy = c.ny * TILE + 8;
        for (const o of cars) {
          if (o === c) continue;
          if (Math.abs(o.x - cx) < 26 && Math.abs(o.y - cy) < 26) { stop = true; break; }
        }
      }
      if (c.wait > 3) stop = false; // не стоять вечно
      const px = player.x, py = player.y - 3;
      if (Math.abs(px - (c.x + c.d[0] * 16)) < 16 && Math.abs(py - (c.y + c.d[1] * 16)) < 16) {
        stop = true;
        if (c.honk <= 0 && onHonk) { onHonk(c); c.honk = 4; }
      }
      if (stop) { c.wait += dt; continue; }
      c.wait = 0;
      const tx = c.nx * TILE + 8, ty = c.ny * TILE + 8;
      const dx = tx - c.x, dy = ty - c.y, L = Math.abs(dx) + Math.abs(dy);
      const step = c.speed * dt;
      if (L <= step) {
        c.x = tx; c.y = ty; c.tx = c.nx; c.ty = c.ny;
        const dirs = World.laneDirs(c.tx, c.ty).filter(([ddx, ddy]) => World.isRoad(c.tx + ddx, c.ty + ddy) && World.laneDirs(c.tx + ddx, c.ty + ddy).length);
        if (!dirs.length) { cars[i] = newCar(); continue; }
        const straight = dirs.find((d) => d[0] === c.d[0] && d[1] === c.d[1]);
        c.d = straight && chance(0.75) ? straight : pick(dirs);
        c.nx = c.tx + c.d[0]; c.ny = c.ty + c.d[1];
      } else {
        c.x += Math.sign(dx) * Math.min(step, Math.abs(dx));
        c.y += Math.sign(dy) * Math.min(step, Math.abs(dy));
      }
    }
  }

  return { player, peds, cars, randomLook, movePlayer, placePlayer, spawnPeds, updatePeds, spawnCars, updateCars, boxBlocked, setSolid };
})();
