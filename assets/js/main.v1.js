/* CHIP365 — меню, стенд (график мощности), сценарии, заявка */
(function () {
  'use strict';

  /* ---------- меню ---------- */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  if (burger && drawer) {
    var last = null;
    function open() {
      last = document.activeElement;
      drawer.hidden = false;
      burger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
      var c = document.getElementById('drawer-close'); if (c) c.focus({ preventScroll: true });
    }
    function close() {
      drawer.hidden = true;
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      if (last) last.focus({ preventScroll: true });
    }
    burger.addEventListener('click', function () { drawer.hidden ? open() : close(); });
    var dc = document.getElementById('drawer-close');
    if (dc) dc.addEventListener('click', close);
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) { close(); return; }
      if (!e.target.closest('.drawer__in')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (drawer.hidden) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var items = drawer.querySelectorAll('a, button');
      if (!items.length) return;
      var first = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 900 && !drawer.hidden) close(); });
  }

  /* ---------- стенд ---------- */
  var svg = document.getElementById('dynoSvg');
  if (!svg) return;

  var ENG = {
    na: { hp: function (v) { return 68 * v + 12; }, nm: function (v) { return 92 * v + 12; }, redline: 6200,
          g: { 1: { hp: 0.08, nm: 0.07 }, 2: { hp: 0.12, nm: 0.10 } } },
    turbo: { hp: function (v) { return 105 * v + 20; }, nm: function (v) { return 165 * v + 20; }, redline: 6200,
          g: { 1: { hp: 0.24, nm: 0.26 }, 2: { hp: 0.38, nm: 0.40 } } },
    diesel: { hp: function (v) { return 78 * v + 15; }, nm: function (v) { return 190 * v + 20; }, redline: 4600,
          g: { 1: { hp: 0.26, nm: 0.28 }, 2: { hp: 0.34, nm: 0.36 } } }
  };
  var state = { engine: 'na', stage: 1, vol: 2 };

  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function fmt(v) { return Math.round(v).toLocaleString('ru-RU'); }

  function powerShape(x) { return 0.46 + 0.62 * x - 0.08 * x * x; }
  function torqueShape(x) { var d = 2 * x - 1; return 1 - 0.55 * d * d; }

  function render() {
    var e = ENG[state.engine];
    var g = e.g[state.stage];
    var baseHp = e.hp(state.vol), baseNm = e.nm(state.vol);
    var newHp = baseHp * (1 + g.hp), newNm = baseNm * (1 + g.nm);
    var rl = e.redline, r0 = 1000;

    var W = 720, H = 380, L = 54, R = 700, T = 34, B = 316;
    var maxHp = newHp * 1.12, maxNm = newNm * 1.12;
    function X(rpm) { return L + (rpm - r0) / (rl - r0) * (R - L); }
    function Y(v, max) { return B - (v / max) * (B - T); }

    svg.innerHTML = '';

    /* сетка */
    for (var rpm = 1000; rpm <= rl; rpm += 1000) {
      svg.appendChild(el('line', { x1: X(rpm), y1: T, x2: X(rpm), y2: B, stroke: 'rgba(233,239,241,.08)' }));
      svg.appendChild(el('text', { x: X(rpm), y: B + 22, fill: '#5C676C', 'font-size': 10, 'font-family': 'JetBrains Mono, monospace', 'text-anchor': 'middle' }, rpm));
    }
    for (var i = 1; i <= 4; i++) {
      var y = T + (B - T) * i / 5;
      svg.appendChild(el('line', { x1: L, y1: y, x2: R, y2: y, stroke: 'rgba(233,239,241,.06)' }));
    }
    svg.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'rgba(233,239,241,.28)' }));
    svg.appendChild(el('text', { x: R, y: B + 40, fill: '#5C676C', 'font-size': 9, 'font-family': 'JetBrains Mono, monospace', 'text-anchor': 'end' }, 'RPM'));

    function series(valFn, max, from, to) {
      var pts = [], n = 30;
      for (var i = 0; i <= n; i++) {
        var rpm = from + (to - from) * i / n;
        var x = (rpm - r0) / (rl - r0);
        pts.push([X(rpm), Y(valFn(x), max)]);
      }
      return pts;
    }
    function path(pts) {
      return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    }

    var hpWas = series(function (x) { return baseHp * powerShape(x); }, maxHp, 1200, rl);
    var hpNow = series(function (x) { return newHp * powerShape(x); }, maxHp, 1200, rl);
    var nmWas = series(function (x) { return baseNm * torqueShape(x); }, maxNm, 1200, rl);
    var nmNow = series(function (x) { return newNm * torqueShape(x); }, maxNm, 1200, rl);

    var areaD = path(hpNow) + ' L ' + R.toFixed(1) + ' ' + B + ' L ' + L + ' ' + B + ' Z';
    svg.appendChild(el('path', { d: areaD, fill: 'rgba(198,255,61,.10)' }));
    svg.appendChild(el('path', { d: path(nmWas), fill: 'none', stroke: '#55606A', 'stroke-width': 1.4, 'stroke-dasharray': '4 4' }));
    svg.appendChild(el('path', { d: path(hpWas), fill: 'none', stroke: '#6B767C', 'stroke-width': 2 }));
    svg.appendChild(el('path', { d: path(nmNow), fill: 'none', stroke: '#2FE0E6', 'stroke-width': 1.8, 'stroke-dasharray': '6 4' }));
    svg.appendChild(el('path', { d: path(hpNow), fill: 'none', stroke: '#C6FF3D', 'stroke-width': 2.6 }));

    svg.appendChild(el('circle', { cx: R, cy: Y(newHp, maxHp), r: 4, fill: '#C6FF3D' }));
    svg.appendChild(el('circle', { cx: R, cy: Y(baseHp, maxHp), r: 3, fill: '#6B767C' }));

    /* легенда */
    var ly = 18, lx = L;
    function legend(dx, color, dash, label) {
      var l = el('line', { x1: dx, y1: ly, x2: dx + 22, y2: ly, stroke: color, 'stroke-width': 2.4 });
      if (dash) l.setAttribute('stroke-dasharray', '5 3');
      svg.appendChild(l);
      svg.appendChild(el('text', { x: dx + 30, y: ly + 4, fill: '#8B979D', 'font-size': 10, 'font-family': 'JetBrains Mono, monospace' }, label));
    }
    legend(lx, '#6B767C', false, 'СТОК');
    legend(lx + 110, '#C6FF3D', false, 'ПОСЛЕ');
    legend(lx + 230, '#2FE0E6', true, 'МОМЕНТ');

    /* цифры */
    var gainPct = Math.round(g.hp * 100);
    var was = document.getElementById('outWas'), now = document.getElementById('outNow'),
        gain = document.getElementById('outGain'), hint = document.getElementById('outHint'),
        volVal = document.getElementById('volVal');
    if (volVal) volVal.textContent = state.vol.toFixed(1).replace('.', ',') + ' л';
    if (was) was.innerHTML = fmt(baseHp) + '<i>л.с.</i>';
    if (now) now.innerHTML = fmt(newHp) + '<i>л.с.</i>';
    if (gain) gain.innerHTML = '+' + gainPct + '%<i> / +' + fmt(newNm - baseNm) + ' Нм</i>';
    if (hint) {
      hint.textContent = 'Stage ' + state.stage + ': ' + fmt(baseNm) + ' → ' + fmt(newNm) + ' Нм · ' +
        (state.stage === 1 ? 'от 300 руб.' : 'считаем индивидуально под железо') +
        ' · цифры ориентировочные — точные после диагностики и чтения прошивки.';
    }
  }

  function bindChips(id, key, parse) {
    var box = document.getElementById(id);
    if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      [].forEach.call(box.querySelectorAll('.chip'), function (c) {
        c.classList.toggle('is-on', c === b);
        c.setAttribute('aria-pressed', String(c === b));
      });
      state[key] = parse(b);
      render();
    });
  }
  bindChips('engines', 'engine', function (b) { return b.getAttribute('data-engine'); });
  bindChips('stages', 'stage', function (b) { return parseInt(b.getAttribute('data-stage'), 10); });
  var vol = document.getElementById('vol');
  if (vol) vol.addEventListener('input', function () { state.vol = parseFloat(vol.value); render(); });

  render();

  /* ---------- сценарии ---------- */
  var SCEN = [
    { t: 'ЭБУ вышел из строя', price: 'от 150 руб.', time: 'от 2 часов до дня',
      txt: 'Блок залило, сгорел или он не выходит на связь после ремонта. Делаем клон: переносим прошивку, кодировки и конфигурацию в исправный донор — иммобилайзер и ключи остаются ваши.',
      pts: ['Читаем ваш блок, даже если авто не заводится', 'Подбираем донора с той же маркировкой', 'Проверяем запуск и работу всех блоков после установки'] },
    { t: 'Потеряны ключи, нужен новый', price: 'по авто', time: '1–3 часа',
      txt: 'Нужен carpass, пин или логин: читаем данные из блока и привязываем новый ключ. Работаем с штатными системами доступа, без «обходов» через скрутки.',
      pts: ['Читаем пин и логин из блока', 'Привязываем новый ключ или чип', 'Стираем ошибки и проверяем запуск'] },
    { t: 'Не заводится после замены блока', price: 'по авто', time: '1–2 часа',
      txt: 'Поставили другой ЭБУ, стартер крутит, но запуска нет: блок «чужой» для машины. Привязываем ЭБУ к авто, переносим конфигурацию, при необходимости делаем IMMO OFF.',
      pts: ['Диагностика: связь с блоком и статус иммо', 'Привязка ЭБУ к автомобилю', 'Проверка на тест-драйве'] },
    { t: 'AdBlue: ошибка и счётчик запуска', price: 'от 180 руб.', time: '2–4 часа',
      txt: 'Горит предупреждение, осталось 300 км. Делаем AdBlue OFF программно: система отключается в прошивке, ограничение запуска и мощности убирается.',
      pts: ['Читаем прошивку и ошибки', 'Отключаем логику AdBlue, а не лампочку', 'Проверяем, что счётчик не возвращается'] },
    { t: 'Сажевый или катализатор', price: 'от 150 руб.', time: '2–4 часа',
      txt: 'Регенерация не идёт, машина в аварийном режиме. Смотрим противодавление и состояние фильтра, затем программное решение — DPF OFF или отключение контроля катализатора.',
      pts: ['Проверяем забитость и датчики', 'Программное отключение с правкой прошивки', 'Диагностика после: ошибки и параметры'] },
    { t: 'Не тянет, хочу мощности', price: 'от 300 руб.', time: 'в течение дня',
      txt: 'Stage 1 или Stage 2: правим калибровки под ваш мотор и топливо, с сохранением ресурса. Сначала смотрим параметры: если железо не готово, тюнинг отложим.',
      pts: ['Диагностика: наддув, смесь, коррекции', 'Индивидуальная прошивка, не универсальный файл', 'Тест-драйв вместе с вами, оплата по результату'] }
  ];

  var listBox = document.getElementById('scenList');
  var bodyBox = document.getElementById('scenBody');
  if (listBox && bodyBox) {
    SCEN.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'scen__btn' + (i === 0 ? ' is-on' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.innerHTML = '<i>0' + (i + 1) + '</i><span>' + s.t + '</span>';
      b.addEventListener('click', function () {
        [].forEach.call(listBox.children, function (c) {
          c.classList.toggle('is-on', c === b);
          c.setAttribute('aria-selected', String(c === b));
        });
        show(i);
      });
      listBox.appendChild(b);
    });
    function show(i) {
      var s = SCEN[i];
      bodyBox.innerHTML =
        '<h3 class="scen__ttl">' + s.t + '</h3>' +
        '<p class="scen__txt">' + s.txt + '</p>' +
        '<div class="scen__num"><div><span>Стоимость</span><b class="ph">' + s.price + '</b></div>' +
        '<div><span>Время</span><b>' + s.time + '</b></div></div>' +
        '<ul class="scen__list2">' + s.pts.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>' +
        '<a class="btn btn--ph" href="https://wa.me/375291515658?text=' +
        encodeURIComponent('Здравствуйте! Ситуация: ' + s.t + '. Подскажите по цене и времени.') +
        '" target="_blank" rel="noopener">Спросить в WhatsApp</a>';
    }
    show(0);
  }

  /* ---------- заявка ---------- */
  var form = document.getElementById('leadForm');
  if (!form) return;
  var ok = document.getElementById('formOk'), out = document.getElementById('formText'),
      send = document.getElementById('formSend'), copy = document.getElementById('formCopy');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = document.getElementById('fname'), p = document.getElementById('fphone'),
        s = document.getElementById('fservice'), c = document.getElementById('fcar');
    var bad = false;
    [n, p].forEach(function (f) {
      if (!f.value.trim()) { f.style.borderColor = '#FF7A2F'; bad = true; } else { f.style.borderColor = ''; }
    });
    if (bad) return;
    var text = 'Заявка с сайта CHIP365\nИмя: ' + n.value.trim() + '\nТелефон: ' + p.value.trim() +
      '\nУслуга: ' + s.value + (c.value.trim() ? '\nАвто и проблема: ' + c.value.trim() : '');
    out.textContent = text;
    send.href = 'https://wa.me/375291515658?text=' + encodeURIComponent(text);
    if (ok.hidden) {
      ok.hidden = false;
      [].forEach.call(form.querySelectorAll('input, select, textarea, .form__btn'), function (f) { f.disabled = true; });
    }
    ok.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  if (copy) copy.addEventListener('click', function () {
    var t = out.textContent || '';
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t);
    else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    copy.textContent = 'Скопировано';
    setTimeout(function () { copy.textContent = 'Скопировать'; }, 1800);
  });
})();
