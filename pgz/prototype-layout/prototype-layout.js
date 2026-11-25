// PROTOTYPE (throwaway) — три варіанти макета pgz для issue #73,
// перемикаються через ?variant=A|B|C на існуючій сторінці pgz/index.html.
// Стан тільки в пам'яті. Не мерджити в main: переможця переписати начисто.
(function () {
  const VARIANTS = {
    A: 'IDE: смужка іконок + окреме вікно гри',
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
  // Іконки (SVG, щоб не залежати від шрифтів з емодзі)
  const ICON = {
    images: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 18l5-5 3 3 3-4 5 6"/></svg>',
    audio: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
    handbook: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M8 7h7M8 11h7"/></svg>',
    togglePanel: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><rect class="fill" x="14" y="4" width="7" height="16"/></svg>',
    toggleConsole: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><rect class="fill" x="3" y="14" width="18" height="6"/></svg>',
  };
  function initA() {
    const main = $('mainLayout'), right = $('rightBar'), cons = $('consoleContainer');
    const gallery = $('resourceGallery');
    let tab = 'images';

    // кнопки галереї, імпорту, редактора й посібника переїжджають з верхньої панелі на бокову
    document.querySelectorAll('#toolPanel [onclick*="toggleShowGallery"], #toolPanel [onclick*="openImportModal"], #toolPanel [onclick*="showEditor"], #toolPanel [onclick*="showHandbook"]')
      .forEach((b) => (b.style.display = 'none'));

    // кнопки розкладки, як у правому верхньому куті VS Code
    const layout = el(`<div id="protoLayoutBtns">
      <button data-t="console" title="Показати/сховати консоль (Ctrl+J)">${ICON.toggleConsole}</button>
      <button data-t="panel" title="Показати/сховати бокову панель (Ctrl+B)">${ICON.togglePanel}</button></div>`);
    $('projectNameInput').before(layout);

    // права панель: заголовок з діями + ресайзер
    const head = el(`<div id="protoPanelHead"><span id="protoPanelTitle"></span>
      <span class="actions"></span>
      <button class="proto-iconbtn" data-a="close" title="Сховати панель">✕</button></div>`);
    right.prepend(head);
    right.prepend(el('<div id="protoPanelResizer"></div>'));
    right.classList.add('proto-closed');

    const TABS = {
      images: { title: 'Зображення', frame: 'imagesFrame', actions: [
        ['./media/add_file.png', 'Додати', 'Додати файл з комп\'ютера', () => addFile('image')],
        ['./media/import.png', 'Імпорт', 'Імпорт з онлайн-галереї', () => openImportModal()],
        ['./media/img-edit.png', 'Намалювати', 'Редактор зображень', () => showEditor()],
      ] },
      audio: { title: 'Аудіо', frame: 'soundsFrame', actions: [['./media/add_file.png', 'Додати', 'Додати аудіофайл', () => addFile('audio')]] },
      music: { title: 'Музика', frame: 'musicFrame', actions: [['./media/add_file.png', 'Додати', 'Додати музику', () => addFile('music')]] },
      handbook: { title: 'Посібник', actions: [] },
    };
    const bar = el(`<div id="protoActivity">${Object.keys(TABS).map((t) =>
      `<button data-tab="${t}" title="${TABS[t].title}">${ICON[t]}<span>${TABS[t].title}</span></button>`).join('')}</div>`);
    main.appendChild(bar);

    const panelOpen = () => !right.classList.contains('proto-closed');
    async function open(t) {
      tab = t;
      right.classList.remove('proto-closed');
      const T = TABS[t];
      $('protoPanelTitle').textContent = T.title;
      const actions = head.querySelector('.actions');
      actions.innerHTML = '';
      T.actions.forEach(([img, label, title, fn]) => {
        const b = el(`<button class="proto-action" title="${title}"><img src="${img}">${label}</button>`);
        b.onclick = fn; actions.appendChild(b);
      });
      if (t === 'handbook') {
        gallery.style.display = 'none';
        $('handbook').style.display = 'block';
      } else {
        $('handbook').style.display = 'none';
        gallery.style.display = 'block';
        ['imagesFrame', 'soundsFrame', 'musicFrame'].forEach((id) => ($(id).style.display = id === T.frame ? '' : 'none'));
        await initializeAssetsGallery();
      }
      state.panel = 'відкрита'; state.tab = T.title;
      sync();
    }
    function close() {
      right.classList.add('proto-closed');
      state.panel = 'закрита'; state.tab = '-';
      sync();
    }
    const togglePanel = () => (panelOpen() ? close() : open(tab));
    const toggleTab = (t) => (panelOpen() && tab === t ? close() : open(t));
    bar.querySelectorAll('button').forEach((b) => (b.onclick = () => toggleTab(b.dataset.tab)));
    head.querySelector('[data-a=close]').onclick = close;
    dragResize($('protoPanelResizer'), (ev) => {
      const w = Math.min(Math.max(innerWidth - ev.clientX - 64, 260), innerWidth * 0.7);
      document.documentElement.style.setProperty('--proto-pw', w + 'px');
    });

    // консоль: схована, відкривається при виводі/помилці
    const chead = el(`<div id="protoConsoleHead"><span class="tab">Консоль</span>
      <span class="tools"><button class="proto-iconbtn" data-a="clear" title="Очистити">⌫</button>
      <button class="proto-iconbtn" data-a="close" title="Сховати консоль">✕</button></span></div>`);
    cons.before(chead);
    const consOpen = () => cons.style.display !== 'none';
    const setCons = (show) => {
      chead.style.display = cons.style.display = show ? '' : 'none';
      state.console = show ? 'відкрита' : 'схована';
      sync();
    };
    chead.querySelector('[data-a=close]').onclick = () => setCons(false);
    chead.querySelector('[data-a=clear]').onclick = () => [...$('output').childNodes].forEach((n) => !n.id && !(n.querySelector && n.querySelector('#btn_showREPL')) && n.remove());
    dragResize(chead, (ev) => {
      const bottom = cons.getBoundingClientRect().bottom;
      const h = Math.min(Math.max(bottom - ev.clientY - 28, 60), innerHeight * 0.7);
      document.documentElement.style.setProperty('--proto-ch', h + 'px');
    });
    onOutput(() => setCons(true));
    onError(() => setCons(true));

    // підсвітка активних кнопок
    function sync() {
      bar.querySelectorAll('button').forEach((b) => b.classList.toggle('active', panelOpen() && b.dataset.tab === tab));
      layout.querySelector('[data-t=panel]').classList.toggle('on', panelOpen());
      layout.querySelector('[data-t=console]').classList.toggle('on', consOpen());
      refreshEditor();
    }
    layout.querySelector('[data-t=panel]').onclick = togglePanel;
    layout.querySelector('[data-t=console]').onclick = () => setCons(!consOpen());
    setCons(false);

    window.toggleShowGallery = () => toggleTab('images');
    window.showHandbook = () => toggleTab('handbook');
    window.showConsole = () => setCons(!consOpen());
    hotkeys({ b: togglePanel, j: window.showConsole });

    // гра: окреме вікно розміру WIDTH×HEIGHT, не блокує сторінку, тягнеться за заголовок
    const inner = $('gameModal').firstElementChild;
    makeDraggable(inner, inner.firstElementChild);
    onGame(() => {});
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
