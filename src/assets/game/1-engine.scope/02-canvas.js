  // ------------------------------------------------------------- canvas --

  const view = { w: 0, h: 0, dpr: 1 };

  /* Rock is by far the dearest thing to paint, and it doesn't move: each
     piece of it is painted once onto a canvas of its own, then just stamped
     down every frame. These go when the screen changes size. */
  const baked = new Map();
  const shapes = new Map();

  /* A canvas to paint something big on, once. An ordinary one queues its
     drawing for the graphics card, where thousands of clipped shapes hold up
     every frame on the screen for a second or more, long after the script has
     moved on. This one is painted by the processor, there and then, and only
     goes to the card as a finished picture. */
  function softCanvas() {
    const c = document.createElement('canvas');
    c.getContext('2d', { willReadFrequently: true });
    return c;
  }

  // the painting is put off until it's needed: have it done now
  const paintNow = c => { c.getContext('2d').getImageData(0, 0, 1, 1); };

  function bake(key, cw, ch, paint, scale) {
    let c = baked.get(key);
    if (!c) {
      c = paintOn(cw, ch, paint, softCanvas(), scale);
      paintNow(c);
      baked.set(key, c);
      if (baked.size > 64) baked.delete(baked.keys().next().value);
    }
    return c;
  }

  function shapeOf(key, make) {
    if (!shapes.has(key)) shapes.set(key, make());
    return shapes.get(key);
  }

  /* A place's rock: the screen and the stretch past each edge it runs on. */
  const OVERLAP = 90;

  function stampRock(key, paint) {
    const { w, h } = view;
    stampBaked(bakeRock(key, paint));
  }

  function stampBaked(rock) {
    ctx.drawImage(rock, -OVERLAP, -OVERLAP, view.w + OVERLAP * 2, view.h + OVERLAP * 2);
  }

  /* Painting a piece of rock takes long enough to show, so what's coming is
     painted ahead, a piece at a time, whenever the browser has a moment.
     Only what's coming next, see paintNear. */
  const ahead = [];
  let aheadBusy = false;

  function paintAhead(...jobs) {
    ahead.push(...jobs);
    if (aheadBusy) return;
    aheadBusy = true;
    const idle = window.requestIdleCallback
      ? fn => requestIdleCallback(fn, { timeout: 500 })
      : fn => setTimeout(fn, 120);
    const next = () => {
      const job = ahead.shift();
      if (!job || !running) { ahead.length = 0; aheadBusy = false; return; }
      job();
      idle(next);
    };
    idle(next);
  }

  /* As much of it as fits in `ms`, all at once: for when nobody can see. */
  function paintAheadNow(ms) {
    const until = performance.now() + ms;
    while (ahead.length && performance.now() < until) ahead.shift()();
  }

  function bakeRock(key, paint) {
    const { w, h } = view;
    return bake(key, w + OVERLAP * 2, h + OVERLAP * 2, () => {
      ctx.translate(OVERLAP, OVERLAP);
      paint();
    });
  }

  function resize() {
    view.w = layer.clientWidth || window.innerWidth;
    view.h = layer.clientHeight || window.innerHeight;
    // sharp, up to a point: every pixel of it is painted every frame
    view.dpr = Math.min(window.devicePixelRatio || 1, 2,
                        Math.sqrt(num('max_pixels', 3700000) / (view.w * view.h)));
    const size = `${view.w}x${view.h}@${view.dpr}`;
    if (resize.size !== size) {
      resize.size = size;
      baked.clear();
      shapes.clear();
      near.clear();
    }
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    layer.style.setProperty('--gap', gapH() + 'px');
    // on the root: the corner buttons, outside the layer, sit in the rock too
    document.documentElement.style.setProperty('--rock', border() + 'px');
    document.documentElement.style.setProperty('--rock-top', borderTop() + 'px');
    fitPages();
    if (fish.x > view.w || fish.y > view.h) {
      fish.x = clamp(fish.x, 0, view.w);
      fish.y = clamp(fish.y, 0, view.h);
    }
  }
