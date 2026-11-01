  // ---------------------------------------------------------------- wire --

  if (el) {
    el.addEventListener('click', event => {
      event.preventDefault();
      tap();
    });
  }

  /* The lock. Added here rather than written into the HTML, so that a page
     whose script never ran is simply the portfolio, scrollable as usual. */
  function lock() {
    if (get('glass.lock_page', true) === false) return;
    if (state.deepLinked) return;          // they came for a project page
    body.classList.add('is-locked');
    document.documentElement.classList.add('is-locked');
    // A #work or #contact left in the address from last time would have the
    // browser jump down to it as the page loads, and the lock would then
    // hold it there. Locked, the page belongs at the top.
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    window.scrollTo(0, 0);
  }

  // The browser may still put the scroll back after this script has run —
  // on load, or coming back to the tab from the history. While the page is
  // locked, it goes straight back to the top.
  // And whatever else moves it — a late jump to an anchor, a restored
  // position, a key — is undone the moment it happens: until the glass
  // breaks, the page does not move from the top. (Once it breaks, the water
  // takes the page down, and this stands aside.)
  const toTop = () => {
    if (state.broken || !body.classList.contains('is-locked')) return;
    if (window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' });
  };
  window.addEventListener('load', toTop);
  window.addEventListener('pageshow', toTop);
  window.addEventListener('scroll', toTop, { passive: true });

  // Anyone who tabs to the skip link wants the page, not the puzzle.
  const skip = document.getElementById('skip');
  if (skip) skip.addEventListener('click', event => {
    if (state.broken) return;
    event.preventDefault();
    smash(Aquarium.clock(), { group: 'work' });
  });

  /* The panel clicked grows a little and the other two fade back at once,
     before anything else happens (hero.picked_* in aquarium.yaml). */
  function pick(link) {
    if (!showcase) return;
    const item = link.closest('.showcase-item');
    showcase.style.setProperty('--picked-scale', String(get('hero.picked_scale', 1.06)));
    showcase.style.setProperty('--picked-fade', String(get('hero.picked_fade', 0.45)));
    showcase.style.setProperty('--picked-time', `${Number(get('hero.picked_time', 0.35))}s`);
    showcase.classList.add('is-picked');
    if (item) item.classList.add('is-chosen');
  }
  function unpick() {
    if (!showcase) return;
    showcase.classList.remove('is-picked');
    showcase.querySelectorAll('.is-chosen').forEach(item => item.classList.remove('is-chosen'));
  }

  // A thumbnail on the opening screen breaks the glass too, and then takes
  // the page down to its part of My work. Nothing is opened: it stops there.
  document.querySelectorAll('.showcase-link').forEach(link => {
    link.addEventListener('click', event => {
      if (state.broken) return;
      event.preventDefault();
      pick(link);
      smash(Aquarium.clock(), { group: link.dataset.group });
    });
  });

  Aquarium.break_ = target => { if (!state.broken) smash(Aquarium.clock(), target); };
  Aquarium.breakGlass = Aquarium.break_;
  Aquarium.reset = () => {
    state.broken = false;
    state.taps = 0;
    state.pour = 0;
    revealed = false;
    cracks = [];
    shards = [];
    gravel = null;
    plants = null;
    body.classList.remove('is-free');
    body.classList.remove('is-breaking');
    body.classList.remove('is-settled');
    body.classList.remove('is-titled');
    body.classList.remove('is-escorting');
    body.classList.remove('is-apex');
    if (showcase) showcase.inert = false;
    unpick();
    heading = null;
    state.heading = false;
    untrim();
    unfold();
    if (el) { el.disabled = false; el.setAttribute('aria-label', 'Tap to break the glass'); }
    if (Aquarium.fish) Aquarium.fish.reset();
    if (Aquarium.dropSurface) Aquarium.dropSurface();
    lock();
  };

  // a project page is laid over the water, and the bowl stays behind it
  const covered = () => body.classList.contains('detail-open');
  scene.add(20, (ctx, env) => { measure(env); pour(env); if (!covered()) drawInside(ctx, env); });
  scene.add(75, (ctx, env) => { if (!covered()) drawGlass(ctx, env); });

  lock();
  // The lock (or not) is in place, so the boot cover from the <head> can go.
  document.documentElement.classList.remove('is-booting');
