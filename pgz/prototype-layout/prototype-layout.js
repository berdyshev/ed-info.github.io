// PROTOTYPE (throwaway) — три варіанти макета pgz для issue #73,
// перемикаються через ?variant=A|B|C на існуючій сторінці pgz/index.html.
// Стан тільки в пам'яті. Не мерджити в main: переможця переписати начисто.
(function () {
  const VARIANTS = {
    A: 'IDE: смужка іконок + док гри',
    B: 'Мінімальні перемикачі + плаваюча гра',
    C: 'Висувні шухляди + гра «картинка в картинці»',
  };
  const KEYS = Object.keys(VARIANTS);
  const params = new URLSearchParams(location.search);
  let key = (params.get('variant') || 'A').toUpperCase();
  if (!VARIANTS[key]) key = 'A';
  document.documentElement.dataset.proto = key;

  const state = { panel: 'закрита', tab: '-', console: 'схована', game: 'не запущена' };
  const $ = (id) => document.getElementById(id);
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const refreshEditor = () => requestAnimationFrame(() => window.PythonIDE && PythonIDE.editor && PythonIDE.editor.refresh());

  // ---------- спільні хелпери ----------
  function printedText() {
    // print() дописує текст прямо в #output, після службових елементів
    const out = $('output');
    if (!out) return '';
    const c = out.cloneNode(true);
    c.querySelectorAll('#watch, #headerOut, #btn_showREPL').forEach((n) => n.remove());
    return c.textContent.trim();
  }
  // викликає cb(lines), коли програма щось надрукувала
  function onOutput(cb) {
    let last = '';
    new MutationObserver(() => {
      const t = printedText();
      if (t && t !== last) { last = t; cb(t.split('\n').length); }
      if (!t) last = '';
    }).observe($('output'), { childList: true, subtree: true, characterData: true });
  }
  // викликає cb(message) при помилці виконання (текст помилки сайт сам пише в консоль)
  function onError(cb) {
    const orig = PythonIDE.handleError;
    PythonIDE.handleError = function (err) {
      const r = orig.apply(this, arguments);
      cb(String(err));
      return r;
    };
  }
  // cb(true/false), коли вікно гри показується/ховається
  function onGame(cb) {
    const gm = $('gameModal');
    let shown = false;
    new MutationObserver(() => {
      const now = gm.style.display !== 'none' && gm.style.display !== '';
      if (now !== shown) { shown = now; state.game = now ? 'запущена' : 'не запущена'; cb(now); }
    }).observe(gm, { attributes: true, attributeFilter: ['style'] });
  }
  function hotkeys(map) {
    window.addEventListener('keydown', (e) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return;
      const f = map[e.key.toLowerCase()];
      if (f) { e.preventDefault(); e.stopPropagation(); f(); }
    }, true);
  }
  function dragResize(handle, onMove, onDone) {
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      document.body.classList.add('proto-resizing');
      const move = (ev) => onMove(ev);
      const up = () => {
        document.body.classList.remove('proto-resizing');
        removeEventListener('mousemove', move); removeEventListener('mouseup', up);
        onDone && onDone(); refreshEditor();
      };
      addEventListener('mousemove', move); addEventListener('mouseup', up);
    });
  }
  function makeDraggable(win, handle) {
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      const r = win.getBoundingClientRect();
      const dx = e.clientX - r.left, dy = e.clientY - r.top;
      win.style.position = 'absolute';
      const move = (ev) => { win.style.left = ev.clientX - dx + 'px'; win.style.top = ev.clientY - dy + 'px'; };
      const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
      addEventListener('mousemove', move); addEventListener('mouseup', up);
    });
  }
  // показати потрібний вміст правої панелі через оригінальні функції сторінки
  const origShowGallery = window.showGallery;
  function showTab(tab) {
    $('handbook').style.display = tab === 'handbook' ? 'block' : 'none';
    $('resourceGallery').style.display = 'none';
    const dock = $('protoGameDock');
    if (dock) dock.style.display = tab === 'game' ? 'block' : 'none';
    if (tab === 'gallery') origShowGallery();
    state.tab = { gallery: 'галерея', handbook: 'посібник', game: 'гра' }[tab];
  }

  // ========== A: IDE ==========
  function initA() {
    const main = $('mainLayout'), right = $('rightBar'), cons = $('consoleContainer');
    let tab = null, autoGame = false;

    // права панель: заголовок + ресайзер + док гри
    const head = el(`<div id="protoPanelHead"><span id="protoPanelTitle"></span>
      <button class="proto-iconbtn" title="Сховати (Ctrl+B)">✕</button></div>`);
    right.prepend(head);
    right.prepend(el('<div id="protoPanelResizer"></div>'));
    const dock = el('<div id="protoGameDock" style="display:none"><div class="empty">Натисніть ▶, щоб запустити гру тут</div></div>');
    right.appendChild(dock);
    dock.appendChild($('gameModal'));
    right.classList.add('proto-closed');

    const bar = el(`<div id="protoActivity">
      <button data-tab="gallery" title="Галерея ресурсів"><img src="./media/gallery.png"></button>
      <button data-tab="handbook" title="Посібник"><img src="./media/pgz-handbook.png"></button>
      <button data-tab="game" title="Гра"><img src="./media/play.png"></button>
      <div class="hint">Ctrl+B<br>панель<br><br>Ctrl+J<br>консоль</div></div>`);
    main.appendChild(bar);

    const titles = { gallery: 'Галерея ресурсів', handbook: 'Посібник', game: 'Гра' };
    function open(t) {
      tab = t;
      right.classList.remove('proto-closed');
      showTab(t);
      $('protoPanelTitle').textContent = titles[t];
      bar.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
      state.panel = 'відкрита';
      refreshEditor();
    }
    function close() {
      right.classList.add('proto-closed');
      bar.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      state.panel = 'закрита'; state.tab = '-';
      refreshEditor();
    }
    const toggle = (t) => (!right.classList.contains('proto-closed') && tab === t ? close() : open(t));
    bar.querySelectorAll('button').forEach((b) => (b.onclick = () => toggle(b.dataset.tab)));
    head.querySelector('button').onclick = close;
    dragResize($('protoPanelResizer'), (ev) => {
      const w = Math.min(Math.max(innerWidth - ev.clientX - 56, 260), innerWidth * 0.7);
      document.documentElement.style.setProperty('--proto-pw', w + 'px');
    });

    // гра відкривається у вкладці «Гра» і повертає панель як було
    let before = null;
    onGame((shown) => {
      dock.querySelector('.empty').style.display = shown ? 'none' : 'block';
      if (shown) {
        before = right.classList.contains('proto-closed') ? null : tab;
        autoGame = true; open('game');
      } else if (autoGame) {
        autoGame = false;
        before ? open(before) : close();
      }
    });

    // консоль: схована, відкривається при виводі/помилці
    const chead = el(`<div id="protoConsoleHead"><span class="tab">Консоль</span>
      <span class="tools"><button class="proto-iconbtn" data-a="clear" title="Очистити">⌫</button>
      <button class="proto-iconbtn" data-a="close" title="Сховати (Ctrl+J)">✕</button></span></div>`);
    cons.before(chead);
    const setCons = (show) => {
      chead.style.display = cons.style.display = show ? '' : 'none';
      state.console = show ? 'відкрита' : 'схована';
      refreshEditor();
    };
    setCons(false);
    chead.querySelector('[data-a=close]').onclick = () => setCons(false);
    chead.querySelector('[data-a=clear]').onclick = () => [...$('output').childNodes].forEach((n) => !n.id && !(n.querySelector && n.querySelector('#btn_showREPL')) && n.remove());
    dragResize(chead, (ev) => {
      const bottom = cons.getBoundingClientRect().bottom;
      const h = Math.min(Math.max(bottom - ev.clientY - 28, 60), innerHeight * 0.7);
      document.documentElement.style.setProperty('--proto-ch', h + 'px');
    });
    onOutput(() => setCons(true));
    onError(() => setCons(true));

    window.toggleShowGallery = () => toggle('gallery');
    window.showHandbook = () => toggle('handbook');
    window.showConsole = () => setCons(cons.style.display === 'none');
    hotkeys({ b: () => (right.classList.contains('proto-closed') ? open(tab || 'gallery') : close()), j: window.showConsole });
  }

  // ========== B: мінімальні перемикачі ==========
  function initB() {
    const right = $('rightBar'), cons = $('consoleContainer');
    let tab = 'gallery';
    const btn = el('<button id="protoEdgeBtn" title="Показати/сховати панель (Ctrl+B)">‹</button>');
    const label = el('<div id="protoEdgeLabel">Галерея · Посібник</div>');
    right.prepend(label); right.prepend(btn);
    const setPanel = (open, t) => {
      if (t) tab = t;
      right.classList.toggle('proto-closed', !open);
      btn.textContent = open ? '›' : '‹';
      if (open) showTab(tab);
      state.panel = open ? 'відкрита' : 'згорнута';
      if (!open) state.tab = '-';
      refreshEditor();
    };
    setPanel(false);
    btn.onclick = () => setPanel(right.classList.contains('proto-closed'));
    label.onclick = () => setPanel(true);
    window.toggleShowGallery = () => setPanel(right.classList.contains('proto-closed') || tab !== 'gallery', 'gallery');
    window.showHandbook = () => setPanel(right.classList.contains('proto-closed') || tab !== 'handbook', 'handbook');

    // консоль: завжди видима смужка-статус, клік розгортає
    const status = el('<div id="protoStatus"><span class="arrow">▸</span><span>Консоль</span><span class="info">порожньо</span><span class="badge" style="display:none"></span></div>');
    cons.before(status);
    let lines = 0, unseen = 0;
    const setCons = (open) => {
      cons.style.display = open ? '' : 'none';
      status.classList.toggle('open', open);
      status.querySelector('.arrow').textContent = open ? '▾' : '▸';
      if (open) unseen = 0;
      const badge = status.querySelector('.badge');
      badge.style.display = unseen ? '' : 'none'; badge.textContent = unseen;
      state.console = open ? 'розгорнута' : 'згорнута';
      refreshEditor();
    };
    setCons(false);
    status.onclick = () => setCons(cons.style.display === 'none');
    onOutput((n) => {
      if (cons.style.display === 'none') unseen += Math.max(n - lines, 1);
      lines = n;
      status.querySelector('.info').textContent = `· ${n} ${n === 1 ? 'рядок' : 'рядків'}`;
      setCons(true);
    });
    onError(() => { status.querySelector('.info').textContent = '· помилка'; setCons(true); });
    window.showConsole = () => setCons(cons.style.display === 'none');
    hotkeys({ b: () => btn.click(), j: window.showConsole });

    // гра: вікно без блокування сторінки, тягнеться за заголовок
    const inner = $('gameModal').firstElementChild;
    makeDraggable(inner, inner.firstElementChild);
    onGame(() => {});
  }

  // ========== C: шухляди ==========
  function initC() {
    const right = $('rightBar'), cons = $('consoleContainer');
    const left = $('editorContainer').parentElement;
    left.classList.add('proto-leftcol');
    let tab = 'gallery';
    const head = el(`<div id="protoPanelHead"><span id="protoPanelTitle"></span>
      <button class="proto-iconbtn" title="Закрити (Esc)">✕</button></div>`);
    right.prepend(head);
    const titles = { gallery: 'Галерея ресурсів', handbook: 'Посібник' };
    const setPanel = (open, t) => {
      if (t) tab = t;
      right.classList.toggle('proto-closed', !open);
      if (open) { showTab(tab); $('protoPanelTitle').textContent = titles[tab]; }
      state.panel = open ? 'висунута' : 'схована';
      if (!open) state.tab = '-';
    };
    setPanel(false);
    head.querySelector('button').onclick = () => setPanel(false);
    window.toggleShowGallery = () => setPanel(right.classList.contains('proto-closed') || tab !== 'gallery', 'gallery');
    window.showHandbook = () => setPanel(right.classList.contains('proto-closed') || tab !== 'handbook', 'handbook');
    document.addEventListener('mousedown', (e) => {
      if (!right.classList.contains('proto-closed') && !right.contains(e.target) && !e.target.closest('#toolPanel, #protoSwitcher, .modal-overlay, #importModal'))
        setPanel(false);
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setPanel(false); });

    // консоль: шухляда знизу поверх редактора
    const chead = el(`<div id="protoConsoleDrawerHead"><span>Консоль</span>
      <span><button class="proto-iconbtn" data-a="close" title="Закрити">✕</button></span></div>`);
    cons.before(chead);
    const setCons = (open) => {
      chead.style.display = cons.style.display = open ? '' : 'none';
      state.console = open ? 'висунута' : 'схована';
    };
    setCons(false);
    chead.querySelector('[data-a=close]').onclick = () => setCons(false);
    onOutput(() => setCons(true));
    onError(() => setCons(true));
    window.showConsole = () => setCons(cons.style.display === 'none');

    // гра: «картинка в картинці» в куті, кнопка ⤢ розгортає
    const gm = $('gameModal');
    const ghead = gm.firstElementChild.firstElementChild;
    const pip = el('<button id="protoPipBtn" title="Згорнути / розгорнути">⤢</button>');
    ghead.firstElementChild.replaceWith(pip);
    const setPip = (on) => { gm.classList.toggle('proto-pip', on); state.game = gm.style.display === 'none' ? 'не запущена' : on ? 'в куті' : 'на весь екран'; };
    setPip(true);
    pip.onclick = () => setPip(!gm.classList.contains('proto-pip'));
    onGame((shown) => shown && setPip(true));
  }

  // Гра більше не перекриває редактор, тому клавіші, набрані в редакторі,
  // не віддаємо грі (у pgz усі натискання під час гри йдуть у гру).
  // Клік по полю гри знімає фокус з редактора, і клавіші знову йдуть у гру.
  function editorKeysStayInEditor() {
    const handler = () => {
      const a = document.activeElement;
      if (!PythonIDE.running || !a || !a.closest('.CodeMirror')) return;
      const saved = PythonIDE.keyHandlers;
      PythonIDE.keyHandlers = [];
      setTimeout(() => { if (!PythonIDE.keyHandlers.length) PythonIDE.keyHandlers = saved; });
    };
    window.addEventListener('keydown', handler, true);
    window.addEventListener('keyup', handler, true);
  }

  // ---------- плаваючий перемикач ----------
  function switcher() {
    const i = KEYS.indexOf(key);
    const go = (d) => {
      const p = new URLSearchParams(location.search);
      p.set('variant', KEYS[(i + d + KEYS.length) % KEYS.length]);
      location.search = p.toString();
    };
    const bar = el(`<div id="protoSwitcher" title="ПРОТОТИП: ← / → перемикають варіанти">
      <div class="row"><button data-d="-1">‹</button><span>${key} · ${VARIANTS[key]}</span><button data-d="1">›</button></div>
      <div class="state"></div></div>`);
    bar.querySelectorAll('button').forEach((b) => (b.onclick = () => go(+b.dataset.d)));
    document.body.appendChild(bar);
    window.addEventListener('keydown', (e) => {
      const a = document.activeElement;
      if (a && (a.matches('input, textarea, select') || a.isContentEditable)) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });
    setInterval(() => {
      bar.querySelector('.state').textContent =
        `панель: ${state.panel} · вкладка: ${state.tab} · консоль: ${state.console} · гра: ${state.game}`;
    }, 300);
  }

  window.addEventListener('load', () => setTimeout(() => {
    ({ A: initA, B: initB, C: initC })[key]();
    editorKeysStayInEditor();
    switcher();
    refreshEditor();
  }, 0));
})();
