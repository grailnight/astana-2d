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

  function drawChar(sheet, x, y, dir, moving, anim) {
    const f = moving ? [1, 0, 2, 0][Math.floor(anim) % 4] : 0;
    shadow(x, y - 1, 6, 2.5);
    blitPart(sheet, f * Art.FW, dir * Art.FH, Art.FW, Art.FH, x - 8, y - 25);
  }

  /* ---------- кадр ---------- */

  let playerKey = '', playerSheet = null;

  function frame(dt, info) {
    time += dt;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, VW, VH);
    if (!G.s) return;
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
    list.push({ y: p.y, player: true });
    list.sort((a, b) => a.y - b.y);

    const look = G.look();
    const key = JSON.stringify(look);
    if (key !== playerKey) { playerKey = key; playerSheet = Art.charSheet(look); }

    let playerIdx = -1;
    list.forEach((it, i) => {
      if (it.b) blit(it.b.sprite, it.b.sx, it.b.sy, it.b.sw, it.b.sh);
      else if (it.d) drawDecor(it.d, season);
      else if (it.ped) {
        if (!it.ped.sheet || it.ped.season !== season) { it.ped.season = season; if (season === 'winter' && !it.ped.look.outer && chance(0.85)) { it.ped.look = Ents.randomLook(true); } it.ped.sheet = Art.charSheet(it.ped.look); }
        drawChar(it.ped.sheet, it.ped.x, it.ped.y, it.ped.dir, !!it.ped.tgt && it.ped.pause <= 0, it.ped.anim);
      } else if (it.car) drawCar(it.car);
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
        blitPart(playerSheet, 0, p.dir * Art.FH, Art.FW, Art.FH, p.x - 8, p.y - 25);
        ctx.globalAlpha = 1;
        break;
      }
    }

    drawWeather(dt);
    drawNight(list);
    drawLabels(info);
    drawMarkers(info);
    drawCold();
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
  const LANDMARK_LABEL_Y = { station: 74, khan: 50, baiterek: 46, akorda: 92, mosque: 84, pyramid: 44, expo: 64, arena: 44 };

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
    const meters = (Math.abs(tx - p.x) + Math.abs(ty - p.y)) / TILE * 40;
    const txt = meters >= 1000 ? (meters / 1000).toFixed(1).replace('.', ',') + ' км' : Math.round(meters / 10) * 10 + ' м';
    const fs = 11 * dpr;
    ctx.font = `700 ${fs}px Onest, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lx = ax - Math.cos(ang) * 26 * dpr, ly = ay - Math.sin(ang) * 22 * dpr;
    ctx.lineWidth = 3 * dpr; ctx.strokeText(txt, lx, ly); ctx.fillStyle = '#f6c343'; ctx.fillText(txt, lx, ly);
  }

  /* ---------- титульный экран ---------- */

  const stars = Array.from({ length: 90 }, () => [Math.random(), Math.random() * 0.6, Math.random() * 6]);
  function skyline(g, W, H, t) {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0b1730'); sky.addColorStop(0.55, '#1d3557'); sky.addColorStop(0.8, '#c8664a'); sky.addColorStop(1, '#f2a65a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (const [x, y, ph] of stars) { g.fillStyle = `rgba(255,255,255,${0.35 + Math.sin(t * 1.5 + ph) * 0.3})`; g.fillRect(x * W, y * H, 2, 2); }
    const base = H * 0.86;
    const u = Math.max(1, Math.round(Math.min(W, H) / 220));
    g.fillStyle = '#0f1d2e';
    // панельки
    for (let i = 0; i < 22; i++) {
      const bw = (18 + hash2(i, 1) * 30) * u, bh = (30 + hash2(i, 2) * 60) * u;
      const x = (i / 22) * W - 10;
      g.fillStyle = '#132236'; g.fillRect(x, base - bh, bw, bh);
      g.fillStyle = 'rgba(255,214,130,0.7)';
      for (let yy = base - bh + 4 * u; yy < base - 4 * u; yy += 7 * u) for (let xx = x + 3 * u; xx < x + bw - 4 * u; xx += 6 * u) if (hash2(xx | 0, yy | 0) < 0.35) g.fillRect(xx, yy, 2 * u, 3 * u);
    }
    // Хан Шатыр
    g.fillStyle = '#1a2b40';
    const kx = W * 0.16;
    g.beginPath(); g.moveTo(kx - 70 * u, base); g.quadraticCurveTo(kx - 20 * u, base - 40 * u, kx + 8 * u, base - 110 * u); g.quadraticCurveTo(kx + 30 * u, base - 40 * u, kx + 80 * u, base); g.fill();
    g.fillStyle = 'rgba(255,200,120,0.18)'; g.fill();
    // Байтерек
    const bx = W * 0.5;
    g.fillStyle = '#e9eef0';
    g.fillRect(bx - 3 * u, base - 150 * u, 6 * u, 150 * u);
    g.beginPath(); g.moveTo(bx - 8 * u, base); g.lineTo(bx + 8 * u, base); g.lineTo(bx + 3 * u, base - 30 * u); g.lineTo(bx - 3 * u, base - 30 * u); g.fill();
    g.strokeStyle = '#e9eef0'; g.lineWidth = 2 * u;
    for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(bx, base - 150 * u); g.quadraticCurveTo(bx + s2 * 18 * u, base - 160 * u, bx + s2 * 15 * u, base - 185 * u); g.stroke(); }
    const glow = g.createRadialGradient(bx, base - 172 * u, 2, bx, base - 172 * u, 40 * u);
    glow.addColorStop(0, 'rgba(255,215,120,0.9)'); glow.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = glow; g.fillRect(bx - 50 * u, base - 220 * u, 100 * u, 100 * u);
    g.fillStyle = '#f6c343'; g.beginPath(); g.arc(bx, base - 172 * u, 13 * u, 0, Math.PI * 2); g.fill();
    // Акорда
    const ax = W * 0.72;
    g.fillStyle = '#1a2b40'; g.fillRect(ax - 40 * u, base - 36 * u, 80 * u, 36 * u);
    g.fillStyle = '#3f9bd0'; g.beginPath(); g.ellipse(ax, base - 36 * u, 16 * u, 16 * u, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#f6c343'; g.fillRect(ax - 1 * u, base - 100 * u, 2 * u, 50 * u);
    // EXPO
    const ex = W * 0.9;
    const eg = g.createRadialGradient(ex - 10 * u, base - 60 * u, 4, ex, base - 50 * u, 42 * u);
    eg.addColorStop(0, '#bff0ff'); eg.addColorStop(1, '#2e6fa8');
    g.fillStyle = eg; g.beginPath(); g.arc(ex, base - 50 * u, 40 * u, 0, Math.PI * 2); g.fill();
    // пирамида
    const px = W * 0.33;
    g.fillStyle = '#1a2b40'; g.beginPath(); g.moveTo(px - 40 * u, base); g.lineTo(px, base - 60 * u); g.lineTo(px + 40 * u, base); g.fill();
    g.fillStyle = 'rgba(255,220,140,0.85)'; g.beginPath(); g.moveTo(px - 12 * u, base - 42 * u); g.lineTo(px, base - 60 * u); g.lineTo(px + 12 * u, base - 42 * u); g.fill();
    // река
    g.fillStyle = '#0c1626'; g.fillRect(0, base, W, H - base);
    g.fillStyle = 'rgba(255,200,120,0.25)';
    for (let i = 0; i < 40; i++) g.fillRect(hash2(i, 5) * W, base + 6 + hash2(i, 6) * (H - base - 10), (10 + hash2(i, 7) * 30) * u, 1 * u);
    // снег
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 70; i++) {
      const x = (hash2(i, 11) * W + t * (12 + hash2(i, 12) * 20) * u) % W;
      const y = (hash2(i, 13) * H + t * (20 + hash2(i, 14) * 30) * u) % H;
      g.fillRect(x, y, 2 * u, 2 * u);
    }
  }

  return { init, frame, ground, skyline, resize, now: () => time };
})();
