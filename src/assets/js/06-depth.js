/* Depth. How far down the page you are is how deep the water is, and the
   light goes with it: bright teal at the surface, nearly black at the bottom.

   This module owns the two questions everything else asks —

       Aquarium.depthAt(screenY)   how deep is this point, 0 to 1
       Aquarium.colorAt(depth)     what colour is the water there

   — and keeps `--depth` on the page in step, so the stylesheet can darken the
   panels along with it. The numbers are the `depth` block of aquarium.yaml. */

(() => {
  'use strict';

  const { clamp, mix, get } = Aquarium;
  const state = Aquarium.state;

  // The page's own height, measured rarely rather than every frame.
  let pageHeight = 0;
  function measure() {
    const doc = document.documentElement;
    pageHeight = Math.max(doc.scrollHeight, doc.offsetHeight, window.innerHeight);
  }
  measure();

  /* Where, on the page, the water is as dark as it is going to get. */
  function floorY() {
    const full = clamp(Number(get('depth.full_at', 0.85)) || 0.85, 0.1, 1);
    return Math.max(window.innerHeight * 0.6, pageHeight * full);
  }

  Aquarium.depthAt = function (screenY) {
    const surface = state.surfacePageY;
    const pageY = window.scrollY + screenY;
    const span = Math.max(1, floorY() - surface);
    const d = clamp((pageY - surface) / span, 0, 1);
    const curve = Number(get('depth.curve', 1.15)) || 1;
    return Math.pow(d, curve);
  };

  /* Three stops: the surface, halfway, and the bottom. */
  Aquarium.colorAt = function (d) {
    const shallow = get('depth.shallow_color', '#0d7fa4');
    const middle  = get('depth.mid_color', '#06495f');
    const deep    = get('depth.deep_color', '#02191f');
    return d < 0.5
      ? mix(shallow, middle, d * 2)
      : mix(middle, deep, (d - 0.5) * 2);
  };

  /* The one number the stylesheet needs. Written only when it has actually
     moved — a style write on every frame of a scroll is a repaint on every
     frame of a scroll. */
  let written = -1;
  function paint() {
    const d = Aquarium.depthAt(window.innerHeight * 0.5);
    state.depth = d;
    const shown = Math.round(d * 100) / 100;
    if (shown !== written) {
      written = shown;
      document.documentElement.style.setProperty('--depth', String(shown));
    }
  }

  window.addEventListener('scroll', paint, { passive: true });
  window.addEventListener('resize', () => { measure(); paint(); });

  // The page gets taller the moment the sections are revealed, so take the
  // measurement again whenever something changes size.
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => { measure(); paint(); });
    ro.observe(document.body);
  }

  Aquarium.remeasure = () => { measure(); paint(); };
  paint();

})();
