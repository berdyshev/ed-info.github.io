// Бокова панель праворуч, як у VS Code: смуга активностей (Зображення, Аудіо, Музика,
// Посібник) і панель обраної вкладки. Панель згортається, ширина змінюється мишею.
PGZ_IDE.ready(function () {
  const { $, el, icon, drag, refreshEditor } = PGZ_IDE;
  const panel = $('rightBar');
  const gallery = $('resourceGallery');
  const handbook = $('handbook');

  const TABS = {
    images: {
      title: 'Зображення', frame: 'imagesFrame', actions: [
        ['add', 'Додати', 'Додати файл з комп\'ютера', () => addFile('image')],
        ['importOnline', 'Імпорт', 'Імпорт з онлайн-галереї', () => openImportModal()],
        ['draw', 'Намалювати', 'Редактор зображень', () => showEditor()],
      ],
    },
    audio: { title: 'Аудіо', frame: 'soundsFrame', actions: [['add', 'Додати', 'Додати аудіофайл', () => addFile('audio')]] },
    music: { title: 'Музика', frame: 'musicFrame', actions: [['add', 'Додати', 'Додати музику', () => addFile('music')]] },
    handbook: { title: 'Посібник', actions: [] },
  };
  const ASSET_FRAMES = ['imagesFrame', 'soundsFrame', 'musicFrame'];

  // ці кнопки верхньої панелі переїжджають на бокову
  document.querySelectorAll(['toggleShowGallery', 'openImportModal', 'showEditor', 'showHandbook']
    .map((fn) => `#toolPanel [onclick*="${fn}"]`).join(',')).forEach((b) => b.remove());

  const head = el(`<div id="idePanelHead">
    <span id="idePanelTitle"></span>
    <button class="ide-iconbtn" title="Сховати панель">${icon('close')}</button>
    <div id="idePanelActions"></div></div>`);
  const resizer = el('<div id="idePanelResizer"></div>');
  panel.prepend(resizer, head);

  const bar = el(`<nav id="ideActivityBar">${Object.entries(TABS).map(([id, t]) =>
    `<button data-tab="${id}" title="${t.title}">${icon(id)}<span>${t.title}</span></button>`).join('')}</nav>`);
  $('mainLayout').append(bar);

  let tab = 'images';
  const listeners = [];
  const isOpen = () => !panel.classList.contains('ide-closed');

  function changed() {
    bar.querySelectorAll('button').forEach((b) => b.classList.toggle('active', isOpen() && b.dataset.tab === tab));
    listeners.forEach((fn) => fn(isOpen()));
    refreshEditor();
  }

  function open(id) {
    tab = id;
    const t = TABS[id];
    panel.classList.remove('ide-closed');
    $('idePanelTitle').textContent = t.title;
    const actions = $('idePanelActions');
    actions.replaceChildren(...t.actions.map(([ic, label, title, fn]) => {
      const b = el(`<button class="ide-action" title="${title}">${icon(ic)}${label}</button>`);
      b.onclick = fn;
      return b;
    }));
    handbook.style.display = id === 'handbook' ? 'block' : 'none';
    gallery.style.display = id === 'handbook' ? 'none' : 'block';
    if (t.frame) {
      ASSET_FRAMES.forEach((f) => ($(f).style.display = f === t.frame ? '' : 'none'));
      initializeAssetsGallery();
    }
    changed();
  }

  function close() {
    panel.classList.add('ide-closed');
    changed();
  }

  const toggle = () => (isOpen() ? close() : open(tab));
  const toggleTab = (id) => (isOpen() && tab === id ? close() : open(id));

  bar.querySelectorAll('button').forEach((b) => (b.onclick = () => toggleTab(b.dataset.tab)));
  head.querySelector('button').onclick = close;

  let startX, startW;
  drag(resizer, (e) => {
    startX = e.clientX;
    startW = panel.getBoundingClientRect().width;
  }, (e) => {
    const w = Math.min(Math.max(startW + startX - e.clientX, 260), innerWidth * 0.7);
    document.documentElement.style.setProperty('--ide-panel-width', w + 'px');
  }, refreshEditor);

  // старі функції сторінки тепер керують панеллю
  window.toggleShowGallery = () => toggleTab('images');
  window.showHandbook = () => toggleTab('handbook');
  window.showGallery = () => open(TABS[tab].frame ? tab : 'images'); // викликається після імпорту
  PGZ_IDE.hotkey('KeyB', toggle);

  PGZ_IDE.sidebar = { isOpen, toggle, onChange: (fn) => listeners.push(fn) };
  close();
});
