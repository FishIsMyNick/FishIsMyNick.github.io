/* The little fish he swims among.

   They are drawn rather than sprited: a body, a tail, and a wave through both,
   which at this size reads as a fish and costs almost nothing. Their colour is
   mixed into the water around them — `blend` in aquarium.yaml, at 1 they
   disappear entirely — so that the one orange fish is the only thing on the
   page that holds the eye.

   They keep loose company with each other, drift up or down with the scroll
   according to how far away they are, and scatter when he comes past. */

(() => {
  'use strict';

  const { get, range, clamp, lerp, rand, pick, motion, mix, css, colorAt, depthAt } = Aquarium;
  const state = Aquarium.state;
  const scene = Aquarium.scene;
  if (!scene) return;

  let shoal = [];
  let lastScroll = window.scrollY;

  function view() { return scene.view; }

  function spawn(fresh) {
    const [small, big] = range('shoal.size', 9, 26);
    const [slow, quick] = range('shoal.speed', 14, 46);
    const v = view();
    const z = Math.random();                       // 0 near, 1 far
    return {
      x: fresh ? rand(-60, v.w + 60) : (Math.random() < 0.5 ? -60 : v.w + 60),
      y: rand(Math.max(0, state.surfaceY) + 30, v.h + 120),
      z,
      len: lerp(big, small, z),
      speed: lerp(quick, slow, z) * rand(0.8, 1.2),
      dir: Math.random() < 0.5 ? -1 : 1,
      drift: rand(-0.25, 0.25),
      phase: rand(0, Math.PI * 2),
      beat: rand(2.4, 4.2),
      turn: 0
    };
  }

  function restock() {
    const want = Math.max(0, Math.round(Number(get('shoal.count', 34))));
    while (shoal.length > want) shoal.pop();
    while (shoal.length < want) shoal.push(spawn(true));
  }

  function draw(ctx, env) {
    if (!state.broken && state.pour <= 0) return;
    restock();

    const { t, dt, w, h } = env;
    const blend = clamp(Number(get('shoal.blend', 0.78)), 0, 1);
    const alpha = Number(get('shoal.opacity', 0.5));
    const own = get('shoal.color', '#9fe3ef');
    const spread = Number(get('shoal.depth_spread', 0.9));
    const schooling = Number(get('shoal.schooling', 0.45));
    const shy = Number(get('shoal.shy', 90));
    const wiggle = Number(get('shoal.wiggle', 1.1));
    const surf = state.surfaceY;

    // the scroll carries them, the far ones less than the near ones
    const scrolled = window.scrollY - lastScroll;
    lastScroll = window.scrollY;

    // the shoal's own centre, for the ones that want company
    let cx = 0, cy = 0;
    for (const f of shoal) { cx += f.x; cy += f.y; }
    cx /= (shoal.length || 1);
    cy /= (shoal.length || 1);

    const koi = state.fish;

    ctx.save();
    for (const f of shoal) {
      f.y -= scrolled * lerp(1, 0.35, f.z * spread);

      // wander
      f.turn += rand(-1, 1) * dt * 0.8;
      f.turn = clamp(f.turn, -0.5, 0.5);
      f.y += (f.drift + f.turn * 0.4) * f.speed * dt * motion();
      if (schooling > 0) {
        f.x += (cx - f.x) * schooling * 0.04 * dt;
        f.y += (cy - f.y) * schooling * 0.12 * dt;
      }

      // give him room
      if (koi && koi.x !== undefined) {
        const dx = f.x - koi.x, dy = f.y - koi.y;
        const dist = Math.hypot(dx, dy);
        if (dist < shy && dist > 0.01) {
          const push = (1 - dist / shy) * 180 * dt;
          f.x += (dx / dist) * push;
          f.y += (dy / dist) * push;
          f.dir = dx >= 0 ? 1 : -1;
        }
      }

      f.x += f.speed * f.dir * dt * motion();

      // the water is the whole screen; they wrap round it
      if (f.x < -120) { f.x = w + 110; f.y = rand(Math.max(0, surf) + 40, h); }
      if (f.x > w + 120) { f.x = -110; f.y = rand(Math.max(0, surf) + 40, h); }
      const floor = h + 140;
      const ceiling = Math.max(0, surf) + 24;
      if (f.y > floor) f.y = ceiling + 20;
      if (f.y < ceiling) f.y = Math.min(floor - 20, ceiling + rand(10, 120));

      if (f.y < surf + 6) continue;        // not above the waterline

      // their colour is mostly the water they are in
      const water = colorAt(depthAt(f.y));
      const body = mix(own, water, blend);
      const fade = alpha * lerp(1, 0.35, f.z * spread);

      const beat = Math.sin(t * f.beat + f.phase) * wiggle;
      const len = f.len;
      const tall = len * 0.42;

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(f.dir, 1);
      ctx.rotate(beat * 0.06);
      ctx.globalAlpha = clamp(fade, 0, 1);
      ctx.fillStyle = css(body);

      // body and tail, drawn twice: once in the colour of the water they are
      // in, and once as a breath of their own colour added on top, so that
      // they stay just visible when the water goes dark
      for (let pass = 0; pass < 2; pass++) {
        if (pass === 1) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = clamp(fade, 0, 1) * 0.3 * (1 - blend * 0.5);
          ctx.fillStyle = css(Aquarium.rgb(own));
        }
        ctx.beginPath();
        ctx.ellipse(0, 0, len * 0.5, tall * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-len * 0.42, 0);
        ctx.lineTo(-len * 0.72, -tall * (0.5 + beat * 0.1));
        ctx.lineTo(-len * 0.72, tall * (0.5 - beat * 0.1));
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  window.addEventListener('resize', () => { shoal = []; });

  scene.add(30, draw);

})();
