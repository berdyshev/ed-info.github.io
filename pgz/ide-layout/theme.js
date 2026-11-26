// Редактор зображень — окрема сторінка (draw-editor.html) в iframe з того ж сайту,
// тож під час її завантаження додаємо в неї темні стилі.
PGZ_IDE.ready(function () {
  const CSS = `
    html, body { background: #1e1e1e !important; }
    body { color: #ccc; font-family: system-ui, "Segoe UI", sans-serif; }
    .cd-top-toolbar, .side-toolbar, .cd-bottom-toolbar { background: #252526 !important; border-color: #3c3c3c !important; }
    .cd-top-toolbar { border-bottom: 1px solid #3c3c3c; }
    .side-toolbar { border-right: 1px solid #3c3c3c; }
    .cd-bottom-toolbar { border-top: 1px solid #3c3c3c; }
    .top-icon-btn:hover, .cd-toolbar-button:hover { background: #ffffff1a !important; }
    .cd-toolbar-button.active { background: #094771 !important; box-shadow: inset 0 0 0 1px #007acc; }
    .canvas-center-wrapper { background-color: #1e1e1e !important; }
    .modal-content { background: #252526 !important; color: #ccc; border: 1px solid #3c3c3c; }
    .btn { border: 0; border-radius: 4px; padding: 6px 14px; cursor: pointer; }
    .btn-ok { background: #0e639c !important; } .btn-ok:hover { background: #1177bb !important; }
    .btn-cancel { background: #3a3d41 !important; } .btn-cancel:hover { background: #45494e !important; }
    input, select { background: #3c3c3c; color: #eee; border: 1px solid #555; border-radius: 4px; }
    .top-icon-btn img, .cd-toolbar-button img { filter: grayscale(1) brightness(1.35); }
    .cd-toolbar-button.active img { filter: grayscale(1) brightness(2); }`;

  // showEditor() щоразу додає в body нове модальне вікно з iframe
  new MutationObserver((mutations) => mutations.forEach((m) => m.addedNodes.forEach((node) => {
    const frame = node.querySelector && node.querySelector('#drawEditorFrame');
    if (!frame) return;
    frame.addEventListener('load', () => {
      const doc = frame.contentDocument;
      if (doc) doc.head.append(Object.assign(doc.createElement('style'), { textContent: CSS }));
    });
  }))).observe(document.body, { childList: true });
});
