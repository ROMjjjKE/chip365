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
  if (svg) initDyno();

  function initDyno() {
    var ENG = {
      na:     { label:'Атмо', hp:function(v){return 68*v+12}, nm:function(v){return 92*v+12},  red:6300, g:{1:{hp:.08,nm:.07},2:{hp:.12,nm:.10}} },
      turbo:  { label:'Турбо', hp:function(v){return 105*v+20}, nm:function(v){return 165*v+20}, red:6300, g:{1:{hp:.24,nm:.26},2:{hp:.38,nm:.40}} },
      diesel: { label:'Дизель', hp:function(v){return 78*v+15}, nm:function(v){return 190*v+20}, red:4600, g:{1:{hp:.26,nm:.28},2:{hp:.34,nm:.36}} }
    };
    var st = { eng:'na', vol:2, stage:1 };
    var NS = 'http://www.w3.org/2000/svg';
    var live = document.getElementById('dynoLive');
    var hover = null;

    function el(tag, attrs, text) {
      var n = document.createElementNS(NS, tag);
      if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
      if (text != null) n.textContent = text;
      return n;
    }

    function calc() {
      var e = ENG[st.eng], v = st.vol, g = e.g[st.stage];
      var hp0 = e.hp(v), nm0 = e.nm(v);
      return { hp0:hp0, hp1:hp0*(1+g.hp), nm0:nm0, nm1:nm0*(1+g.nm), red:e.red, dhp:hp0*g.hp, dnm:nm0*g.nm, pct:g.hp*100 };
    }

    // форма кривой: x 0..1
    function hpShape(x){ return 0.42 + 0.72*x - 0.16*x*x; }
    function nmShape(x){ return 1 - 0.55*Math.pow(2*x-1,2); }

    function series(d, key) {
      var pts = [], max = key === 'hp' ? d.hp1 : d.nm1, red = d.red, N = 40;
      for (var i=0;i<=N;i++){
        var x = i/N, rpm = 900 + x*(red-900);
        var base = key === 'hp' ? d.hp0 : d.nm0, mult = max/base;
        var shape = key === 'hp' ? hpShape(x) : nmShape(x);
        var maxShape = key === 'hp' ? hpShape(1) : 1;
        pts.push({ rpm:rpm, base: base*shape/maxShape, after: base*mult*shape/maxShape });
      }
      return pts;
    }

    function render() {
      var svg2 = document.getElementById('dynoSvg');
      if (!svg2) return;
      var d = calc();
      svg2.innerHTML = '';
      var W = 760, H = 360, x0 = 56, x1 = 716, y0 = 20, y1 = 296;
      var hpMax = Math.ceil(d.hp1*1.15/20)*20;
      var nmMax = Math.ceil(d.nm1*1.15/20)*20;

      var X = function(rpm){ return x0 + (rpm-900)/(d.red-900)*(x1-x0); };
      var Yhp = function(hp){ return y1 - hp/hpMax*(y1-y0); };
      var Ynm = function(nm){ return y1 - nm/nmMax*(y1-y0); };

      // сетка
      for (var i=0;i<=4;i++){
        var yy = y0 + i*(y1-y0)/4;
        svg2.appendChild(el('line',{x1:x0,y1:yy,x2:x1,y2:yy,stroke:'rgba(233,239,241,.09)','stroke-width':1}));
        svg2.appendChild(el('text',{x:x0-10,y:yy+3.5,fill:'#8B979D','font-size':9,'text-anchor':'end','font-family':'monospace'}, Math.round(hpMax*(4-i)/4)));
        svg2.appendChild(el('text',{x:x1+10,y:yy+3.5,fill:'#5E7378','font-size':9,'font-family':'monospace'}, Math.round(nmMax*(4-i)/4)));
      }
      for (var rpm=1000; rpm<=d.red; rpm+=1000){
        svg2.appendChild(el('line',{x1:X(rpm),y1:y0,x2:X(rpm),y2:y1,stroke:'rgba(233,239,241,.06)','stroke-width':1}));
        svg2.appendChild(el('text',{x:X(rpm),y:y1+18,fill:'#8B979D','font-size':9,'text-anchor':'middle','font-family':'monospace'}, rpm));
      }
      svg2.appendChild(el('text',{x:x0-10,y:y0-4,fill:'#C6FF3D','font-size':9,'text-anchor':'end','font-family':'monospace'},'Л.С.'));
      svg2.appendChild(el('text',{x:x1+10,y:y0-4,fill:'#2FE0E6','font-size':9,'font-family':'monospace'},'НМ'));
      svg2.appendChild(el('text',{x:x1,y:y1+34,fill:'#8B979D','font-size':9,'text-anchor':'end','font-family':'monospace'},'ОБ/МИН'));

      var P = series(d,'hp'), T = series(d,'nm');

      var line = function(pts, key, stroke, width, dash, yfn){
        var ds = pts.map(function(p,i){ return (i?'L':'M') + X(p.rpm).toFixed(1) + ' ' + yfn(p[key]).toFixed(1); }).join(' ');
        svg2.appendChild(el('path',{d:ds,fill:'none',stroke:stroke,'stroke-width':width,'stroke-dasharray':dash||'0','stroke-linejoin':'round','stroke-linecap':'round'}));
      };

      // заливка под «после»
      var area = P.map(function(p,i){ return (i?'L':'M') + X(p.rpm).toFixed(1) + ' ' + Yhp(p.after).toFixed(1); }).join(' ');
      area += ' L ' + X(d.red).toFixed(1) + ' ' + y1 + ' L ' + X(900).toFixed(1) + ' ' + y1 + ' Z';
      svg2.appendChild(el('path',{d:area,fill:'rgba(198,255,61,.10)'}));

      line(P,'base','#7B868C',2,'0',Yhp);
      line(T,'base','#63737A',1.5,'5 5', Ynm);
      line(P,'after','#C6FF3D',3,'0',Yhp);
      line(T,'after','#2FE0E6',2,'6 5', Ynm);

      // пиковые значения
      var peak = P[P.length-1];
      svg2.appendChild(el('circle',{cx:X(peak.rpm),cy:Yhp(peak.after),r:4,fill:'#C6FF3D'}));
      svg2.appendChild(el('text',{x:X(d.red)-6,y:Yhp(d.hp1)-12,fill:'#C6FF3D','font-size':11,'font-weight':700,'text-anchor':'end','font-family':'monospace'}, Math.round(d.hp1)+' л.с.'));
      svg2.appendChild(el('text',{x:X(d.red)-6,y:Yhp(d.hp0)+18,fill:'#A9B4B9','font-size':10,'text-anchor':'end','font-family':'monospace'}, Math.round(d.hp0)));

      // перекрестие
      if (hover != null) {
        var idx = Math.round((hover-900)/(d.red-900)*40);
        idx = Math.max(0, Math.min(40, idx));
        var ph = P[idx], pt = T[idx], xx = X(ph.rpm);
        svg2.appendChild(el('line',{x1:xx,y1:y0,x2:xx,y2:y1,stroke:'rgba(233,239,241,.35)','stroke-width':1,'stroke-dasharray':'3 3'}));
        svg2.appendChild(el('circle',{cx:xx,cy:Yhp(ph.after),r:4.5,fill:'#07090B',stroke:'#C6FF3D','stroke-width':2.5}));
        svg2.appendChild(el('circle',{cx:xx,cy:Yhp(ph.base),r:3.5,fill:'#7B868C'}));
        svg2.appendChild(el('circle',{cx:xx,cy:Ynm(pt.after),r:3.5,fill:'#07090B',stroke:'#2FE0E6','stroke-width':2}));
        if (live) live.innerHTML = Math.round(ph.rpm)+' об/мин · <b>'+Math.round(ph.after)+'</b> л.с. · '+Math.round(pt.after)+' Нм';
      } else if (live) {
        live.textContent = 'ведите курсором по графику';
      }

      // числа
      var f = function(n){ return Math.round(n).toLocaleString('ru-RU'); };
      document.getElementById('outWas').textContent = f(d.hp0);
      document.getElementById('outNow').textContent = f(d.hp1);
      document.getElementById('outGain').textContent = '+' + f(d.dhp);
      document.getElementById('outPct').textContent = '+' + Math.round(d.pct) + '% к мощности · момент ' + f(d.nm0) + ' → ' + f(d.nm1) + ' Нм';
      document.getElementById('outNote').textContent = 'Stage ' + st.stage + ' на ' + ENG[st.eng].label.toLowerCase() + ' ' + st.vol.toFixed(1).replace('.',',') + ' л: ' +
        (st.stage === 1 ? 'работаем на штатном железе' : 'нужны доработки по выпуску или наддуву') +
        '. Тяга приходит раньше, обгон на трассе — без провала на средних оборотах. Цифры ориентировочные.';
    }

    var svg2 = document.getElementById('dynoSvg');
    if (svg2) {
      var move = function(e){
        var r = svg2.getBoundingClientRect();
        var px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        var x0 = 56, x1 = 716, W = 760;
        hover = 900 + Math.max(0, Math.min(1, (px/r.width*W - x0)/(x1-x0))) * (calc().red - 900);
        render();
      };
      svg2.addEventListener('mousemove', move);
      svg2.addEventListener('mouseleave', function(){ hover = null; render(); });
      svg2.addEventListener('touchmove', function(e){ move(e); }, {passive:true});
    }

    var eng = document.getElementById('engines');
    if (eng) eng.addEventListener('click', function(e){
      var b = e.target.closest('[data-engine]'); if (!b) return;
      st.eng = b.getAttribute('data-engine');
      [].forEach.call(eng.children, function(c){ c.classList.toggle('is-on', c === b); });
      render();
    });

    var stg = document.getElementById('stages');
    if (stg) stg.addEventListener('click', function(e){
      var b = e.target.closest('[data-stage]'); if (!b) return;
      st.stage = parseInt(b.getAttribute('data-stage'), 10);
      [].forEach.call(stg.children, function(c){ c.classList.toggle('is-on', c === b); });
      render();
    });

    var vol = document.getElementById('vol');
    if (vol) vol.addEventListener('input', function(){
      st.vol = parseFloat(vol.value);
      var vv = document.getElementById('volVal');
      if (vv) vv.textContent = st.vol.toFixed(1).replace('.', ',') + ' л';
      render();
    });

    render();
  }

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
