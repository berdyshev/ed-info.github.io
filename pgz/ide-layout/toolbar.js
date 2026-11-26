// Верхня панель: логотип, однотонні іконки, назва проєкту по центру,
// кнопки розкладки праворуч. Рядок підказок замінено спливаючими повідомленнями.
PGZ_IDE.ready(function () {
  const { $, el, icon } = PGZ_IDE;
  const toolbar = $('toolPanel');

  // логотип зліва від «Виконати»: верхня частина media/splash.png
  toolbar.prepend(el('<div id="ideLogo" title="PGZ Studio"></div>'));

  // Однотонні іконки: кнопки верхньої панелі — <img>, тож підставляємо SVG у src.
  const svgUrl = (name, color = '#d4d4d4') => 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75" ` +
    `stroke-linecap="round" stroke-linejoin="round">${PGZ_IDE_ICONS[name]}</svg>`);
  const ICONS = {
    'stop.png': svgUrl('stop', '#f44336'), 'new-project.png': svgUrl('newProject'), 'pgz-open.png': svgUrl('open'),
    'pgz-save.png': svgUrl('save'), 'restore-code.png': svgUrl('restore'), 'share.png': svgUrl('share'),
    'settings.png': svgUrl('settings'),
  };
  toolbar.querySelectorAll('img').forEach((img) => {
    const icon = ICONS[img.getAttribute('src').split('/').pop()];
    if (icon) img.src = icon;
  });

  // «Виконати» перемикається між «усе» і «по кроку» (data-mode, налаштування проєкту),
  // і pgz при цьому ставить свою PNG — замінюємо її відповідною SVG.
  const run = $('btn_run');
  const RUN_ICONS = { normal: svgUrl('run', '#4caf50'), step: svgUrl('step', '#4caf50') };
  const syncRun = () => {
    const icon = RUN_ICONS[run.dataset.mode] || RUN_ICONS.normal;
    if (run.src !== icon) run.src = icon;
  };
  new MutationObserver(syncRun).observe(run, { attributes: true, attributeFilter: ['src', 'data-mode'] });
  syncRun();

  // кнопки розкладки, як у правому верхньому куті VS Code:
  // рамка є завжди, видима частина вікна зафарбована
  const FILL = {
    panelBottom: '<path class="ide-fill" d="M3 15h18v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    panelRight: '<path class="ide-fill" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4z"/>',
  };
  const layoutButton = (name, title, part) => {
    const b = el(`<button title="${title}">${icon(name, FILL[name])}</button>`);
    b.onclick = part.toggle;
    const sync = (open) => b.classList.toggle('on', open);
    part.onChange(sync);
    sync(part.isOpen());
    return b;
  };
  const layout = el('<div id="ideLayoutButtons"></div>');
  layout.append(
    layoutButton('panelBottom', 'Показати/сховати консоль (Ctrl+J)', PGZ_IDE.console),
    layoutButton('panelRight', 'Показати/сховати бокову панель (Ctrl+B)', PGZ_IDE.sidebar),
  );
  $('projectNameInput').after(layout);

  // Рядок підказок посеред панелі прибрано: підказки при наведенні дублюють title,
  // а стан запуску видно з кнопки «Виконати/Зупинити». Решту повідомлень
  // (помилки в назві файлу, «немає збережених копій» тощо) показуємо сповіщенням.
  const hoverHints = new Set([...toolbar.querySelectorAll('img')].map((i) => i.alt).filter(Boolean));
  const runStatus = /виконується|завершила виконання|is running|completed execution/i;
  const toast = el('<div id="ideToast" role="status"></div>');
  document.body.append(toast);
  let timer;
  PythonIDE.showHint = function (msg) {
    const text = String(msg || '').replace(/<[^>]*>/g, '').trim();
    if (!text || hoverHints.has(text) || runStatus.test(text)) return;
    toast.innerHTML = msg;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('show'), 5000);
  };
});
