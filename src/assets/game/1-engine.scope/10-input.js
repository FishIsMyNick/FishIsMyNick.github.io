  // ---------------------------------------------------------------- input --

  const interactive = 'a, button, input, select, textarea, video, model-viewer, summary, label, .game-room-bar';

  layer.addEventListener('pointermove', event => {
    // the mouse only counts again once it has really moved
    if (event.clientX !== pointer.x || event.clientY !== pointer.y) pointer.keyed = false;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.inside = true;
    pointer.moved = clock;
  });
  layer.addEventListener('pointerleave', () => { pointer.inside = false; });

  layer.addEventListener('pointerdown', event => {
    if (!running || inSettings || event.button > 0) return;
    if (event.target.closest && event.target.closest(interactive)) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.inside = true;
    pointer.keyed = false;
    const held = holder();
    if (held) { held.tap(level, event.clientX, event.clientY); return; }
    dash(event.clientX, event.clientY);
  });

  const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
                 a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };

  document.addEventListener('keydown', event => {
    if (!running || inSettings || scene === 'room') return;
    if (event.target.closest && event.target.closest('input, textarea, select')) return;
    const k = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (KEYS[k]) pointer.keyed = true;   // he stops following the mouse until it moves
    const held = holder();
    if (held) {
      // one press, one step: every step costs, so holding a key doesn't repeat
      if (KEYS[k]) {
        event.preventDefault();
        if (!event.repeat) held.press(level, KEYS[k][0], KEYS[k][1]);
      }
      return;
    }
    if (KEYS[k]) { keys.add(k); event.preventDefault(); }
    else if (k === ' ' && !(event.target.closest && event.target.closest('button, a'))) {
      event.preventDefault();
      const [kx, ky] = keyDir();
      const dx = kx || ky ? kx : fish.facing;
      dash(fish.x + dx * 200, fish.y + ky * 200);
    }
  });
  document.addEventListener('keyup', event => {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });

  function keyDir() {
    let x = 0, y = 0;
    for (const k of keys) { x += KEYS[k][0]; y += KEYS[k][1]; }
    const d = Math.hypot(x, y) || 1;
    return [x / d, y / d];
  }

  function dash(tx, ty) {
    if (scene === 'room') { swimTo(tx, ty); return; }
    if (move || fish.cool > 0) return;
    if (scene !== 'start' && scene !== 'level' && scene !== 'room') return;
    let dx = tx - fish.x, dy = ty - fish.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) { dx = fish.facing; dy = 0; } else { dx /= d; dy /= d; }
    const speed = num('dash_speed', 1250);
    fish.dash = { vx: dx * speed, vy: dy * speed, left: num('dash_time', 0.32) };
    fish.cool = num('dash_cooldown', 0.4);
    if (Math.abs(dx) > 0.2) fish.facing = Math.sign(dx);
    for (let i = 0; i < 5; i++) puff(fish.x - dx * halfW(), fish.y - dy * halfW(), 1);
    if (sound()) sound().bubble(0.9);
  }
