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
     runs out along the surface, a ring on it, and the sound of it. `big`
     is the dive: the landing after the break gets its own, bigger sound. */
  function breakSurface(t, strength, big = false) {
    fish.lastBreak = t;
    const s = clamp(strength, 0.1, 2.4);
    if (big) Portfolio.sound.bigSplash();
    else Portfolio.sound.splash(clamp(s, 0.2, 1.2));
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
