'use strict';
// Интерьеры, по которым можно ходить: комната у Гульнар-апай, своя квартира, кофейня.
// Мебель — отдельные спрайты с сортировкой по глубине, у каждого предмета свои действия.

const Inside = (() => {
  let cur = null; // { id, locId, def, b, bgKey, bg, items, npcs, guests }
  let hoursTimer = 0;

  /* ---------- рисование ---------- */

  function pad(w, h) {
    const cv = makeCanvas(w, h), g = cv.getContext('2d');
    const R = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x, y, ww, hh); };
    return { cv, g, R };
  }

  const WOOD = '#8a5a34', WOOD_L = '#a8744a', WOOD_D = '#5e3b22';

  // Мебель: footprint w×h клеток (твёрдый), спрайт может быть выше footprint
  const FURN = {
    bed(o) {
      const c = o.color || '#c0392b';
      const { cv, R } = pad(32, 58);
      R(0, 0, 32, 14, WOOD_D); R(2, 2, 28, 10, WOOD); R(2, 2, 28, 2, WOOD_L); // изголовье
      R(1, 12, 30, 44, '#f4f0e6'); // матрас
      R(4, 14, 11, 7, '#ffffff'); R(17, 14, 11, 7, '#ffffff'); R(4, 20, 11, 1, '#d8d4cc'); R(17, 20, 11, 1, '#d8d4cc');
      R(1, 24, 30, 30, c); R(1, 24, 30, 3, shade(c, 0.25)); R(1, 51, 30, 3, shade(c, -0.3)); // одеяло
      for (let y = 30; y < 50; y += 6) for (let x = 4; x < 30; x += 8) { R(x, y, 3, 1, shade(c, 0.35)); R(x + 1, y - 1, 1, 3, shade(c, 0.35)); }
      R(0, 54, 32, 4, WOOD_D); R(0, 12, 1, 44, WOOD_D); R(31, 12, 1, 44, WOOD_D);
      return cv;
    },
    wardrobe() {
      const { cv, R } = pad(32, 54);
      R(0, 0, 32, 5, WOOD_L); R(0, 5, 32, 47, WOOD); R(0, 5, 32, 1, WOOD_D);
      R(2, 7, 13, 43, shade(WOOD, 0.08)); R(17, 7, 13, 43, shade(WOOD, 0.08));
      R(3, 8, 11, 41, WOOD); R(18, 8, 11, 41, WOOD); R(3, 8, 11, 1, WOOD_L); R(18, 8, 11, 1, WOOD_L);
      R(13, 26, 1, 5, '#f2c14e'); R(18, 26, 1, 5, '#f2c14e');
      R(0, 50, 32, 4, WOOD_D); R(2, 52, 3, 2, '#2a1a10'); R(27, 52, 3, 2, '#2a1a10');
      return cv;
    },
    desk(o) {
      const { cv, R } = pad(32, 30);
      R(0, 8, 32, 8, WOOD_L); R(0, 8, 32, 1, '#c99a6a'); R(0, 16, 32, 3, WOOD_D);
      R(2, 19, 3, 11, WOOD_D); R(27, 19, 3, 11, WOOD_D); R(20, 19, 8, 7, WOOD); R(23, 22, 2, 1, '#f2c14e');
      if (o.laptop) { R(9, 0, 14, 10, '#9aa4ad'); R(10, 1, 12, 8, '#b8c2cb'); R(15, 4, 2, 2, '#e8edf0'); R(8, 10, 16, 2, '#6d7780'); }
      else { R(6, 4, 8, 5, '#e8e0d0'); R(7, 5, 6, 1, '#9a8f7a'); R(7, 7, 4, 1, '#9a8f7a'); R(20, 3, 3, 6, '#2f6fd1'); R(24, 4, 3, 5, '#c0392b'); }
      R(25, 2, 5, 1, '#3a3f48'); R(27, 2, 1, 6, '#3a3f48'); R(24, 1, 7, 2, '#f6c343'); // лампа
      return cv;
    },
    chair() {
      const { cv, R } = pad(14, 22);
      R(2, 0, 10, 10, WOOD); R(3, 1, 8, 2, WOOD_L); R(1, 10, 12, 4, WOOD_L); R(1, 14, 12, 2, WOOD_D);
      R(2, 16, 2, 6, WOOD_D); R(10, 16, 2, 6, WOOD_D);
      return cv;
    },
    stool() {
      const { cv, R } = pad(10, 12);
      R(0, 0, 10, 4, WOOD_L); R(0, 4, 10, 1, WOOD_D); R(1, 5, 2, 7, WOOD_D); R(7, 5, 2, 7, WOOD_D);
      return cv;
    },
    tv() {
      const { cv, R } = pad(32, 34);
      R(0, 18, 32, 4, WOOD_L); R(0, 22, 32, 10, WOOD); R(2, 24, 12, 6, WOOD_D); R(18, 24, 12, 6, WOOD_D); R(0, 32, 32, 2, '#2a1a10');
      R(3, 0, 26, 17, '#1b1d22'); R(4, 1, 24, 14, '#24324a'); R(5, 2, 8, 3, '#3d5a80'); R(14, 17, 4, 2, '#1b1d22');
      R(22, 20, 6, 2, '#3a3f48'); // приставка
      return cv;
    },
    sofa(o) {
      // вид со спины: диван смотрит на телевизор
      const c = o.color || '#3f6f8f', w = o.w * 16;
      const { cv, R } = pad(w, 26);
      R(0, 6, w, 14, c); R(0, 6, w, 3, shade(c, 0.25)); R(0, 0, 6, 22, shade(c, -0.12)); R(w - 6, 0, 6, 22, shade(c, -0.12));
      R(0, 0, 6, 2, shade(c, 0.2)); R(w - 6, 0, 6, 2, shade(c, 0.2));
      for (let x = 12; x < w - 8; x += 14) R(x, 9, 1, 10, shade(c, -0.2));
      R(0, 20, w, 3, shade(c, -0.35)); R(2, 23, 3, 3, '#2a1a10'); R(w - 5, 23, 3, 3, '#2a1a10');
      if (o.pillow) { R(8, 1, 8, 6, o.pillow); R(w - 16, 1, 8, 6, '#f2c14e'); }
      return cv;
    },
    fridge() {
      const { cv, R } = pad(16, 40);
      R(0, 0, 16, 4, '#f4f7f8'); R(0, 4, 16, 34, '#e3e9ec'); R(0, 4, 1, 34, '#c5ced4'); R(15, 4, 1, 34, '#c5ced4');
      R(1, 16, 14, 1, '#aab4bb'); R(12, 8, 1, 6, '#8f9aa2'); R(12, 19, 1, 9, '#8f9aa2');
      R(3, 7, 3, 3, '#e5533d'); R(7, 8, 3, 2, '#2ec4e6'); R(4, 21, 4, 5, '#f6c343'); // магнитики и записка
      R(0, 38, 16, 2, '#7d878e');
      return cv;
    },
    stove() {
      const { cv, R } = pad(16, 24);
      R(0, 0, 16, 9, '#3a3f48'); R(1, 1, 14, 7, '#2b2f36');
      for (const [x, y] of [[2, 1], [9, 1], [2, 5], [9, 5]]) { R(x, y, 5, 3, '#1b1d22'); R(x + 1, y + 1, 3, 1, '#5d6670'); }
      R(0, 9, 16, 13, '#e3e9ec'); R(2, 11, 12, 1, '#9aa4ad'); R(3, 13, 10, 6, '#3a3f48'); R(4, 14, 4, 2, '#5d6670'); R(0, 22, 16, 2, '#7d878e');
      return cv;
    },
    sink() {
      const { cv, R } = pad(16, 24);
      R(0, 0, 16, 9, '#d6dde3'); R(3, 2, 10, 5, '#9aa4ad'); R(4, 3, 8, 3, '#b8c2cb'); R(7, 0, 2, 3, '#7d878e');
      R(0, 9, 16, 13, WOOD); R(1, 10, 6, 11, shade(WOOD, 0.08)); R(9, 10, 6, 11, shade(WOOD, 0.08)); R(6, 14, 1, 3, '#f2c14e'); R(9, 14, 1, 3, '#f2c14e');
      R(0, 22, 16, 2, WOOD_D);
      return cv;
    },
    shower() {
      const { cv, R } = pad(32, 50);
      R(0, 0, 32, 50, '#cfe3ef');
      for (let y = 0; y < 30; y += 5) for (let x = (y / 5) % 2 ? 0 : 3; x < 32; x += 6) R(x, y, 1, 5, '#b4cfe0');
      for (let y = 4; y < 30; y += 5) R(0, y, 32, 1, '#b4cfe0');
      R(22, 3, 2, 10, '#9aa4ad'); R(19, 3, 7, 2, '#9aa4ad'); R(18, 5, 5, 2, '#c5ced4'); // лейка
      R(0, 28, 32, 22, '#f4f7f8'); R(2, 30, 28, 17, '#e3e9ec'); R(15, 38, 3, 2, '#9aa4ad');
      R(0, 0, 2, 50, '#9aa4ad'); R(30, 0, 2, 50, '#9aa4ad'); R(0, 0, 32, 2, '#9aa4ad');
      R(2, 2, 7, 44, 'rgba(255,255,255,0.35)'); R(3, 3, 1, 30, 'rgba(255,255,255,0.7)'); // стеклянная дверь
      R(26, 16, 3, 10, '#e84393'); R(26, 16, 3, 2, '#f2a7c3'); // полотенце
      return cv;
    },
    plant(o) {
      const { cv, R } = pad(16, 30);
      R(4, 20, 8, 9, '#b5651d'); R(3, 19, 10, 2, '#cf7a2e'); R(5, 29, 6, 1, '#7a4215');
      const L = o && o.wilted ? '#8a7a3a' : '#3f8f4a', LL = o && o.wilted ? '#a89448' : '#5cb85c', LD = o && o.wilted ? '#6b5a2a' : '#2a6a35';
      R(7, 6, 2, 14, LD); R(2, 8, 6, 4, L); R(9, 4, 6, 4, L); R(1, 13, 6, 3, LL); R(9, 11, 6, 4, LL); R(5, 1, 5, 5, L); R(6, 2, 2, 2, LL); R(3, 9, 2, 1, LL); R(11, 5, 2, 1, LL);
      return cv;
    },
    table(o) {
      const { cv, R } = pad(18, 22);
      const top = o.cafe ? '#c99a6a' : WOOD_L;
      R(1, 0, 16, 8, top); R(0, 2, 18, 4, top); R(1, 0, 16, 1, '#e0b88c'); R(0, 6, 18, 2, WOOD_D);
      R(8, 8, 2, 12, '#3a3f48'); R(4, 20, 10, 2, '#3a3f48');
      if (o.cup) { R(4, 1, 4, 3, '#f4f7f8'); R(5, 1, 2, 1, '#6b4a32'); R(11, 2, 4, 2, '#f2c14e'); }
      return cv;
    },
    dining() {
      const { cv, R } = pad(18, 22);
      R(0, 0, 18, 9, '#f4f0e6'); R(0, 0, 18, 1, '#ffffff'); R(0, 9, 18, 3, '#d8cfbd'); // скатерть
      R(3, 2, 5, 4, '#f2c14e'); R(4, 3, 3, 2, '#e8a317'); R(10, 2, 5, 4, '#f4f7f8'); R(11, 3, 3, 2, '#c0392b'); // баурсаки и пиала
      R(2, 12, 2, 10, WOOD_D); R(14, 12, 2, 10, WOOD_D);
      return cv;
    },
    counter(o) {
      // стойка кофейни: столешница, кофемашина, витрина, касса
      const w = o.w * 16;
      const { cv, R } = pad(w, 46);
      R(0, 16, w, 8, '#c99a6a'); R(0, 16, w, 1, '#e0b88c'); R(0, 24, w, 20, WOOD); R(0, 44, w, 2, WOOD_D);
      for (let x = 4; x < w - 4; x += 12) { R(x, 30, 6, 6, '#e8a317'); R(x + 2, 32, 2, 2, '#7a1f1f'); R(x + 1, 29, 4, 1, '#f2c14e'); } // войлочный орнамент
      R(6, 0, 14, 18, '#9aa4ad'); R(7, 1, 12, 5, '#c5ced4'); R(9, 8, 3, 4, '#2b2f36'); R(14, 8, 3, 4, '#2b2f36'); R(9, 12, 3, 3, '#f4f7f8'); R(14, 12, 3, 3, '#f4f7f8'); // кофемашина
      R(26, 6, 22, 12, 'rgba(210,235,250,0.65)'); R(26, 6, 22, 1, '#eef6fa'); R(28, 12, 4, 3, '#e8a317'); R(34, 12, 5, 3, '#c97a2e'); R(41, 12, 4, 3, '#f2c14e'); R(29, 8, 4, 3, '#d4a07a'); R(36, 8, 4, 3, '#7a4a2a'); // витрина
      if (w > 64) { R(w - 22, 8, 12, 9, '#2b2f36'); R(w - 21, 9, 10, 4, '#2ec4e6'); R(w - 24, 16, 16, 2, '#3a3f48'); } // касса
      R(w - 40, 12, 4, 5, '#f4f7f8'); R(w - 41, 11, 6, 1, '#f4f7f8'); // стаканчики
      return cv;
    },
    counterK() {
      const { cv, R } = pad(16, 24);
      R(0, 0, 16, 9, '#d6dde3'); R(2, 2, 5, 4, '#c0392b'); R(9, 1, 4, 6, '#f4f7f8'); R(10, 2, 2, 1, '#2ec4e6');
      R(0, 9, 16, 13, WOOD); R(2, 11, 12, 1, WOOD_L); R(0, 22, 16, 2, WOOD_D);
      return cv;
    },
    lamp() {
      const { cv, R } = pad(12, 40);
      R(1, 0, 10, 8, '#f2e3c0'); R(0, 7, 12, 2, '#d9c7a3'); R(5, 9, 2, 28, '#3a3f48'); R(2, 37, 8, 3, '#3a3f48');
      return cv;
    },
    bigplant(o) {
      const { cv, R } = pad(18, 40);
      const L = o.wilted ? '#8a7a3a' : '#2f7a3a', LL = o.wilted ? '#a89448' : '#4caf50', LD = o.wilted ? '#6b5a2a' : '#1f5a2a';
      R(4, 29, 10, 10, '#e8e0d0'); R(3, 28, 12, 2, '#f4f0e6'); R(5, 39, 8, 1, '#9a8f7a');
      R(8, 12, 2, 17, LD);
      for (const [x, y, w, h] of [[1, 4, 7, 6], [10, 2, 7, 6], [0, 13, 7, 5], [11, 11, 7, 6], [4, 0, 6, 5], [3, 19, 5, 4], [11, 19, 5, 4]]) { R(x, y, w, h, L); R(x + 1, y + 1, w - 3, 1, LL); R(x + Math.floor(w / 2), y + 1, 1, h - 2, LD); }
      return cv;
    },
    aquarium() {
      const { cv, R } = pad(32, 34);
      R(0, 16, 32, 18, WOOD); R(0, 16, 32, 2, WOOD_L); R(2, 20, 12, 12, WOOD_D); R(18, 20, 12, 12, WOOD_D);
      R(1, 0, 30, 16, '#2b3a44'); R(2, 1, 28, 14, '#6fc0dc'); R(2, 1, 28, 3, '#9fd8ea'); R(2, 12, 28, 3, '#e8d3a8');
      R(5, 8, 1, 4, '#3f8f4a'); R(6, 6, 1, 6, '#4caf50'); R(25, 7, 1, 5, '#3f8f4a'); R(26, 9, 1, 3, '#4caf50');
      R(10, 6, 4, 2, '#e8a317'); R(9, 6, 1, 2, '#f2c14e'); R(18, 9, 3, 2, '#e5533d'); R(21, 9, 1, 2, '#f08aa8'); R(14, 11, 3, 1, '#2ec4e6');
      R(22, 3, 1, 1, '#eef6fa'); R(23, 5, 1, 1, '#eef6fa'); R(12, 2, 1, 1, '#eef6fa');
      return cv;
    },
    console() {
      const { cv, R } = pad(32, 22);
      R(0, 6, 32, 6, WOOD_L); R(0, 12, 32, 8, WOOD); R(0, 20, 32, 2, WOOD_D); R(3, 14, 10, 4, WOOD_D);
      R(16, 1, 12, 5, '#1b1d22'); R(17, 2, 10, 1, '#3a3f48'); R(26, 4, 1, 1, '#2ec4e6'); // приставка
      R(4, 3, 7, 3, '#2b2f36'); R(5, 4, 1, 1, '#e5533d'); R(9, 4, 1, 1, '#2ec4e6'); R(7, 2, 1, 1, '#2b2f36'); // джойстик
      R(15, 14, 14, 1, '#3a3f48'); R(15, 16, 10, 1, '#3a3f48');
      return cv;
    },
    bike() {
      const { cv, R } = pad(22, 32);
      R(2, 26, 18, 3, '#3a3f48'); R(4, 29, 3, 3, '#1b1d22'); R(15, 29, 3, 3, '#1b1d22');
      R(14, 12, 3, 14, '#5d6670'); R(6, 16, 3, 10, '#5d6670'); R(5, 14, 6, 3, '#1b1d22'); // седло
      R(13, 6, 7, 2, '#1b1d22'); R(15, 8, 2, 4, '#5d6670'); R(14, 18, 6, 6, '#c0392b'); R(15, 19, 4, 4, '#e5533d'); // руль и маховик
      R(16, 4, 3, 2, '#2ec4e6');
      return cv;
    },
    bookcase() {
      const { cv, R } = pad(18, 44);
      R(0, 0, 18, 44, WOOD_D); R(1, 1, 16, 42, WOOD); R(0, 0, 18, 2, WOOD_L);
      const cols = ['#a3262a', '#2a6f97', '#f2c14e', '#3f8f4a', '#5b3a6e', '#e8a317', '#7a1f1f', '#2b2f36'];
      for (let sh = 0; sh < 4; sh++) {
        const y = 3 + sh * 10;
        R(1, y + 8, 16, 2, WOOD_D);
        for (let i = 0; i < 6; i++) R(2 + i * 2 + (i > 3 ? 1 : 0), y + 1 + (i % 3 === 1 ? 1 : 0), 2, 7 - (i % 3 === 1 ? 1 : 0), cols[(i + sh * 3) % cols.length]);
      }
      return cv;
    },
    shanyrak() {
      // торшер с абажуром в виде шаңырака — деревянного круга юрты
      const { cv, R } = pad(18, 42);
      R(1, 2, 16, 10, '#f2e3c0'); R(0, 10, 18, 2, '#c99a6a'); R(0, 2, 18, 2, '#c99a6a');
      R(8, 0, 2, 12, '#a8744a'); R(3, 6, 12, 1, '#a8744a'); R(4, 4, 1, 6, '#a8744a'); R(13, 4, 1, 6, '#a8744a');
      R(8, 12, 2, 26, '#5e3b22'); R(4, 38, 10, 3, '#5e3b22');
      return cv;
    },
    beanbag(o) {
      const c = o.color || '#e8a317';
      const { cv, R } = pad(22, 18);
      R(3, 2, 16, 14, c); R(1, 6, 20, 9, c); R(5, 0, 12, 4, shade(c, 0.15)); R(4, 4, 6, 2, shade(c, 0.3)); R(2, 14, 18, 3, shade(c, -0.3));
      return cv;
    },
  };

  // Настенный декор рисуется прямо в фон
  function wallDeco(R, kind, x, w, sky) {
    switch (kind) {
      case 'window': {
        const W = w * 16;
        R(x + 1, 9, W - 2, 30, '#f4f0e6');
        const [a, b] = sky;
        for (let i = 0; i < 26; i++) R(x + 3, 11 + i, W - 6, 1, mix(a, b, i / 25));
        if (w >= 4) { // панорама: Байтерек и город
          const cx = x + Math.round(W / 2);
          for (let i = 0; i < W - 6; i += 5) R(x + 3 + i, 28 + ((i * 7) % 6), 4, 9 - ((i * 7) % 6), G.isNight() ? '#2b3550' : '#8fa3b8');
          R(cx - 1, 18, 2, 18, '#f4f7f8'); R(cx - 3, 13, 6, 6, '#f2c14e'); R(cx - 2, 12, 4, 1, '#f6d77a'); R(cx - 3, 19, 6, 1, '#f4f7f8');
          if (G.isNight()) for (let i = 0; i < W - 8; i += 3) R(x + 4 + i, 30 + ((i * 5) % 5), 1, 1, '#f6d77a');
        } else if (G.isNight()) { R(x + 6, 14, 1, 1, '#ffffff'); R(x + W - 9, 18, 1, 1, '#ffffff'); }
        for (let i = 1; i < w; i++) R(x + i * 16 - 1, 11, 2, 26, '#f4f0e6');
        R(x + 3, 23, W - 6, 2, '#f4f0e6');
        R(x - 1, 38, W + 2, 3, '#e3dccb'); R(x - 1, 41, W + 2, 1, '#b8ae98');
        break;
      }
      case 'kilim': { // настенный ковёр
        const W = w * 16 - 6;
        R(x + 3, 8, W, 31, '#8f1d22'); R(x + 5, 10, W - 4, 27, '#b3282d'); R(x + 7, 12, W - 8, 23, '#8f1d22');
        for (let yy = 15; yy < 33; yy += 6) for (let xx = x + 10; xx < x + W - 3; xx += 7) {
          R(xx, yy, 3, 1, '#f2c14e'); R(xx - 1, yy + 1, 5, 1, '#f2c14e'); R(xx, yy + 2, 3, 1, '#f2c14e'); R(xx + 1, yy + 1, 1, 1, '#1d3a6b');
        }
        for (let xx = x + 4; xx < x + W + 2; xx += 2) R(xx, 39, 1, 2, '#f4f0e6');
        break;
      }
      case 'clock': R(x + 3, 12, 10, 10, '#3a3f48'); R(x + 4, 13, 8, 8, '#f4f7f8'); R(x + 7, 14, 1, 4, '#1b1d22'); R(x + 7, 17, 3, 1, '#1b1d22'); break;
      case 'dombra': // домбра на стене
        for (let i = 0; i < 18; i++) R(x + 3 + Math.floor(i * 0.5), 9 + i, 2, 1, WOOD_D);
        R(x + 10, 24, 7, 9, WOOD_L); R(x + 11, 23, 5, 11, WOOD_L); R(x + 12, 27, 3, 3, '#5e3b22'); R(x + 2, 8, 3, 3, WOOD_D);
        break;
      case 'picture': R(x + 2, 11, 12, 14, WOOD_D); R(x + 3, 12, 10, 12, '#7fc4e8'); R(x + 7, 16, 2, 8, '#f4f7f8'); R(x + 6, 14, 4, 3, '#f2c14e'); R(x + 3, 21, 10, 3, '#7f9a48'); break;
      case 'shelf': {
        const W = w * 16;
        R(x + 1, 24, W - 2, 2, WOOD_D);
        const cols = ['#6b4a32', '#c97a2e', '#3f5f3f', '#7a1f1f', '#f2c14e', '#2a6f97'];
        for (let i = 0; i < (W - 6) / 5; i++) R(x + 3 + i * 5, 15 + (i % 2) * 2, 4, 9 - (i % 2) * 2, cols[i % cols.length]);
        R(x + 1, 36, W - 2, 2, WOOD_D);
        for (let i = 0; i < (W - 6) / 6; i++) { R(x + 3 + i * 6, 29, 4, 7, '#e3e9ec'); R(x + 3 + i * 6, 29, 4, 2, cols[(i + 2) % cols.length]); }
        break;
      }
      case 'menu': {
        const W = w * 16;
        R(x + 1, 8, W - 2, 26, WOOD_D); R(x + 3, 10, W - 6, 22, '#1f2a26');
        R(x + 6, 12, W - 12, 2, '#f2c14e');
        for (let i = 0; i < 4; i++) { R(x + 6, 17 + i * 4, (W - 12) * (0.5 + (i % 2) * 0.15), 1, '#e3e9ec'); R(x + W - 12, 17 + i * 4, 6, 1, '#e3e9ec'); }
        break;
      }
      case 'photo': R(x + 3, 14, 10, 12, '#f4f0e6'); R(x + 4, 15, 8, 8, '#9fc3d6'); R(x + 5, 18, 2, 5, '#3f6f8f'); R(x + 5, 16, 2, 2, '#d9a982'); R(x + 9, 18, 2, 5, '#2f6fd1'); R(x + 9, 16, 2, 2, '#e0b38c'); R(x + 5, 15, 2, 1, '#c0392b'); R(x + 4, 24, 8, 1, '#c9c2b4'); break;
      case 'kzmap': {
        R(x + 2, 10, w * 16 - 4, 22, '#f4f0e6'); R(x + 3, 11, w * 16 - 6, 20, '#cfe3ef');
        const pts = [[6, 18, 8, 6], [10, 15, 10, 9], [18, 14, 6, 10], [12, 23, 9, 4], [22, 17, 5, 6]];
        for (const [a, b, c2, d] of pts) R(x + a, b, c2, d, '#e8c26b');
        R(x + 18, 19, 2, 2, '#c0392b'); R(x + 21, 27, 2, 1, '#2f6fd1');
        break;
      }
      case 'poster': R(x + 3, 9, 10, 15, '#2a6f97'); R(x + 4, 10, 8, 8, '#f2c14e'); R(x + 7, 11, 2, 6, '#eef6fa'); R(x + 6, 11, 4, 2, '#f2c14e'); R(x + 4, 19, 8, 1, '#eef6fa'); R(x + 5, 21, 6, 1, '#eef6fa'); break;
      case 'felt': R(x + 3, 9, 10, 26, '#e8a317'); R(x + 4, 10, 8, 24, '#c97a2e'); for (let yy = 13; yy < 32; yy += 6) { R(x + 6, yy, 4, 1, '#7a1f1f'); R(x + 5, yy + 1, 6, 1, '#7a1f1f'); R(x + 6, yy + 2, 4, 1, '#7a1f1f'); } break;
      default:
    }
  }

  const FLOORS = {
    wood: (R, x, y, w, h) => {
      for (let yy = 0; yy < h; yy += 4) {
        const row = Math.floor(yy / 4);
        R(x, y + yy, w, 4, row % 2 ? '#b07a4a' : '#a8723f');
        R(x, y + yy + 3, w, 1, '#8f5d33');
        const off = (row * 13) % 28;
        for (let xx = off; xx < w; xx += 28) R(x + xx, y + yy, 1, 3, '#8f5d33');
        for (let xx = 3; xx < w; xx += 9) if (hash2(xx, row) > 0.8) R(x + xx, y + yy + 1, 3, 1, '#bd8a58');
      }
    },
    parquet: (R, x, y, w, h) => {
      for (let yy = 0; yy < h; yy += 8) for (let xx = 0; xx < w; xx += 8) {
        const a = ((xx + yy) / 8) % 2;
        R(x + xx, y + yy, 8, 8, a ? '#c9a27a' : '#bf956a');
        if (a) { R(x + xx, y + yy + 3, 8, 1, '#a87d55'); R(x + xx, y + yy + 7, 8, 1, '#a87d55'); }
        else { R(x + xx + 3, y + yy, 1, 8, '#a87d55'); R(x + xx + 7, y + yy, 1, 8, '#a87d55'); }
      }
    },
    tiles: (R, x, y, w, h) => {
      for (let yy = 0; yy < h; yy += 8) for (let xx = 0; xx < w; xx += 8) {
        R(x + xx, y + yy, 8, 8, ((xx + yy) / 8) % 2 ? '#e8e0d0' : '#5a4a3a');
      }
    },
  };

  /* ---------- комнаты ---------- */

  const ROOMS = {
    home: {
      W: 13, H: 12, door: 6, floor: 'wood', wall: '#e6d5b0', pat: '#d8c49a', trim: '#8a6a45', top: '#5b4636',
      deco: [['clock', 4.5, 1], ['window', 7, 2]],
      rug: [3, 4, 4, 4, '#7a1f1f', '#f2c14e'],
      items: [
        { k: 'bed', x: 1, y: 3, w: 2, h: 3, name: 'Кровать', act: /Спать|Вздремнуть/, btn: ['СПАТЬ', 'bed'], color: '#2a6f97' },
        { k: 'tv', x: 4, y: 3, w: 2, h: 1, name: 'Телевизор', act: /сериал/, btn: ['ТВ', 'film'] },
        { k: 'sofa', x: 3, y: 6, w: 4, h: 1, name: 'Диван', act: /сериал|Вздремнуть/, btn: ['СЕСТЬ', 'film'], color: '#5b6c8f', pillow: '#c0392b' },
        { k: 'desk', x: 7, y: 3, w: 2, h: 1, name: 'Письменный стол', act: /Учить код/, btn: ['УЧИТЬ', 'code'] },
        { k: 'chair', x: 8, y: 4, w: 1, h: 1, solid: false, dx: 1 },
        { k: 'wardrobe', x: 10, y: 3, w: 2, h: 1, name: 'Шкаф', act: /Гардероб/, custom: 'decor', btn: ['ШКАФ', 'shirt'] },
        { k: 'fridge', x: 11, y: 5, w: 1, h: 1, name: 'Холодильник', act: /ужин/, eat: true, btn: ['ЕДА', 'bowl'] },
        { k: 'stove', x: 11, y: 6, w: 1, h: 1, name: 'Плита', act: /ужин/, btn: ['ГОТОВИТЬ', 'bowl'] },
        { k: 'sink', x: 11, y: 7, w: 1, h: 1, name: 'Раковина', custom: 'wash', btn: ['УМЫТЬСЯ', 'shower'] },
        { k: 'dining', x: 9, y: 7, w: 1, h: 1, name: 'Дастархан', custom: 'tea', btn: ['ШАЙ', 'cup'], dx: 0 },
        { k: 'stool', x: 9, y: 8, w: 1, h: 1, solid: false, dx: 3 },
        { k: 'shower', x: 1, y: 8, w: 2, h: 2, name: 'Душ', act: /душ/, btn: ['ДУШ', 'shower'] },
      ],
      npcs: () => (G.s.homeId === 'home' || !G.s.flags.ownFlat) && G.hour() >= 8 && G.hour() < 22 ? [{ id: 'gulnar', x: 9.5, y: 9.6, dir: 2 }] : [],
    },
    flat: {
      W: 14, H: 12, door: 6, floor: 'parquet', wall: '#eef2f4', pat: '#e2e8ec', trim: '#9aa4ad', top: '#3a4552',
      deco: [['window', 4, 5]],
      rug: [8, 4, 4, 4, '#2a6f97', '#eef6fa'],
      items: [
        { k: 'bed', x: 1, y: 3, w: 2, h: 3, name: 'Кровать', act: /Спать|Вздремнуть/, btn: ['СПАТЬ', 'bed'], color: '#e8a317' },
        { k: 'desk', x: 4, y: 3, w: 2, h: 1, name: 'Рабочий стол', act: /Учить код/, btn: ['УЧИТЬ', 'code'] },
        { k: 'chair', x: 5, y: 4, w: 1, h: 1, solid: false, dx: 1 },
        { k: 'tv', x: 9, y: 3, w: 2, h: 1, name: 'Телевизор', act: /сериал/, btn: ['ТВ', 'film'] },
        { k: 'sofa', x: 8, y: 6, w: 4, h: 1, name: 'Диван', act: /сериал|Вздремнуть/, btn: ['СЕСТЬ', 'film'], color: '#3a3f4a', pillow: '#2ec4e6' },
        { k: 'wardrobe', x: 11, y: 3, w: 2, h: 1, name: 'Гардеробная', act: /Гардероб/, custom: 'decor', btn: ['ШКАФ', 'shirt'] },
        { k: 'fridge', x: 12, y: 7, w: 1, h: 1, name: 'Холодильник', act: /ужин/, eat: true, btn: ['ЕДА', 'bowl'] },
        { k: 'stove', x: 12, y: 8, w: 1, h: 1, name: 'Плита', act: /ужин/, btn: ['ГОТОВИТЬ', 'bowl'] },
        { k: 'counterK', x: 12, y: 9, w: 1, h: 1, name: 'Кухня', custom: 'tea', btn: ['ШАЙ', 'cup'] },
        { k: 'dining', x: 10, y: 9, w: 1, h: 1, name: 'Стол', custom: 'tea', btn: ['ШАЙ', 'cup'] },
        { k: 'shower', x: 1, y: 8, w: 2, h: 2, name: 'Душ', act: /душ/, btn: ['ДУШ', 'shower'] },
        { k: 'lamp', x: 7, y: 6, w: 1, h: 1, solid: false, dx: 2 },
      ],
      npcs: () => {
        // супруг(а) дома по утрам и вечерам
        const l = Romance.love();
        const h = G.hour();
        return l.married && l.partner && (h < 9 || h >= 19) ? [{ id: l.partner, x: 9.5, y: 8.4, dir: 0 }] : [];
      },
    },
    coffee: {
      W: 13, H: 11, door: 6, floor: 'tiles', wall: '#c9b79c', pat: '#bba98c', trim: '#5e3b22', top: '#3b2a20',
      deco: [['menu', 2, 4], ['felt', 6.5, 1], ['window', 9, 3], ['shelf', 7.6, 1]],
      items: [
        { k: 'counter', x: 1, y: 4, w: 6, h: 1, name: 'Стойка', act: /Капучино|Шай|Смена/, btn: ['ЗАКАЗ', 'cup'] },
        { k: 'plant', x: 7, y: 3, w: 1, h: 1, solid: true },
        { k: 'plant', x: 7, y: 4, w: 1, h: 1, solid: true },
        { k: 'table', x: 9, y: 5, w: 1, h: 1, name: 'Столик у окна', custom: 'rest', btn: ['СЕСТЬ', 'cup'], cafe: true, cup: true },
        { k: 'table', x: 3, y: 7, w: 1, h: 1, name: 'Столик', custom: 'rest', btn: ['СЕСТЬ', 'cup'], cafe: true },
        { k: 'table', x: 10, y: 8, w: 1, h: 1, name: 'Столик', custom: 'rest', btn: ['СЕСТЬ', 'cup'], cafe: true, cup: true },
        { k: 'chair', x: 2, y: 7, w: 1, h: 1, solid: false, dx: 6 },
        { k: 'lamp', x: 11, y: 4, w: 1, h: 1, solid: false, dx: 2 },
      ],
      npcs: () => [{ id: 'aigerim', x: 3.5, y: 3.7, dir: 0 }],
      guests: [{ x: 9.5, y: 5.05 }, { x: 10.5, y: 8.05 }],
    },
  };

  /* ---------- фон комнаты ---------- */

  function skyBand() {
    const h = G.hour();
    if (h >= 7.5 && h < 16) return 0; if (h >= 16 && h < 18.5) return 1; if (h >= 5.5 && h < 7.5) return 2; return 3;
  }
  const SKY = [['#7fc4e8', '#d9f0fa'], ['#4a5f9e', '#f2a65a'], ['#5a6fa8', '#f7c08a'], ['#08142b', '#1d3557']];

  function paintRoom(def) {
    const W = def.W * TILE, H = def.H * TILE;
    const { cv, R } = pad(W, H);
    const winter = G.season() === 'winter';
    // пол
    FLOORS[def.floor](R, TILE, 3 * TILE, W - 2 * TILE, (def.H - 4) * TILE);
    if (def.rug) {
      const [x, y, w, h, c, e] = def.rug;
      const X = x * TILE, Y = y * TILE + 4, RW = w * TILE, RH = h * TILE - 8;
      R(X, Y, RW, RH, e); R(X + 2, Y + 2, RW - 4, RH - 4, c);
      for (let yy = Y + 6; yy < Y + RH - 6; yy += 8) for (let xx = X + 6; xx < X + RW - 6; xx += 10) { R(xx, yy, 4, 1, e); R(xx + 1, yy - 1, 2, 3, e); }
      for (let xx = X; xx < X + RW; xx += 2) { R(xx, Y - 2, 1, 2, e); R(xx, Y + RH, 1, 2, e); }
    }
    // задняя стена
    R(0, 0, W, 6, def.top); R(TILE, 6, W - 2 * TILE, 42, def.wall);
    if (def.ornament) {
      for (let y = 10; y < 42; y += 10) for (let x = TILE + ((y / 10) % 2 ? 8 : 2); x < W - TILE - 4; x += 12) { R(x, y, 3, 1, def.pat); R(x - 1, y + 1, 5, 1, def.pat); R(x, y + 2, 3, 1, def.pat); R(x + 1, y + 1, 1, 1, def.trim); }
    } else for (let y = 8; y < 44; y += 6) for (let x = TILE + ((y / 6) % 2 ? 3 : 0); x < W - TILE; x += 6) R(x, y, 1, 2, def.pat);
    R(TILE, 6, W - 2 * TILE, 1, shade(def.wall, -0.2));
    R(TILE, 44, W - 2 * TILE, 4, def.trim); R(TILE, 44, W - 2 * TILE, 1, shade(def.trim, 0.25));
    R(TILE, 48, W - 2 * TILE, 3, 'rgba(20,14,10,0.18)');
    for (const [kind, x, w] of def.deco) wallDeco(R, kind, Math.round(x * TILE), w, SKY[skyBand()]);
    // боковые стены (вид сверху на торец) и тени
    R(0, 0, TILE, H, def.top); R(W - TILE, 0, TILE, H, def.top);
    R(TILE - 2, 6, 2, H - 6, shade(def.top, 0.2)); R(W - TILE, 6, 2, H - 6, shade(def.top, 0.2));
    R(TILE, 48, 3, H - 4 * TILE + 0, 'rgba(20,14,10,0.12)');
    // передняя стена с дверью
    const fy = (def.H - 1) * TILE;
    R(0, fy, W, 10, def.top); R(0, fy, W, 2, shade(def.top, 0.2));
    const dx = def.door * TILE;
    FLOORS[def.floor](R, dx, fy, TILE, 10);
    R(dx + 1, fy + 1, TILE - 2, 8, winter ? '#5a6f8a' : '#6b4a32'); R(dx + 3, fy + 3, TILE - 6, 4, winter ? '#7d93ad' : '#8a6a45');
    R(dx + 6, fy + 4, 4, 1, '#f6c343'); R(dx + 7, fy + 5, 2, 1, '#f6c343');
    return cv;
  }

  function sprite(it) {
    if (!it._cv) it._cv = FURN[it.k]({ ...it, laptop: it.k === 'desk' && G.has('laptop') });
    return it._cv;
  }

  /* ---------- вход и выход ---------- */

  function roomFor(b) {
    if (b.id === 'home') return 'home';
    if (b.id === 'realty' && G.s.flags.ownFlat) return 'flat';
    if (b.id === 'coffee') return 'coffee';
    return null;
  }

  function solid(tx, ty) {
    const d = cur.def;
    if (tx <= 0 || tx >= d.W - 1 || ty < 3) return true;
    if (ty >= d.H - 1) return !(ty === d.H - 1 && tx === d.door);
    for (const it of d.items) if (it.solid !== false && tx >= it.x && tx < it.x + it.w && ty >= it.y && ty < it.y + it.h) return true;
    return false;
  }

  async function enter(b) {
    const rid = roomFor(b);
    if (!rid) return false;
    const def = Decor.build(rid, ROOMS[rid]);
    const winter = G.season() === 'winter';
    cur = {
      id: rid, locId: b.id, def, b, bg: null, bgKey: '',
      guests: (def.guests || []).filter((_, i) => hash2(G.s.day, i, 3) > 0.25).map((g0) => ({ ...g0, look: Ents.randomLook(winter && chance(0.3)) })),
    };
    await UI.fade('', async () => {
      Ents.setSolid(solid, () => { cur = null; Render.snap(); });
      const p = Ents.player;
      p.x = def.door * TILE + 8; p.y = (def.H - 2) * TILE + 12; p.dir = 3; p.moving = false;
      Render.snap();
      Pet.enter(def);
    });
    return true;
  }

  function leave() {
    if (!cur) return;
    const b = cur.b;
    cur = null;
    Ents.setSolid(null);
    Ents.placePlayer(b.doorX, b.doorY + 1);
    Ents.player.dir = 0;
    Render.snap();
    Sfx.play('door');
  }

  const active = () => !!cur;
  const locId = () => (cur ? cur.locId : null);
  const room = () => cur;
  const outsidePos = () => (cur ? { x: (cur.b.doorX * TILE + 8) / TILE, y: ((cur.b.doorY + 1) * TILE + 12) / TILE, dir: 0 } : null);

  function background() {
    const key = cur.id + skyBand() + G.season() + (G.isNight() ? 'n' : 'd');
    if (cur.bgKey !== key) { cur.bgKey = key; cur.bg = paintRoom(cur.def); }
    return cur.bg;
  }

  // Список того, что рисовать: мебель, люди, гости за столиками
  function drawables() {
    const out = [];
    for (const it of cur.def.items) {
      const cv = sprite(it);
      const baseY = (it.y + it.h) * TILE;
      const x = it.dx != null ? it.x * TILE + it.dx : it.x * TILE + Math.round((it.w * TILE - cv.width) / 2);
      out.push({ y: baseY - (it.solid === false ? 6 : 0), img: cv, x, top: baseY - cv.height, lamp: it.k === 'lamp' });
    }
    for (const n of cur.def.npcs()) out.push({ y: n.y * TILE, npc: n });
    for (const gs of cur.guests) out.push({ y: gs.y * TILE - 1, guest: gs });
    const pd = Pet.drawable();
    if (pd) out.push(pd);
    return out;
  }

  /* ---------- взаимодействие ---------- */

  function rectDist(px, py, it) {
    const x0 = it.x * TILE, x1 = (it.x + it.w) * TILE, y0 = it.y * TILE, y1 = (it.y + it.h) * TILE;
    const dx = Math.max(x0 - px, 0, px - x1), dy = Math.max(y0 - py, 0, py - y1);
    return Math.hypot(dx, dy);
  }

  const CUSTOM = {
    wash: () => [{
      label: 'Умыться', time: 10, icon: 'shower', sub: 'гигиена +25',
      run: async () => { G.advance(10); G.s.hyg = Math.min(100, G.s.hyg + 25); UI.toast('Свежесть! Гигиена +25', 'good'); },
    }],
    tea: () => [{
      label: 'Попить шай', time: 15, icon: 'cup', sub: 'настроение +4 · энергия +3',
      run: async () => { G.advance(15); G.add('mood', 4); G.add('energy', 3); UI.toast('Горячий шай с молоком — как дома', 'good'); },
    }, ...(cur && cur.id === 'home' && G.s.flags.baursakDay === G.s.day && !G.s.daily.grandBaursak ? [{
      label: 'Угоститься баурсаками', time: 10, icon: 'bowl', sub: 'сытость +25 · от Гульнар-апай',
      run: async () => { G.s.daily.grandBaursak = true; G.advance(10); G.add('food', 25); G.add('mood', 5); UI.toast('Баурсаки ещё тёплые. Внук Гульнар-апай машет тебе из комнаты.', 'good'); },
    }] : [])],
    decor: () => Decor.homeActs(),
    rest: () => [{
      label: 'Отдохнуть за столиком', time: 30, icon: 'clock', sub: 'энергия +5 · настроение +3',
      run: async () => { await UI.fade('Смотришь в окно на прохожих…', async () => G.advance(30)); G.add('energy', 5); G.add('mood', 3); },
    }],
  };

  function eatList() {
    return Object.keys(ITEMS).filter((k) => ITEMS[k].food && G.has(k)).map((k) => ({
      label: 'Съесть: ' + ITEMS[k].name, icon: 'bowl', time: 10, sub: `сытость +${ITEMS[k].food}${ITEMS[k].mood ? ' · настроение +' + ITEMS[k].mood : ''}`,
      run: () => Content.eat(k),
    }));
  }

  function useItem(it) {
    const extra = () => [
      ...(typeof it.custom === 'function' ? it.custom() : it.custom ? CUSTOM[it.custom]() : []),
      ...(it.eat ? eatList() : []),
      ...Fun.objectActs(it, cur),
    ];
    return UI.openLocation(cur.locId, { only: it.act || /^$/, title: it.name, compact: true, extra, icon: it.btn && it.btn[1] });
  }

  function interactables() {
    const p = Ents.player;
    const fx = p.x, fy = p.y - 4;
    const out = [];
    const pi = Pet.interactable(fx, fy);
    if (pi) out.push(pi);
    for (const n of cur.def.npcs()) {
      const x = n.x * TILE, y = n.y * TILE;
      const d = Math.hypot(fx - x, fy - y + 4);
      if (d < 26) out.push({ pri: 0, d, label: 'Говорить: ' + NPCS[n.id].name, x, y: y - 36, run: () => (Content.Talk[n.id] ? Content.Talk[n.id]() : Social.open(n.id, { loc: cur.locId })) });
    }
    for (const it of cur.def.items) {
      if (!it.name) continue;
      const d = rectDist(fx, fy, it);
      if (d < 13) out.push({ pri: 1, d, label: it.name, btn: it.btn, x: (it.x + it.w / 2) * TILE, y: (it.y + it.h) * TILE - sprite(it).height - 6, run: () => useItem(it) });
    }
    const d = cur.def;
    const ex = d.door * TILE + 8, ey = (d.H - 1) * TILE + 4;
    const de = Math.hypot(fx - ex, fy - ey);
    if (de < 14) out.push({ pri: 2, d: de, label: 'Выйти на улицу', btn: ['ВЫЙТИ', 'door'], x: ex, y: ey - 8, run: async () => leave() });
    out.sort((a, b) => a.pri - b.pri || a.d - b.d);
    return out[0] || null;
  }

  function update(dt) {
    const p = Ents.player;
    if (p.y > (cur.def.H - 1) * TILE + 9) { leave(); return; }
    Pet.update(dt);
    hoursTimer -= dt;
    if (hoursTimer <= 0) {
      hoursTimer = 1;
      if (!Content.isOpen(cur.locId)) { UI.toast(`«${Content.locName(cur.locId)}» закрывается`, 'info'); leave(); }
    }
  }

  // после перестановки мебели — пересобрать комнату
  function refresh() {
    if (!cur) return;
    cur.def = Decor.build(cur.id, ROOMS[cur.id]);
    cur.bgKey = '';
  }

  // превью для каталога мебели
  const furniture = (kind, o = {}) => FURN[kind]({ w: 1, ...o });
  function wallPreview(kind, w) {
    const { cv, R } = pad(w * 16 + 4, 44);
    R(0, 0, cv.width, 44, '#e6d5b0');
    wallDeco(R, kind, 2, w, SKY[0]);
    return cv;
  }

  const solidAt = (tx, ty) => (cur ? solid(tx, ty) : true);

  return { enter, leave, active, locId, room, outsidePos, background, drawables, interactables, update, roomFor, refresh, furniture, wallPreview, solidAt, ROOMS };
})();
