// Консоль знизу, як у VS Code. Схована за замовчуванням; відкривається сама,
// коли програма вперше за запуск щось надрукувала, і при кожній помилці.
PGZ_IDE.ready(function () {
  const { $, el, icon, drag, refreshEditor } = PGZ_IDE;
  const cons = $('consoleContainer');
  const output = $('output');
  const SERVICE = '#watch, #headerOut, #btn_showREPL'; // службові елементи всередині #output

  // замінено кнопкою розкладки на верхній панелі
  document.querySelector('#toolPanel [onclick*="showConsole"]').remove();

  const head = el(`<div id="ideConsoleHead">
    <span class="ide-console-tab">Консоль</span>
    <button class="ide-iconbtn" data-a="clear" title="Очистити">${icon('clear')}</button>
    <button class="ide-iconbtn" data-a="close" title="Сховати консоль">${icon('close')}</button></div>`);
  cons.before(head);

  const listeners = [];
  const isOpen = () => cons.style.display !== 'none';
  function show(open) {
    head.style.display = cons.style.display = open ? '' : 'none';
    listeners.forEach((fn) => fn(open));
    refreshEditor();
  }
  const toggle = () => show(!isOpen());

  head.querySelector('[data-a=close]').onclick = () => show(false);
  head.querySelector('[data-a=clear]').onclick = () =>
    [...output.childNodes].forEach((n) => !(n.matches && (n.matches(SERVICE) || n.querySelector(SERVICE))) && n.remove());

  let startY, startH;
  drag(head, (e) => {
    startY = e.clientY;
    startH = parseFloat(getComputedStyle(cons).height);
  }, (e) => {
    const h = Math.min(Math.max(startH + startY - e.clientY, 60), innerHeight * 0.7);
    document.documentElement.style.setProperty('--ide-console-height', h + 'px');
  }, refreshEditor);

  // print() дописує текст прямо в #output. Відкриваємо консоль один раз за запуск,
  // щоб учень міг її закрити, навіть якщо програма друкує щокадру.
  let openedThisRun = false;
  const runCode = PythonIDE.runCode;
  PythonIDE.runCode = function () {
    openedThisRun = false;
    return runCode.apply(this, arguments);
  };
  new MutationObserver(() => {
    if (openedThisRun) return;
    const copy = output.cloneNode(true);
    copy.querySelectorAll(SERVICE).forEach((n) => n.remove());
    if (copy.textContent.trim()) {
      openedThisRun = true;
      show(true);
    }
  }).observe(output, { childList: true, subtree: true, characterData: true });

  // текст помилки сайт сам пише в консоль, нам лише треба її показати
  const handleError = PythonIDE.handleError;
  PythonIDE.handleError = function () {
    const result = handleError.apply(this, arguments);
    show(true);
    return result;
  };

  window.showConsole = toggle;
  PGZ_IDE.hotkey('KeyJ', toggle);

  PGZ_IDE.console = { isOpen, toggle, onChange: (fn) => listeners.push(fn) };
  show(false);
});
