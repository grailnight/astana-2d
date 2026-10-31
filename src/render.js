'use strict';
// Отрисовка мира: земля, объекты с сортировкой по глубине, ночь, погода, подписи.

const Render = (() => {
  let cv, ctx, S = 4, VW = 0, VH = 0, dpr = 1;
  let camX = 0, camY = 0, lastCamX = 0, lastCamY = 0;
  let groundCv = null, groundSeason = null;
  let time = 0;
  const flakes = [];
  let lampGlow = null;
  const fountainCache = {};

  function init(canvas) {
    cv = canvas;
    ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    lampGlow = makeCanvas(64, 64);
    const g = lampGlow.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,220,150,0.9)'); gr.addColorStop(0.4, 'rgba(255,190,110,0.35)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    VW = Math.round(window.innerWidth * dpr);
    VH = Math.round(window.innerHeight * dpr);
    cv.width = VW; cv.height = VH;
    // чем больше экран, тем больше видно клеток, но пиксели остаются целыми
    S = Math.max(2, Math.round(Math.min(VW, VH) / (TILE * 15)));
    ctx.imageSmoothingEnabled = false;
  }

  function ground() {
    const season = G.s ? G.season() : 'autumn';
    if (!groundCv || groundSeason !== season || G.groundDirty) {
      groundCv = Art.paintGround(World, season);
      groundSeason = season;
      G.groundDirty = false;
    }
    return groundCv;
  }

  function darkness() {
    const h = G.hour();
    if (h >= 7.5 && h < 16.5) return 0;
    if (h >= 16.5 && h < 19) return (h - 16.5) / 2.5 * 0.62;
    if (h >= 5.5 && h < 7.5) return (7.5 - h) / 2 * 0.62;
    return 0.62;
  }

  function sx(wx) { return Math.round(wx * S - Math.round(camX * S)); }
  function sy(wy) { return Math.round(wy * S - Math.round(camY * S)); }
  function blit(img, wx, wy, w, h, flipX) {
    const x = sx(wx), y = sy(wy);
    if (flipX) {
      ctx.save(); ctx.translate(x + w * S, y); ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w * S, h * S);
      ctx.restore();
    } else ctx.drawImage(img, x, y, w * S, h * S);
  }
  function blitPart(img, srcX, srcY, w, h, wx, wy) {
    ctx.drawImage(img, srcX, srcY, w, h, sx(wx), sy(wy), w * S, h * S);
  }

  function shadow(wx, wy, rx, ry) {
    ctx.fillStyle = 'rgba(10,15,30,0.25)';
    ctx.beginPath(); ctx.ellipse(sx(wx), sy(wy), rx * S, ry * S, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Персонажи нарисованы вдвое детальнее мира: один пиксель спрайта — половина пикселя мира
  const charK = () => Math.max(1, Math.round(S * 0.5));
  function drawChar(sheet, x, y, dir, moving, anim) {
    const f = moving ? [1, 0, 2, 0][Math.floor(anim) % 4] : 0;
    shadow(x, y - 1, 6.5, 2.5);
    const k = charK();
    ctx.drawImage(sheet, f * Art.FW, dir * Art.FH, Art.FW, Art.FH, Math.round(sx(x) - 16 * k), Math.round(sy(y) - 55 * k), Art.FW * k, Art.FH * k);
  }

  /* ---------- кадр ---------- */

  let playerKey = '', playerSheet = null;

  let snapNext = false;
  function frame(dt, info) {
    time += dt;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, VW, VH);
    if (!G.s) return;
    if (snapNext) { info = { ...(info || {}), snap: true }; snapNext = false; }
    if (Inside.active()) { frameInside(dt, info); return; }
    const p = Ents.player;
    const vw = VW / S, vh = VH / S;
    const tx = clamp(p.x - vw / 2, 0, Math.max(0, MAP_W * TILE - vw));
    const ty = clamp(p.y - 12 - vh / 2, 0, Math.max(0, MAP_H * TILE - vh));
    if (info && info.snap) { camX = tx; camY = ty; }
    const k = 1 - Math.exp(-dt * 7);
    camX += (tx - camX) * k; camY += (ty - camY) * k;
    if (vw > MAP_W * TILE) camX = -(vw - MAP_W * TILE) / 2;
    if (vh > MAP_H * TILE) camY = -(vh - MAP_H * TILE) / 2;

    // земля
    const gcv = ground();
    const gx0 = Math.max(0, Math.floor(camX)), gy0 = Math.max(0, Math.floor(camY));
    const gw = Math.min(gcv.width - gx0, Math.ceil(vw) + 2), gh = Math.min(gcv.height - gy0, Math.ceil(vh) + 2);
    ctx.drawImage(gcv, gx0, gy0, gw, gh, sx(gx0), sy(gy0), gw * S, gh * S);
    drawWater(vw, vh);

    const season = G.season();
    trackFootprints(season);
    drawFootprints();
    drawCards();
    const vx0 = camX - 40, vx1 = camX + vw + 40, vy0 = camY - 40, vy1 = camY + vh + 260;
    const list = [];
    for (const b of World.buildings) {
      if (b.sx > vx1 || b.sx + b.sw < vx0 || b.sy > vy1 || b.base < vy0 - 10) continue;
      list.push({ y: b.base, b });
    }
    for (const d of World.decor) {
      if (d.x < vx0 || d.x > vx1 || d.y < vy0 || d.y > vy1) continue;
      if (d.kind === 'cat' && (G.flag('catQuest') === 'found' || G.flag('catQuest') === 'done')) continue;
      list.push({ y: d.y, d });
    }
    for (const ped of Ents.peds) if (ped.x > vx0 && ped.x < vx1 && ped.y > vy0 && ped.y < vy1) list.push({ y: ped.y, ped });
    for (const c of Ents.cars) if (c.x > vx0 && c.x < vx1 && c.y > vy0 && c.y < vy1) list.push({ y: c.y + 6, car: c });
    for (const n of Content.worldNpcs) if (n.visible()) list.push({ y: n.ty * TILE + 12, npc: n });
    for (const pg of City.pigeons) if (pg.away <= 0 && pg.x > vx0 && pg.x < vx1 && pg.y > vy0 && pg.y < vy1) list.push({ y: pg.y, pig: pg });
    for (const sm of Fun.snowmen()) { const x = sm.tx * TILE + 8, y = sm.ty * TILE + 12; if (x > vx0 && x < vx1 && y > vy0 && y < vy1) list.push({ y, snowman: sm }); }
    list.push({ y: p.y, player: true });
    list.sort((a, b) => a.y - b.y);

    const look = G.look();
    const key = JSON.stringify(look);
    if (key !== playerKey) { playerKey = key; playerSheet = Art.charSheet(look); }

    drawShadows(list);
    let playerIdx = -1;
    list.forEach((it, i) => {
      if (it.b) blit(it.b.sprite, it.b.sx, it.b.sy, it.b.sw, it.b.sh);
      else if (it.d) drawDecor(it.d, season);
      else if (it.ped) {
        if (!it.ped.sheet || it.ped.season !== season) { it.ped.season = season; if (season === 'winter' && !it.ped.look.outer && chance(0.85)) { if (it.ped.police) { it.ped.look.outer = 'puffer'; it.ped.look.outerColor = '#1f2a44'; } else it.ped.look = Ents.randomLook(true); } it.ped.sheet = Art.charSheet(it.ped.look); }
        drawChar(it.ped.sheet, it.ped.x, it.ped.y, it.ped.dir, !!it.ped.tgt && it.ped.pause <= 0, it.ped.anim);
      } else if (it.car) drawCar(it.car);
      else if (it.pig) drawPigeon(it.pig);
      else if (it.snowman) drawSnowman(it.snowman);
      else if (it.npc) {
        const n = it.npc;
        const sheet = n.sheet || (n.sheet = Art.charSheet(NPCS[n.id].look));
        drawChar(sheet, n.tx * TILE + 8, n.ty * TILE + 12, 0, false, 0);
      } else if (it.player) {
        playerIdx = i;
        drawChar(playerSheet, p.x, p.y, p.dir, p.moving, p.anim);
      }
    });

    // игрок за зданием — полупрозрачный силуэт поверх
    for (let i = playerIdx + 1; i < list.length; i++) {
      const b = list[i].b;
      if (!b) continue;
      if (p.x > b.sx && p.x < b.sx + b.sw && p.y - 20 > b.sy && p.y < b.base) {
        ctx.globalAlpha = 0.45;
        const k = charK();
        ctx.drawImage(playerSheet, 0, p.dir * Art.FH, Art.FW, Art.FH, Math.round(sx(p.x) - 16 * k), Math.round(sy(p.y) - 55 * k), Art.FW * k, Art.FH * k);
        ctx.globalAlpha = 1;
        break;
      }
    }

    drawClouds(dt);
    drawWeather(dt);
    drawNight(list);
    drawGrade();
    drawLabels(info);
    drawMarkers(info);
    drawCold();
  }

  // Снеговик игрока: три кома, морковка, руки-ветки и шапка
  function drawSnowman(sm) {
    const u = charK();
    const X = sx(sm.tx * TILE + 8), Y = sy(sm.ty * TILE + 12);
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(X + x * u), Math.round(Y + y * u), w * u, h * u); };
    shadow(sm.tx * TILE + 8, sm.ty * TILE + 11, 7, 2.5);
    const W = '#f4f8fb', S2 = '#cfdce5';
    R(-8, -14, 16, 13, W); R(-9, -11, 18, 8, W); R(-8, -3, 16, 2, S2);
    R(-6, -25, 12, 11, W); R(-7, -22, 14, 6, W); R(-6, -15, 12, 1, S2);
    R(-4, -33, 8, 8, W); R(-5, -31, 10, 4, W);
    R(-2, -30, 1, 1, '#1b1d22'); R(1, -30, 1, 1, '#1b1d22'); R(0, -28, 4, 1, '#e8701a'); R(-2, -26, 4, 1, '#3a3f48');
    R(-1, -21, 1, 1, '#1b1d22'); R(-1, -18, 1, 1, '#1b1d22');
    R(-12, -22, 6, 1, '#6b4a32'); R(-13, -24, 1, 2, '#6b4a32'); R(6, -22, 6, 1, '#6b4a32'); R(12, -24, 1, 2, '#6b4a32');
    if (sm.hat === 0) { R(-4, -38, 8, 5, '#f3f0e6'); R(-5, -34, 10, 1, '#2a2a2a'); R(-1, -37, 2, 2, '#c0392b'); }
    else if (sm.hat === 1) { R(-5, -37, 10, 4, '#6b4a32'); R(-6, -34, 2, 4, '#6b4a32'); R(4, -34, 2, 4, '#6b4a32'); }
    else if (sm.hat === 2) { R(-6, -25, 12, 2, '#2a6f97'); R(3, -24, 2, 5, '#f2c14e'); R(-3, -36, 6, 3, '#9aa4ad'); }
    else { R(-4, -38, 8, 5, '#9aa4ad'); R(-5, -34, 10, 1, '#7d878e'); }
  }

  // Голубь в масштабе персонажей: клюёт, вертит головой, вспархивает
  function drawPigeon(g) {
    const u = charK();
    const X = sx(g.x), Y = sy(g.y);
    const flip = g.dir < 0;
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(X + (flip ? -x - w : x) * u), Math.round(Y + y * u), w * u, h * u); };
    const body = g.white ? '#e8edf0' : '#8a95a0', wing = g.white ? '#c5ced4' : '#6d7780', head = g.white ? '#f4f7f8' : '#5d6670';
    if (g.z < 2) { ctx.fillStyle = 'rgba(10,15,30,0.22)'; ctx.fillRect(X - 3 * u, Y - u, 7 * u, u); }
    const lift = -Math.round(g.z / (u / S));
    if (g.fly > 0) {
      const up = Math.floor(time * 14 + g.hx) % 2 === 0;
      R(-4, -6 + lift, 8, 3, body); R(-6, -6 + lift, 2, 1, wing); R(3, -8 + lift, 3, 3, head); R(6, -7 + lift, 1, 1, '#c9a27a');
      if (up) { R(-3, -11 + lift, 2, 5, wing); R(0, -10 + lift, 2, 4, wing); } else { R(-5, -4 + lift, 9, 2, wing); }
      return;
    }
    R(-4, -5, 7, 3, body); R(-3, -6, 5, 1, body); R(-3, -5, 5, 2, wing); R(-6, -5, 2, 1, wing); R(-5, -4, 1, 1, wing);
    R(-1, -2, 1, 2, '#e5533d'); R(1, -2, 1, 2, '#e5533d');
    if (g.peck < 0) { R(3, -4, 3, 2, head); R(6, -3, 1, 1, '#c9a27a'); }
    else { R(2, -5, 2, 1, g.white ? '#dfe7ea' : '#4f9a86'); R(2, -8, 3, 3, head); R(4, -7, 1, 1, '#1b1d22'); R(5, -7, 1, 1, '#c9a27a'); }
  }

  /* ---------- интерьер ---------- */

  function frameInside(dt, info) {
    const R = Inside.room();
    const p = Ents.player;
    const vw = VW / S, vh = VH / S;
    const rw = R.def.W * TILE, rh = R.def.H * TILE;
    const topM = 150 * dpr / S; // под HUD
    const tx = rw <= vw ? -(vw - rw) / 2 : clamp(p.x - vw / 2, -8, rw - vw + 8);
    const ty = rh <= vh - topM ? -topM - (vh - topM - rh) / 2 : clamp(p.y - 12 - (vh + topM) / 2, -topM, rh - vh + 24);
    if (info && info.snap) { camX = tx; camY = ty; }
    const k = 1 - Math.exp(-dt * 8);
    camX += (tx - camX) * k; camY += (ty - camY) * k;
    lastCamX = camX; lastCamY = camY;

    ctx.fillStyle = '#0a1320'; ctx.fillRect(0, 0, VW, VH);
    const bg = Inside.background();
    ctx.drawImage(bg, sx(0), sy(0), bg.width * S, bg.height * S);

    const list = Inside.drawables();
    list.push({ y: p.y, player: true });
    list.sort((a, b) => a.y - b.y);
    const look = G.look();
    const key = JSON.stringify(look);
    if (key !== playerKey) { playerKey = key; playerSheet = Art.charSheet(look); }
    for (const it of list) {
      if (it.img) blit(it.img, it.x, it.top, it.img.width, it.img.height);
      else if (it.npc) {
        const n = it.npc;
        const sheet = n.sheet || (n.sheet = Art.charSheet(NPCS[n.id].look));
        drawChar(sheet, n.x * TILE, n.y * TILE, n.dir || 0, false, 0);
      } else if (it.guest) {
        // гость сидит за столиком: рисуем только верх, ноги скрыты столом
        const gs = it.guest;
        if (!gs.sheet) gs.sheet = Art.charSheet(gs.look);
        const kk = charK();
        const rows = 34;
        ctx.drawImage(gs.sheet, 0, 0, Art.FW, rows, Math.round(sx(gs.x * TILE) - 16 * kk), Math.round(sy(gs.y * TILE) - 46 * kk), Art.FW * kk, rows * kk);
      } else if (it.player) drawChar(playerSheet, p.x, p.y, p.dir, p.moving, p.anim);
    }

    // свет: вечером в комнате горят лампы, тёплый оттенок
    const d = darkness();
    if (d > 0.01) {
      ctx.fillStyle = `rgba(40,24,10,${d * 0.35})`; ctx.fillRect(0, 0, VW, VH);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = d * 0.5;
      for (const it of list) if (it.lamp) ctx.drawImage(lampGlow, sx(it.x - 24), sy(it.top - 20), 60 * S, 60 * S);
      ctx.drawImage(lampGlow, sx(rw / 2 - 70), sy(rh / 2 - 70), 140 * S, 140 * S);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    drawGrade();
    for (const it of list) if (it.npc) {
      const n = it.npc;
      plate(NPCS[n.id].name, n.x * TILE, n.y * TILE - 38, { size: 3.4, bg: 'rgba(19,40,58,0.85)', color: '#eef6fa', border: false });
    }
    plate(Content.locName(R.locId) + (Decor.SLOTS[R.id] ? ` · уют ${Decor.comfort(R.id)}` : ''), rw / 2, -6, { size: 4, bg: 'rgba(19,40,58,0.92)' });
    if (info && info.near && info.near.label) {
      const n = info.near;
      plate('E', n.x, n.y + Math.sin(time * 5) * 1.2, { size: 4, bg: '#2ec4e6', color: '#0d1b2a', border: false, weight: 800 });
    }
  }

  /* ---------- тени, облака, следы, цветокоррекция ---------- */

  // Солнце светит с юго-запада: тень от дома ложится вправо-вниз на землю
  function drawShadows(list) {
    const night = darkness();
    const a = 0.24 * (1 - night * 1.2);
    if (a <= 0.02) return;
    ctx.fillStyle = `rgba(14,24,44,${a})`;
    for (const it of list) {
      const b = it.b;
      if (!b) continue;
      const fd = b.h * TILE;
      const L = Math.min(b.landmark ? 26 : 44, 8 + b.sh * 0.22);
      const x = b.sx + b.sw, top = b.base - fd;
      ctx.beginPath();
      ctx.moveTo(sx(x), sy(top + 4));
      ctx.lineTo(sx(x + L), sy(top + 4 + L * 0.35));
      ctx.lineTo(sx(x + L), sy(b.base + L * 0.35));
      ctx.lineTo(sx(b.sx + L * 0.6), sy(b.base + L * 0.35));
      ctx.lineTo(sx(b.sx), sy(b.base));
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(10,16,30,0.18)';
    for (const it of list) if (it.b) ctx.fillRect(sx(it.b.sx), sy(it.b.base), it.b.sw * S, 2 * S);
  }

  let cloudCv = null;
  const clouds = Array.from({ length: 7 }, (_, i) => ({ x: hash2(i, 1) * MAP_W * TILE, y: hash2(i, 2) * MAP_H * TILE, s: 0.7 + hash2(i, 3) * 0.8 }));
  function drawClouds(dt) {
    const kind = G.s.weather.kind;
    if (kind === 'buran' || darkness() > 0.4) return;
    if (!cloudCv) {
      cloudCv = makeCanvas(160, 100);
      const g = cloudCv.getContext('2d');
      for (const [x, y, r] of [[50, 55, 38], [90, 45, 44], [125, 58, 30], [75, 68, 34]]) {
        const gr = g.createRadialGradient(x, y, 2, x, y, r);
        gr.addColorStop(0, 'rgba(10,20,40,1)'); gr.addColorStop(1, 'rgba(10,20,40,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 160, 100);
      }
    }
    const a = kind === 'clear' ? 0.09 : 0.14;
    ctx.globalAlpha = a;
    const W = MAP_W * TILE, H = MAP_H * TILE;
    for (const c of clouds) {
      c.x += dt * 7; c.y += dt * 2;
      if (c.x > W + 200) c.x = -400; if (c.y > H + 200) c.y = -300;
      ctx.drawImage(cloudCv, sx(c.x), sy(c.y), 160 * 2.4 * c.s * S, 100 * 2.4 * c.s * S);
    }
    ctx.globalAlpha = 1;
  }

  const prints = [];
  let lastPrint = null, printSide = 0;
  function trackFootprints(season) {
    const p = Ents.player;
    if (season !== 'winter') { prints.length = 0; return; }
    if (!lastPrint || Math.hypot(p.x - lastPrint.x, p.y - lastPrint.y) > 7) {
      const t = World.tile(Math.floor(p.x / TILE), Math.floor((p.y - 2) / TILE));
      if (t !== World.T.ROAD && t !== World.T.BRIDGE && t !== World.T.WATER) {
        printSide ^= 1;
        prints.push({ x: p.x + (printSide ? 2 : -2) * (p.dir === 0 || p.dir === 3 ? 1 : 0), y: p.y - 1 + (printSide ? 1 : -1) * (p.dir === 1 || p.dir === 2 ? 1 : 0), t: time });
        if (prints.length > 160) prints.shift();
      }
      lastPrint = { x: p.x, y: p.y };
    }
  }
  function drawFootprints() {
    for (const f of prints) {
      const age = time - f.t;
      if (age > 30) continue;
      ctx.fillStyle = `rgba(120,140,165,${0.45 * (1 - age / 30)})`;
      ctx.fillRect(sx(f.x - 1), sy(f.y - 1), 2 * S, 2 * S);
    }
  }

  // Спрятанные открытки — блестящие конверты на земле
  function drawCards() {
    for (const c of Life.cardsLeft()) {
      const x = c.tx * TILE + 8, y = c.ty * TILE + 9 + Math.sin(time * 3 + c.tx) * 1.5;
      if (x < camX - 20 || x > camX + VW / S + 20 || y < camY - 20 || y > camY + VH / S + 20) continue;
      ctx.fillStyle = 'rgba(10,15,30,0.25)'; ctx.fillRect(sx(x - 4), sy(c.ty * TILE + 13), 8 * S, 2 * S);
      ctx.fillStyle = '#f4f7f8'; ctx.fillRect(sx(x - 5), sy(y - 4), 10 * S, 7 * S);
      ctx.fillStyle = '#e5533d'; ctx.fillRect(sx(x - 5), sy(y - 4), 10 * S, S);
      ctx.fillStyle = '#2ec4e6'; ctx.fillRect(sx(x + 1), sy(y - 2), 3 * S, 3 * S);
      ctx.fillStyle = '#9aa7b0'; ctx.fillRect(sx(x - 4), sy(y), 4 * S, S);
      if ((time * 1.5 + c.tx * 0.37) % 2 < 0.5) {
        ctx.fillStyle = '#f6c343';
        ctx.fillRect(sx(x + 5), sy(y - 8), S, 3 * S); ctx.fillRect(sx(x + 4), sy(y - 7), 3 * S, S);
      }
    }
  }

  // Цвет дня: тёплое утро, холодный зимний день, лёгкая виньетка
  function drawGrade() {
    const h = G.hour();
    if (h > 6 && h < 9.5) { ctx.fillStyle = `rgba(255,170,140,${Math.sin((h - 6) / 3.5 * Math.PI) * 0.08})`; ctx.fillRect(0, 0, VW, VH); }
    if (G.season() === 'winter' && darkness() < 0.3) { ctx.fillStyle = 'rgba(150,190,230,0.06)'; ctx.fillRect(0, 0, VW, VH); }
    const g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.45, VW / 2, VH / 2, Math.hypot(VW, VH) * 0.6);
    g.addColorStop(0, 'rgba(8,14,28,0)'); g.addColorStop(1, 'rgba(8,14,28,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }

  function drawWater(vw, vh) {
    if (G.season() === 'winter') return;
    ctx.fillStyle = 'rgba(200,230,250,0.55)';
    const x0 = Math.floor(camX / TILE), x1 = Math.ceil((camX + vw) / TILE);
    const y0 = Math.floor(camY / TILE), y1 = Math.ceil((camY + vh) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (World.tile(tx, ty) !== World.T.WATER) continue;
      const ph = (time * 0.8 + hash2(tx, ty) * 6) % 6;
      if (ph < 2) {
        const px = tx * TILE + Math.floor(hash2(tx, ty, 9) * 10) + Math.floor(ph * 2);
        const py = ty * TILE + 6 + Math.floor(hash2(tx, ty, 8) * 8);
        ctx.fillRect(sx(px), sy(py), 3 * S, S);
      }
    }
  }

  function drawDecor(d, season) {
    switch (d.kind) {
      case 'tree': {
        const img = Art.tree(d.tk, season, d.v);
        shadow(d.x, d.y - 1, 9, 3);
        blit(img, d.x - 13, d.y - 34, 26, 36);
        break;
      }
      case 'lamp': blit(Art.lamp(), d.x - 5, d.y - 33, 10, 34); break;
      case 'bench': blit(Art.bench(season), d.x - 9, d.y - 11, 18, 12); break;
      case 'bus': blit(Art.busStop(), d.x - 15, d.y - 29, 30, 30); break;
      case 'yurt': blit(Art.yurt(season), d.x - 24, d.y - 39, 48, 40); break;
      case 'wheel': drawWheel(d, false); break;
      case 'stele': { const st = Art.stele(); blit(st.cv, d.x - 10, d.y - 118, 20, 120); break; }
      case 'sign': {
        ctx.fillStyle = '#3a3f48'; ctx.fillRect(sx(d.x - 0.5), sy(d.y - 22), S, 22 * S);
        ctx.fillStyle = '#1f5f95'; ctx.fillRect(sx(d.x - 4), sy(d.y - 26), 8 * S, 5 * S);
        break;
      }
      case 'cat': blit(Art.cat(), d.x - 6, d.y - 9 - (Math.sin(time * 3) > 0.9 ? 1 : 0), 12, 10); break;
      case 'parked': { const img = Art.car(d.color, false, false); blit(img, d.x - 13, d.y - 13, 26, 16); break; }
      case 'fountain': {
        let img = fountainCache[season];
        if (!img) img = fountainCache[season] = Art.fountain(season, 0);
        blit(img, d.x - 24, d.y - 43, 48, 44);
        if (season !== 'winter') {
          ctx.fillStyle = 'rgba(225,244,255,0.9)';
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const ph = (time * 1.4 + i * 0.37) % 1;
            const r = 3 + ph * 9;
            const hgt = Math.sin(ph * Math.PI) * 10;
            ctx.fillRect(sx(d.x + Math.cos(a) * r), sy(d.y - 18 - hgt + Math.sin(a) * r * 0.4), S, S);
          }
          const jh = 10 + Math.sin(time * 5) * 2;
          ctx.fillRect(sx(d.x - 1), sy(d.y - 26 - jh), 2 * S, jh * S);
        }
        break;
      }
      default:
    }
  }

  // Колесо обозрения: вращается, ночью горит цветными огнями
  function drawWheel(d, lightsOnly) {
    const cx = d.x, cy = d.y - 64, r = 46;
    const ang = time * 0.12;
    const cols = ['#e5533d', '#f6c343', '#2ec4e6', '#7cc66b', '#e84393', '#9b59b6'];
    if (!lightsOnly) {
      ctx.strokeStyle = '#d6dde3'; ctx.lineWidth = Math.max(1, S * 1.2);
      ctx.beginPath(); ctx.moveTo(sx(cx - 24), sy(d.y)); ctx.lineTo(sx(cx), sy(cy)); ctx.lineTo(sx(cx + 24), sy(d.y)); ctx.stroke();
      ctx.lineWidth = Math.max(1, S * 0.6);
      ctx.beginPath(); ctx.arc(sx(cx), sy(cy), r * S, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(sx(cx), sy(cy), (r - 4) * S, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = ang + (i / 12) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(sx(cx), sy(cy)); ctx.lineTo(sx(cx + Math.cos(a) * r), sy(cy + Math.sin(a) * r)); ctx.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const a = ang + (i / 12) * Math.PI * 2;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(sx(x - 3), sy(y + 1), 6 * S, 5 * S);
        ctx.fillStyle = 'rgba(200,230,250,0.9)'; ctx.fillRect(sx(x - 2), sy(y + 2), 4 * S, 2 * S);
      }
      ctx.fillStyle = '#9aa4ad'; ctx.beginPath(); ctx.arc(sx(cx), sy(cy), 3 * S, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5d6670'; ctx.fillRect(sx(cx - 26), sy(d.y - 2), 52 * S, 3 * S);
    } else {
      for (let i = 0; i < 24; i++) {
        const a = ang + (i / 24) * Math.PI * 2;
        ctx.fillStyle = cols[(i + Math.floor(time * 2)) % cols.length];
        ctx.fillRect(sx(cx + Math.cos(a) * r - 1), sy(cy + Math.sin(a) * r - 1), 3 * S, 3 * S);
      }
    }
  }

  function drawCar(c) {
    const horiz = c.d[0] !== 0;
    const img = Art.car(c.color, !horiz, c.bus);
    if (horiz) {
      const w = c.bus ? 46 : 26, h = c.bus ? 20 : 16;
      shadow(c.x, c.y + 5, w / 2, 3);
      blit(img, c.x - w / 2, c.y - h + 6, w, h, c.d[0] < 0);
    } else {
      const w = c.bus ? 20 : 16, h = c.bus ? 46 : 26;
      shadow(c.x, c.y + h / 2 - 3, w / 2, 3);
      if (c.d[1] < 0) {
        ctx.save();
        const x = sx(c.x - w / 2), y = sy(c.y - h / 2);
        ctx.translate(x, y + h * S); ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0, w * S, h * S);
        ctx.restore();
      } else blit(img, c.x - w / 2, c.y - h / 2, w, h);
    }
  }

  /* ---------- погода ---------- */

  function drawWeather(dt) {
    const kind = G.s.weather.kind;
    const want = kind === 'snow' ? 150 : kind === 'buran' ? 380 : kind === 'rain' ? 170 : 0;
    while (flakes.length < want) flakes.push({ x: Math.random() * VW, y: Math.random() * VH, s: rand(0.6, 1.4), ph: Math.random() * 6 });
    if (flakes.length > want) flakes.length = want;
    const dcx = (camX - lastCamX) * S, dcy = (camY - lastCamY) * S;
    lastCamX = camX; lastCamY = camY;
    if (!want) return;
    const u = dpr;
    if (kind === 'rain') {
      ctx.strokeStyle = 'rgba(190,215,235,0.55)'; ctx.lineWidth = 1 * u;
      ctx.beginPath();
      for (const f of flakes) {
        f.y += 900 * u * f.s * dt - dcy; f.x += -80 * u * dt - dcx;
        if (f.y > VH) { f.y -= VH + 20; f.x = Math.random() * VW; }
        if (f.x < 0) f.x += VW; if (f.x > VW) f.x -= VW; if (f.y < -20) f.y += VH;
        ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - 3 * u, f.y + 14 * u * f.s);
      }
      ctx.stroke();
      return;
    }
    const buran = kind === 'buran';
    ctx.fillStyle = 'rgba(245,250,255,0.9)';
    for (const f of flakes) {
      f.ph += dt;
      f.y += (buran ? 160 : 45) * u * f.s * dt - dcy;
      f.x += ((buran ? 420 : 14) * f.s + Math.sin(f.ph * 2) * 10) * u * dt - dcx;
      if (f.y > VH) { f.y -= VH; f.x = Math.random() * VW; }
      if (f.y < 0) f.y += VH;
      if (f.x > VW) f.x -= VW; if (f.x < 0) f.x += VW;
      const r = (buran ? 1.6 : 1.8) * f.s * u;
      ctx.fillRect(f.x, f.y, r, r);
    }
    if (buran) { ctx.fillStyle = 'rgba(225,236,245,0.32)'; ctx.fillRect(0, 0, VW, VH); }
  }

  /* ---------- ночь и свет ---------- */

  function drawNight(list) {
    const d = darkness();
    const h = G.hour();
    const dusk = h > 15.5 && h < 18.5 ? Math.sin((h - 15.5) / 3 * Math.PI) * 0.16 : 0;
    if (dusk > 0) { ctx.fillStyle = `rgba(255,130,60,${dusk})`; ctx.fillRect(0, 0, VW, VH); }
    if (G.s.weather.kind === 'cloudy' || G.s.weather.kind === 'rain') { ctx.fillStyle = 'rgba(60,70,90,0.12)'; ctx.fillRect(0, 0, VW, VH); }
    if (d <= 0.01) return;
    ctx.fillStyle = `rgba(10,16,44,${d})`;
    ctx.fillRect(0, 0, VW, VH);
    const a = clamp(d * 1.6, 0, 1);
    ctx.globalAlpha = a;
    for (const it of list) if (it.b) blit(it.b.lights, it.b.sx, it.b.sy, it.b.sw, it.b.sh);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * 0.8;
    for (const it of list) {
      if (it.d && it.d.kind === 'wheel') drawWheel(it.d, true);
      if (it.d && it.d.kind === 'stele') { const st = Art.stele(); blit(st.lights, it.d.x - 10, it.d.y - 118, 20, 120); }
      if (it.d && it.d.kind === 'lamp') { const s2 = 46; ctx.drawImage(lampGlow, sx(it.d.x - s2 / 2), sy(it.d.y - 27 - s2 / 2), s2 * S, s2 * S); }
      if (it.car) {
        const c = it.car;
        const s2 = 22;
        ctx.drawImage(lampGlow, sx(c.x + c.d[0] * 16 - s2 / 2), sy(c.y + c.d[1] * 16 - s2 / 2), s2 * S, s2 * S);
      }
    }
    const p = Ents.player;
    ctx.globalAlpha = a * 0.35;
    ctx.drawImage(lampGlow, sx(p.x - 30), sy(p.y - 42), 60 * S, 60 * S);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawCold() {
    const def = G.coldDeficit();
    if (!def) return;
    const a = Math.min(0.5, 0.16 * def + Math.sin(time * 2) * 0.03);
    const g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.35, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
    g.addColorStop(0, 'rgba(210,235,255,0)'); g.addColorStop(1, `rgba(210,235,255,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }

  /* ---------- подписи и маркеры ---------- */

  // высота таблички над основанием здания, чтобы она висела на фасаде, а не над игроком
  const LANDMARK_LABEL_Y = { station: 74, khan: 50, baiterek: 46, akorda: 92, mosque: 84, grandMosque: 84, pyramid: 44, expo: 64, arena: 44, oldStation: 84 };

  function plate(text, wx, wy, opts = {}) {
    const fs = Math.max(10 * dpr, Math.round((opts.size || 4.6) * S));
    ctx.font = `${opts.weight || 600} ${fs}px Onest, system-ui, sans-serif`;
    const w = ctx.measureText(text).width;
    const padX = fs * 0.45, hgt = fs * 1.45;
    const x = Math.round(sx(wx) - w / 2 - padX), y = Math.round(sy(wy) - hgt / 2);
    ctx.fillStyle = opts.bg || 'rgba(19,40,58,0.92)';
    ctx.fillRect(x, y, w + padX * 2, hgt);
    if (opts.border !== false) { ctx.fillStyle = opts.border || '#f6c343'; ctx.fillRect(x, y + hgt - Math.max(1, S / 3), w + padX * 2, Math.max(1, S / 3)); }
    ctx.fillStyle = opts.color || '#f6c343';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padX + w / 2, y + hgt / 2 + fs * 0.05);
  }

  function bubble(text, wx, wy) {
    const fs = Math.max(11 * dpr, Math.round(4.2 * S));
    ctx.font = `500 ${fs}px Onest, system-ui, sans-serif`;
    const maxW = Math.min(VW * 0.7, fs * 18);
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const wd of words) {
      const t = cur ? cur + ' ' + wd : wd;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t;
    }
    if (cur) lines.push(cur);
    const lh = fs * 1.3;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + fs;
    const hh = lines.length * lh + fs * 0.6;
    let x = sx(wx) - w / 2, y = sy(wy) - hh - 6 * dpr;
    x = clamp(x, 6 * dpr, VW - w - 6 * dpr); y = Math.max(6 * dpr, y);
    ctx.fillStyle = '#eef6fa'; ctx.fillRect(x, y, w, hh);
    ctx.fillStyle = '#13283a'; ctx.fillRect(x, y + hh - 2 * dpr, w, 2 * dpr);
    ctx.fillStyle = '#eef6fa';
    ctx.beginPath(); ctx.moveTo(sx(wx) - 5 * dpr, y + hh); ctx.lineTo(sx(wx), y + hh + 6 * dpr); ctx.lineTo(sx(wx) + 5 * dpr, y + hh); ctx.fill();
    ctx.fillStyle = '#13283a'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + fs * 0.3 + i * lh));
  }

  const POIS = [['Центральный парк', 20.5, 26.6], ['Ботанический сад', 7, 42.2], ['Президентский парк', 82, 56.5], ['Площадь «Қазақ Елі»', 97, 41.6], ['Колесо обозрения', 16.5, 37.6]];

  function drawLabels(info) {
    const p = Ents.player;
    for (const b of World.buildings) {
      if (!b.label || b.res) continue;
      const lx = b.doorX * TILE + 8;
      const near = Math.abs(lx - p.x) < 260 && Math.abs(b.base - p.y) < 200;
      if (!near) continue;
      if (b.landmark) plate(b.label, lx, b.base - (LANDMARK_LABEL_Y[b.landmark] || 30), { size: 4.2 });
      else plate(b.id === 'realty' && G.s.flags.ownFlat ? 'Мой дом' : b.label, lx, b.base - (b.spr && b.spr.awning ? 27 : 22), { size: 4 });
    }
    // синие таблички улиц на перекрёстках, как в городе
    for (const d of World.decor) {
      if (d.kind !== 'sign' || Math.abs(d.x - p.x) > 90 || Math.abs(d.y - p.y) > 70) continue;
      const opt = { size: 2.9, bg: 'rgba(31,95,149,0.96)', color: '#ffffff', border: false, weight: 600 };
      plate(d.a, d.x, d.y - 36, opt);
      plate(d.b, d.x, d.y - 30, opt);
    }
    for (const [name, x, y] of POIS) {
      const wx = x * TILE, wy = y * TILE;
      if (Math.abs(wx - p.x) < 220 && Math.abs(wy - p.y) < 160) plate(name, wx, wy, { size: 3.6, bg: 'rgba(40,90,60,0.9)', color: '#eef6fa', border: false });
    }
    for (const st of World.busStops) {
      if (Math.abs(st.x - p.x) < 200 && Math.abs(st.y - p.y) < 160) plate('Аялдама · ' + st.name, st.x, st.y - 34, { size: 3.4, bg: 'rgba(42,111,151,0.95)', color: '#eef6fa', border: false });
    }
    for (const n of Content.worldNpcs) {
      if (!n.visible()) continue;
      const x = n.tx * TILE + 8, y = n.ty * TILE + 12;
      if (Math.abs(x - p.x) < 120 && Math.abs(y - p.y) < 90) plate(NPCS[n.id].name, x, y - 31, { size: 3.4, bg: 'rgba(19,40,58,0.85)', color: '#eef6fa', border: false });
      if (n.id !== 'dombra') { const by = y - 40 + Math.sin(time * 4) * 1.5; plate('!', x, by, { size: 4.4, bg: '#f6c343', color: '#13283a', border: false, weight: 800 }); }
    }
    for (const ped of Ents.peds) if (ped.bubble && ped.bubble.until > time) bubble(ped.bubble.text, ped.x, ped.y - 26);
    if (info && info.near && info.near.label) {
      const n = info.near;
      const bob = Math.sin(time * 5) * 1.2;
      plate('E', n.x, n.y + bob, { size: 4, bg: '#2ec4e6', color: '#0d1b2a', border: false, weight: 800 });
    }
  }

  function drawMarkers() {
    const o = Quests.objective();
    if (!o || !o.target) return;
    const b = World.byId[o.target];
    if (!b) return;
    const tx = b.doorX * TILE + 8, ty = b.doorY * TILE + 2;
    const X = sx(tx), Y = sy(ty);
    const margin = 40 * dpr, top = 150 * dpr, bottom = 70 * dpr;
    const onScreen = X > margin && X < VW - margin && Y > top && Y < VH - bottom;
    ctx.fillStyle = '#f6c343'; ctx.strokeStyle = '#13283a'; ctx.lineWidth = 2 * dpr;
    if (onScreen) {
      const bob = Math.sin(time * 4) * 3 * S;
      const s = 4 * S;
      ctx.beginPath(); ctx.moveTo(X - s, Y - s * 2 + bob); ctx.lineTo(X + s, Y - s * 2 + bob); ctx.lineTo(X, Y - s * 0.6 + bob); ctx.closePath();
      ctx.fill(); ctx.stroke();
      return;
    }
    const p = Ents.player;
    // стрелка у края экрана, в рамке, которая не заходит под HUD
    const cx = VW / 2, cy = (top + VH - bottom) / 2;
    const ang = Math.atan2(ty - p.y, tx - p.x);
    const rx = VW / 2 - margin, ry = (VH - bottom - top) / 2;
    const k = Math.min(rx / Math.abs(Math.cos(ang) || 1e-6), ry / Math.abs(Math.sin(ang) || 1e-6));
    const ax = cx + Math.cos(ang) * k, ay = cy + Math.sin(ang) * k;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
    const s = 9 * dpr;
    ctx.beginPath(); ctx.moveTo(s * 1.6, 0); ctx.lineTo(-s, -s); ctx.lineTo(-s * 0.4, 0); ctx.lineTo(-s, s); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
    const meters = (Math.abs(tx - p.x) + Math.abs(ty - p.y)) / TILE * 50;
    const txt = meters >= 1000 ? (meters / 1000).toFixed(1).replace('.', ',') + ' км' : Math.round(meters / 10) * 10 + ' м';
    const fs = 11 * dpr;
    ctx.font = `700 ${fs}px Onest, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lx = ax - Math.cos(ang) * 26 * dpr, ly = ay - Math.sin(ang) * 22 * dpr;
    ctx.lineWidth = 3 * dpr; ctx.strokeText(txt, lx, ly); ctx.fillStyle = '#f6c343'; ctx.fillText(txt, lx, ly);
  }

  /* ---------- снимок города для титульного коллажа ---------- */

  function postcard(cx, cy, w, h, opts = {}) {
    const cv = makeCanvas(w, h), g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
    g.drawImage(ground(), x0, y0, w, h, 0, 0, w, h);
    const items = [];
    for (const b of World.buildings) if (b.sx < x0 + w && b.sx + b.sw > x0 && b.sy < y0 + h && b.base > y0) items.push({ y: b.base, b });
    for (const d of World.decor) if (d.x > x0 - 30 && d.x < x0 + w + 30 && d.y > y0 && d.y < y0 + h + 140) items.push({ y: d.y, d });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.b) { g.drawImage(it.b.sprite, it.b.sx - x0, it.b.sy - y0); continue; }
      const d = it.d, X = d.x - x0, Y = d.y - y0;
      if (d.kind === 'tree') g.drawImage(Art.tree(d.tk, 'autumn', d.v), X - 13, Y - 34);
      else if (d.kind === 'lamp') g.drawImage(Art.lamp(), X - 5, Y - 33);
      else if (d.kind === 'bench') g.drawImage(Art.bench('autumn'), X - 9, Y - 11);
      else if (d.kind === 'fountain') g.drawImage(Art.fountain('autumn', 0), X - 24, Y - 43);
      else if (d.kind === 'stele') g.drawImage(Art.stele().cv, X - 10, Y - 118);
      else if (d.kind === 'yurt') g.drawImage(Art.yurt('autumn'), X - 24, Y - 39);
      else if (d.kind === 'bus') g.drawImage(Art.busStop(), X - 15, Y - 29);
    }
    if (opts.night) {
      g.fillStyle = 'rgba(10,16,44,0.62)'; g.fillRect(0, 0, w, h);
      for (const it of items) if (it.b) g.drawImage(it.b.lights, it.b.sx - x0, it.b.sy - y0);
      g.globalCompositeOperation = 'lighter';
      for (const it of items) if (it.d && it.d.kind === 'lamp') g.drawImage(lampGlow, it.d.x - x0 - 23, it.d.y - y0 - 50, 46, 46);
      g.globalCompositeOperation = 'source-over';
    }
    return cv;
  }

  return { init, frame, ground, postcard, resize, now: () => time, snap: () => { snapNext = true; } };
})();
