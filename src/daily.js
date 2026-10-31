'use strict';
// Ритм дня: три дела на сегодня с наградами и итог дня с тем, что ждёт завтра.

const Day = (() => {
  const s = () => G.s;

  /* ---------- учёт за сегодня ---------- */

  function fresh(st) {
    return {
      day: st.day, earned: 0, spent: 0, rel: {}, talks: 0, stars3: 0, acts: {}, absurd: 0, medals: [], cards: 0,
      gifts: 0, calls: {}, ate: {}, bus: 0, walked: 0,
      base: { deliveries: st.stats.deliveries, barista: st.stats.baristaShifts, office: st.stats.officeShifts, gigs: st.stats.gigs || 0 },
      tasks: (st.nextTasks && st.nextTasks.day === st.day ? st.nextTasks.ids : pickTasks(st, st.day)).map((id) => ({ id, done: false })), bonus: false,
    };
  }

  function today() {
    const st = s();
    if (!st) return null;
    if (!st.today || st.today.day !== st.day) st.today = fresh(st);
    return st.today;
  }

  // хуки из остальной игры
  function note(kind, a, b) {
    const t = today();
    if (!t) return;
    switch (kind) {
      case 'earn': t.earned += a; break;
      case 'spend': t.spent += a; break;
      case 'rel': t.rel[a] = (t.rel[a] || 0) + b; break;
      case 'talk': t.talks++; if (a >= 3) t.stars3++; break;
      case 'act': t.acts[a] = true; break;
      case 'absurd': t.absurd++; break;
      case 'medal': t.medals.push(a); break;
      case 'card': t.cards++; break;
      case 'gift': t.gifts++; break;
      case 'call': t.calls[a] = true; break;
      case 'eat': t.ate[a] = true; break;
      case 'bus': t.bus++; break;
      case 'walk': t.walked += a; break;
      case 'event': t.events = (t.events || 0) + 1; break;
      default:
    }
  }

  /* ---------- дела на сегодня ---------- */

  const did = (re) => (st, t) => Object.keys(t.acts).some((k) => re.test(k));
  const TASKS = {
    // работа и деньги
    deliver: { text: 'Доставь 2 заказа «Жылдам»', icon: 'bag', kind: 'work', avail: (st) => st.flags.joinedCourier, done: (st, t) => st.stats.deliveries - t.base.deliveries >= 2 },
    barista: { text: 'Отработай смену бариста', icon: 'cup', kind: 'work', avail: (st) => st.flags.metAigerim && !st.job.hired, done: (st, t) => st.stats.baristaShifts > t.base.barista },
    office: { text: 'Отработай смену в Steppe Digital', icon: 'case', kind: 'work', avail: (st) => st.job.hired && !G.isWeekend(), done: (st, t) => st.stats.officeShifts > t.base.office },
    gig: { text: 'Подработай: той, караоке или экскурсия', icon: 'tray', kind: 'work', avail: (st) => st.ads && st.ads.waiter && G.isWeekend(), done: (st, t) => (st.stats.gigs || 0) > t.base.gigs },
    earn: { text: () => `Заработай ${fmtMoney(earnGoal())}`, icon: 'coin', kind: 'work', avail: () => true, done: (st, t) => t.earned >= earnGoal() },
    // люди
    talk: { text: 'Поговори с двумя людьми', icon: 'talk', kind: 'people', avail: () => true, done: (st, t) => t.talks >= 2 },
    stars: { text: 'Разговор на три звезды', icon: 'star', kind: 'people', avail: () => true, done: (st, t) => t.stars3 >= 1 },
    mama: { text: 'Позвони маме', icon: 'phone', kind: 'people', avail: () => true, done: (st, t) => !!t.calls.mama },
    gift: { text: 'Подари кому-нибудь подарок', icon: 'gift', kind: 'people', avail: (st) => st.money >= 3000, done: (st, t) => t.gifts >= 1 },
    pigeons: { text: 'Покорми голубей на площади', icon: 'bird', kind: 'people', avail: () => G.s.weather.kind !== 'buran', done: (st) => !!st.daily.pigeons },
    // город и дом
    cook: { text: 'Приготовь ужин дома', icon: 'bowl', kind: 'city', avail: (st) => !st.rent.locked, done: did(/Приготовить ужин/) },
    shower: { text: 'Прими душ', icon: 'shower', kind: 'city', avail: () => true, done: did(/душ|Душ/) },
    gym: { text: 'Сходи на тренировку в «Батыр»', icon: 'dumbbell', kind: 'city', avail: (st) => st.money >= 1500, done: did(/^Тренировка/) },
    kaz: { text: 'Урок казахского в Тілдер орталығы', icon: 'book', kind: 'city', avail: (st) => st.money >= 3000 && G.lv('kaz') < 10, done: did(/Урок казахского/) },
    photo: { text: 'Сфотографируйся у Акорды', icon: 'camera', kind: 'city', avail: () => true, done: (st) => !!st.daily.akorda },
    mosque: { text: 'Посиди в тишине в мечети', icon: 'moon', kind: 'city', avail: () => true, done: (st) => !!st.daily.mosque },
    wheel: { text: 'Прокатись на колесе обозрения', icon: 'wheel', kind: 'city', avail: (st) => st.money >= 2000, done: did(/колесе/) },
    paper: { text: 'Купи свежую газету', icon: 'news', kind: 'city', avail: () => true, done: (st) => st.paperDay === st.day },
    absurd: { text: 'Сделай какую-нибудь глупость', icon: 'joke', kind: 'city', avail: () => true, done: (st, t) => t.absurd >= 1 },
    walk: { text: 'Пройди пешком 2 км', icon: 'map', kind: 'city', avail: () => true, done: (st, t) => t.walked >= 2000 },
    bus: { text: 'Прокатись на автобусе', icon: 'bus', kind: 'city', avail: () => true, done: (st, t) => t.bus >= 1 },
    petfeed: { text: () => `Покорми ${Pet.has() ? s().pet.name : 'котёнка'}`, icon: 'cat', kind: 'people', avail: () => Pet.has(), done: (st) => Pet.has() && st.pet.fed === st.day },
    helpout: { text: 'Помоги кому-нибудь на улице', icon: 'hand', kind: 'people', avail: () => true, done: (st, t) => (t.events || 0) >= 1 },
    kazfood: { text: 'Съешь баурсаки, казы или курт', icon: 'bowl', kind: 'city', avail: () => true, done: (st, t) => !!(t.ate.baursak || t.ate.kazy || t.ate.kurt) },
  };

  function earnGoal() {
    const st = s();
    return st.job.hired ? 15000 : st.flags.joinedCourier ? 5000 : 3000;
  }

  // Три дела: по одному про работу, людей и город. Набор зависит от дня, а не от случая — честно и предсказуемо.
  function pickTasks(st, day) {
    const out = [];
    for (const kind of ['work', 'people', 'city']) {
      const pool = Object.keys(TASKS).filter((k) => TASKS[k].kind === kind && TASKS[k].avail(st));
      if (!pool.length) continue;
      out.push(pool[Math.floor(hash2(day, kind.length * 7, 31) * pool.length) % pool.length]);
    }
    return out;
  }

  const REWARD = 1000, BONUS = 2500;
  function taskText(id) { const tx = TASKS[id].text; return typeof tx === 'function' ? tx() : tx; }

  function tick() {
    const st = s(), t = today();
    if (!st || !t) return;
    for (const x of t.tasks) {
      if (x.done || !TASKS[x.id] || !TASKS[x.id].done(st, t)) continue;
      x.done = true;
      st.stats.tasksDone = (st.stats.tasksDone || 0) + 1;
      G.add('mood', 3);
      G.earn(REWARD, 'дело дня: ' + taskText(x.id).toLowerCase());
      t.earned -= REWARD; // награда за дела не считается заработком
      Sfx.play('success');
    }
    if (!t.bonus && t.tasks.length && t.tasks.every((x) => x.done)) {
      t.bonus = true;
      st.stats.fullDays = (st.stats.fullDays || 0) + 1;
      G.add('mood', 8);
      G.earn(BONUS, 'все дела дня');
      t.earned -= BONUS;
      UI.toast('Все три дела сделаны! Отличный день.', 'medal');
    }
  }

  /* ---------- итог дня ---------- */

  // Что ждёт в указанный день: события, работа, погода, люди
  function hooks(day) {
    const st = s();
    const out = [...Dreams.hooks(day), ...Lives.hooks(day), ...Pet.hooks(day)];
    const wd = weekday(day);
    const weekend = wd === 0 || wd === 6;
    const dayWord = day === st.day ? 'Сегодня' : 'Завтра';
    if (Quests.status('toy') === 'active' && !st.flags.toyDone && st.flags.toyDay === day) out.push(['ring', `${dayWord} той Даурена и Мадины в «Алтын Сарае», с 18:00. Нарядная одежда обязательна!`]);
    if (Romance.weddingToday && Romance.love().engaged && !Romance.love().married && Romance.love().weddingDay === day) out.push(['ring', `${dayWord} ваш собственный той! Не опаздывай.`]);
    if (!st.flags.ownFlat && st.homeId === 'home' && st.rent.due - day <= 1 && st.rent.due - day >= 0) out.push(['coin', `Аренда ${fmtMoney(st.rent.amount)} — до конца дня ${st.rent.due === day ? 'сегодня' : 'завтра'}.`]);
    if (st.job.hired && !weekend) out.push(['case', 'Смена в Steppe Digital: прийти с 8:30 до 11:00.']);
    if (weekend) {
      if (st.ads && st.ads.waiter) out.push(['tray', 'Выходные: подработка официантом на тое с 17:00 и экскурсии у Байтерека.']);
      out.push(['ball', 'Матч «Астаны» на Астана Арене в 18:00.']);
    }
    const l = Romance.love();
    if (l.partner && !l.married) out.push(['heart', `${NPCS[l.partner].name} будет рад${NPCS[l.partner].look.female ? 'а' : ''} свиданию вечером.`]);
    else if (!l.partner) {
      const crush = Object.keys(st.rel).filter((id) => Romance.isDater(id) && st.rel[id] >= 40).sort((a, b) => st.rel[b] - st.rel[a])[0];
      if (crush) out.push(['heart', `Кажется, ${NPCS[crush].name} ждёт, что ты позовёшь на свидание.`]);
    }
    if (day === 6) out.push(['sun', 'Синоптики обещают первый снег. Пуховик есть?']);
    if (day >= 7 && G.warmth() < 3) out.push(['sun', 'Морозы до −25. Без пуховика и шапки на улице тяжело.']);
    const plants = typeof Decor !== 'undefined' ? Decor.thirsty() : 0;
    if (plants) out.push(['leaf', 'Цветы дома просят полить.']);
    const un = Life.unread();
    if (un) out.push(['mail', `Непрочитанных сообщений: ${un}.`]);
    return out.slice(0, 5);
  }

  let suppress = false;
  function onNewDay() {
    const st = s();
    const prev = st.today && st.today.day === st.day - 1 ? st.today : null;
    st.lastDay = prev;
    st.today = fresh(st);
    if (prev && !suppress) G.events.push(() => recap(prev, 'morning'));
    suppress = false;
  }

  function relRows(t) {
    return Object.entries(t.rel).filter(([id, v]) => v && NPCS[id]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4)
      .map(([id, v]) => `<li><span>${escapeHtml(NPCS[id].name)}</span><em class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${v}</em></li>`).join('');
  }

  // mode: 'sleep' — перед сном (что будет завтра), 'morning' — после полуночи без сна
  function recap(t = today(), mode = 'sleep') {
    return new Promise((resolve) => {
      const st = s();
      if (!t) { resolve(); return; }
      if (mode === 'sleep') suppress = true;
      const nextDay = mode === 'sleep' ? st.day + 1 : st.day;
      const nextTasks = mode === 'sleep' ? pickTasks(st, nextDay) : st.today.tasks.map((x) => x.id);
      if (mode === 'sleep') st.nextTasks = { day: nextDay, ids: nextTasks }; // завтра будут именно эти дела
      const el = document.createElement('div');
      el.className = 'sheet recap fx-panel';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Итоги дня');
      const doneN = t.tasks.filter((x) => x.done).length;
      const rel = relRows(t);
      el.innerHTML = `
        <header class="sheet-head"><span class="fx-gold">Итоги дня</span><small>${fmtDate(t.day)} · день ${t.day} в Астане</small></header>
        <div class="rc-body">
          <div class="rc-money">
            <div><b class="up">+${fmtMoney(t.earned)}</b><small>заработано</small></div>
            <div><b class="down">−${fmtMoney(t.spent)}</b><small>потрачено</small></div>
            <div><b>${fmtMoney(st.money)}</b><small>в кошельке</small></div>
          </div>
          <h3>Дела дня · ${doneN}/${t.tasks.length}${t.bonus ? ' · бонус получен' : ''}</h3>
          <ul class="rc-tasks">${t.tasks.map((x) => `<li class="${x.done ? 'ok' : ''}">${UIKit.img(TASKS[x.id].icon)}<span>${escapeHtml(taskText(x.id))}</span><i>${x.done ? '✓' : '—'}</i></li>`).join('')}</ul>
          ${rel ? `<h3>Отношения</h3><ul class="rc-rel">${rel}</ul>` : ''}
          ${t.medals.length || t.cards || t.absurd ? `<p class="rc-note">${[t.medals.length ? 'Медали: ' + t.medals.map(escapeHtml).join(', ') : '', t.cards ? `Открыток найдено: ${t.cards}` : '', t.absurd ? `Странных поступков: ${t.absurd}` : ''].filter(Boolean).join(' · ')}</p>` : ''}
          <h3>${mode === 'sleep' ? 'Завтра' : 'Сегодня'} · ${fmtDate(nextDay)}</h3>
          <ul class="rc-next">${hooks(nextDay).map(([ic, tx]) => `<li>${UIKit.img(ic)}<span>${escapeHtml(tx)}</span></li>`).join('') || '<li><span>Свободный день — город твой.</span></li>'}</ul>
          <p class="rc-note">Новые дела: ${nextTasks.map((id) => escapeHtml(taskText(id).toLowerCase())).join(' · ')}</p>
        </div>
        <footer class="loc-foot"><button class="btn big fx-gold" data-close>${UIKit.img(mode === 'sleep' ? 'moon' : 'sun')}${mode === 'sleep' ? 'Спокойной ночи' : 'Вперёд!'}</button></footer>`;
      UI.pushModal(el);
      el.addEventListener('click', (e) => {
        if (!e.target.closest('[data-close]')) return;
        Sfx.play('click');
        UI.popModal(el);
        resolve();
      });
    });
  }

  function onSleep() { return recap(today(), 'sleep'); }

  // блок для телефона
  function phoneHtml() {
    const t = today();
    if (!t) return '';
    return `<h3>Дела на сегодня · ${t.tasks.filter((x) => x.done).length}/${t.tasks.length}</h3>
      <ul class="rc-tasks">${t.tasks.map((x) => `<li class="${x.done ? 'ok' : ''}">${UIKit.img(TASKS[x.id].icon)}<span>${escapeHtml(taskText(x.id))}</span><i>${x.done ? '✓' : '+' + fmtMoney(REWARD)}</i></li>`).join('')}</ul>
      <p class="note">${t.bonus ? 'Все дела сделаны — бонус получен!' : `За все три — ещё ${fmtMoney(BONUS)} и хорошее настроение.`}</p>`;
  }
  function progress() { const t = today(); return t ? [t.tasks.filter((x) => x.done).length, t.tasks.length] : [0, 0]; }

  return { today, note, tick, onNewDay, recap, onSleep, phoneHtml, progress, hooks, TASKS };
})();
