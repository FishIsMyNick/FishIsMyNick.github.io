/* The water, and the loop everything else draws inside.

   One canvas, fixed to the viewport, is the whole scene: the water, the inside
   of the bowl, the shoal, the fish, the glass. They are kept apart as layers
   with an order, so each module can add its own and not care about the others:

       Aquarium.scene.add(50, (ctx, env) => { ... });

   Low numbers are far away. 10 is the water, 20 the inside of the bowl, 30 the
   shoal, 50 the fish, 75 the glass over the top of him, 90 the surface itself.

   The canvas is fixed, so the water does not scroll with the page: scrolling
   takes you down through it instead, which is the whole idea. The waterline is
   remembered as a point on the page, and where that lands on the screen is
   what the first layer draws from. */

(() => {
  'use strict';

  const { get, clamp, lerp, rand, mix, motion, colorAt, depthAt, css } = Aquarium;
  const state = Aquarium.state;

  const host = document.getElementById('aquarium');
  const canvas = document.getElementById('aquarium-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ------------------------------------------------------------- canvas --

  const view = { w: 0, h: 0, dpr: 1 };

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    scatter();
  }

  // -------------------------------------------------------------- layers --

  const layers = [];
  const scene = {
    view,
    add(order, draw) {
      layers.push({ order, draw });
      layers.sort((a, b) => a.order - b.order);
    },
    ripple(x, y, strength = 1) {
      ripples.push({ x, y, born: clock, strength, seed: rand(0, Math.PI * 2) });
      if (ripples.length > 24) ripples.shift();
    },

    /* Something went through the line. Two things come of it: a wave that
       travels out along the surface in both directions, and a crown of
       droplets thrown up off the point it went through.

       `strength` is roughly how hard — 1 is the fish landing, 2 is the fish
       landing from a height. `dir` is +1 going down into the water, -1 coming
       up out of it, which only changes how the droplets are thrown. */
    splash(x, strength = 1, dir = 1) {
      const s = clamp(strength, 0.1, 2.5);
      splashes.push({ x, born: clock, strength: s, seed: rand(0, Math.PI * 2) });
      if (splashes.length > 8) splashes.shift();

      const n = Math.round(Number(get('water.splash_drops', 16)) * s);
      const up = Number(get('water.splash_throw', 420));
      for (let i = 0; i < n; i++) {
        // across the crown, and hardest up the middle of it
        const across = rand(-1, 1);
        drops.push({
          x: x + across * 30 * s,
          y: state.surfaceY + rand(-4, 6),
          vx: across * rand(50, 240) * s,
          vy: -up * s * rand(0.35, 1) * (1 - Math.abs(across) * 0.45)
              * (dir < 0 ? 1.15 : 1),
          r: rand(1.1, 3.4) * (0.8 + s * 0.3),
          born: clock,
          life: rand(0.45, 1.15) * (0.7 + s * 0.3)
        });
      }
      if (drops.length > 260) drops.splice(0, drops.length - 260);
    }
  };
  Aquarium.scene = scene;

  // ------------------------------------------------------- the waterline --

  /* The waterline. Once he has finished turning over at the top of his leap,
     it comes up from below the screen and climbs, without stopping, to
     `surface_end` — he lands in it somewhere on the way up. It is kept in page coordinates, which do not
     change when the page scrolls: scrolling takes you down past it, it does
     not follow you. */
  function restingSurface() {
    const start = Number(get('water.surface_start', 0.5));
    return window.scrollY + view.h * start;
  }

  let resting = 0;
  let rise = null;
  let risen = false;       // it has finished climbing and stays where it is

  function remeasureSurface() {
    if (!state.broken && !rise) resting = restingSurface();
  }

  /* Called once, when he starts to fall. A second call is ignored, so the
     climb is never restarted halfway up.

     Where it comes to rest is the top of the pond (#waterline), the band
     under the opening screen. The page goes down with it while it climbs, so
     that on screen it does what it always did — comes up from below and
     stops `surface_end` from the top — and by the time it stops the pond is
     in view and he has fallen past the quote. Without a #waterline it simply
     stops `surface_end` from the top of the screen, and the page stays put. */
  Aquarium.raiseSurface = () => {
    if (rise || risen) return;
    const end = Number(get('water.surface_end', 0.17));
    const scrollFrom = window.scrollY;
    const mark = document.getElementById('waterline');
    const to = mark
      ? mark.getBoundingClientRect().top + scrollFrom
      : scrollFrom + view.h * end;
    rise = {
      from: scrollFrom + view.h + 40,
      to,
      at: clock,
      time: Math.max(0.2, Number(get('water.rise_time', 3.4))),
      scrollFrom,
      scrollTo: mark ? Math.max(0, to - view.h * end) : scrollFrom
    };
    resting = rise.from;
    // the page is being moved for him, so he isn't to be carried with it
    state.autoScroll = rise.scrollTo !== scrollFrom;
    // After a hero click the page doesn't stop where the water does: the
    // bowl module takes the scroll from here and carries it on down to the
    // group, and the water only climbs.
    if (state.heading && Aquarium.leadRise && Aquarium.leadRise({ ...rise })) rise.led = true;
  };

  Aquarium.dropSurface = () => {
    rise = null; risen = false; state.autoScroll = false; remeasureSurface();
  };

  /* The page above the line has been cut away by `by` pixels: the line is
     that much nearer the top of the page now, though not on the screen.
     If it is still climbing (the dive given up partway, by a scroll), the
     climb moves with it. */
  Aquarium.shiftSurface = by => {
    resting -= by;
    if (rise) { rise.from -= by; rise.to -= by; rise.scrollFrom -= by; rise.scrollTo -= by; }
  };

  /* Whether the line is still on its way up. He dives until it isn't. */
  Aquarium.surfaceRising = () => !!rise;

  /* And how long it has left to go, in seconds; 0 once it is up. */
  Aquarium.surfaceLeft = () => rise ? Math.max(0, rise.at + rise.time - clock) : 0;

  /* One steady climb, slowing down only over the last `rise_ease` of it, so
     it never looks as if it has stopped partway. Starts at 0, ends at 1. */
  function steady(p) {
    const k = clamp(Number(get('water.rise_ease', 0.15)), 0.01, 1);
    const v = 1 / (1 - k / 2);
    if (p < 1 - k) return p * v;
    const q = p - (1 - k);
    return ((1 - k) + q - (q * q) / (2 * k)) * v;
  }

  function climb() {
    if (!rise) return;
    const p = clamp((clock - rise.at) / rise.time, 0, 1);
    resting = lerp(rise.from, rise.to, steady(p));
    // 'instant', or the stylesheet's smooth scrolling would chase every frame
    if (state.autoScroll && !rise.led) {
      window.scrollTo({ top: lerp(rise.scrollFrom, rise.scrollTo, steady(p)), behavior: 'instant' });
    }
    if (p >= 1) {
      if (!rise.led) state.autoScroll = false;
      rise = null;
      risen = true;
      if (Aquarium.onSettled) Aquarium.onSettled();
    }
  }

  // ------------------------------------------------------------- drifting --

  let motes = [];
  let ripples = [];
  const splashes = [];     // waves running out along the line
  const drops = [];        // and what was thrown up off it

  function scatter() {
    const count = Math.round(Number(get('water.motes', 90)));
    motes = [];
    for (let i = 0; i < count; i++) {
      motes.push({
        x: rand(0, view.w),
        y: rand(0, view.h),
        r: rand(0.6, 2.2),
        drift: rand(-6, 6),
        rise: rand(4, 16),
        phase: rand(0, Math.PI * 2)
      });
    }
  }

  // --------------------------------------------------------------- water --

  /* The air starts out the colour of the water, so the bowl sits in one
     unbroken tank. When the glass goes it clears to `sky_color`, on the same
     curve as his leap, and is fully clear just as he reaches the top of it. */
  function skyColor(t) {
    const water = get('depth.shallow_color', '#06455a');
    const air = get('depth.sky_color', '#0d7fa4');
    if (!state.broken) return mix(water, air, 0);
    const rise = Math.max(0.2, Number(get('fish.leap_rise', 1)));
    const up = clamp((t - state.breakTime) / rise, 0, 1);
    return mix(water, air, 1 - (1 - up) * (1 - up));
  }

  function drawWater(ctx, env) {
    const { t, w, h } = env;
    const surf = state.surfaceY;
    const sky = css(skyColor(t));

    // Above the line is air, and before the break it is all there is.
    if (surf > 0) {
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, Math.min(h, surf + 1));
      // the light falls off a little towards the top of the screen
      const fade = ctx.createLinearGradient(0, 0, 0, Math.min(h, surf));
      fade.addColorStop(0, 'rgba(0, 0, 0, .16)');
      fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, w, Math.max(0, Math.min(h, surf)));
    }

    if (surf >= h) return;            // nothing but air on this screen

    const top = Math.max(0, surf);
    const body = ctx.createLinearGradient(0, top, 0, h);
    body.addColorStop(0, css(colorAt(depthAt(top))));
    body.addColorStop(0.5, css(colorAt(depthAt(lerp(top, h, 0.5)))));
    body.addColorStop(1, css(colorAt(depthAt(h))));
    ctx.fillStyle = body;
    ctx.fillRect(0, top, w, h - top);

    drawShafts(ctx, env, surf);
    drawCaustics(ctx, env, surf);
    drawMotes(ctx, env, surf);
  }

  /* Sunlight coming down through the surface.

     A beam is not on a timer: its brightness is three slow waves added
     together, so the light gathers and fades where they happen to meet, the
     way it does on water. And no two beams share a clock — each one is given
     its own phases, its own rates, its own width and its own lean when the
     page opens, so the set never pulses as one. `shaft_randomness` is how far
     apart they are allowed to drift; at 0 they all move together again.

     The whole set is drawn small — a quarter of the size — on a canvas of its
     own, blurred there, and then blown up over the water. That is where the
     softness comes from and why it costs almost nothing: a blur over a quarter
     scale canvas is a sixteenth of the work, and the upscale smooths it again.
     `shaft_blur` is in pixels at the size they end up. */

  const beams = document.createElement('canvas');
  const beamCtx = beams.getContext('2d');
  const scratch = document.createElement('canvas');
  const scratchCtx = scratch.getContext('2d');
  const BEAM_SCALE = 4;
  let beamKey = '';
  let beamSeeds = [];

  /* Drawn once per beam, so the light wanders rather than jitters. */
  function seedBeams(count) {
    beamSeeds = [];
    for (let i = 0; i < count; i++) {
      beamSeeds.push({
        phase: [rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2)],
        rate: [rand(0.55, 1.6), rand(0.55, 1.6), rand(0.55, 1.6)],
        swayPhase: rand(0, Math.PI * 2),
        swayRate: rand(0.45, 1.7),
        swayAmount: rand(0.35, 1.5),
        lean: rand(-1, 1),
        width: rand(0.65, 1.5),
        bright: rand(0.55, 1.3),
        slot: rand(-0.34, 0.34)       // how far off its own share of the width
      });
    }
  }

  function paintBeams(env, surf) {
    const { t, w, h } = env;
    const bw = Math.max(1, Math.round(w / BEAM_SCALE));
    const bh = Math.max(1, Math.round(h / BEAM_SCALE));
    if (beams.width !== bw || beams.height !== bh) {
      beams.width = bw;
      beams.height = bh;
      scratch.width = bw;
      scratch.height = bh;
      beamKey = '';
    }

    const strength = Number(get('water.shafts', 0.55)) * quality();
    const count = Math.max(1, Math.round(Number(get('water.shaft_count', 5))));
    if (beamSeeds.length !== count) seedBeams(count);

    const width = Number(get('water.shaft_width', 0.07)) * bw;
    const soft = Math.max(1, Number(get('water.shaft_softness', 3.2)));
    const move = Number(get('water.movement', 1)) * motion();
    const wander = Number(get('water.shaft_wander', 0.09));
    const R = clamp(Number(get('water.shaft_randomness', 0.85)), 0, 1);
    const own = v => lerp(1, v, R);        // how much of its own way it goes
    const waves = get('water.shaft_interference', [0.21, 0.37, 0.09]);
    const f0 = Number(waves[0]) || 0.21;
    const f1 = Number(waves[1]) || 0.37;
    const f2 = Number(waves[2]) || 0.09;

    // a tenth of a second of the same light is not worth redrawing
    const key = `${Math.round(t * 10)}|${Math.round(surf)}|${strength}|${count}`;
    if (key === beamKey) return;
    beamKey = key;

    const top = surf / BEAM_SCALE;
    const fade = clamp(1 - Math.abs(surf) / (h * 0.8), 0, 1);

    scratchCtx.clearRect(0, 0, bw, bh);
    beamCtx.clearRect(0, 0, bw, bh);
    if (strength <= 0 || fade <= 0.01) return;
    scratchCtx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < count; i++) {
      const s = beamSeeds[i];
      const seed = i * 1.37;
      // three waves meeting: sometimes they add up, sometimes they cancel
      const interference =
        (Math.sin(t * f0 * move * own(s.rate[0]) + seed * 2.1 + s.phase[0] * R) +
         Math.sin(t * f1 * move * own(s.rate[1]) + seed * 3.7 + s.phase[1] * R) +
         Math.sin(t * f2 * move * own(s.rate[2]) + seed * 1.1 + s.phase[2] * R)) / 3;
      const k = clamp(0.18 + 0.82 * (0.5 + 0.5 * interference), 0, 1.2) * own(s.bright);

      const sway = Math.sin(t * 0.17 * move * own(s.swayRate) + seed + s.swayPhase * R)
                 * bw * wander * own(s.swayAmount);
      const x = (bw / count) * (i + 0.5 + s.slot * R) + sway;
      const lean = lerp(Math.sin(seed) * 0.35, s.lean * 0.5, R);
      const reach = bh * 1.15;
      const spread0 = width * own(s.width);

      const light = scratchCtx.createLinearGradient(0, top, 0, top + reach);
      light.addColorStop(0, `rgba(198, 246, 255, ${0.075 * strength * fade * k})`);
      light.addColorStop(0.4, `rgba(190, 240, 255, ${0.034 * strength * fade * k})`);
      light.addColorStop(1, 'rgba(190, 240, 255, 0)');
      scratchCtx.fillStyle = light;

      // three passes, each wider and fainter: added up, a beam with no edge
      for (let pass = 0; pass < 3; pass++) {
        const spread = spread0 * (1 + pass * (soft - 1) * 0.5);
        scratchCtx.globalAlpha = 1 / (1 + pass * 1.4);
        scratchCtx.beginPath();
        scratchCtx.moveTo(x - spread * 0.4, top);
        scratchCtx.lineTo(x + spread * 0.4, top);
        scratchCtx.lineTo(x + spread * 1.5 + lean * reach, top + reach);
        scratchCtx.lineTo(x - spread * 1.5 + lean * reach, top + reach);
        scratchCtx.closePath();
        scratchCtx.fill();
      }
      scratchCtx.globalAlpha = 1;
    }

    // and the blur that takes the last edge off them
    const blur = Number(get('water.shaft_blur', 34)) / BEAM_SCALE;
    const canBlur = blur > 0.2 && 'filter' in beamCtx;
    if (canBlur) beamCtx.filter = `blur(${blur}px)`;
    beamCtx.drawImage(scratch, 0, 0);
    if (canBlur) beamCtx.filter = 'none';
  }

  function drawShafts(ctx, env, surf) {
    if (Number(get('water.shafts', 0.5)) * quality() <= 0) return;
    if (surf > env.h || surf < -env.h) return;
    paintBeams(env, surf);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(beams, 0, 0, env.w, env.h);
    ctx.restore();
  }

  /* The wandering light bands the surface throws onto everything under it.

     Each one is a filled strip with a gradient across it rather than a line,
     so its edges fade out instead of stopping. And each is laid down several
     times over — `caustic_passes` — wider and fainter every pass, which adds
     up to a band with no edge at all rather than one with a soft one.

     Each band also keeps its own phases and rates, so they wander past each
     other instead of sliding along in formation. `caustic_drift` is how far
     they are allowed to go their own way. */

  const BANDS = 9;
  let bandSeeds = [];

  function seedBands() {
    bandSeeds = [];
    for (let i = 0; i < BANDS; i++) {
      bandSeeds.push({
        phase: [rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2)],
        rate: [rand(0.6, 1.5), rand(0.55, 1.6), rand(0.7, 1.4)],
        amp: [rand(0.7, 1.35), rand(0.6, 1.4)],
        offset: rand(-0.5, 0.5),
        thick: rand(0.75, 1.3)
      });
    }
  }
  seedBands();

  function drawCaustics(ctx, env, surf) {
    const strength = Number(get('water.caustics', 0.4)) * quality();
    if (strength <= 0) return;

    const { t, w, h } = env;
    const scale = Math.max(0.2, Number(get('water.caustic_scale', 1)));
    const soft = Math.max(1, Number(get('water.caustic_softness', 6.5)));
    const move = Number(get('water.movement', 1)) * motion();
    const drift = clamp(Number(get('water.caustic_drift', 0.8)), 0, 1);
    const own = v => lerp(1, v, drift);
    // one pass is plenty on a machine that has already asked for less light
    const passes = state.lean
      ? 1
      : clamp(Math.round(Number(get('water.caustic_passes', 3))), 1, 4);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < BANDS; i++) {
      const s = bandSeeds[i];
      // the bands are not evenly spaced, or they read as stripes
      const spacing = (78 / scale) * (0.78 + 0.5 * Math.abs(Math.sin(i * 2.3)));
      const y = surf + 70 + i * spacing
              + Math.sin(i * 4.1) * 18 + s.offset * spacing * drift * 0.6;
      if (y < -140 || y > h + 140) continue;
      const near = clamp(1 - (y - surf) / (h * 1.4), 0, 1);
      if (near <= 0.02) continue;

      const thick = (2 + (i % 3) * 2.5) * soft * own(s.thick);
      const step = 60 / scale;
      const wave = x =>
          Math.sin(x / ((130 + i * 17) / scale)
                   + t * (0.5 + i * 0.05) * move * own(s.rate[0]) + i + s.phase[0] * drift)
            * 9 * own(s.amp[0])
        + Math.sin(x / ((55 + i * 9) / scale)
                   - t * 0.33 * move * own(s.rate[1]) + i * 1.7 + s.phase[1] * drift)
            * 5 * own(s.amp[1])
        + Math.sin(x / ((240 + i * 31) / scale)
                   + t * 0.14 * move * own(s.rate[2]) + s.phase[2] * drift)
            * 7 * drift;

      for (let pass = 0; pass < passes; pass++) {
        const spread = thick * (1 + pass * 1.7);
        const alpha = (0.075 * strength * near) / (1 + pass * 1.6);
        if (alpha <= 0.002) continue;

        ctx.beginPath();
        for (let x = -step; x <= w + step; x += step) ctx.lineTo(x, y + wave(x) - spread / 2);
        for (let x = w + step; x >= -step; x -= step) ctx.lineTo(x, y + wave(x) + spread / 2);
        ctx.closePath();

        // a falloff with no shoulder on it: nothing to read as an edge
        const band = ctx.createLinearGradient(0, y - spread / 2, 0, y + spread / 2);
        band.addColorStop(0, 'rgba(200, 246, 255, 0)');
        band.addColorStop(0.18, `rgba(200, 246, 255, ${alpha * 0.22})`);
        band.addColorStop(0.5, `rgba(200, 246, 255, ${alpha})`);
        band.addColorStop(0.82, `rgba(200, 246, 255, ${alpha * 0.22})`);
        band.addColorStop(1, 'rgba(200, 246, 255, 0)');
        ctx.fillStyle = band;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* Specks of silt, so the water is never completely still. */
  function drawMotes(ctx, env, surf) {
    const alpha = Number(get('water.mote_opacity', 0.3));
    if (alpha <= 0) return;
    const { t, dt, w, h } = env;
    const move = Number(get('water.movement', 1)) * motion();

    ctx.save();
    ctx.fillStyle = `rgba(222, 248, 255, ${alpha})`;
    for (const m of motes) {
      m.y -= m.rise * dt * move * 0.25;
      m.x += Math.sin(t * 0.4 + m.phase) * m.drift * dt;
      if (m.y < -10) { m.y = h + 10; m.x = rand(0, w); }
      if (m.x < -10) m.x = w + 10;
      if (m.x > w + 10) m.x = -10;
      if (m.y < surf) continue;
      ctx.globalAlpha = alpha * clamp(1 - (m.y - surf) / (h * 1.6), 0.15, 1);
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------- surface --

  /* How far the line is lifted at a point by whatever has gone through it.

     A splash is a group of waves, not a ring: it leaves the point it was made
     at, travels out along the surface at `splash_speed`, and the water behind
     the front goes on rocking for a moment after it has passed. Nothing is
     lifted before the front arrives, which is what makes it read as travelling
     rather than as the whole line flexing at once. */
  function splashLift(x, t) {
    if (!splashes.length) return 0;

    const life = Math.max(0.3, Number(get('water.splash_life', 2.4)));
    const speed = Math.max(40, Number(get('water.splash_speed', 540)));
    const wave = Math.max(30, Number(get('water.splash_wave', 170)));
    const tall = Number(get('water.splash_height', 30));
    const k = (Math.PI * 2) / wave;

    let dy = 0;
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      const age = t - s.born;
      if (age > life) { splashes.splice(i, 1); continue; }

      const d = Math.abs(x - s.x);
      const front = speed * age;
      if (d > front) continue;                       // it hasn't reached here

      // dies away with time, with distance, and behind the front
      const fade = Math.pow(1 - age / life, 1.7);
      const spread = 1 / (1 + d / 300);
      const trail = Math.exp(-Math.pow((front - d) / (wave * 2.2), 2) * 0.55);

      dy -= Math.sin(k * (d - front) + s.seed) * tall * s.strength * fade * spread * trail;
    }
    return dy;
  }

  /* The line itself, drawn over everything so that the fish can break it.
     Several waves overlap — the far ones slow and faint, the near one crisp —
     which is what gives the surface its depth. `surface_layers` is how many. */
  function drawSurface(ctx, env) {
    const { t, w, h } = env;
    const surf = state.surfaceY;
    if (surf < -80 || surf > h + 80) { drawRipples(ctx, env); drawDrops(ctx, env); return; }

    const height = Number(get('water.wave_height', 9));
    const length = Math.max(40, Number(get('water.wave_length', 320)));
    const move = Number(get('water.movement', 1)) * motion();
    const foam = Number(get('water.foam', 0.5));
    const layers = Math.max(1, Math.round(Number(get('water.surface_layers', 3))
                                        - state.lean));

    // back to front: the last one drawn is the one the eye reads as the line
    for (let i = layers - 1; i >= 0; i--) {
      const far = layers > 1 ? i / (layers - 1) : 0;    // 1 is the farthest
      const amp = height * (1 - far * 0.45);
      const speed = 0.9 * move * (1 - far * 0.3);
      const drop = far * height * 1.5;
      const phase = i * 1.9;
      const strength = foam * (1 - far * 0.55);

      // the near layers take the most of a splash, the far ones a little
      const take = 1 - far * 0.55;

      const at = x => surf + drop
        + Math.sin(x / (length * (1 + far * 0.4)) * Math.PI * 2 + t * speed + phase) * amp
        + Math.sin(x / (length * 0.37) * Math.PI * 2 - t * speed * 1.5 + phase) * amp * 0.35
        + splashLift(x, t) * take;

      // a band of brighter water just under the front one
      ctx.save();
      if (i === 0) {
        ctx.beginPath();
        ctx.moveTo(0, at(0));
        for (let x = 0; x <= w; x += 20) ctx.lineTo(x, at(x));
        ctx.lineTo(w, at(w) + 30);
        ctx.lineTo(0, at(0) + 30);
        ctx.closePath();
        const band = ctx.createLinearGradient(0, surf + drop - amp, 0, surf + drop + 30);
        band.addColorStop(0, `rgba(222, 250, 255, ${0.26 * strength})`);
        band.addColorStop(1, 'rgba(222, 250, 255, 0)');
        ctx.fillStyle = band;
        ctx.fill();
      }

      // and the line itself. A splash is drawn at a finer step than the swell:
      // the wave group is short, and at 20px it would come out as corners.
      const step = splashes.length ? 7 : 20;
      ctx.beginPath();
      ctx.moveTo(0, at(0));
      for (let x = 0; x <= w; x += step) ctx.lineTo(x, at(x));
      ctx.strokeStyle = `rgba(233, 253, 255, ${0.5 * strength})`;
      ctx.lineWidth = 1.5 - far * 0.6;
      ctx.stroke();
      ctx.restore();
    }

    drawRipples(ctx, env);
    drawDrops(ctx, env);
  }

  /* What the splash threw up: droplets, falling back into the line they came
     out of. They are the part of a splash the eye actually reads as water. */
  function drawDrops(ctx, env) {
    if (!drops.length) return;
    const g = Number(get('water.splash_gravity', 1500));
    const { t, dt } = env;

    ctx.save();
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      const age = t - d.born;
      if (age > d.life) { drops.splice(i, 1); continue; }

      d.vy += g * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      // back in the water, and gone
      if (d.vy > 0 && d.y > state.surfaceY + 2) { drops.splice(i, 1); continue; }

      const fade = Math.pow(1 - age / d.life, 0.7);
      // stretched along the way it is going, the way a droplet is
      const speed = Math.hypot(d.vx, d.vy);
      const long = clamp(speed / 900, 0, 1.4);

      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(Math.atan2(d.vy, d.vx));
      ctx.fillStyle = `rgba(235, 252, 255, ${0.72 * fade})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, d.r * (1 + long), d.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /* A ring where something touched the water.

     It is round, because water does not know which way the screen is turned.
     And it is a wave rather than a circle: one front leaves the point it was
     made at and travels out at `ripple_speed`, with the crests behind it
     following at their own spacing, each one thinner and fainter than the one
     in front. Three things are doing the work:

       - the amplitude falls as 1/√r, which is what a ring spreading out over a
         surface does, on top of dying away with age;
       - every crest is drawn twice, bright on the near side and dark on the
         far side, because what you see of a ripple is the light bending
         through the slope of it rather than the water itself;
       - the front runs ahead of the rest: short waves travel slower than long
         ones on water, so the leading crest arrives alone and the fine ones
         gather up behind it.

     Capillary wrinkles ride just inside the front, which is the detail that
     stops it reading as a drawn circle. */
  function drawRipples(ctx, env) {
    if (!ripples.length) return;

    const life = Math.max(0.2, Number(get('water.ripple_life', 2.4)));
    const rings = Math.max(1, Math.round(Number(get('water.ripple_rings', 4))));
    const strength = Number(get('water.ripple_strength', 0.8));
    const speed = Math.max(20, Number(get('water.ripple_speed', 240)));
    const wave = Math.max(10, Number(get('water.ripple_wave', 34)));

    ctx.save();
    ctx.lineCap = 'round';

    /* A ring is round, but it is a ring on the water — so it is kept to the
       water. Without this the half of it above the line goes on expanding
       into the sky, which is the one thing that gives away that this is a
       circle being drawn rather than something happening on a surface. */
    const line = Math.max(0, state.surfaceY);
    if (line < env.h) {
      ctx.beginPath();
      ctx.rect(0, line, env.w, env.h - line);
      ctx.clip();
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      const age = env.t - r.born;
      if (age >= life) { ripples.splice(i, 1); continue; }

      const t01 = age / life;
      const fade = Math.pow(1 - t01, 1.5);
      const front = speed * age * (0.55 + 0.45 * (1 - t01 * 0.5));

      for (let k = 0; k < rings; k++) {
        // the crests trail the front, the short ones further back
        const radius = front - k * wave * (1 + k * 0.22);
        if (radius <= 3) continue;

        const spread = 1 / Math.sqrt(Math.max(radius, 8) / 18);
        const amp = 0.5 * strength * r.strength * fade * spread
                  * Math.pow(0.68, k);
        if (amp <= 0.004) continue;

        const width = clamp(1 + amp * 3.4, 0.7, 3.4);

        // the dark side of the slope, just outside the crest
        ctx.strokeStyle = `rgba(3, 26, 34, ${Math.min(amp * 0.5, 0.3)})`;
        ctx.lineWidth = width * 1.25;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius + width * 0.9, 0, Math.PI * 2);
        ctx.stroke();

        // and the lit side of it
        ctx.strokeStyle = `rgba(228, 250, 255, ${Math.min(amp, 0.55)})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      /* The fine wrinkles that run ahead of a real ripple, just inside the
         front. They are drawn as one wobbling ring rather than a circle, so
         the leading edge is never a perfect curve. */
      const fineAmp = 0.22 * strength * r.strength * Math.pow(1 - t01, 2.2);
      if (fineAmp > 0.01 && front > 14) {
        ctx.strokeStyle = `rgba(228, 250, 255, ${fineAmp})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        const steps = 48;
        for (let s = 0; s <= steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          const wobble = Math.sin(a * 7 + r.seed) * 1.6
                       + Math.sin(a * 13 - r.seed * 2) * 1.1;
          const rr = front - wave * 0.35 + wobble;
          const x = r.x + Math.cos(a) * rr;
          const y = r.y + Math.sin(a) * rr;
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

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

  // --------------------------------------------------------------- input --

  /* A click anywhere on the page is a click on the water: it rings, and the
     fish comes over. Clicks on something you can actually press are left
     alone, apart from the bowl, which does its own thing with them. */
  document.addEventListener('click', event => {
    if (document.body.classList.contains('detail-open')) return;
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

  // ----------------------------------------------------------------- go --

  resize();
  remeasureSurface();
  scene.add(10, drawWater);
  scene.add(90, drawSurface);
  requestAnimationFrame(frame);

  // So the other modules can measure the line again after a reset.
  Aquarium.remeasureSurface = remeasureSurface;
  Aquarium.clock = () => clock;

})();
