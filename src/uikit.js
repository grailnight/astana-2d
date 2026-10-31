'use strict';
// Пиксельный UI-кит: рамки для border-image (9-slice) и иконки 12×12 для кнопок интерфейса.

const UIKit = (() => {
  const PAL = {
    k: '#0a1622', w: '#f4f7f8', y: '#f6c343', o: '#d98a1c', r: '#e5533d', R: '#9c2b20', s: '#2ec4e6', S: '#1a7fa3',
    b: '#a0693d', n: '#5a3b22', g: '#9aa7b0', h: '#5d6a74', G: '#6cc35a', D: '#2f7a3a', c: '#f3e4c4', p: '#f08aa8',
    m: '#9b59b6', l: '#bfe6f5', d: '#13304a', t: '#2a5a80',
  };

  /* ---------- иконки 12×12 ---------- */
  const ICONS = {
    door: ['..kkkkkkkk..', '..knnnnnnk..', '..knbbbbnk..', '..knbbbbnk..', '..knbbbbnk..', '..knbbbbnk..', '..knbbbyyk..', '..knbbbbnk..', '..knbbbbnk..', '..knbbbbnk..', '.kkkkkkkkkk.', '............'],
    talk: ['............', '.kkkkkkkkkk.', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', 'kwwkwwkwwkwk', 'kwwwwwwwwwwk', '.kkwkkkkkkk.', '...kwk......', '....kk......', '............', '............', '............'],
    chat: ['.kkkkkkk....', 'kwwwwwwwk...', 'kwkwkwkwk...', 'kwwwwwwwkkk.', '.kkwkkkkksk.', '..kk.ksssssk', '....kssssssk', '....kskskssk', '....kssssssk', '.....kkkkks.', '.........kk.', '............'],
    bed: ['............', '............', 'k...........', 'kww.........', 'kwwwssssssss', 'kssssssssssk', 'kSSSSSSSSSSk', 'knnnnnnnnnnk', 'kk........kk', '............', '............', '............'],
    bowl: ['....w...w...', '...w...w....', '....w...w...', '...w...w....', '............', 'kkkkkkkkkkkk', 'kcccccccccck', '.kyyyyyyyyk.', '.koyyyyyyok.', '..kooooook..', '...kkkkkk...', '............'],
    cup: ['...w..w.....', '..w..w......', '...w..w.....', '............', 'kkkkkkkkk...', 'kwwwwwwwkkk.', 'kwnnnnnwk.k.', 'kwwwwwwwk.k.', 'kwwwwwwwkkk.', '.kwwwwwk....', '..kkkkk.....', '............'],
    bag: ['....kkkk....', '...k....k...', '...k....k...', '.kkkkkkkkkk.', '.kyyyyyyyyk.', '.kyyyyyyyyk.', '.kyyyrryyyk.', '.kyyyrryyyk.', '.kyyyyyyyyk.', '.koooooooook', '.kkkkkkkkkk.', '............'],
    shirt: ['............', '.kkk....kkk.', 'kssskkkksssk', 'kssssssssssk', 'kkksssssskkk', '..ksssssssk.', '..ksssssssk.', '..ksssssssk.', '..ksssssssk.', '..kSSSSSSSk.', '..kkkkkkkkk.', '............'],
    book: ['............', '.kkkkk.kkkkk', 'kwwwwwkwwwwk', 'kwkkkwkwkkwk', 'kwwwwwkwwwwk', 'kwkkkwkwkkwk', 'kwwwwwkwwwwk', 'kwkkwwkwkkwk', 'kwwwwwkwwwwk', '.kkkkkkkkkk.', '.....kk.....', '............'],
    case: ['............', '....kkkk....', '...k....k...', '.kkkkkkkkkk.', 'knnbbbbbbnnk', 'kbbbbbbbbbbk', 'kkkkkyykkkkk', 'kbbbbyybbbbk', 'kbbbbbbbbbbk', 'knnnnnnnnnnk', '.kkkkkkkkkk.', '............'],
    dumbbell: ['............', '............', '.kk......kk.', 'khhk....khhk', 'khhkkkkkkhhk', 'khhggggggghk', 'khhkkkkkkhhk', 'khhk....khhk', '.kk......kk.', '............', '............', '............'],
    heart: ['............', '.kkk..kkk...', 'krrrkkrrrk..', 'krwrrrrrrk..', 'krrrrrrrrk..', '.krrrrrrk...', '..krrrrk....', '...krrk.....', '....kk......', '............', '............', '............'],
    gift: ['...kk..kk...', '..kyyk kyyk.', '...kkyykk...', '.kkkkyykkkk.', '.krrrryrrrk.', '.kkkkyykkkk.', '.krrrryrrrk.', '.krrrryrrrk.', '.krrrryrrrk.', '.kRRRRyRRRk.', '.kkkkkkkkkk.', '............'],
    coin: ['...kkkkkk...', '..kyyyyyyk..', '.kyyyyyyyyk.', 'kyykkkkkkyyk', 'kyyyyyyyyyyk', 'kyykkkkkkyyk', 'kyyyykkyyyyk', 'kyyyykkyyyyk', '.kyyykkyyyk.', '..koyyyyok..', '...kkkkkk...', '............'],
    clock: ['...kkkkkk...', '..kwwwwwwk..', '.kwwwkwwwwk.', 'kwwwwkwwwwwk', 'kwwwwkwwwwwk', 'kwwwwkkkkwwk', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', '.kwwwwwwwwk.', '..kwwwwwwk..', '...kkkkkk...', '............'],
    note: ['......kkkk..', '......kmmk..', '......kmmk..', '......kmk...', '......kmk...', '......kmk...', '..kkkkkmk...', '.kmmmmmmk...', '.kmmmmmmk...', '..kkkkkk....', '............', '............'],
    film: ['kkkkkkkkkkkk', 'kwkwkwkwkwkk', 'kkkkkkkkkkkk', 'kllllkllllkk', 'kllllkllllkk', 'kllllkllllkk', 'kkkkkkkkkkkk', 'kwkwkwkwkwkk', 'kkkkkkkkkkkk', '............', '............', '............'],
    bus: ['.kkkkkkkkkk.', 'kssssssssssk', 'kllllkllllsk', 'kllllkllllsk', 'kssssssssssk', 'kssssssssssk', 'kyysssssyysk', 'kssssssssssk', 'kkkkkkkkkkkk', '.kk......kk.', '............', '............'],
    camera: ['............', '...kkk......', '.kkhhhkkkkk.', 'khhhhhhhhhhk', 'khhkkkkkhhhk', 'khkllllkhhhk', 'khkllwlkhhhk', 'khkllllkhhhk', 'khhkkkkkhhhk', 'khhhhhhhhhhk', '.kkkkkkkkkk.', '............'],
    star: ['.....kk.....', '....kyyk....', '....kyyk....', 'kkkkyyyykkkk', 'kyyyyyyyyyyk', '.kyyyyyyyyk.', '..kyyyyyyk..', '..kyyookyk..', '.kyyok.koyk.', '.kok....kok.', '.kk......kk.', '............'],
    phone: ['...kkkkkk...', '..kddddddk..', '..kssssssk..', '..kssssssk..', '..kssssssk..', '..kssssssk..', '..kssssssk..', '..kssssssk..', '..kddddddk..', '..kddkkddk..', '...kkkkkk...', '............'],
    map: ['............', 'kkkk.kkkk...', 'kGGkkllllkkk', 'kGGGkllllkGk', 'kGrGkllllkGk', 'kGGGkllllkGk', 'kGGGkllrlkGk', 'kGGGkllllkGk', 'kGGkkllllkkk', 'kkk..kkkk...', '............', '............'],
    quest: ['.kkkkkkkkk..', 'kcccccccccck', 'kckkkkkkkcck', 'kcccccccccck', 'kckkkkkkcccк'.replace('к', 'k'), 'kcccccccccck', 'kckkkkkkkcck', 'kcccccccccck', 'kckkkkcccrrk', 'kccccccccrrk', '.kkkkkkkkkk.', '............'],
    mail: ['............', 'kkkkkkkkkkkk', 'kkwwwwwwwwkk', 'kwkwwwwwwkwk', 'kwwkwwwwkwwk', 'kwwwkkkkwwwk', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk', '............', '............', '............'],
    person: ['....kkkk....', '...kccccc...', '...kccccck..', '...kccccck..', '....kcck....', '..kkkkkkkk..', '.kssssssssk.', 'kssssssssssk', 'kssssssssssk', 'kssssssssssk', 'kkkkkkkkkkkk', '............'],
    medal: ['.kkk...kkk..', '.krrk.kssk..', '..krrkssk...', '...kkkkk....', '..kyyyyyk...', '.kyyoooyyk..', '.kyoyyyoyk..', '.kyoyyyoyk..', '.kyyoooyyk..', '..kyyyyyk...', '...kkkkk....', '............'],
    gear: ['.....kk.....', '..kk.gg.kk..', '..kgkggkgk..', '...kggggk...', 'kkggkkkkggkk', 'kgggk..kgggk', 'kgggk..kgggk', 'kkggkkkkggkk', '...kggggk...', '..kgkggkgk..', '..kk.gg.kk..', '.....kk.....'],
    shower: ['...kkkkkk...', '..khhhhhhk..', '.kggggggggk.', '.kkkkkkkkkk.', '..s.s.s.s...', '.s.s.s.s....', '..s.s.s.s...', '.s.s.s.s....', '..s.s.s.s...', '............', '............', '............'],
    drop: ['.....k......', '....ksk.....', '....ksk.....', '...ksssk....', '...ksssk....', '..kssssssk..', '..kswssssk..', '..kswssssk..', '..ksssssk...', '...kssssk...', '....kkkk....', '............'],
    tv: ['..k.....k...', '...k...k....', '....k.k.....', 'kkkkkkkkkkkk', 'khhhhhhhhhhk', 'khllllllllhk', 'khlllwllllhk', 'khllllllllhk', 'khhhhhhhhhhk', 'kkkkkkkkkkkk', '..kk....kk..', '............'],
    laptop: ['............', '.kkkkkkkkkk.', '.kddddddddk.', '.kdGddddddk.', '.kddGGGdddk.', '.kddddddddk.', '.kkkkkkkkkk.', 'kgggggggggggk'.slice(0, 12), 'khhhhhhhhhhk', 'kkkkkkkkkkkk', '............', '............'],
    moon: ['....kkkk....', '...kyyyk....', '..kyyyk.....', '.kyyyk......', '.kyyk.......', '.kyyk.......', '.kyyk.......', '.kyyyk......', '..kyyyk.....', '...kyyyk....', '....kkkk....', '............'],
    wheel: ['...kkkkkk...', '..k.kkkk.k..', '.kk..kk..kk.', '.k.k.kk.k.k.', '.kkkkkkkkkk.', '.k.k.kk.k.k.', '.kk..kk..kk.', '..k.kkkk.k..', '...kkkkkk...', '..k......k..', '.k........k.', 'kkkkkkkkkkkk'],
    car: ['............', '............', '...kkkkkk...', '..kssllsk...', '.kkkkkkkkkk.', 'krrrrrrrrrrk', 'kryyrrrryyrk', 'krrrrrrrrrrk', 'kkkkkkkkkkkk', '.khk....khk.', '..k......k..', '............'],
    cat: ['............', '.k......k...', '.kk....kk...', '.kooooook...', 'kooooooook..', 'kowoooowok..', 'koooppoook..', '.koooooook.k', '..koooooookk', '..kooooook..', '..kk.kk.kk..', '............'],
    news: ['............', '.kkkkkkkkk..', '.kwwwwwwwkk.', '.kwkkkkkwkwk', '.kwkhhhkwkwk', '.kwkkkkkwkwk', '.kwwwwwwwkwk', '.kwhhhwhhkwk', '.kwwwwwwwkwk', '.kwhhwhhhkk.', '.kkkkkkkkk..', '............'],
    police: ['............', '...kkkkkk...', '..kttttttk..', '.kttttyttkk.', '.kttyyyyttk.', 'kkkkkkkkkkkk', '.kddddddddk.', '..kkkkkkkk..', '....kyyk....', '...kyyyyk...', '....kyyk....', '.....kk.....'],
    bird: ['............', '......kkk...', '.....khhhk..', '.....khkhyk.', '..kkkkhhhkk.', '.khhhhhhhk..', 'khhgggghhk..', 'khhhgggghk..', '.kkhhhhhk...', '...kykyk....', '...kk.kk....', '............'],
    tray: ['............', '....kkkk....', '...kwwwwk...', '..kwwwwwwk..', '..kwssswwk..', '.kkkkkkkkkk.', 'kggggggggggk', '.kkkkkkkkkk.', '.....kk.....', '....kwwk....', '...kkkkkk...', '............'],
    ticket: ['............', 'kkkkkkkkkkkk', 'kyyyyykyyyyk', 'kyrrryyyyyy.', '.yyyyykyyyy.', '.yrrrryyyyy.', 'kyyyyykyyyyk', 'kkkkkkkkkkkk', '............', '............', '............', '............'],
    joke: ['...kkkkkk...', '..kyyyyyyk..', '.kyykyykyyk.', 'kyykkyykkyyk', 'kyyyyyyyyyyk', 'kykkkkkkkkyk', 'kykwwwwwwkyk', 'kyykrrrrkyyk', '.kyykkkkyyk.', '..kyyyyyyk..', '...kkkkkk...', '............'],
    flower: ['...kk.kk....', '..kppkppk...', '..kpyyypk...', '...kpppk....', '....kGk.....', '..kkkGk.....', '..kGGGk.....', '....kGkkk...', '....kGGGk...', '....kGk.....', '....kGk.....', '............'],
    hand: ['....k.k.k...', '...kckckck..', '...kckckck..', '.k.kckckck..', 'kck.kcccck..', 'kcckcccccck.', '.kccccccccck', '..kcccccccck', '...kccccccck', '....kcccccck', '.....kkkkkk.', '............'],
    ring: ['....kkkk....', '...klllk....', '....kkkk....', '...kyyyyk...', '..kyk..kyk..', '.kyk....kyk.', '.kyk....kyk.', '.kyk....kyk.', '..kyk..kyk..', '...kyyyyk...', '....kkkk....', '............'],
    ball: ['...kkkkkk...', '..kwwwwwwk..', '.kwwkkkwwwk.', 'kwwkkkkkwwwk', 'kwwkkkkkwwwk', 'kwwwkkkwwkkk', 'kkwwwwwwkkkk', 'kkkwwwwwwkkk', '.kwwwkkwwwk.', '..kwwkkwwk..', '...kkkkkk...', '............'],
    mic: ['....kkkk....', '...kgggk....', '...kgwgk....', '...kgggk....', '...kgggk....', '..k.kkk.k...', '..k.....k...', '...kk.kk....', '.....k......', '.....k......', '...kkkkk....', '............'],
    sun: ['.....y......', '.y...y...y..', '..y.....y...', '....kkkk....', '...kyyyyk...', 'yy.kyyyyk.yy', '...kyyyyk...', '....kkkk....', '..y.....y...', '.y...y...y..', '.....y......', '............'],
    leaf: ['........kkk.', '......kkGGk.', '....kkGGGGk.', '...kGGGGGGk.', '..kGGGGGDGk.', '..kGGGGDGk..', '..kGGGDGGk..', '..kGGDGGk...', '..kGDkkk....', '..kDk.......', '.kk.........', '............'],
    cross: ['............', '....kkkk....', '....kGGk....', '....kGGk....', '.kkkkGGkkkk.', '.kGGGGGGGGk.', '.kGGGGGGGGk.', '.kkkkGGkkkk.', '....kGGk....', '....kGGk....', '....kkkk....', '............'],
    back: ['............', '....kk......', '...kyk......', '..kyykkkkkk.', '.kyyyyyyyyk.', 'kyyyyyyyyyk.', '.kyyyyyyyyk.', '..kyykkkkkk.', '...kyk......', '....kk......', '............', '............'],
    bolt: ['......kkkk..', '.....kyyk...', '....kyyk....', '...kyyk.....', '..kyyykkkk..', '.kyyyyyyk...', '..kkkyyk....', '....kyk.....', '...kyk......', '..kyk.......', '..kk........', '............'],
    mood: ['...kkkkkk...', '..kyyyyyyk..', '.kyyyyyyyyk.', 'kyykyyyykyyk', 'kyyyyyyyyyyk', 'kyyyyyyyyyyk', 'kykyyyyyykyk', 'kyykkkkkkyyk', '.kyyyyyyyyk.', '..kyyyyyyk..', '...kkkkkk...', '............'],
    scooter: ['..........kk', '.........kk.', '.........k..', '.........k..', '........k...', '........k...', '..kkkkkkk...', '.kssssssk...', 'kk.....kkk..', 'kgk....kgk..', '.k......k...', '............'],
    pin: ['...kkkkkk...', '..krrrrrrk..', '.krrrwwrrrk.', '.krrwwwwrrk.', '.krrrwwrrrk.', '..krrrrrrk..', '...krrrrk...', '....krrk....', '.....kk.....', '............', '............', '............'],
  };
  const cache = {};
  function icon(name, px = 3) {
    const key = name + px;
    if (cache[key]) return cache[key];
    const rows = ICONS[name] || ICONS.star;
    const cv = makeCanvas(12 * px, 12 * px);
    const g = cv.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < 12; x++) {
        const c = PAL[row[x]];
        if (c) { g.fillStyle = c; g.fillRect(x * px, y * px, px, px); }
      }
    });
    cache[key] = cv.toDataURL();
    return cache[key];
  }
  function img(name, cls = 'ico') { return `<img class="${cls}" alt="" src="${icon(name)}">`; }

  /* ---------- рамки 12×12 для border-image (срез 4) ---------- */
  const SHAPES = {
    panel: ['.OOOOOOOOOO.', 'OBBBBBBBBBBO', 'OBHHHHHHHHbO', 'OBHFFFFFFFbO', 'OBHFFFFFFFbO', 'OBHFFFFFFFbO', 'OBHFFFFFFFbO', 'OBHFFFFFFFbO', 'OBHFFFFFFFbO', 'OBFFFFFFFFbO', 'ObbbbbbbbbbO', '.OOOOOOOOOO.'],
    button: ['.OOOOOOOOOO.', 'OHHHHHHHHHHO', 'OHFFFFFFFFfO', 'OFFFFFFFFFfO', 'OFFFFFFFFFfO', 'OFFFFFFFFFfO', 'OFFFFFFFFFfO', 'OFFFFFFFFFfO', 'OFFFFFFFFFfO', 'OffffffffffO', 'OddddddddddO', '.OOOOOOOOOO.'],
  };
  const FRAMES = {
    panel: ['panel', { O: '#081320', B: '#f6c343', b: '#b8841f', H: '#2a5a80', F: '#13304a' }],
    plain: ['panel', { O: '#081320', B: '#2c5470', b: '#1b3850', H: '#24496a', F: '#13304a' }],
    paper: ['panel', { O: '#081320', B: '#2c5470', b: '#1b3850', H: '#ffffff', F: '#eef4f7' }],
    btn: ['button', { O: '#081320', H: '#9be8f7', F: '#2ec4e6', f: '#1fa3c6', d: '#13708c' }],
    gold: ['button', { O: '#081320', H: '#ffe9a8', F: '#f6c343', f: '#dba52c', d: '#9c6d12' }],
    red: ['button', { O: '#081320', H: '#ffa494', F: '#e5533d', f: '#c23d2a', d: '#7f2418' }],
    tile: ['button', { O: '#081320', H: '#3d729b', F: '#1d3e5c', f: '#18344d', d: '#0d2234' }],
    off: ['button', { O: '#081320', H: '#46535d', F: '#28343e', f: '#212b33', d: '#151d23' }],
    green: ['button', { O: '#081320', H: '#b4ec9f', F: '#6cc35a', f: '#55a646', d: '#2f6e26' }],
  };
  function frame(kind) {
    const [shape, pal] = FRAMES[kind];
    const cv = makeCanvas(12, 12);
    const g = cv.getContext('2d');
    SHAPES[shape].forEach((row, y) => {
      for (let x = 0; x < 12; x++) { const c = pal[row[x]]; if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } }
    });
    return cv.toDataURL();
  }

  function install() {
    const root = document.documentElement.style;
    for (const k of Object.keys(FRAMES)) root.setProperty('--f-' + k, `url("${frame(k)}")`);
    root.setProperty('--ico-check', `url("${icon('star', 2)}")`);
  }

  return { icon, img, install, has: (n) => !!ICONS[n] };
})();
