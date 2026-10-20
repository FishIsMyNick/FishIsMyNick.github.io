/* Him.

   The artwork is a flat drawing seen from the side, so the body is bent rather
   than jointed: the sprite is rasterised once, then redrawn every frame as a
   row of thin vertical strips, each nudged up or down by a wave travelling
   from nose to tail. The head barely moves, the tail swings hardest, and the
   whole shape flexes the way a fish does.

   He has four lives, in order:

       bowl     turning circles behind the glass, with nowhere to go. A tap
                brings him up for a look; another puts his nose through the
                surface
       leap     the tap that breaks the glass throws him into the air, where
                he turns over once or twice and doubles in size on the way down
       free     out in the water, following the cursor, circling whatever you
                hover, and dashing to wherever you click. The water is wider
                than the window: he can carry on out past the edge of it and
                come back, and he can turn right over, nose over tail, as he
                goes
       jump     out of the water altogether — of his own accord every so
                often, or after a click in the sky above the waterline. He
                arcs, turns over if he feels like it, and comes back down with
                a splash

   Everything he does comes from the `fish` block of src/content/aquarium.yaml.
   Replace src/assets/svg/koi_fish.svg to change the fish; the only settings
   tied to the drawing are `faces`, which says which way its nose points, and
   `mouth`, which is where the bubbles come from. */

