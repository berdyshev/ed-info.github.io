// Макет pgz у стилі IDE (issue #73): спільні помічники для модулів макета.
// Кожен модуль (sidebar.js, console.js, ...) реєструє ініціалізацію через PGZ_IDE.ready(),
// і всі вони запускаються після завантаження сторінки, коли PythonIDE вже готовий.
(function () {
  const inits = [];

  const PGZ_IDE = {
    $: (id) => document.getElementById(id),

    // HTML-рядок → DOM-елемент
    el(html) {
      const t = document.createElement('template');
      t.innerHTML = html.trim();
      return t.content.firstChild;
    },

    // inline SVG з набору PGZ_IDE_ICONS; extra — додаткові фігури під іконкою
    icon(name, extra = '') {
      return `<svg class="ide-icon" viewBox="0 0 24 24" aria-hidden="true">${extra}${PGZ_IDE_ICONS[name]}</svg>`;
    },

    // CodeMirror треба перемалювати після зміни розміру редактора
    refreshEditor() {
      requestAnimationFrame(() => window.PythonIDE && PythonIDE.editor && PythonIDE.editor.refresh());
    },

    // Ctrl+<клавіша>. Беремо e.code, щоб працювало й в українській розкладці.
    hotkey(code, fn) {
      window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === code) {
          e.preventDefault();
          e.stopPropagation();
          fn();
        }
      }, true);
    },

    // Перетягування з pointer capture: інакше iframe посібника перехоплює
    // відпускання миші, і елемент далі рухається за курсором.
    // onStart(e) викликається на початку, onMove(e) — при кожному русі.
    drag(handle, onStart, onMove, onEnd) {
      handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('button')) return;
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        document.body.classList.add('ide-dragging');
        onStart(e);
        const end = () => {
          document.body.classList.remove('ide-dragging');
          handle.removeEventListener('pointermove', onMove);
          handle.removeEventListener('pointerup', end);
          handle.removeEventListener('pointercancel', end);
          if (onEnd) onEnd();
        };
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
      });
    },

    ready(fn) { inits.push(fn); },
  };

  window.PGZ_IDE = PGZ_IDE;
  // клас вмикає стилі макета для наявних елементів сторінки
  document.documentElement.classList.add('ide-layout');
  window.addEventListener('load', () => setTimeout(() => {
    inits.forEach((fn) => fn());
    PGZ_IDE.refreshEditor();
  }, 0));
})();
