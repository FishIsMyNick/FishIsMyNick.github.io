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
