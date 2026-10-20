/* Detail pages: open, close, focus, and the URL for each one. */

(() => {
  'use strict';

  const main       = document.getElementById('main');
  const layer      = document.getElementById('detail-layer');
  const scroller   = document.getElementById('detail-scroll');
  const closeBtn   = document.getElementById('detail-close');
  const details    = Array.from(document.querySelectorAll('.detail'));
  const byProject  = new Map(details.map(d => [d.dataset.project, d]));
  let   lastOpener = null;

  function openDetail(id) {
    const panel = byProject.get(id);
    if (!panel) return false;

    details.forEach(d => { d.hidden = (d !== panel); });
    // the page takes the colour of the shelf the project sits on
    layer.classList.toggle('is-hobby', panel.classList.contains('detail--hobby'));
    layer.hidden = false;
    document.body.classList.add('detail-open');
    main.inert = true;
    main.setAttribute('aria-hidden', 'true');
    if (scroller) scroller.scrollTop = 0;

    const title = panel.querySelector('.detail-title');
    if (title) title.focus({ preventScroll: true });
    return true;
  }

  function closeDetail() {
    if (layer.hidden) return;
    layer.hidden = true;
    details.forEach(d => { d.hidden = true; });
    document.body.classList.remove('detail-open');
    main.inert = false;
    main.removeAttribute('aria-hidden');

    if (lastOpener) {
      lastOpener.focus({ preventScroll: true });
      lastOpener = null;
    }
  }

  function idFromHash() {
    return location.hash ? location.hash.slice(1) : '';
  }

  function syncToHistory() {
    const id = (history.state && history.state.detail) || idFromHash();
    if (byProject.has(id)) openDetail(id);
    else closeDetail();
  }

  document.querySelectorAll('.entry-link').forEach(link => {
    link.addEventListener('click', event => {
      const id = link.dataset.project;
      if (!byProject.has(id) || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      lastOpener = link;
      history.pushState({ detail: id }, '', '#' + id);
      openDetail(id);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', () => history.back());

  window.addEventListener('popstate', syncToHistory);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !layer.hidden) history.back();
  });

  // Deep link: someone opened the page on #infernal-dante. The glass is
  // already broken in that case — they asked for a project, not a puzzle.
  if (byProject.has(idFromHash())) {
    Aquarium.state.deepLinked = true;
    openDetail(idFromHash());
  }

})();