(() => {
  'use strict';

  const { get, range, clamp, lerp, rand, pick, motion, css, colorAt, depthAt } = Aquarium;
  const state = Aquarium.state;
  const scene = Aquarium.scene;
  if (!scene) return;

  // --------------------------------------------------------- the sprites --

  /* Two drawings, one for each way he goes: `fish-sprite-left` and
     `fish-sprite-right`, both inlined into the page by the build.

     He is no longer one drawing held up to a mirror. When he comes about, the
     drawing he is wearing is squashed down through nothing and the other one
     opens out on the far side of it — so the turn is the same movement it
     always was, but what you see afterwards is a drawing made to face that
     way rather than a flipped copy of the other one.

     Each file is trimmed to its ink with a transparent background, so there is
     nothing to crop here and nothing to read back off a canvas. */

  const sheets = { left: null, right: null };
  const shades = { left: null, right: null };
  const shape = { left: 0.46, right: 0.46 };   // height ÷ length, per drawing
  let ready = false;

  function loadSprites() {
    let settled = 0;

    const finish = () => {
      if (++settled < 2) return;
      // one drawing missing is not worth a fishless page: the other does both
      if (!sheets.left && sheets.right) {
        sheets.left = sheets.right; shades.left = shades.right; shape.left = shape.right;
      }
      if (!sheets.right && sheets.left) {
        sheets.right = sheets.left; shades.right = shades.left; shape.right = shape.left;
      }
      ready = !!sheets.right;
    };

    for (const side of ['left', 'right']) {
      const img = document.getElementById('fish-sprite-' + side);
      if (!img) { finish(); continue; }

      const take = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w && h) {
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          sheets[side] = c;
          shape[side] = h / w;
          shades[side] = silhouette(c);
        }
        finish();
      };

      if (img.complete && img.naturalWidth) take();
      else {
        img.addEventListener('load', take, { once: true });
        img.addEventListener('error', finish, { once: true });
      }
    }
  }

  /* Which drawing he is wearing this frame. `flip` is the width he is drawn
     at, signed: it eases from one side to the other and the swap happens as it
     passes through zero, which is the middle of the turn. */
  function sideNow() {
    return fish.flip >= 0 ? 'right' : 'left';
  }

  /* How tall he is for his length, in the drawing he is wearing. */
  function bodyRatio() {
    return shape[sideNow()] || 0.46;
  }

  /* A black copy of him, softened once here rather than on every frame, so
     that his shadow costs one more blit and not a filter. */
  function silhouette(src) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);

    if (!('filter' in g)) return c;
    const soft = document.createElement('canvas');
    soft.width = c.width; soft.height = c.height;
    const sg = soft.getContext('2d');
    sg.filter = `blur(${Math.max(2, c.width * 0.02)}px)`;
    sg.drawImage(c, 0, 0);
    return soft;
  }

  // ------------------------------------------------------------- the fish --

  const fish = {
    x: 0, y: 0,
    vx: -20, vy: 0,
    facing: -1,            // -1 nose left, +1 nose right
    flip: 1,               // the width he is drawn at, while turning over
    placed: false,
    phase: 0,
    mode: 'bowl',          // bowl | leap | free | jump
    grow: 0,               // 0 the size he is in the bowl, 1 the size he ends
    spin: 0,               // how far round he is, mid-leap
    spinRate: 0,
    hold: null,            // somewhere he has been startled to
    target: null,
    nextThink: 0,
    dash: null,
    nextBubble: 2,
    now: 0,                // the scene clock, for anything drawing itself
    roll: null,            // a full turn, nose over tail, under way
    nextRoll: 6,
    nextJump: 7,
    wantJump: null,        // a click in the sky he is working his way up to
    outside: 0,            // how long he has been off the edge of the window
    dive: null,            // heading for the bottom while the water comes up
    leap: null,            // the way out of the bowl: up, hang, turn, fall
    unwind: null,          // levelling out after the dive
    lastBreak: -9          // when he last came through the surface
  };
  state.fish = fish;

  const bubbles = [];

  /* How long he is, in pixels. He leaves the bowl at `size_bowl` and arrives in
     the water `grow_to` times that, growing on the way down. On a narrow screen
     he is held to a share of it, so a phone doesn't get a fish wider than the
     page. */
  function length() {
    const small = Number(get('fish.size_bowl', 140));
    const big = small * Number(get('fish.grow_to', 2));
    const want = lerp(small, big, clamp(fish.grow, 0, 1));
    const room = scene.view.w * Number(get('fish.max_share', 0.5));
    return Math.max(60, Math.min(want, room));
  }

  // ------------------------------------------------------------- steering --

  /* The water inside the glass. `air` lets him up into the space above it,
     which is what a breach is. */
  function bowlBox(air) {
    const b = state.bowl;
    if (!b) return null;
    const level = Number(get('bowl.water_level', 0.8));
    const len = length();
    // far enough in that his nose and tail stay behind the glass
    const inset = Math.max(b.w * 0.16, len * 0.55);
    const waterline = b.y + b.h * (1 - level);
    const bottom = b.y + b.h * (1 - Number(get('bowl.gravel_depth', 0.16)) * 0.8);
    return {
      left: b.x + inset,
      right: b.x + b.w - inset,
      top: (air ? b.y + b.h * 0.06 : waterline + b.h * 0.06) + len * 0.1,
      bottom: bottom - len * 0.2,
      waterline
    };
  }

  /* The water you can see. This is where he decides to go. */
  function visibleBox() {
    const v = scene.view;
    const pad = length() * 0.5;
    return {
      left: pad * 0.5,
      right: v.w - pad * 0.5,
      top: Math.max(state.surfaceY, 0) + pad * 0.5,
      bottom: v.h - pad * 0.4
    };
  }

  /* And how far the water goes. The window is not the edge of it: he may carry
     on out past the side or the bottom by `off_frame` of his own lengths,
     which is what makes the water feel wider than the screen. The surface is
     the one wall he cannot swim through — going above it is a jump. */
  function limitBox() {
    const v = scene.view;
    const len = length();
    const out = Math.max(0, Number(get('fish.off_frame', 1.4))) * len;
    return {
      // He is allowed right up under the line rather than held a body's depth
      // below it: a click just under the surface is a place he can reach, and
      // his back breaking through is a splash, not a mistake.
      top: Math.max(state.surfaceY + len * Number(get('fish.surface_gap', 0.12)),
                    -out * 0.6),
      left: -out,
      right: v.w + out,
      bottom: v.h + out * 0.5
    };
  }

  /* Where he is held, and where he aims. In the bowl they are the same thing. */
  function box() {
    if (fish.mode !== 'bowl') return limitBox();
    return bowlBox(!!(fish.hold && fish.hold.air)) || limitBox();
  }

  function roam() {
    if (fish.mode !== 'bowl') return visibleBox();
    return bowlBox(!!(fish.hold && fish.hold.air)) || visibleBox();
  }

  function newTarget(t) {
    const b = roam();
    if (!b || b.right <= b.left || b.bottom <= b.top) return;

    let x = rand(b.left, b.right);
    const y = rand(b.top, b.bottom);
    let out = false;

    // now and then he simply carries on out of the frame, and comes back
    if (fish.mode === 'free' && Math.random() < Number(get('fish.off_frame_chance', 0.18))) {
      const lim = limitBox();
      x = Math.random() < 0.5 ? rand(lim.left, b.left) : rand(b.right, lim.right);
      out = true;
    }

    fish.target = { x, y, out };
    const [lo, hi] = range('fish.wander_range', 1.4, 3.6);
    // somewhere off the edge is a long way at a cruise, so once he has decided
    // to go he keeps going: he does not change his mind halfway out there
    fish.nextThink = t + (out ? Math.max(hi, 2.5) * 2 : rand(lo, hi));
  }

  /* A click: he comes about on the spot and goes straight there. If that means
     doubling back on himself he sometimes turns right over instead of simply
     facing the other way. */
  function dashTo(x, y, t) {
    if (fish.mode === 'leap' || fish.mode === 'jump' || fish.dive) return;
    const back = (x >= fish.x ? 1 : -1) !== fish.facing;
    fish.dash = { x, y, until: t + Math.max(0.2, Number(get('fish.dash_time', 1.4))) };
    if (back && fish.mode === 'free'
        && Math.random() < Number(get('fish.roll_on_dash', 0.4)) && startRoll(t)) {
      // a roll keeps him pointing the way he was until he comes round
      return;
    }
    fish.facing = x >= fish.x ? 1 : -1;
    // the turn itself is quick rather than instant; starting it near zero is
    // what makes it read as a fish coming about rather than a drawing swapping
    fish.flip = fish.facing * 0.06;
  }

  // ------------------------------------------------ turning right over --

  /* A full 360 in the water: nose over tail, once round, and on he goes. It is
     an angle added to however he is already held, so he keeps swimming — he
     does not stop to do it. */
  function startRoll(t, dir) {
    if (get('fish.roll', true) === false) return false;
    if (fish.roll || fish.mode !== 'free') return false;
    fish.roll = {
      at: t,
      dur: Math.max(0.2, Number(get('fish.roll_time', 0.95))),
      dir: dir || (Math.random() < 0.5 ? -1 : 1)
    };
    const [lo, hi] = range('fish.roll_every', 7, 18);
    fish.nextRoll = t + rand(lo, hi);
    return true;
  }

  function rollAngle() {
    if (!fish.roll) return 0;
    const p = clamp((fish.now - fish.roll.at) / fish.roll.dur, 0, 1);
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    return eased * Math.PI * 2 * fish.roll.dir;
  }

  // ----------------------------------------------------- out of the water --

  /* Near enough the line, and out in open water, to leave it. */
  function canJump() {
    if (fish.mode !== 'free' || get('fish.jump', true) === false) return false;
    if (fish.dive || state.pour < 0.9) return false;
    const v = scene.view;
    const surf = state.surfaceY;
    if (surf < -v.h * 0.15 || surf > v.h) return false;      // the line is off screen
    return (fish.y - surf) < Number(get('fish.jump_near_surface', 320));
  }

  /* On the cursor's tail: it is in the window and has moved lately. */
  function following(t) {
    const p = state.pointer;
    return get('fish.follow', true) !== false && p.inside
      && (t - p.moved) < Number(get('fish.idle_after', 2.5));
  }

  /* Out he goes. With somewhere to aim for he is thrown exactly hard enough to
     get there; left to himself he gives it `jump_power` and sees what happens.
     Either way he comes down where the water is, not out through the side. */
  function jump(t, aim) {
    const g = Math.max(100, Number(get('fish.jump_gravity', 1400)));
    const surf = state.surfaceY;
    const deep = Math.max(0, fish.y - surf);
    const v = scene.view;

    let power = Number(get('fish.jump_power', 620));
    let vx = fish.vx * 0.8 + rand(-120, 120);

    if (aim) {
      const climb = deep + Math.max(30, surf - aim.y) + length() * 0.5;
      power = clamp(Math.sqrt(2 * g * climb), 220,
                    Number(get('fish.jump_power_max', 1500)));
      const air = (power + Math.sqrt(Math.max(0, power * power - 2 * g * deep))) / g;
      vx = (aim.x - fish.x) / Math.max(0.25, air);
    }

    // he has to clear the surface, or it is not a jump
    if (power * power <= 2 * g * deep * 1.05) power = Math.sqrt(2 * g * deep) * 1.25 + 220;

    // and he does not jump out through the edge of the window
    if (fish.x < v.w * 0.1 && vx < 0) vx = Math.abs(vx);
    if (fish.x > v.w * 0.9 && vx > 0) vx = -Math.abs(vx);

    fish.mode = 'jump';
    fish.dash = null;
    fish.hold = null;
    fish.roll = null;
    fish.wantJump = null;
    fish.spin = 0;
    fish.jumpAt = t;
    fish.vy = -power;
    fish.vx = clamp(vx, -1300, 1300);
    fish.facing = fish.vx >= 0 ? 1 : -1;
    fish.flip = fish.facing;

    const air = (power + Math.sqrt(Math.max(0, power * power - 2 * g * deep))) / g;
    const [few, many] = range('fish.jump_flips', 0, 1);
    const turns = Math.round(rand(few, many));
    fish.spinRate = turns
      ? (turns * Math.PI * 2) / Math.max(0.25, air) * (fish.vx >= 0 ? 1 : -1)
      : 0;

    // leaving the water throws it about, the same as coming back does
    breakSurface(t, 0.75);
    scheduleJump(t);
  }

  /* Going through the line, either way. The water answers with a splash that
     runs out along the surface, a ring on it, and the sound of it. */
  function breakSurface(t, strength) {
    fish.lastBreak = t;
    const s = clamp(strength, 0.1, 2.4);
    Portfolio.sound.splash(clamp(s, 0.2, 1.2));
    if (scene.splash) scene.splash(fish.x, s, fish.vy >= 0 ? 1 : -1);
    scene.ripple(fish.x, state.surfaceY, s);
  }

  function scheduleJump(t) {
    const [lo, hi] = range('fish.jump_every', 8, 20);
    fish.nextJump = t + rand(lo, hi);
  }

  /* Mid-air, out in the open: gravity, whatever turn he started, and the line
     coming back up at him. */
  function arc(t, dt) {
    fish.vy += Number(get('fish.jump_gravity', 1400)) * dt;
    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;
    fish.spin += fish.spinRate * dt;

    const down = fish.vy > 0 && fish.y >= state.surfaceY;
    // and if the line has moved out from under him, he is back in after this
    const lost = (t - fish.jumpAt) > 4;
    if (down || lost) splashDown(t);
  }

  function splashDown(t) {
    const hit = clamp(Math.abs(fish.vy) / 700, 0.5, 1.9);
    fish.mode = 'free';
    fish.spin = 0;
    fish.spinRate = 0;
    fish.grow = 1;
    fish.vy = Math.abs(fish.vy) * 0.4;
    fish.vx *= 0.7;
    fish.y = Math.max(fish.y, state.surfaceY + 2);
    breakSurface(t, hit);
    newTarget(t);
  }

  // ------------------------------------------------- what a tap does to him --

  /* Every tap but the last. He comes up to look, and then puts his nose out. */
  function startle(step, final, t) {
    const b = bowlBox(true);
    if (!b) return;
    const hold = Number(get('glass.rise_hold', 1.4));
    const breach = Number(get('glass.breach', 0.35)) * length() * bodyRatio();
    const nose = step >= final - 1;      // the tap before the one that breaks it

    // a fish puts his nose out in the middle, where there is room for it
    const middle = (b.left + b.right) / 2;
    fish.hold = {
      x: nose ? middle + rand(-14, 14) : clamp(fish.x + rand(-40, 40), b.left, b.right),
      y: nose ? b.waterline - breach : b.waterline + length() * bodyRatio() * 0.45,
      air: nose,
      until: t + hold
    };
    fish.target = null;
  }

  // ------------------------------------------------------------- bubbles --

  function breathe(t, dt) {
    if (get('fish.bubbles', true) === false) return;

    if (t > fish.nextBubble) {
      const [lo, hi] = range('fish.bubble_every', 1.6, 5);
      fish.nextBubble = t + rand(lo, hi);
      if (fish.mode === 'bowl' || fish.mode === 'free') {
        const [few, many] = range('fish.bubble_count', 1, 4);
        const n = Math.round(rand(few, many));
        const [small, big] = range('fish.bubble_size', 2, 6);
        const m = mouth();
        for (let i = 0; i < n; i++) {
          bubbles.push({
            x: m.x + rand(-4, 4),
            y: m.y + rand(-4, 4),
            r: rand(small, big),
            phase: rand(0, Math.PI * 2),
            born: t,
            life: Number(get('fish.bubble_life', 4)) * rand(0.7, 1.2)
          });
        }
        if (n > 1) Portfolio.sound.bubble(0.6);
      }
    }

    const rise = Number(get('fish.bubble_rise', 42));
    const wobble = Number(get('fish.bubble_wobble', 14));
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      const age = t - b.born;
      b.y -= rise * dt * (0.7 + b.r / 8) * motion();
      b.x += Math.sin(t * 2.2 + b.phase) * wobble * dt;
      const ceiling = state.broken ? state.surfaceY : (state.bowl
        ? state.bowl.y + state.bowl.h * (1 - Number(get('bowl.water_level', 0.8)))
        : 0);
      if (age > b.life || b.y < ceiling + b.r) bubbles.splice(i, 1);
    }
  }

  /* Where his mouth is right now, in screen pixels — the bubbles start here.
     `mouth` in the YAML is a point on the left-facing drawing, across and
     down; on the right-facing one it is the same point read from the other
     end, because that drawing is the fish the other way round and not a
     mirror of this one. */
  function mouth() {
    const m = get('fish.mouth', [0.03, 0.46]);
    const len = length();
    const h = len * bodyRatio();
    const across = sideNow() === 'left' ? Number(m[0]) : 1 - Number(m[0]);
    const lx = (across - 0.5) * len;
    const ly = (Number(m[1]) - 0.5) * h;
    const rot = rotation();
    return {
      x: fish.x + lx * Math.cos(rot) - ly * Math.sin(rot),
      y: fish.y + lx * Math.sin(rot) + ly * Math.cos(rot)
    };
  }

  /* How far round the drawing is turned.

     The sprite is a side view and is mirrored left and right, so the angle is
     measured from whichever way his nose is pointing — which is why the sign
     follows `facing`.

     In the air he is held nose-first along his own arc, plus whatever flips he
     is doing. In the water he tips nose-up or nose-down by `pitch`, plus a
     roll if one is under way — and a roll is a whole turn, so this is where
     the 360 comes from. */
  function rotation() {
    if (fish.mode === 'leap') return fish.spin;

    // On the way down after the splash, and while he waits at the bottom for
    // the water, he is pointed straight down whatever he is doing.
    const noseDown = (Math.PI / 2) * (fish.facing >= 0 ? 1 : -1);
    if (fish.dive) {
      // unless he has started coming round to level for the end of it
      const lv = fish.dive.level;
      if (!lv) return noseDown;
      const k = clamp((fish.now - lv.at) / lv.dur, 0, 1);
      return lerp(noseDown, swimRotation(), k * k * (3 - 2 * k));
    }

    const raw = swimRotation();
    // and once he is let go he comes round to level, rather than snapping
    const u = fish.unwind;
    if (u) {
      const k = clamp((fish.now - u.at) / u.dur, 0, 1);
      if (k >= 1) fish.unwind = null;
      else return lerp(u.from, raw, k * k * (3 - 2 * k));
    }
    return raw;
  }

  function swimRotation() {
    const speed = Math.hypot(fish.vx, fish.vy);
    const sign = fish.facing >= 0 ? 1 : -1;

    if (fish.mode === 'jump') {
      const along = speed < 1 ? 0 : Math.atan2(fish.vy, Math.max(Math.abs(fish.vx), 1)) * sign;
      return clamp(along, -1.35, 1.35) + fish.spin;
    }

    const roll = rollAngle();
    if (speed < 1) return roll;
    const k = Number(get('fish.pitch', 0.45));
    const pitch = Math.atan2(fish.vy, Math.max(Math.abs(fish.vx), 30)) * k;
    return clamp(pitch, -1.1, 1.1) * sign + roll;
  }

  // -------------------------------------------------------- what's hovered --

  let hovered = null;

  function targets() {
    return String(get('fish.circle_targets', '.entry'));
  }

  document.addEventListener('pointerover', event => {
    if (get('fish.circle', true) === false) return;
    let el = null;
    try { el = event.target.closest(targets()); } catch (err) { return; }
    if (el) hovered = el;
  }, true);

  document.addEventListener('pointerout', event => {
    if (!hovered) return;
    const to = event.relatedTarget;
    if (!to || !hovered.contains(to)) hovered = null;
  }, true);

  /* The ring he swims around whatever the cursor is on: the thing's own box,
     pushed out by `circle_margin`, so he passes outside it rather than through
     it — but never wider than a couple of `circle_radius`, or a tall row would
     have him circling the whole screen. It is centred on the part of the thing
     you can actually see, so a half-scrolled row is still circled on screen. */
  function orbit() {
    if (!hovered || !hovered.isConnected) { hovered = null; return null; }
    const v = scene.view;
    const r = hovered.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > v.h) return null;

    const margin = Number(get('fish.circle_margin', 40));
    const radius = Number(get('fish.circle_radius', 150));
    const left = Math.max(r.left, 0), right = Math.min(r.right, v.w);
    const top = Math.max(r.top, 0), bottom = Math.min(r.bottom, v.h);

    return {
      cx: (left + right) / 2,
      cy: (top + bottom) / 2,
      rx: clamp(Math.min(r.width / 2 + margin, radius * 1.8), radius * 0.5, v.w * 0.42),
      ry: clamp(Math.min(r.height / 2 + margin, radius * 1.4), radius * 0.35, v.h * 0.38)
    };
  }

  // -------------------------------------------------------------- update --

  function update(t, dt) {
    fish.now = t;

    // the first frame the bowl has been measured, he goes in it
    if (!fish.placed && (state.bowl || state.broken)) {
      fish.placed = true;
      if (!state.broken) Aquarium.fish.reset();
    }

    if (fish.roll && t > fish.roll.at + fish.roll.dur) fish.roll = null;

    /* A click anywhere is a place to be. Above the waterline it is somewhere
       he has to leave the water to reach: if he is near enough the line he
       goes straight for it, and if he isn't he swims up and jumps when he
       gets there. */
    const click = state.lastClick;
    if (click && click.at > (fish.lastClickSeen || -1)) {
      fish.lastClickSeen = click.at;
      const sky = state.broken && click.y < state.surfaceY - 6
               && get('fish.jump_at_clicks', true) !== false;
      if (sky && canJump()) {
        jump(t, { x: click.x, y: click.y });
      } else if (sky && fish.mode === 'free') {
        fish.wantJump = { x: click.x, y: click.y, until: t + 3 };
        dashTo(click.x, state.surfaceY + length() * 0.4, t);
      } else {
        dashTo(click.x, click.y, t);
      }
    }

    // the one he was working his way up to, now that he is up there
    if (fish.wantJump) {
      if (t > fish.wantJump.until) fish.wantJump = null;
      else if (canJump()) jump(t, fish.wantJump);
    }

    // and one of his own, every so often, when he has nothing else on
    if (t > fish.nextJump) {
      if (canJump() && !fish.dash && !hovered && !following(t)) jump(t, null);
      else if (fish.mode === 'free') fish.nextJump = t + 2;
      else scheduleJump(t);
    }

    // a turn of his own, for no reason at all
    if (t > fish.nextRoll && fish.mode === 'free' && !fish.dash && !fish.dive) startRoll(t);

    if (fish.mode === 'leap') fly(t, dt);
    else if (fish.mode === 'jump') arc(t, dt);
    else swim(t, dt);

    // how long he has been off the edge of the window. Left to his own
    // devices out there, he turns round and comes back in.
    const v = scene.view;
    const away = fish.x < -4 || fish.x > v.w + 4 || fish.y > v.h + 4;
    fish.outside = away ? fish.outside + dt : 0;
    if (fish.outside > Number(get('fish.off_frame_return', 2.6))) {
      fish.outside = 0;
      if (fish.mode === 'free' && !fish.dash) {
        const inner = visibleBox();
        fish.target = {
          x: clamp(fish.x, inner.left + 40, inner.right - 40),
          y: rand(inner.top, inner.bottom)
        };
        fish.nextThink = t + 2;
      }
    }

    // the body wave runs faster the harder he is working
    const speed = Math.hypot(fish.vx, fish.vy);
    const base = Number(get('fish.stroke_rate', 1.5));
    const extra = Number(get('fish.stroke_speedup', 0.5));
    fish.phase += dt * Math.PI * 2 * (base + (speed / 220) * base * extra);

    // turning over: the drawing is squashed through zero rather than snapped,
    // which reads as the fish swinging round towards you. A dash turns harder.
    const turnTime = Math.max(0.03, Number(fish.dash
      ? get('fish.dash_turn', 0.07)
      : get('fish.turn_time', 0.16)));
    fish.flip += (fish.facing - fish.flip) * Math.min(1, dt / turnTime * 1.6);

    breathe(t, dt);
  }

  /* Out of the bowl. Three parts, on a clock that starts at the break:

     up     to the top of the screen, slowing into it, in `leap_rise` seconds;
     hang   held there until `leap_turn` seconds have gone, the turn — one or
            two flips — spread evenly over the whole of that time and ending
            nose down;
     fall   and only then does the water start to come in. He drops, nose
            first, and goes in wherever the two of them meet.

     He grows into the fish he is about to be over the up and the hang. */
  function fly(t, dt) {
    const L = fish.leap;
    const since = t - L.at;

    if (L.part !== 'fall') {
      const up = clamp(since / L.rise, 0, 1);
      const out = 1 - (1 - up) * (1 - up);          // slowing into the top
      const k = clamp(since / L.turn, 0, 1);
      const turned = k * k * (3 - 2 * k);           // slow in, slow out

      const py = fish.y;
      fish.x = lerp(L.x0, L.x1, clamp(since / L.turn, 0, 1));
      fish.y = lerp(L.y0, topOfLeap(), out);
      fish.vx = (L.x1 - L.x0) / L.turn;
      fish.vy = dt > 0 ? (fish.y - py) / dt : 0;
      fish.spin = L.spinEnd * turned;
      fish.grow = clamp(since / L.turn, 0, 1);

      // the top of the leap: the hero panels go up and away from here
      if (since >= L.rise && !L.apex) {
        L.apex = true;
        if (typeof Aquarium.onApex === 'function') Aquarium.onApex(t);
      }

      if (since >= L.turn) {
        L.part = 'fall';
        fish.spin = L.spinEnd;
        fish.grow = 1;
        fish.vx = 0;
        fish.vy = 0;
        // now the water comes
        if (Aquarium.raiseSurface) Aquarium.raiseSurface();
      }
      return;
    }

    const g = Math.max(100, Number(get('fish.leap_gravity', 1500)));
    fish.vy += g * dt;
    fish.y += fish.vy * dt;

    if (fish.vy > 0 && fish.y >= state.surfaceY) enter(t);
  }

  /* Where he hangs: near the top of the screen, but never so near that the
     turn takes his nose or his tail off it. */
  function topOfLeap() {
    const at = scene.view.h * Number(get('fish.leap_top', 0.12));
    return Math.max(at, length() * 0.55);
  }

  function swim(t, dt) {
    const b = box();
    if (!b) return;

    const p = state.pointer;

    const cruise = Number(get('fish.speed', 70));
    const top = Number(get('fish.max_speed', 1600));
    const gap = Number(get('fish.follow_gap', 90));
    const ease = Number(get('fish.follow_ease', 2.2));

    let goal = null;
    let want = cruise;
    let urgency = 1;

    /* 0. straight down. He comes out of the bowl head first and keeps going
       down until the water has finished rising — so the page opens by his
       taking it, rather than by his bobbing about at the top of it. */
    if (fish.dive) {
      const rising = typeof Aquarium.surfaceRising === 'function'
        ? Aquarium.surfaceRising() : false;
      // and while the page is taking him on down to something, he goes too
      const escort = state.escortY != null;
      if (escort) fish.dive.until = Math.max(fish.dive.until, t + 2);
      if (t > fish.dive.until || (!rising && !escort)) {
        fish.dive = null;
        fish.unwind = { at: t, from: rotation.last || 0,
                        dur: Math.max(0.05, Number(get('fish.dive_unwind', 0.8))) };
        fish.nextThink = t;
      } else {
        // When he broke out on his own, with nowhere to take the page, he
        // starts levelling out just before the water stops, so he is level
        // by the time he is free. With somewhere to go he stays nose down.
        const lead = Math.max(0, Number(get('fish.dive_level_lead', 0.6)));
        const remaining = typeof Aquarium.surfaceLeft === 'function' ? Aquarium.surfaceLeft() : 0;
        if (!fish.dive.level && !state.heading && !escort && rising && lead > 0 && remaining <= lead) {
          fish.dive.level = { at: t, dur: Math.max(0.05, remaining) };
        }
        // down to the bottom of the screen, nose first, and he holds there,
        // still swimming, until the water is all the way up
        const floor = scene.view.h - length() * Number(get('fish.dive_settle', 0.62));
        // on the way to a part of the page he holds the bottom of the screen
        // until it comes up to him, then rides it in to the top
        const y = escort ? clamp(state.escortY, length() * 0.6, floor) : floor;
        goal = { x: fish.x, y };
        // Coming up the screen while the page goes down faster still is
        // going down through the water, so nose down is still the right way
        // round for it.
        const left = Math.abs(y - fish.y);
        // On the way to a group he swims down to the bottom of the screen at
        // a dive's pace; once the group has come up to him he keeps right up
        // with it, so he gets there as the page does.
        const riding = escort && y < floor;
        const most = riding
          ? Number(get('fish.max_speed', 1600))
          : Number(get('fish.dive_speed', 230)) * (escort ? 2 : 1);
        want = left > 4 ? Math.min(most, left * (riding ? 8 : 3)) : 0;
        urgency = riding ? 6 : 2;
      }
    }

    // 1. a click he is on his way to
    if (!goal && fish.dash) {
      const d = fish.dash;
      const away = Math.hypot(d.x - fish.x, d.y - fish.y);
      if (t > d.until || away < Number(get('fish.dash_arrive', 26))) {
        fish.dash = null;
        fish.nextThink = t;
      } else {
        // A click just under the line is a place in the water like any other.
        // He is held off the surface by less on a dash than he holds himself
        // off it otherwise, so he arrives at it instead of stopping short.
        const skim = state.surfaceY + length() * Number(get('fish.dash_surface_gap', 0.05));
        goal = {
          x: clamp(d.x, b.left, b.right),
          y: clamp(d.y, Math.min(skim, b.top), b.bottom)
        };
        want = Number(get('fish.dash_speed', 1100));
        urgency = 6;
      }
    }

    // 2. something the cursor is resting on, to be circled
    if (!goal && fish.mode === 'free' && get('fish.circle', true) !== false) {
      const ring = orbit();
      if (ring) {
        const lead = Number(get('fish.circle_lead', 0.55));
        const a = Math.atan2((fish.y - ring.cy) / ring.ry,
                             (fish.x - ring.cx) / ring.rx) + lead;
        goal = {
          x: clamp(ring.cx + Math.cos(a) * ring.rx, b.left, b.right),
          y: clamp(ring.cy + Math.sin(a) * ring.ry, b.top, b.bottom)
        };
        want = Number(get('fish.circle_speed', 140));
        urgency = Math.max(0.2, Number(get('fish.circle_ease', 1.5)));
      }
    }

    // 3. somewhere a tap startled him to
    if (!goal && fish.hold) {
      if (t > fish.hold.until) { fish.hold = null; fish.nextThink = t; }
      else {
        goal = { x: fish.hold.x, y: fish.hold.y };
        want = Math.hypot(goal.x - fish.x, goal.y - fish.y) > 10 ? cruise * 3.4 : 0;
        urgency = 2.2;
      }
    }

    // 4. the cursor itself
    if (!goal && fish.mode === 'free' && following(t)) {
      goal = { x: clamp(p.x, b.left, b.right), y: clamp(p.y, b.top, b.bottom) };
      want = clamp((Math.hypot(goal.x - fish.x, goal.y - fish.y) - gap) * ease, 0, top);
    }

    // 5. his own business
    if (!goal) {
      if (!fish.target || t > fish.nextThink) newTarget(t);
      goal = fish.target || { x: fish.x, y: fish.y };
      // and if that is out past the edge of the window, he means it
      if (fish.target && fish.target.out) {
        want = cruise * Math.max(1, Number(get('fish.off_frame_speed', 3)));
        urgency = 1.6;
      }
      if (Math.hypot(goal.x - fish.x, goal.y - fish.y) < 30) {
        want = cruise * 0.25;
        if (t > fish.nextThink - 0.2) newTarget(t);
      }
    }

    const dx = goal.x - fish.x;
    const dy = goal.y - fish.y;
    const dist = Math.hypot(dx, dy) || 0.001;

    want = Math.min(want, top);
    const accel = Number(get('fish.accel', 3.2)) * urgency;
    fish.vx += ((dx / dist) * want - fish.vx) * Math.min(1, accel * dt);
    fish.vy += ((dy / dist) * want - fish.vy) * Math.min(1, accel * dt);

    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;

    /* He keeps to his water. The ceiling gives way on a dash: whatever is
       holding him off the surface the rest of the time, a click he is on his
       way to is somewhere he gets to. */
    const ceiling = fish.dash
      ? Math.min(b.top, state.surfaceY + length() * Number(get('fish.dash_surface_gap', 0.05)))
      : b.top;

    if (fish.x < b.left)   { fish.x = b.left;   fish.vx = Math.abs(fish.vx) * 0.4; }
    if (fish.x > b.right)  { fish.x = b.right;  fish.vx = -Math.abs(fish.vx) * 0.4; }
    if (fish.y < ceiling)  { fish.y = ceiling;  fish.vy = Math.abs(fish.vy) * 0.4; }
    if (fish.y > b.bottom) { fish.y = b.bottom; fish.vy = -Math.abs(fish.vy) * 0.4; }

    /* And if his back came through the line on the way, the water says so —
       once, with a gap after it, so skimming along the top is not a drum roll. */
    if (fish.mode === 'free' && state.broken && state.pour > 0.9) {
      const out = state.surfaceY - (fish.y - length() * bodyRatio() * 0.4);
      const quick = Math.abs(fish.vy) > Number(get('fish.break_speed', 140));
      if (out > 0 && quick && (t - fish.lastBreak) > Number(get('fish.break_gap', 1.1))) {
        breakSurface(t, clamp(0.35 + out / 60, 0.35, 1.1));
      }
    }

    // which way round he is drawn, with a little hysteresis so that a fish
    // hovering over the cursor doesn't flicker. Mid-roll it is left alone:
    // he is already turning, and a mirror on top of that reads as a glitch.
    if (!fish.dash && !fish.roll && !fish.dive) {
      if (fish.vx > 14) fish.facing = 1;
      if (fish.vx < -14) fish.facing = -1;
    }
  }

  /* The moment he lands: nose first, and he keeps going. */
  function enter(t) {
    fish.mode = 'free';
    fish.grow = 1;
    fish.spin = 0;
    fish.spinRate = 0;

    /* He went in head down and he carries on head down — the water taking him
       rather than catching him. The dive runs until the surface has finished
       climbing; `until` is only there in case it never says so. */
    const rise = Number(get('water.rise_time', 3.4));
    fish.dive = { until: t + rise + 3 };
    fish.vy = Math.max(Math.abs(fish.vy) * 0.5, Number(get('fish.dive_speed', 230)) * 0.8);
    fish.vx = 0;
    fish.target = null;
    fish.dash = null;

    breakSurface(t, 1.9);
    // the clock on both of the things he now does of his own accord starts
    // here, so neither of them happens the second he gets in the water
    scheduleJump(t);
    const [lo, hi] = range('fish.roll_every', 7, 18);
    fish.nextRoll = t + rand(lo, hi) * 0.6;
    if (typeof Aquarium.onSplash === 'function') Aquarium.onSplash(t);
  }

  // ---------------------------------------------------------------- draw --

  function draw(ctx, env) {
    if (!ready) return;
    update(env.t, env.dt);

    /* The drawing he is wearing, and how wide it is drawn. `flip` carries both:
       its sign says which of the two it is, its size how far through a turn he
       is. The drawing is never mirrored — at the middle of a turn one is at no
       width at all, and the other opens out of it. */
    const side = sideNow();
    const sheet = sheets[side];
    const shade = shades[side];
    if (!sheet) return;
    // a project page is laid over the water; he waits behind it, unseen
    if (document.body.classList.contains('detail-open')) return;

    const len = length();
    const h = len * shape[side];
    const rot = rotation();
    rotation.last = rot;
    const squash = Math.max(0.02, Math.abs(fish.flip));

    const wiggle = Number(get('fish.wiggle', 0.55)) * h * 0.14;
    const waves = Number(get('fish.wave_length', 1.2));
    const steady = clamp(Number(get('fish.head_steady', 0.26)), 0, 0.9);

    ctx.save();
    ctx.translate(fish.x, fish.y);
    ctx.rotate(rot);
    ctx.scale(squash, 1);

    const strips = Math.max(10, Math.round(len / 4));
    const stripW = sheet.width / strips;
    const outW = len / strips;

    // his shadow: one soft blit, under him and a little behind. Only in the
    // water — in the air there is nothing behind him for it to fall on.
    const shadow = Number(get('fish.shadow', 0.12));
    const airborne = fish.mode === 'leap' || fish.mode === 'jump';
    if (shadow > 0 && !airborne) {
      ctx.save();
      ctx.globalAlpha = shadow;
      ctx.drawImage(shade, -len / 2 + len * 0.03, -h / 2 + h * 0.1, len, h);
      ctx.restore();
    }

    // and the fish, strip by strip, with the wave running down him
    for (let i = 0; i < strips; i++) {
      // 0 at the nose, 1 at the tail, whichever way this drawing faces
      const u = (i + 0.5) / strips;
      const s = side === 'left' ? u : 1 - u;
      const amount = Math.pow(clamp((s - steady) / (1 - steady), 0, 1), 1.6);
      const dy = Math.sin(fish.phase - s * waves * Math.PI * 2) * wiggle * amount;
      ctx.drawImage(
        sheet,
        i * stripW, 0, stripW + 0.6, sheet.height,
        -len / 2 + i * outW, -h / 2 + dy, outW + 0.8, h
      );
    }
    ctx.restore();

    // the water lit up around him
    const glow = Number(get('fish.glow', 0.3));
    if (glow > 0) {
      const g = ctx.createRadialGradient(fish.x, fish.y, 0, fish.x, fish.y, len * 0.9);
      g.addColorStop(0, `rgba(255, 140, 70, ${0.16 * glow})`);
      g.addColorStop(1, 'rgba(255, 140, 70, 0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fish.x, fish.y, len * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBubbles(ctx, env) {
    if (!bubbles.length) return;
    ctx.save();
    for (const b of bubbles) {
      const age = (env.t - b.born) / b.life;
      const alpha = clamp(1 - age, 0, 1) * 0.5;
      ctx.strokeStyle = `rgba(226, 250, 255, ${alpha})`;
      ctx.fillStyle = `rgba(226, 250, 255, ${alpha * 0.18})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------- the API --

  Aquarium.fish = {
    get: () => fish,

    /* A tap that isn't the last one. */
    startle(step, final, t) {
      if (fish.mode === 'bowl') startle(step, final, t);
    },

    /* The glass has gone: he throws himself out of it, up to the top of the
       screen, and turns over there. The turn always finishes nose down. */
    release(t) {
      if (fish.mode !== 'bowl') return;
      fish.mode = 'leap';
      fish.hold = null;
      fish.dash = null;
      fish.spin = 0;
      fish.grow = 0;

      const spread = Number(get('fish.leap_spread', 170));
      const rise = Math.max(0.2, Number(get('fish.leap_rise', 1)));
      const turn = Math.max(rise, Number(get('fish.leap_turn', 2)));
      const v = scene.view;
      const x1 = clamp(fish.x + rand(-spread, spread), v.w * 0.1, v.w * 0.9);

      /* The turns, and the angle they have to finish on: whole turns for the
         look of it, and then the quarter that leaves him pointing at the
         water. Which quarter depends on the drawing he is wearing — the one
         facing left has its nose at the other end, so nose-down is the other
         way round for it. */
      const [few, many] = range('fish.leap_flips', 1, 2);
      const turns = Math.round(rand(few, many));
      const way = x1 >= fish.x ? 1 : -1;
      const noseDown = (Math.PI / 2) * (fish.facing >= 0 ? 1 : -1);

      fish.leap = {
        at: t, part: 'up', rise, turn,
        x0: fish.x, y0: fish.y, x1,
        spinEnd: turns * Math.PI * 2 * way + noseDown
      };
    },

    reset() {
      fish.mode = 'bowl';
      fish.facing = -1;
      fish.flip = -1;
      fish.dive = null;
      fish.leap = null;
      fish.unwind = null;
      fish.lastBreak = -9;
      fish.vx = -20; fish.vy = 0;
      fish.grow = 0;
      fish.spin = 0;
      fish.spinRate = 0;
      fish.dash = null;
      fish.hold = null;
      fish.target = null;
      fish.roll = null;
      fish.wantJump = null;
      fish.outside = 0;
      fish.nextRoll = fish.now + 6;
      fish.nextJump = fish.now + 7;
      bubbles.length = 0;
      const b = bowlBox();
      if (b) { fish.x = (b.left + b.right) / 2; fish.y = (b.top + b.bottom) / 2; }
    },

    place(x, y) { fish.x = x; fish.y = y; }
  };

  /* ------------------------------------------------------------- scroll --

     The water does not scroll: the canvas is fixed and the waterline is held
     at a point on the page, so going down the page is going down through the
     water rather than past a picture of it. He belongs to the water, so he
     goes with it — the page takes him along as it moves, by `scroll_drag` of
     however far it went, and he swims back to whatever he was doing from
     wherever that leaves him.

     At 1 he is pinned to the page and the window slides past him; at 0 he
     stays where he is on the screen, as he did before. Where he was going goes
     with him, or he would turn round and swim back up the moment he arrived. */

  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const dy = y - lastScrollY;
    lastScrollY = y;
    if (!dy || !state.broken || state.autoScroll) return;

    const drag = Number(get('fish.scroll_drag', 0.8));
    if (!drag) return;
    const carry = dy * clamp(drag, 0, 1);

    fish.y -= carry;
    if (fish.target) fish.target.y -= carry;
    if (fish.dash) fish.dash.y -= carry;
    if (fish.hold) fish.hold.y -= carry;
    for (const b of bubbles) b.y -= carry;
  }, { passive: true });

  loadSprites();
  scene.add(50, draw);
  scene.add(55, drawBubbles);

})();
