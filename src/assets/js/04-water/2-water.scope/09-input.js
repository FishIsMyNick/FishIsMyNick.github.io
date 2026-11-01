  // --------------------------------------------------------------- input --

  /* A click anywhere on the page is a click on the water: it rings, and the
     fish comes over. Clicks on something you can actually press are left
     alone, apart from the bowl, which does its own thing with them. */
  document.addEventListener('click', event => {
    // the bowl answers its own taps; everything else you can press is doing
    // something of its own
    if (event.target.closest('a, button, input, textarea, select, summary, label, .settings')) return;

    state.lastClick = { x: event.clientX, y: event.clientY, at: clock };
    if (state.broken && event.clientY > state.surfaceY) {
      scene.ripple(event.clientX, event.clientY, 1);
    }
  }, true);

  window.addEventListener('pointermove', event => {
    const p = state.pointer;
    p.x = event.clientX;
    p.y = event.clientY;
    p.moved = clock;
    p.inside = true;
  }, { passive: true });

  window.addEventListener('pointerleave', () => { state.pointer.inside = false; });

  window.addEventListener('resize', () => { resize(); remeasureSurface(); });
  window.addEventListener('scroll', remeasureSurface, { passive: true });
