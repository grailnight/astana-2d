'use strict';
// Процедурный пиксель-арт: персонажи, тайлы, здания, достопримечательности, иконки.

const Art = (() => {
  const OUTLINE = '#1a1622';

  function rectFn(g) {
    return (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  }

  function pixelCircle(g, cx, cy, r, c) {
    g.fillStyle = c;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6));
      g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }

  // Обводка непрозрачных пикселей тёмной линией (как в классическом пиксель-арте)
  function outline(cv, col = OUTLINE) {
    const g = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const src = g.getImageData(0, 0, w, h).data;
    const out = g.createImageData(w, h);
    const o = out.data;
    const [r, gg, b] = hexToRgb(col);
    const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (A(x, y) > 0) continue;
        if (A(x - 1, y) > 0 || A(x + 1, y) > 0 || A(x, y - 1) > 0 || A(x, y + 1) > 0) {
          const i = (y * w + x) * 4;
          o[i] = r; o[i + 1] = gg; o[i + 2] = b; o[i + 3] = 255;
        }
      }
    }
    const tmp = makeCanvas(w, h);
    tmp.getContext('2d').putImageData(out, 0, 0);
    g.drawImage(tmp, 0, 0);
    return cv;
  }

  /* ---------------- Персонажи ---------------- */

  const FW = 16, FH = 27; // кадр с запасом под обводку, чтобы кадры не залезали друг на друга

  function drawHat(R, L, dir) {
    const c = L.hatColor || '#6b4a32';
    switch (L.hat) {
      case 'ushanka':
        R(3, 0, 10, 3, c); R(4, 2, 8, 1, shade(c, 0.25));
        if (dir === 0) { R(2, 3, 2, 5, c); R(12, 3, 2, 5, c); }
        else if (dir === 3) { R(3, 3, 10, 3, c); }
        else { R(4, 3, 3, 5, c); }
        break;
      case 'beanie':
        R(3, 0, 10, 3, c); R(3, 3, 10, 1, shade(c, 0.3)); R(7, -1, 2, 1, shade(c, 0.5));
        break;
      case 'kalpak':
        R(5, -1, 6, 1, '#f3f0e6'); R(4, 0, 8, 3, '#f3f0e6'); R(3, 3, 10, 1, '#2a2a2a');
        if (dir === 0) R(7, 0, 2, 3, '#e2ddcf');
        break;
      case 'cap':
        R(4, 0, 8, 3, c);
        if (dir === 0) R(4, 3, 8, 1, shade(c, -0.3));
        else if (dir === 2) R(10, 3, 4, 1, shade(c, -0.3));
        break;
      case 'kerchief':
        R(3, 0, 10, 3, c); R(3, 3, 2, 6, c); R(11, 3, 2, 6, c); R(4, 1, 8, 1, shade(c, 0.25));
        if (dir === 3) R(3, 3, 10, 7, c);
        if (dir === 2) { R(3, 3, 4, 7, c); }
        break;
      case 'saukele':
        R(6, -1, 4, 1, '#f2c14e'); R(5, 0, 6, 1, '#c0392b'); R(4, 1, 8, 2, '#c0392b');
        R(4, 2, 8, 1, '#f2c14e'); R(3, 3, 10, 1, '#f2c14e');
        if (dir !== 2) { R(2, 4, 1, 8, '#f3f0e6'); R(13, 4, 1, 8, '#f3f0e6'); }
        break;
      default:
    }
  }

  function drawHairFront(R, L) {
    const h = L.hair, hs = L.hairStyle, hl = shade(h, 0.2);
    if (L.hat === 'kerchief' || L.hat === 'saukele') return;
    switch (hs) {
      case 'buzz':
        R(4, 1, 8, 2, h); R(3, 2, 1, 2, h); R(12, 2, 1, 2, h); break;
      case 'long':
        R(4, 1, 8, 2, h); R(4, 3, 3, 1, h); R(9, 3, 3, 1, h);
        R(2, 3, 2, 10, h); R(12, 3, 2, 10, h); R(5, 1, 3, 1, hl); break;
      case 'bob':
        R(4, 1, 8, 2, h); R(4, 3, 8, 1, h); R(3, 2, 1, 7, h); R(12, 2, 1, 7, h); R(5, 1, 3, 1, hl); break;
      case 'bun':
        R(4, 1, 8, 2, h); R(4, 3, 2, 1, h); R(10, 3, 2, 1, h); R(3, 2, 1, 4, h); R(12, 2, 1, 4, h);
        R(6, -1, 4, 2, h); break;
      case 'pony':
        R(4, 1, 8, 2, h); R(4, 3, 4, 1, h); R(3, 2, 1, 5, h); R(12, 2, 1, 5, h); R(5, 1, 3, 1, hl); break;
      default: // short
        R(4, 1, 8, 2, h); R(4, 3, 3, 1, h); R(8, 3, 4, 1, h); R(3, 2, 1, 4, h); R(12, 2, 1, 4, h); R(5, 1, 3, 1, hl);
    }
  }

  function drawHairBack(R, L) {
    const h = L.hair, hs = L.hairStyle;
    if (L.hat === 'kerchief' || L.hat === 'saukele') return;
    switch (hs) {
      case 'buzz': R(4, 1, 8, 6, h); break;
      case 'long': R(3, 1, 10, 13, h); break;
      case 'bob': R(3, 1, 10, 9, h); break;
      case 'bun': R(3, 1, 10, 8, h); R(6, -1, 4, 3, shade(h, 0.1)); break;
      case 'pony': R(3, 1, 10, 7, h); R(7, 8, 2, 6, h); R(6, 7, 4, 1, '#c0392b'); break;
      default: R(3, 1, 10, 8, h);
    }
  }

  function drawHairSide(R, L) {
    const h = L.hair, hs = L.hairStyle;
    if (L.hat === 'kerchief' || L.hat === 'saukele') return;
    switch (hs) {
      case 'buzz': R(5, 1, 7, 2, h); R(5, 3, 2, 3, h); break;
      case 'long': R(4, 1, 8, 2, h); R(3, 3, 4, 11, h); R(7, 3, 1, 2, h); break;
      case 'bob': R(4, 1, 8, 2, h); R(4, 3, 4, 7, h); break;
      case 'bun': R(4, 1, 8, 2, h); R(4, 3, 3, 5, h); R(3, 0, 3, 3, h); break;
      case 'pony': R(4, 1, 8, 2, h); R(4, 3, 3, 4, h); R(2, 4, 2, 7, h); R(3, 3, 2, 1, '#c0392b'); break;
      default: R(4, 1, 8, 2, h); R(4, 3, 3, 5, h); R(7, 3, 2, 1, h);
    }
  }

  function torsoColors(L) {
    if (L.outer === 'puffer') return { main: L.outerColor || '#2d4f7c', sleeve: L.outerColor || '#2d4f7c' };
    switch (L.outfit) {
      case 'suit': return { main: L.top || '#2b2f3a', sleeve: L.top || '#2b2f3a' };
      case 'apron': return { main: L.top || '#f0f0f0', sleeve: L.top || '#f0f0f0' };
      default: return { main: L.top, sleeve: L.top };
    }
  }

  // dir: 0 вниз, 1 влево, 2 вправо, 3 вверх; f: 0 стоит, 1/2 шаги
  function drawChar(g, L, dir, f) {
    if (dir === 1) {
      g.save(); g.translate(FW, 0); g.scale(-1, 1);
      drawChar(g, L, 2, f);
      g.restore();
      return;
    }
    const R = rectFn(g);
    const skin = L.skin, skinD = shade(skin, -0.15);
    const tc = torsoColors(L);
    const puffer = L.outer === 'puffer';
    const robe = !puffer && (L.outfit === 'chapan' || (L.outfit === 'gala' && L.female));
    const leg = L.bottom, shoe = L.shoes || '#2a2420';

    if (dir === 0 || dir === 3) {
      const lUp = f === 2 ? 1 : 0, rUp = f === 1 ? 1 : 0;
      // ноги
      if (!robe) {
        R(5, 17, 3, 4 - lUp, leg); R(8, 17, 3, 4 - rUp, leg);
        R(7, 17, 1, 3, shade(leg, -0.2));
        if (L.outfit === 'sport') { R(5, 17, 1, 4 - lUp, '#f4f4f4'); R(10, 17, 1, 4 - rUp, '#f4f4f4'); }
      } else {
        R(5, 20, 3, 1 - lUp, leg); R(8, 20, 3, 1 - rUp, leg);
      }
      R(5, 21 - lUp, 3, 2, shoe); R(8, 21 - rUp, 3, 2, shoe);
      // руки
      const la = f === 1 ? 1 : 0, ra = f === 2 ? 1 : 0;
      const aw = puffer ? 3 : 2;
      const lx = puffer ? 1 : 2;
      R(lx, 11 + la, aw, 5, tc.sleeve); R(12, 11 + ra, aw, 5, tc.sleeve);
      R(2, 16 + la, 2, 1, skin); R(12, 16 + ra, 2, 1, skin);
      if (L.outfit === 'sport' && !puffer) { R(2, 11 + la, 1, 5, '#f4f4f4'); R(13, 11 + ra, 1, 5, '#f4f4f4'); }
      if (L.outfit === 'chapan' && !puffer) { R(2, 15 + la, 2, 1, '#f2c14e'); R(12, 15 + ra, 2, 1, '#f2c14e'); }
      // корпус
      if (robe) {
        R(4, 11, 8, 6, tc.main); R(3, 16, 10, 4, tc.main); R(3, 19, 10, 1, shade(tc.main, -0.2));
        if (L.outfit === 'chapan') {
          R(3, 19, 10, 1, '#f2c14e');
          if (dir === 0) { R(7, 11, 2, 9, '#f2c14e'); R(7, 12, 2, 7, shade(tc.main, 0.15)); }
        } else {
          R(4, 15, 8, 1, '#f2c14e');
        }
      } else if (puffer) {
        R(3, 11, 10, 7, tc.main); R(3, 13, 10, 1, shade(tc.main, -0.22)); R(3, 16, 10, 1, shade(tc.main, -0.22));
        R(4, 10, 8, 1, '#c9b79c');
        if (dir === 0) R(7, 11, 2, 7, shade(tc.main, -0.3));
      } else {
        R(4, 11, 8, 6, tc.main); R(11, 11, 1, 6, shade(tc.main, -0.18)); R(4, 16, 8, 1, shade(tc.main, -0.2));
        if (dir === 0) {
          switch (L.outfit) {
            case 'suit':
              R(6, 11, 4, 2, '#f4f4f4'); R(7, 13, 2, 1, '#f4f4f4'); R(7, 12, 2, 4, L.tie || '#a83232'); break;
            case 'gala':
              R(6, 11, 4, 2, '#f4f4f4'); R(7, 11, 2, 1, '#1b1b1b'); R(5, 14, 1, 1, '#f2c14e'); R(10, 14, 1, 1, '#f2c14e'); break;
            case 'sport': R(7, 11, 1, 6, '#f4f4f4'); break;
            case 'hoodie':
              R(6, 11, 1, 2, '#f4f4f4'); R(9, 11, 1, 2, '#f4f4f4'); R(5, 14, 6, 2, shade(tc.main, -0.15)); break;
            case 'courier': R(4, 14, 8, 1, '#e8f0f0'); R(7, 11, 2, 2, shade(tc.main, -0.25)); break;
            case 'apron': R(5, 12, 6, 7, L.apron || '#6b4a32'); R(5, 12, 6, 1, shade(L.apron || '#6b4a32', 0.25)); break;
            default: R(6, 11, 4, 1, shade(tc.main, -0.25));
          }
        } else {
          if (L.outfit === 'hoodie') R(4, 11, 8, 2, shade(tc.main, -0.15));
          if (L.outfit === 'courier') R(4, 14, 8, 1, '#e8f0f0');
        }
      }
      // шея и голова
      R(6, 10, 4, 1, skinD);
      R(4, 2, 8, 8, skin); R(4, 9, 8, 1, skinD);
      if (dir === 0) {
        R(6, 6, 1, 2, '#2a1d1a'); R(9, 6, 1, 2, '#2a1d1a');
        R(5, 8, 1, 1, shade(skin, -0.08)); R(10, 8, 1, 1, shade(skin, -0.08));
        if (L.glasses) { R(5, 6, 3, 1, '#222'); R(8, 6, 3, 1, '#222'); R(5, 7, 1, 1, '#222'); R(10, 7, 1, 1, '#222'); }
        drawHairFront(R, L);
      } else {
        drawHairBack(R, L);
        if (L.bag) { R(4, 11, 8, 7, '#e8a317'); R(4, 11, 8, 1, '#f6c343'); R(6, 13, 4, 2, '#1d3a4a'); }
      }
      drawHat(R, L, dir);
      return;
    }

    // Профиль (вправо)
    const front = f === 1, back = f === 2;
    if (!robe) {
      if (f === 0) { R(6, 17, 4, 4, leg); R(6, 21, 5, 2, shoe); }
      else {
        R(8, 17, 3, 4, front ? leg : shade(leg, -0.2)); R(8, 21, 4, 2, shoe);
        R(5, 17, 3, 3, front ? shade(leg, -0.2) : leg); R(4, 20, 3, 2, shoe);
      }
    } else {
      R(4, 16, 8, 4, tc.main);
      if (L.outfit === 'chapan') R(4, 19, 8, 1, '#f2c14e');
      if (f === 0) R(6, 21, 5, 2, shoe); else { R(8, 21, 4, 2, shoe); R(4, 20, 3, 2, shoe); }
    }
    // задняя рука
    // корпус
    if (puffer) { R(4, 11, 8, 7, tc.main); R(4, 13, 8, 1, shade(tc.main, -0.22)); R(4, 16, 8, 1, shade(tc.main, -0.22)); R(6, 10, 5, 1, '#c9b79c'); }
    else if (!robe) { R(5, 11, 6, 6, tc.main); R(5, 16, 6, 1, shade(tc.main, -0.2)); if (L.outfit === 'courier') R(5, 14, 6, 1, '#e8f0f0'); if (L.outfit === 'apron') R(9, 12, 2, 7, L.apron || '#6b4a32'); }
    else R(5, 11, 6, 6, tc.main);
    if (L.bag) { R(2, 11, 4, 7, '#e8a317'); R(2, 11, 4, 1, '#f6c343'); }
    // рука
    const ax = f === 0 ? 7 : front ? 8 : 6;
    R(ax, 11, 2, 5, puffer ? shade(tc.sleeve, -0.1) : shade(tc.sleeve, -0.1));
    R(ax + (front ? 1 : back ? -1 : 0), 16, 2, 1, skin);
    // голова
    R(7, 10, 3, 1, skinD);
    R(5, 2, 7, 8, skin); R(12, 6, 1, 1, skin); R(5, 9, 7, 1, skinD);
    R(10, 5, 1, 2, '#2a1d1a');
    if (L.glasses) { R(9, 5, 3, 1, '#222'); R(9, 6, 1, 1, '#222'); }
    drawHairSide(R, L);
    drawHat(R, L, 2);
  }

  const sheetCache = new Map();

  // Возвращает спрайт-лист 3 кадра × 4 направления
  function charSheet(L) {
    const key = JSON.stringify(L);
    let cv = sheetCache.get(key);
    if (cv) return cv;
    cv = makeCanvas(FW * 3, FH * 4);
    const g = cv.getContext('2d');
    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 3; f++) {
        g.save();
        g.translate(f * FW, d * FH + 2);
        drawChar(g, L, d, f);
        g.restore();
      }
    }
    outline(cv);
    sheetCache.set(key, cv);
    if (sheetCache.size > 400) sheetCache.delete(sheetCache.keys().next().value);
    return cv;
  }

  function portrait(L, size = 64) {
    const sheet = charSheet(L);
    const cv = makeCanvas(size, size);
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const s = size / 16;
    g.drawImage(sheet, 0, 1, 16, 16, 0, s * 0.5, size, size);
    return cv;
  }

  /* ---------------- Иконки 8×8 ---------------- */

  const ICON_PAL = {
    y: '#f6c343', o: '#d98a1c', k: '#1a1622', w: '#f4f7f8', r: '#e5533d', b: '#6b4a32', s: '#2ec4e6',
    g: '#9aa7b0', G: '#7cc66b', d: '#1d3a4a', p: '#f08aa8',
  };
  const ICONS = {
    energy: ['....yy..', '...yy...', '..yy....', '.yyyyy..', '...yy...', '..yy....', '.yy.....', '.y......'],
    food: ['..w..w..', '.w..w...', '..w..w..', '........', 'bbbbbbbb', '.bbbbbb.', '..bbbb..', '........'],
    mood: ['..yyyy..', '.yyyyyy.', 'yykyykyy', 'yyyyyyyy', 'ykyyyyky', 'yykkkkyy', '.yyyyyy.', '..yyyy..'],
    heart: ['.rr..rr.', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...', '........'],
    coin: ['..oooo..', '.oyyyyo.', 'oykkkkyo', 'oyyyyyyo', 'oykkkkyo', 'oyyykyyo', '.oyykyo.', '..oooo..'],
    kaz: ['.ssssss.', 'ssssssss', 'sswswsws', 'ssssssss', '.ssssss.', '..ss....', '.s......', '........'],
    code: ['dddddddd', 'dkkkkkkd', 'dkGkkkkd', 'dkkGkkkd', 'dkGkGGGd', 'dkkkkkkd', 'dddddddd', '..dddd..'],
    charm: ['...y....', '...y....', '..yyy...', 'yyyyyyy.', '..yyy...', '...y..w.', '...y.www', '......w.'],
    fit: ['........', 'gg....gg', 'gg....gg', 'gggggggg', 'gg....gg', 'gg....gg', '........', '........'],
    snow: ['...w....', '.w.w.w..', '..www...', 'wwwwwww.', '..www...', '.w.w.w..', '...w....', '........'],
    pin: ['..rrrr..', '.rrrrrr.', '.rrwwrr.', '.rrwwrr.', '.rrrrrr.', '..rrrr..', '...rr...', '...r....'],
    star: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yyyyyy.', '.yy..yy.', 'y......y'],
    sun: ['...y....', '.y...y..', '...yy...', 'y.yyyy.y', '..yyyy..', '...yy...', '.y...y..', '...y....'],
    cloud: ['........', '...ww...', '..wwww..', '.wwwwww.', 'wwwwwwww', '.wwwwww.', '........', '........'],
    rain: ['..gggg..', '.gggggg.', 'gggggggg', '........', '.s..s...', '...s..s.', '.s..s...', '........'],
    moon: ['...yyy..', '..yy....', '.yy.....', '.yy.....', '.yy.....', '..yy....', '...yyy..', '........'],
    phone: ['.dddddd.', '.dssssd.', '.dssssd.', '.dssssd.', '.dssssd.', '.dssssd.', '.dddddd.', '..dkkd..'],
    bus: ['.ssssss.', 'swwswwss', 'swwswwss', 'ssssssss', 'ssssssss', '.k....k.', '........', '........'],
  };
  const iconCache = {};
  function icon(name, scale = 3) {
    const key = name + scale;
    if (iconCache[key]) return iconCache[key];
    const rows = ICONS[name] || ICONS.star;
    const cv = makeCanvas(8 * scale, 8 * scale);
    const g = cv.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < 8; x++) {
        const c = ICON_PAL[row[x]];
        if (c) { g.fillStyle = c; g.fillRect(x * scale, y * scale, scale, scale); }
      }
    });
    iconCache[key] = cv.toDataURL();
    return iconCache[key];
  }

  /* ---------------- Земля ---------------- */

  const GROUND = {
    autumn: {
      grass: ['#86a04d', '#7b9645', '#91a956', '#6f8a3e'], leaf: ['#d9a33a', '#c9772e', '#e2b84a'],
      walk: '#bdb7ab', walkLine: '#aaa499', plaza: '#ddd5c4', plaza2: '#cfc6b2', path: '#cdb991',
      water: '#2e6d96', water2: '#3a82ad', road: '#4b505a', embank: '#a9a59c',
    },
    winter: {
      grass: ['#eef4f8', '#e4edf3', '#f6fafc', '#dde8ef'], leaf: ['#ffffff', '#d4e2ec'],
      walk: '#d9dfe4', walkLine: '#c6cdd3', plaza: '#e6eaee', plaza2: '#d8dee3', path: '#dfe3e6',
      water: '#b8d6e6', water2: '#cfe5f0', road: '#535863', embank: '#c3c6c9',
    },
  };

  function paintGround(world, season) {
    const P = GROUND[season];
    const cv = makeCanvas(MAP_W * TILE, MAP_H * TILE);
    const g = cv.getContext('2d');
    const R = rectFn(g);
    const T = World.T;
    const tileAt = (x, y) => world.tile(x, y);
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const t = tileAt(tx, ty);
        const X = tx * TILE, Y = ty * TILE;
        const hv = hash2(tx, ty);
        switch (t) {
          case T.GRASS: {
            R(X, Y, 16, 16, P.grass[Math.floor(hv * 2)]);
            for (let i = 0; i < 7; i++) {
              const px = Math.floor(hash2(tx, ty, i) * 16), py = Math.floor(hash2(tx, ty, i + 9) * 16);
              R(X + px, Y + py, 1, 1, P.grass[2 + (i % 2)]);
            }
            if (hash2(tx, ty, 77) < 0.35) {
              const px = Math.floor(hash2(tx, ty, 78) * 14), py = Math.floor(hash2(tx, ty, 79) * 14);
              R(X + px, Y + py, 2, 1, P.leaf[Math.floor(hash2(tx, ty, 80) * P.leaf.length)]);
            }
            break;
          }
          case T.WALK: case T.BWALK: {
            R(X, Y, 16, 16, t === T.BWALK ? shade(P.walk, -0.12) : P.walk);
            R(X, Y + 7, 16, 1, P.walkLine); R(X + (ty % 2 ? 4 : 11), Y, 1, 7, P.walkLine); R(X + (ty % 2 ? 11 : 4), Y + 8, 1, 8, P.walkLine);
            if (season === 'winter' && hv < 0.3) R(X + 3, Y + 10, 5, 2, '#f4f8fb');
            break;
          }
          case T.PLAZA: {
            const chk = (tx + ty) % 2 === 0;
            R(X, Y, 16, 16, chk ? P.plaza : P.plaza2);
            R(X, Y, 16, 1, shade(P.plaza, -0.06)); R(X, Y, 1, 16, shade(P.plaza, -0.06));
            if ((tx * 3 + ty * 5) % 11 === 0) R(X + 6, Y + 6, 4, 4, shade(P.plaza2, -0.08));
            break;
          }
          case T.PATH: {
            R(X, Y, 16, 16, P.path);
            for (let i = 0; i < 6; i++) R(X + Math.floor(hash2(tx, ty, i) * 16), Y + Math.floor(hash2(tx, ty, i + 5) * 16), 1, 1, shade(P.path, -0.12));
            break;
          }
          case T.EMBANK: {
            R(X, Y, 16, 16, P.embank);
            R(X, Y + 15, 16, 1, shade(P.embank, -0.15)); R(X + (tx % 2 ? 0 : 8), Y, 1, 16, shade(P.embank, -0.1));
            break;
          }
          case T.LOT: {
            R(X, Y, 16, 16, shade(P.road, 0.12));
            if (tx % 2 === 0) R(X, Y + 2, 1, 12, '#d8d8d8');
            break;
          }
          case T.WATER: {
            R(X, Y, 16, 16, P.water);
            if (season === 'winter') {
              if (hv < 0.4) { R(X + 2, Y + Math.floor(hv * 12), 9, 1, '#e8f4fa'); R(X + 10, Y + 3, 1, 5, '#9fc4d8'); }
            } else {
              for (let i = 0; i < 3; i++) R(X + Math.floor(hash2(tx, ty, i) * 12), Y + Math.floor(hash2(tx, ty, i + 3) * 15), 4, 1, P.water2);
            }
            break;
          }
          case T.ROAD: case T.BRIDGE: {
            R(X, Y, 16, 16, P.road);
            for (let i = 0; i < 5; i++) R(X + Math.floor(hash2(tx, ty, i) * 16), Y + Math.floor(hash2(tx, ty, i + 4) * 16), 1, 1, shade(P.road, 0.08));
            break;
          }
          default:
            R(X, Y, 16, 16, P.grass[0]);
        }
      }
    }

    // Разметка дорог, бордюры, зебры
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const t = tileAt(tx, ty);
        if (t !== T.ROAD && t !== T.BRIDGE) continue;
        const X = tx * TILE, Y = ty * TILE;
        const dir = world.roadDir(tx, ty);
        const isRoad = (x, y) => { const k = tileAt(x, y); return k === T.ROAD || k === T.BRIDGE; };
        if (dir === 1 && world.roadDir(tx, ty + 1) === 1 && tx % 2 === 0) R(X + 3, Y + 15, 9, 1, '#e9e6da');
        if (dir === 2 && world.roadDir(tx + 1, ty) === 2 && ty % 2 === 0) R(X + 15, Y + 3, 1, 9, '#e9e6da');
        // бордюры
        if (!isRoad(tx, ty - 1)) R(X, Y, 16, 1, '#9b9a96');
        if (!isRoad(tx, ty + 1)) R(X, Y + 15, 16, 2, '#7f7d78');
        if (!isRoad(tx - 1, ty)) R(X, Y, 1, 16, '#9b9a96');
        if (!isRoad(tx + 1, ty)) R(X + 15, Y, 1, 16, '#7f7d78');
        // зебра возле перекрёстка
        if (dir === 1 && (world.roadDir(tx + 1, ty) === 3 || world.roadDir(tx - 1, ty) === 3)) {
          for (let i = 1; i < 16; i += 4) R(X + 3, Y + i, 10, 2, '#ecebe4');
        }
        if (dir === 2 && (world.roadDir(tx, ty + 1) === 3 || world.roadDir(tx, ty - 1) === 3)) {
          for (let i = 1; i < 16; i += 4) R(X + i, Y + 3, 2, 10, '#ecebe4');
        }
        if (season === 'winter') {
          if (!isRoad(tx, ty - 1)) R(X + Math.floor(hv(tx, ty) * 8), Y + 1, 6, 1, '#e8eef2');
          if (!isRoad(tx, ty + 1)) R(X + Math.floor(hv(tx, ty + 1) * 8), Y + 13, 7, 2, '#e8eef2');
        }
      }
    }

    // Гранитные стенки набережной и перила
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const t = tileAt(tx, ty);
        const X = tx * TILE, Y = ty * TILE;
        if (t === T.WATER) {
          const up = tileAt(tx, ty - 1);
          if (up !== T.WATER && up !== T.BRIDGE && up !== T.BWALK) { R(X, Y, 16, 4, '#7d7a74'); R(X, Y + 4, 16, 1, '#5d5a55'); }
        }
        if (t === T.EMBANK || t === T.BWALK) {
          if (tileAt(tx, ty + 1) === T.WATER) { R(X, Y + 13, 16, 1, '#3c3f46'); for (let i = 1; i < 16; i += 5) R(X + i, Y + 10, 1, 4, '#3c3f46'); }
          if (tileAt(tx, ty - 1) === T.WATER) { R(X, Y + 1, 16, 1, '#3c3f46'); for (let i = 1; i < 16; i += 5) R(X + i, Y, 1, 3, '#3c3f46'); }
          if (t === T.BWALK) {
            if (tileAt(tx - 1, ty) === T.WATER) { R(X, Y, 2, 16, '#3c3f46'); }
            if (tileAt(tx + 1, ty) === T.WATER) { R(X + 14, Y, 2, 16, '#3c3f46'); }
          }
        }
      }
    }
    return cv;
  }
  function hv(x, y) { return hash2(x, y, 3); }

  /* ---------------- Деревья и декор ---------------- */

  const decorCache = {};

  function tree(kind, season, variant) {
    const key = kind + season + variant;
    if (decorCache[key]) return decorCache[key];
    const cv = makeCanvas(26, 36);
    const g = cv.getContext('2d');
    const R = rectFn(g);
    if (kind === 'pine') {
      R(12, 29, 3, 5, '#5a3d28');
      const layers = [[13, 4, 4], [13, 9, 7], [13, 15, 9], [13, 21, 11]];
      layers.forEach(([cx, y, w], i) => {
        for (let k = 0; k < 7; k++) {
          const ww = Math.round(w * (k + 1) / 7);
          R(cx - ww, y + k, ww * 2 + 1, 1, k < 2 ? '#3f7a4b' : '#2f5d3a');
        }
        if (season === 'winter') { R(cx - Math.round(w * 0.4), y, Math.round(w * 0.8) + 1, 2, '#f4f8fb'); R(cx - w + 1, y + 6, 3, 1, '#f4f8fb'); }
        if (i === 0) R(cx, y - 1, 1, 1, '#3f7a4b');
      });
    } else if (season === 'winter') {
      R(12, 16, 3, 18, '#5a3d28'); R(11, 33, 5, 1, '#4a3020');
      const br = [[12, 18, -1, 9], [14, 15, 1, 9], [12, 12, -1, 7], [14, 10, 1, 6], [13, 6, 0, 6]];
      br.forEach(([x, y, dx, len]) => {
        for (let i = 0; i < len; i++) {
          const px = x + Math.round(dx * i * 0.9), py = y - Math.round(i * 0.8);
          R(px, py, 1, 1, '#5a3d28');
          if (i % 3 === 2) R(px, py - 1, 1, 1, '#f4f8fb');
        }
      });
      R(9, 10, 8, 1, '#f4f8fb');
    } else {
      const cols = [['#d9a33a', '#b8792b', '#f0c45a'], ['#c9772e', '#a35a22', '#e39648'], ['#b8a13a', '#8f7d2c', '#d4bd55'], ['#7f9a3e', '#5f7a2e', '#9db552']][variant % 4];
      R(12, 22, 3, 12, '#5a3d28'); R(11, 33, 5, 1, '#4a3020');
      pixelCircle(g, 13, 14, 10, cols[1]);
      pixelCircle(g, 8, 15, 6, cols[0]); pixelCircle(g, 18, 15, 6, cols[0]); pixelCircle(g, 13, 9, 7, cols[0]);
      pixelCircle(g, 10, 8, 3, cols[2]); pixelCircle(g, 7, 13, 2, cols[2]);
      R(4, 21, 2, 1, cols[0]); R(20, 23, 2, 1, cols[1]);
    }
    outline(cv);
    decorCache[key] = cv;
    return cv;
  }

  function lamp() {
    if (decorCache.lamp) return decorCache.lamp;
    const cv = makeCanvas(10, 34);
    const R = rectFn(cv.getContext('2d'));
    R(4, 6, 2, 26, '#3a3f48'); R(3, 31, 4, 2, '#2c3038');
    R(1, 3, 8, 3, '#2c3038'); R(2, 6, 6, 1, '#fff2c0');
    outline(cv);
    decorCache.lamp = cv;
    return cv;
  }

  function bench(season) {
    const key = 'bench' + season;
    if (decorCache[key]) return decorCache[key];
    const cv = makeCanvas(18, 12);
    const R = rectFn(cv.getContext('2d'));
    R(2, 8, 2, 3, '#2c3038'); R(14, 8, 2, 3, '#2c3038');
    R(1, 2, 16, 2, '#8a5a34'); R(1, 5, 16, 3, '#a0693d'); R(1, 5, 16, 1, '#b97d4b');
    if (season === 'winter') R(1, 4, 16, 2, '#f4f8fb');
    outline(cv);
    decorCache[key] = cv;
    return cv;
  }

  function busStop() {
    if (decorCache.bus) return decorCache.bus;
    const cv = makeCanvas(30, 30);
    const R = rectFn(cv.getContext('2d'));
    R(1, 4, 28, 3, '#2a6f97'); R(1, 7, 28, 1, '#1d4f6e');
    R(2, 8, 1, 18, '#c6d4dc'); R(27, 8, 1, 18, '#c6d4dc');
    R(3, 8, 24, 14, 'rgba(180,220,240,0.45)'); R(4, 18, 22, 3, '#7b5a3a');
    R(24, 0, 2, 26, '#3a3f48'); R(21, 0, 8, 6, '#f6c343'); R(23, 2, 4, 2, '#1d3a4a');
    outline(cv);
    decorCache.bus = cv;
    return cv;
  }

  function fountain(season, t) {
    const cv = makeCanvas(48, 44);
    const g = cv.getContext('2d');
    const R = rectFn(g);
    g.fillStyle = '#b8b0a0'; g.beginPath(); g.ellipse(24, 30, 23, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = season === 'winter' ? '#d9e9f2' : '#3d8bbd'; g.beginPath(); g.ellipse(24, 29, 19, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9d9585'; g.fillRect(1, 30, 46, 4);
    R(22, 18, 4, 12, '#cfc8b8'); R(18, 17, 12, 2, '#b8b0a0');
    if (season !== 'winter') {
      g.fillStyle = 'rgba(220,240,255,0.85)';
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + t * 2;
        const h = 6 + ((t * 30 + i * 7) % 10);
        g.fillRect(24 + Math.cos(a) * 9, 22 - h * 0.6 + Math.sin(a) * 2, 1, 2);
      }
      R(23, 4 + ((t * 20) % 3), 2, 14, 'rgba(230,246,255,0.9)');
    } else {
      R(21, 15, 6, 3, '#f4f8fb');
    }
    return cv;
  }

  /* ---------------- Машины ---------------- */

  const carCache = {};
  function car(color, vertical, bus) {
    const key = color + vertical + bus;
    if (carCache[key]) return carCache[key];
    let cv;
    if (!vertical) {
      const w = bus ? 46 : 26, h = bus ? 20 : 16;
      cv = makeCanvas(w, h);
      const R = rectFn(cv.getContext('2d'));
      R(1, 5, w - 2, h - 8, color); R(1, h - 4, w - 2, 1, shade(color, -0.3));
      if (bus) {
        R(1, 1, w - 2, 5, shade(color, 0.2));
        for (let x = 4; x < w - 6; x += 7) R(x, 6, 5, 4, '#2c4a63');
        R(w - 4, 6, 2, 6, '#2c4a63');
      } else {
        R(7, 1, 12, 6, shade(color, 0.15)); R(8, 2, 10, 4, '#2c4a63'); R(9, 2, 3, 1, '#7fb0cf'); R(17, 2, 2, 5, '#3e6585');
      }
      R(4, h - 4, 5, 3, '#1b1b1b'); R(w - 9, h - 4, 5, 3, '#1b1b1b');
      R(w - 2, 8, 1, 2, '#fff6c8'); R(1, 8, 1, 2, '#e5533d');
    } else {
      const w = bus ? 20 : 16, h = bus ? 46 : 26;
      cv = makeCanvas(w, h);
      const R = rectFn(cv.getContext('2d'));
      R(2, 1, w - 4, h - 2, color); R(2, h - 3, w - 4, 1, shade(color, -0.3));
      if (bus) { for (let y = 4; y < h - 8; y += 7) { R(2, y, 2, 4, '#2c4a63'); R(w - 4, y, 2, 4, '#2c4a63'); } R(4, h - 7, w - 8, 4, '#2c4a63'); }
      else { R(3, 6, w - 6, 13, shade(color, 0.15)); R(4, 16, w - 8, 3, '#2c4a63'); R(4, 6, w - 8, 2, '#2c4a63'); }
      R(1, 4, 1, 4, '#1b1b1b'); R(w - 2, 4, 1, 4, '#1b1b1b'); R(1, h - 9, 1, 4, '#1b1b1b'); R(w - 2, h - 9, 1, 4, '#1b1b1b');
      R(3, h - 2, 2, 1, '#fff6c8'); R(w - 5, h - 2, 2, 1, '#fff6c8'); R(3, 1, 2, 1, '#e5533d'); R(w - 5, 1, 2, 1, '#e5533d');
    }
    outline(cv);
    carCache[key] = cv;
    return cv;
  }

  /* ---------------- Здания ---------------- */

  const WARM = ['#ffd27a', '#ffe3a3', '#ffc98a', '#fff0c8'];

  function makeBuilding(o) {
    const W = o.w * TILE;
    const facade = o.facade;
    const depth = Math.max(o.minDepth || 10, o.h * TILE - facade);
    const H = depth + facade;
    const cv = makeCanvas(W, H), g = cv.getContext('2d');
    const lights = makeCanvas(W, H), lg = lights.getContext('2d');
    const R = rectFn(g), L = rectFn(lg);
    const seed = o.seed || 1;
    const wall = o.wall, roof = o.roof;

    // крыша
    R(0, 0, W, depth, roof);
    R(0, 0, W, 1, shade(roof, 0.25)); R(0, 0, 1, depth, shade(roof, 0.12)); R(W - 1, 0, 1, depth, shade(roof, -0.2));
    R(0, depth - 2, W, 2, shade(roof, -0.3));
    if (depth > 14) {
      for (let i = 0; i < Math.floor(W / 36); i++) {
        const vx = 6 + Math.floor(hash2(seed, i) * (W - 16));
        const vy = 3 + Math.floor(hash2(seed, i + 7) * (depth - 12));
        R(vx, vy, 7, 5, shade(roof, -0.15)); R(vx, vy, 7, 1, shade(roof, 0.2));
      }
    }
    // фасад
    R(0, depth, W, facade, wall);
    R(0, depth, W, 2, shade(wall, -0.25));
    R(W - 2, depth, 2, facade, shade(wall, -0.1));
    R(0, H - 2, W, 2, shade(wall, -0.3));

    const doorX = o.doorX != null ? o.doorX * TILE : -100;
    const floorH = 12;
    const floors = Math.max(1, Math.floor((facade - 6) / floorH));
    const lit = (x, y, w, h, i) => { if (hash2(seed, i, 5) < (o.litRate ?? 0.6)) L(x, y, w, h, WARM[Math.floor(hash2(seed, i, 6) * 4)]); };

    const style = o.style;
    if (style === 'glass') {
      const top = depth + 2, bot = H - 2;
      const grd = g.createLinearGradient(0, top, W, bot);
      grd.addColorStop(0, shade(o.glass || '#5d8fb3', 0.25)); grd.addColorStop(0.5, o.glass || '#5d8fb3'); grd.addColorStop(1, shade(o.glass || '#5d8fb3', -0.25));
      g.fillStyle = grd; g.fillRect(2, top, W - 4, bot - top);
      let i = 0;
      for (let y = top + 1; y < bot - 14; y += 6) {
        R(2, y, W - 4, 1, shade(o.glass || '#5d8fb3', -0.35));
        for (let x = 4; x < W - 6; x += 8) { lit(x, y + 1, 7, 5, i++); }
      }
      for (let x = 2; x < W - 2; x += 8) R(x, top, 1, bot - top, shade(o.glass || '#5d8fb3', -0.3));
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.beginPath(); g.moveTo(W * 0.2, top); g.lineTo(W * 0.45, top); g.lineTo(W * 0.15, bot); g.lineTo(0, bot); g.closePath(); g.fill();
      R(0, H - 16, W, 14, shade(wall, -0.05));
      for (let x = 4; x < W - 6; x += 12) if (Math.abs(x - doorX) > 14) { R(x, H - 13, 9, 9, '#3b5a78'); lit(x, H - 13, 9, 9, i++); }
    } else {
      let i = 0;
      for (let f = 0; f < floors; f++) {
        const wy = H - floorH * (f + 1) - 2 + 3;
        if (f === 0 && (style === 'shop' || style === 'mall')) continue;
        if (style !== 'classic' && style !== 'palace') R(0, wy - 3, W, 1, shade(wall, -0.06));
        const step = style === 'classic' || style === 'palace' ? 14 : 10;
        for (let x = 5; x < W - 8; x += step) {
          if (f === 0 && Math.abs(x - doorX - 3) < 10) continue;
          if (style === 'classic' || style === 'palace') {
            R(x, wy - 1, 6, 8, '#3b5a78'); R(x + 1, wy - 2, 4, 1, '#3b5a78'); R(x - 1, wy + 7, 8, 1, shade(wall, 0.2));
            lit(x, wy - 1, 6, 8, i++);
          } else {
            R(x - 1, wy - 1, 8, 8, shade(wall, 0.15)); R(x, wy, 6, 6, '#3b5a78'); R(x, wy, 2, 1, '#7fb0cf');
            lit(x, wy, 6, 6, i++);
            if (style === 'panel' && f > 0 && (x / step) % 3 === 1) { R(x - 2, wy + 6, 10, 3, shade(wall, -0.12)); R(x - 2, wy + 6, 10, 1, shade(wall, 0.1)); }
            if (style === 'modern' && f > 0) { R(x - 1, wy + 6, 8, 2, 'rgba(160,210,230,0.7)'); }
          }
        }
        if (style === 'modern' && o.accent) {
          R(W - 18, H - floorH * (f + 1) - 2, 6, floorH, f % 2 ? o.accent : shade(o.accent, 0.2));
        }
      }
      if (style === 'classic' || style === 'palace') {
        for (let x = 8; x < W - 8; x += 14) {
          if (Math.abs(x - doorX - 4) < 12) continue;
          R(x - 4, H - 22, 3, 20, shade(wall, 0.25)); R(x - 1, H - 22, 1, 20, shade(wall, -0.15));
        }
        R(0, H - 24, W, 2, shade(wall, 0.2));
        R(0, depth + 2, W, 3, shade(wall, 0.18));
      }
      if (style === 'shop' || style === 'mall') {
        for (let x = 3; x < W - 10; x += 14) {
          if (Math.abs(x - doorX - 2) < 13) continue;
          R(x, H - 14, 11, 10, '#5a87a6'); R(x + 1, H - 13, 3, 2, '#a9d1e6'); L(x, H - 14, 11, 10, '#ffe3a3');
        }
        if (o.awning) {
          for (let x = 0; x < W; x += 4) R(x, H - 21, 4, 5, (x / 4) % 2 ? o.awning : '#f4f4f0');
          for (let x = 0; x < W; x += 4) R(x + 1, H - 16, 2, 1, (x / 4) % 2 ? o.awning : '#f4f4f0');
        }
        if (style === 'mall' && o.accent) {
          R(0, depth + 2, W, 6, o.accent); R(W * 0.1, depth + 10, 18, facade - 36, shade(o.accent, -0.1));
        }
      }
      if (style === 'warehouse') {
        R(Math.max(4, doorX - 30), H - 18, 24, 16, '#8b9196');
        for (let y = H - 17; y < H - 2; y += 3) R(Math.max(4, doorX - 30), y, 24, 1, '#6f757a');
      }
    }

    // дверь
    if (o.doorX != null) {
      const dx = doorX;
      R(dx + 2, H - 17, 12, 1, shade(wall, -0.35));
      R(dx + 3, H - 16, 10, 14, '#3a2c24');
      R(dx + 4, H - 15, 8, 6, '#7fb4cf'); R(dx + 8, H - 15, 1, 13, '#2a201a');
      L(dx + 4, H - 15, 8, 6, '#ffe3a3');
      R(dx + 1, H - 2, 14, 2, '#cfc8b8');
    }
    if (o.cross) {
      const cx = W / 2 | 0, cy = depth + 10;
      R(cx - 5, cy - 1, 10, 10, '#f4f4f4'); R(cx - 1, cy, 2, 8, '#2fa37a'); R(cx - 4, cy + 3, 8, 2, '#2fa37a');
    }
    if (o.dome) {
      const cx = W / 2, cy = depth + 2;
      g.fillStyle = '#f2c14e'; g.beginPath(); g.ellipse(cx, cy, 14, 12, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#d9a53a'; g.fillRect(cx - 1, cy - 20, 2, 9);
      g.fillStyle = '#fff1b8'; g.fillRect(cx - 8, cy - 8, 3, 3);
      lg.fillStyle = 'rgba(255,214,120,0.8)'; lg.beginPath(); lg.ellipse(cx, cy, 14, 12, 0, Math.PI, 0); lg.fill();
    }
    return { cv, lights, W, H };
  }

  /* ---------------- Достопримечательности ---------------- */

  function canvases(W, H) {
    const cv = makeCanvas(W, H), lights = makeCanvas(W, H);
    return { cv, lights, g: cv.getContext('2d'), lg: lights.getContext('2d'), W, H };
  }

  function baiterek() {
    const o = canvases(64, 214), { g, lg, W, H } = o;
    const R = rectFn(g);
    R(0, H - 14, 64, 12, '#cfc8b8'); R(0, H - 3, 64, 3, '#a9a190'); R(6, H - 18, 52, 5, '#e2dccf');
    R(18, H - 36, 28, 19, '#eef2f4'); R(18, H - 36, 28, 2, '#ffffff'); R(20, H - 31, 24, 5, '#5d7d96'); R(18, H - 19, 28, 2, '#c3ccd2');
    R(29, H - 26, 6, 8, '#3a4a5a');
    const top = 70, bot = H - 36;
    for (let y = top; y < bot; y++) {
      const t = (y - top) / (bot - top);
      const half = 4 + Math.pow(t, 2.2) * 7 + Math.max(0, 0.15 - t) * 14;
      R(32 - half, y, half * 2, 1, '#f3f6f7');
      R(32 + half - 2, y, 2, 1, '#c9d3da');
      R(32 - half, y, 1, 1, '#ffffff');
      if (y % 7 === 0) R(32 - half + 1, y, half * 2 - 2, 1, '#d5dde3');
    }
    g.lineCap = 'round';
    g.strokeStyle = '#f3f6f7'; g.lineWidth = 2;
    const cup = (s, k) => { g.beginPath(); g.moveTo(32 + s * 3, 80); g.bezierCurveTo(32 + s * (6 + 10 * k), 70, 32 + s * (13 + 6 * k), 58, 32 + s * (10 + 8 * k), 30 + (1 - k) * 10); g.stroke(); };
    cup(-1, 1); cup(1, 1);
    const cx = 32, cy = 44, r = 16;
    const grd = g.createRadialGradient(cx - 6, cy - 7, 2, cx, cy, r);
    grd.addColorStop(0, '#fff7cf'); grd.addColorStop(0.35, '#f6c443'); grd.addColorStop(1, '#a8681a');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(110,60,10,0.4)'; g.lineWidth = 1;
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(cx, cy, Math.abs(k) * 5 + 1, r, 0, 0, Math.PI * 2); g.stroke(); }
    for (let k = -2; k <= 2; k++) { const yy = cy + k * 5.5; const ww = Math.sqrt(Math.max(0, r * r - (yy - cy) ** 2)); g.beginPath(); g.moveTo(cx - ww, yy); g.lineTo(cx + ww, yy); g.stroke(); }
    g.strokeStyle = '#f3f6f7'; g.lineWidth = 2;
    cup(-1, 0.45); cup(1, 0.45); cup(-1, 0.1); cup(1, 0.1);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(cx - 9, cy - 10, 4, 3);
    // подсветка ночью
    const halo = lg.createRadialGradient(cx, cy, 4, cx, cy, 30);
    halo.addColorStop(0, 'rgba(255,230,140,1)'); halo.addColorStop(0.5, 'rgba(255,200,80,0.9)'); halo.addColorStop(1, 'rgba(255,190,60,0)');
    lg.fillStyle = halo; lg.fillRect(0, 10, 64, 70);
    lg.fillStyle = 'rgba(210,235,255,0.55)'; lg.fillRect(28, top, 8, bot - top);
    lg.fillStyle = '#ffe3a3'; lg.fillRect(20, H - 31, 24, 5);
    return o;
  }

  function khanShatyr() {
    const o = canvases(224, 236), { g, lg, W, H } = o;
    const base = H - 22, ax = 128, ay = 6;
    const tent = (ctx) => {
      ctx.beginPath();
      ctx.moveTo(6, base);
      ctx.bezierCurveTo(26, base - 70, 90, 44, ax, ay);
      ctx.bezierCurveTo(156, 46, 204, base - 80, 218, base);
      ctx.ellipse(112, base, 106, 16, 0, 0, Math.PI, false);
      ctx.closePath();
    };
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(112, base + 4, 108, 16, 0, 0, Math.PI * 2); g.fill();
    const grd = g.createLinearGradient(0, 0, W, 0);
    grd.addColorStop(0, '#f2e7c4'); grd.addColorStop(0.5, '#ddc893'); grd.addColorStop(1, '#a98f5b');
    tent(g); g.fillStyle = grd; g.fill();
    g.save(); tent(g); g.clip();
    g.strokeStyle = 'rgba(120,96,52,0.38)'; g.lineWidth = 1;
    for (let i = 0; i <= 18; i++) {
      const bx = 6 + i * (212 / 18);
      const by = base + Math.sin(Math.acos(clamp((bx - 112) / 106, -1, 1))) * 16;
      g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(lerp(ax, bx, 0.35), lerp(ay, by, 0.6), bx, by); g.stroke();
    }
    for (let j = 1; j <= 9; j++) {
      const t = j / 10;
      const y = lerp(ay, base, Math.pow(t, 1.25));
      g.beginPath(); g.ellipse(lerp(ax, 112, t), y, 106 * Math.pow(t, 0.62), 16 * t, 0, 0, Math.PI); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath(); g.moveTo(ax - 6, 20); g.quadraticCurveTo(60, 110, 30, base - 6); g.lineTo(48, base - 4); g.quadraticCurveTo(80, 110, ax - 2, 24); g.fill();
    g.restore();
    g.fillStyle = '#c9b27a'; g.fillRect(ax - 1, 0, 3, 10);
    // вход
    g.fillStyle = '#d5dfe6'; g.fillRect(92, base - 2, 40, 18);
    g.fillStyle = '#4c6f8c'; g.fillRect(96, base + 2, 32, 12);
    g.fillStyle = '#9fc6dc'; g.fillRect(98, base + 3, 8, 4); g.fillRect(110, base + 3, 8, 4);
    g.fillStyle = '#2b3b4a'; g.fillRect(111, base + 4, 2, 10);
    tent(lg); lg.fillStyle = 'rgba(255,214,150,0.55)'; lg.fill();
    lg.fillStyle = 'rgba(255,240,200,0.9)'; lg.fillRect(96, base + 2, 32, 12);
    return o;
  }

  function akorda() {
    const o = canvases(224, 206), { g, lg, W, H } = o;
    const R = rectFn(g), L = rectFn(lg);
    // крылья
    R(6, H - 54, 40, 52, '#f1f1ec'); R(6, H - 66, 40, 12, '#d7dbde');
    R(178, H - 54, 40, 52, '#f1f1ec'); R(178, H - 66, 40, 12, '#d7dbde');
    for (const bx of [6, 178]) for (let x = bx + 4; x < bx + 36; x += 8) for (let y = H - 48; y < H - 10; y += 14) { R(x, y, 4, 8, '#5f7383'); L(x, y, 4, 8, '#ffe3a3'); }
    // главный корпус
    R(46, H - 84, 132, 82, '#f7f7f3'); R(46, H - 102, 132, 18, '#dde1e4'); R(46, H - 86, 132, 4, '#e8e8e2');
    for (let x = 58; x < 170; x += 11) { R(x, H - 74, 4, 60, '#ffffff'); R(x + 4, H - 74, 1, 60, '#c8ccd0'); R(x + 5, H - 70, 5, 50, '#62778a'); L(x + 5, H - 70, 5, 50, '#ffe9b0'); }
    R(46, H - 14, 132, 4, '#e5e2da'); R(84, H - 10, 56, 10, '#e9e6de'); for (let y = H - 9; y < H; y += 3) R(84, y, 56, 1, '#cfcbc2');
    // барабан купола
    R(88, H - 128, 48, 28, '#f7f7f3'); for (let x = 92; x < 132; x += 7) { R(x, H - 124, 3, 14, '#62778a'); L(x, H - 124, 3, 14, '#ffe9b0'); }
    R(86, H - 102, 52, 3, '#dde1e4');
    // купол
    const cx = 112, cy = H - 128;
    const grd = g.createLinearGradient(cx - 28, 0, cx + 28, 0);
    grd.addColorStop(0, '#9fdcf2'); grd.addColorStop(0.45, '#3f9bd0'); grd.addColorStop(1, '#1f5f95');
    g.fillStyle = grd; g.beginPath(); g.ellipse(cx, cy, 28, 26, 0, Math.PI, 0); g.fill();
    g.strokeStyle = '#f2c14e'; g.lineWidth = 1;
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(cx, cy, Math.abs(k) * 7 + 0.5, 26, 0, Math.PI, Math.PI * 1.5); g.ellipse(cx, cy, Math.abs(k) * 7 + 0.5, 26, 0, Math.PI * 1.5, 0); g.stroke(); }
    lg.fillStyle = 'rgba(120,200,255,0.6)'; lg.beginPath(); lg.ellipse(cx, cy, 28, 26, 0, Math.PI, 0); lg.fill();
    // шпиль
    g.fillStyle = '#f2c14e';
    g.beginPath(); g.moveTo(cx - 4, cy - 24); g.lineTo(cx + 4, cy - 24); g.lineTo(cx + 1, 14); g.lineTo(cx - 1, 14); g.closePath(); g.fill();
    g.beginPath(); g.arc(cx, 30, 3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx, 10, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff1b8'; g.fillRect(cx - 2, 7, 2, 2);
    lg.fillStyle = 'rgba(255,214,110,0.95)'; lg.fillRect(cx - 2, 6, 4, cy - 30);
    lg.beginPath(); lg.arc(cx, 10, 6, 0, Math.PI * 2); lg.fill();
    return o;
  }

  function mosque() {
    const o = canvases(224, 222), { g, lg, W, H } = o;
    const R = rectFn(g), L = rectFn(lg);
    const tq = '#2fa3b5', tqL = '#8fdde8';
    // минареты (дальние)
    const minaret = (x, top) => {
      R(x, top, 8, H - top - 4, '#f6f6f2'); R(x + 6, top, 2, H - top - 4, '#d9dcdc');
      R(x - 2, top + 22, 12, 3, '#e5e7e6'); R(x - 2, top + 25, 12, 1, tq);
      for (let y = top + 34; y < H - 20; y += 22) R(x, y, 8, 1, tq);
      g.fillStyle = tq; g.beginPath(); g.moveTo(x - 1, top); g.lineTo(x + 4, top - 18); g.lineTo(x + 9, top); g.closePath(); g.fill();
      g.fillStyle = '#f2c14e'; g.fillRect(x + 3, top - 24, 2, 7);
      L(x + 1, top + 4, 6, 14, 'rgba(255,240,200,0.8)'); L(x + 3, top - 24, 2, 7, '#ffe08a');
    };
    minaret(34, 40); minaret(182, 40);
    // основной объём
    R(26, H - 74, 172, 72, '#f7f7f4'); R(26, H - 88, 172, 14, '#e4e8ea'); R(26, H - 76, 172, 3, '#e9ecec');
    for (let x = 34; x < 190; x += 14) {
      R(x, H - 62, 8, 30, '#2a6f78'); g.fillStyle = '#2a6f78'; g.beginPath(); g.arc(x + 4, H - 62, 4, Math.PI, 0); g.fill();
      L(x, H - 62, 8, 30, '#fff3cf');
    }
    R(100, H - 40, 24, 38, '#e6e9ea'); R(104, H - 34, 16, 32, '#2a4f58'); g.fillStyle = '#e6e9ea'; g.beginPath(); g.arc(112, H - 40, 12, Math.PI, 0); g.fill();
    g.fillStyle = '#2a4f58'; g.beginPath(); g.arc(112, H - 34, 8, Math.PI, 0); g.fill();
    L(104, H - 40, 16, 38, '#fff3cf');
    // малые купола
    const dome = (cx, cy, rx, ry) => {
      const grd = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
      grd.addColorStop(0, tqL); grd.addColorStop(0.5, tq); grd.addColorStop(1, '#1d6f80');
      g.fillStyle = grd; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#f2c14e'; g.fillRect(cx - 1, cy - ry - 6, 2, 6);
      lg.fillStyle = 'rgba(140,230,240,0.45)'; lg.beginPath(); lg.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); lg.fill();
    };
    dome(60, H - 88, 18, 16); dome(164, H - 88, 18, 16);
    R(76, H - 112, 72, 26, '#f7f7f4'); for (let x = 82; x < 144; x += 9) { R(x, H - 108, 4, 14, '#2a6f78'); L(x, H - 108, 4, 14, '#fff3cf'); }
    dome(112, H - 112, 42, 40);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
    for (let k = 1; k <= 3; k++) { g.beginPath(); g.ellipse(112, H - 112, 42 * k / 4, 40, 0, Math.PI, 0); g.stroke(); }
    // минареты (ближние)
    minaret(4, 20); minaret(212, 20);
    return o;
  }

  function pyramid() {
    const o = canvases(176, 172), { g, lg, W, H } = o;
    const ax = 88, ay = 8, bl = 6, br = 170, by = H - 4, mx = 92;
    g.fillStyle = '#e1dccf'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bl, by); g.lineTo(mx, by); g.closePath(); g.fill();
    g.fillStyle = '#c3bba8'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(mx, by); g.lineTo(br, by); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,110,95,0.35)'; g.lineWidth = 1;
    for (let t = 0.32; t < 1; t += 0.085) {
      const y = lerp(ay, by, t);
      g.beginPath(); g.moveTo(lerp(ax, bl, t), y); g.lineTo(lerp(ax, mx, t), y); g.lineTo(lerp(ax, br, t), y); g.stroke();
    }
    // стеклянная вершина
    const gt = 0.3;
    const grd = g.createLinearGradient(0, ay, 0, lerp(ay, by, gt));
    grd.addColorStop(0, '#f6d77a'); grd.addColorStop(0.5, '#9fd3ec'); grd.addColorStop(1, '#3f86b8');
    g.fillStyle = grd; g.beginPath(); g.moveTo(ax, ay); g.lineTo(lerp(ax, bl, gt), lerp(ay, by, gt)); g.lineTo(lerp(ax, br, gt), lerp(ay, by, gt)); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    for (let i = 1; i < 5; i++) { const t = gt * i / 5; g.beginPath(); g.moveTo(lerp(ax, bl, t), lerp(ay, by, t)); g.lineTo(lerp(ax, br, t), lerp(ay, by, t)); g.stroke(); }
    g.fillStyle = '#2f3e4c'; g.fillRect(78, H - 22, 20, 18);
    g.fillStyle = '#d2cab8'; g.fillRect(74, H - 26, 28, 4);
    lg.fillStyle = 'rgba(255,225,140,0.95)'; lg.beginPath(); lg.moveTo(ax, ay); lg.lineTo(lerp(ax, bl, gt), lerp(ay, by, gt)); lg.lineTo(lerp(ax, br, gt), lerp(ay, by, gt)); lg.closePath(); lg.fill();
    lg.fillStyle = '#ffe3a3'; lg.fillRect(78, H - 22, 20, 18);
    return o;
  }

  function expo() {
    const o = canvases(176, 236), { g, lg, W, H } = o;
    const R = rectFn(g);
    R(4, H - 44, 168, 42, '#d6dde2'); R(4, H - 52, 168, 8, '#bfc8ce');
    for (let x = 8; x < 168; x += 10) { R(x, H - 40, 8, 26, '#4f7fa3'); lg.fillStyle = '#d9f1ff'; if (hash2(x, 3) < 0.6) lg.fillRect(x, H - 40, 8, 26); }
    R(72, H - 22, 32, 20, '#2b4a63'); lg.fillStyle = '#e8f6ff'; lg.fillRect(72, H - 22, 32, 20);
    const cx = 88, cy = H - 124, r = 76;
    const grd = g.createRadialGradient(cx - 26, cy - 30, 6, cx, cy, r);
    grd.addColorStop(0, '#e6f7ff'); grd.addColorStop(0.45, '#6fbbe3'); grd.addColorStop(1, '#1e5a8e');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = 1;
    for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(cx, cy, r * Math.cos((k / 7) * Math.PI / 2) + 0.5, r, 0, 0, Math.PI * 2); g.stroke(); }
    for (let y = cy - r; y < cy + r; y += 10) { g.beginPath(); g.moveTo(cx - r, y); g.lineTo(cx + r, y); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(cx - 30, cy - 34, 18, 28, -0.6, 0, Math.PI * 2); g.fill();
    g.restore();
    g.strokeStyle = '#1b4c74'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    const glow = lg.createRadialGradient(cx, cy, 10, cx, cy, r);
    glow.addColorStop(0, 'rgba(160,240,255,0.95)'); glow.addColorStop(0.8, 'rgba(70,170,255,0.75)'); glow.addColorStop(1, 'rgba(70,170,255,0.15)');
    lg.fillStyle = glow; lg.beginPath(); lg.arc(cx, cy, r, 0, Math.PI * 2); lg.fill();
    return o;
  }

  function station() {
    const o = canvases(240, 186), { g, lg, W, H } = o;
    const R = rectFn(g), L = rectFn(lg);
    const top = H - 96;
    const grd = g.createLinearGradient(0, top, 0, H);
    grd.addColorStop(0, '#7fb2d4'); grd.addColorStop(1, '#3f6f93');
    g.fillStyle = grd; g.fillRect(4, top, 232, 94);
    let i = 0;
    for (let y = top + 4; y < H - 6; y += 8) { R(4, y, 232, 1, '#2f5675'); for (let x = 6; x < 232; x += 10) { if (hash2(x, y, 4) < 0.55) L(x, y + 1, 9, 7, WARM[i++ % 4]); } }
    for (let x = 4; x < 236; x += 10) R(x, top, 1, 94, '#2f5675');
    // волнистая крыша
    g.fillStyle = '#eef1f3';
    g.beginPath(); g.moveTo(0, top + 6);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, top - 16 + Math.sin(x / W * Math.PI * 3) * 9);
    g.lineTo(W, top + 6); g.closePath(); g.fill();
    g.fillStyle = '#c9d0d6';
    g.beginPath(); g.moveTo(0, top + 6);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, top + 2 + Math.sin(x / W * Math.PI * 3) * 3);
    g.lineTo(W, top + 6); g.closePath(); g.fill();
    g.fillStyle = '#dfe5ea';
    g.beginPath(); g.moveTo(0, top - 10);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, top - 16 + Math.sin(x / W * Math.PI * 3) * 9);
    for (let x = W; x >= 0; x -= 4) g.lineTo(x, top - 40 - Math.cos(x / W * Math.PI * 2) * 6);
    g.closePath(); g.fill();
    R(60, top + 16, 120, 13, '#163a5a');
    R(96, H - 40, 48, 38, '#a9cfe3'); R(96, H - 40, 48, 2, '#e5eef4'); R(119, H - 38, 2, 36, '#2f5675');
    L(96, H - 40, 48, 38, '#fff0c8');
    return o;
  }

  function arena() {
    const o = canvases(240, 222), { g, lg, W, H } = o;
    const cx = 120;
    g.fillStyle = '#8f99a3'; g.beginPath(); g.ellipse(cx, H - 74, 116, 70, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7d8791';
    for (let a = 0; a < Math.PI; a += 0.07) { const x = cx + Math.cos(a) * 114; g.fillRect(x, H - 74 + Math.sin(a) * 68 - 26, 2, 26); }
    g.fillStyle = '#d4dae0'; g.beginPath(); g.ellipse(cx, H - 104, 116, 72, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#bcc5cd'; g.beginPath(); g.ellipse(cx, H - 104, 96, 58, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a63a3a'; g.beginPath(); g.ellipse(cx, H - 104, 80, 47, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3f9a4a'; g.beginPath(); g.ellipse(cx, H - 104, 66, 37, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.ellipse(cx, H - 104, 66, 37, 0, 0, Math.PI * 2); g.clip();
    for (let x = cx - 70; x < cx + 70; x += 12) { g.fillStyle = '#48a853'; g.fillRect(x, H - 150, 6, 100); }
    g.restore();
    g.strokeStyle = '#eaf3ea'; g.lineWidth = 1;
    g.strokeRect(cx - 48, H - 126, 96, 44);
    g.beginPath(); g.moveTo(cx, H - 126); g.lineTo(cx, H - 82); g.stroke();
    g.beginPath(); g.ellipse(cx, H - 104, 9, 6, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#2f3e4c'; for (const x of [70, 110, 150]) g.fillRect(x, H - 22, 20, 14);
    lg.fillStyle = 'rgba(220,255,220,0.65)'; lg.beginPath(); lg.ellipse(cx, H - 104, 70, 40, 0, 0, Math.PI * 2); lg.fill();
    lg.fillStyle = 'rgba(255,240,200,0.9)'; for (const x of [70, 110, 150]) lg.fillRect(x, H - 22, 20, 14);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) { lg.fillStyle = '#ffffff'; lg.fillRect(cx + Math.cos(a) * 100, H - 104 + Math.sin(a) * 62, 3, 3); }
    return o;
  }

  function yurt(season) {
    const key = 'yurt' + season;
    if (decorCache[key]) return decorCache[key];
    const o = canvases(48, 40), { g } = o;
    g.fillStyle = '#f1ece0'; g.fillRect(4, 18, 40, 20);
    g.fillStyle = season === 'winter' ? '#ffffff' : '#ece4d2';
    g.beginPath(); g.moveTo(2, 20); g.quadraticCurveTo(24, -4, 46, 20); g.closePath(); g.fill();
    g.fillStyle = '#b0392e'; g.fillRect(4, 24, 40, 3);
    for (let x = 6; x < 42; x += 6) { g.fillStyle = '#f2c14e'; g.fillRect(x, 25, 3, 1); }
    g.fillStyle = '#b0392e'; g.fillRect(20, 27, 8, 11); g.fillStyle = '#f2c14e'; g.fillRect(20, 27, 8, 1);
    g.fillStyle = '#8b5a2b'; g.fillRect(22, 5, 4, 2);
    outline(o.cv);
    decorCache[key] = o.cv;
    return o.cv;
  }

  function cat() {
    if (decorCache.cat) return decorCache.cat;
    const cv = makeCanvas(12, 10);
    const R = rectFn(cv.getContext('2d'));
    R(2, 3, 7, 5, '#e08a3a'); R(1, 1, 4, 4, '#e08a3a'); R(1, 0, 1, 1, '#e08a3a'); R(4, 0, 1, 1, '#e08a3a');
    R(2, 2, 1, 1, '#1a1622'); R(9, 2, 1, 4, '#e08a3a'); R(10, 1, 1, 2, '#e08a3a');
    R(2, 8, 1, 1, '#c06a2a'); R(7, 8, 1, 1, '#c06a2a'); R(4, 5, 3, 1, '#f3b878');
    outline(cv);
    decorCache.cat = cv;
    return cv;
  }

  return {
    charSheet, portrait, icon, paintGround, tree, lamp, bench, busStop, fountain, car, makeBuilding,
    baiterek, khanShatyr, akorda, mosque, pyramid, expo, station, arena, yurt, cat, FW, FH, outline,
  };
})();
