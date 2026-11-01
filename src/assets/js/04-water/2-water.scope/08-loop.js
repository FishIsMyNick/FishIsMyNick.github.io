  // ---------------------------------------------------------------- loop --

  let clock = 0;
  let last = 0;
  const env = { t: 0, dt: 0, w: 0, h: 0 };

  /* If the machine can't keep up, the two most expensive things on the canvas
     — the sunbeams and the light bands — are quietly turned down, once, and
     stay down for the session. Nothing moves differently; there is just less
     light in the water. Set water.auto_quality to false to leave it alone. */
  let slowFor = 0;
  state.lean = 0;

  function watchTheFrameRate(dt) {
    if (state.lean >= 2 || get('water.auto_quality', true) === false) return;
    slowFor = dt > 1 / 30 ? slowFor + dt : Math.max(0, slowFor - dt * 2);
    if (slowFor > 2.5) {
      state.lean += 1;
      slowFor = 0;
      if (state.lean === 1) console.info(
        'The water is being drawn with less light, to keep the page smooth. ' +
        'Aquarium.config.water.auto_quality = false stops that.');
    }
  }

  // how much of a thing to draw, after any step-down
  const quality = () => state.lean === 0 ? 1 : (state.lean === 1 ? 0.5 : 0);

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    clock += dt;

    // Game Mode covers all of this with its own water: nothing to draw
    if (document.body.classList.contains('game-open')) {
      requestAnimationFrame(frame);
      return;
    }

    watchTheFrameRate(dt);

    env.t = clock;
    env.dt = dt;
    env.w = view.w;
    env.h = view.h;

    // where the waterline is on screen right now
    climb();
    state.surfacePageY = resting;
    state.surfaceY = state.broken && (rise || risen)
      ? resting - window.scrollY
      : view.h + 80;

    ctx.clearRect(0, 0, view.w, view.h);
    for (const layer of layers) layer.draw(ctx, env);

    requestAnimationFrame(frame);
  }
