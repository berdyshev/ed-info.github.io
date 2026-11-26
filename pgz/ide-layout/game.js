// Гра у плаваючому вікні: не блокує сторінку, перетягується за заголовок.
// Редактор лишається доступним, тож клавіші, набрані в ньому, не мають іти в гру.
PGZ_IDE.ready(function () {
  const { $, drag } = PGZ_IDE;
  const modal = $('gameModal');
  const win = modal.firstElementChild;
  const header = win.firstElementChild;
  const inEditor = () => document.activeElement && document.activeElement.closest('.CodeMirror');

  // Перетягування. Заголовок не можна витягнути за межі вікна браузера:
  // на ньому кнопка закриття гри.
  const KEEP_VISIBLE = 80; // px заголовка, що завжди лишаються на екрані
  let dx, dy;
  drag(header, (e) => {
    const r = win.getBoundingClientRect();
    dx = e.clientX - r.left;
    dy = e.clientY - r.top;
    win.style.position = 'absolute';
  }, (e) => {
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
    win.style.left = clamp(e.clientX - dx, KEEP_VISIBLE - win.offsetWidth, innerWidth - KEEP_VISIBLE) + 'px';
    win.style.top = clamp(e.clientY - dy, 0, innerHeight - header.offsetHeight) + 'px';
  });

  // У pgz під час гри всі натискання з window йдуть у гру (PythonIDE.keyHandlers).
  // Поки фокус у редакторі, тимчасово відключаємо обробники гри.
  const keepKeysInEditor = () => {
    if (!PythonIDE.running || !inEditor()) return;
    const handlers = PythonIDE.keyHandlers;
    PythonIDE.keyHandlers = [];
    setTimeout(() => { if (!PythonIDE.keyHandlers.length) PythonIDE.keyHandlers = handlers; });
  };
  window.addEventListener('keydown', keepKeysInEditor, true);
  window.addEventListener('keyup', keepKeysInEditor, true);

  // Запуск з клавіатури (F5) лишає фокус у редакторі, і гра не отримала б клавіш.
  // Тому під час показу гри знімаємо фокус з редактора; клік у редактор повертає його.
  let shown = false;
  new MutationObserver(() => {
    const now = modal.style.display !== 'none' && modal.style.display !== '';
    if (now && !shown && inEditor()) document.activeElement.blur();
    shown = now;
  }).observe(modal, { attributes: true, attributeFilter: ['style'] });
});
