  // ------------------------------------------------------------- swimming --

  function swim(dt) {
    if (scene === 'room') { swimRoom(dt); return; }
    const max = num('swim_speed', 520);
    if (fish.cool > 0) fish.cool -= dt;

    if (fish.dash) {
      fish.vx = fish.dash.vx;
      fish.vy = fish.dash.vy;
      fish.dash.left -= dt;
      if (fish.dash.left <= 0) {
        fish.dash = null;
        fish.dashEnd = clock;
        fish.vx *= 0.35; fish.vy *= 0.35;
      }
      if (Math.random() < dt * 40) puff(fish.x - Math.sign(fish.vx) * halfW(), fish.y, 0.6);
    } else {
      let want = [0, 0];
      const [kx, ky] = keyDir();
      const ring = !kx && !ky && !pointer.keyed && scene === 'start' && Aquarium.get('fish.circle', true) !== false && orbit();
      if (kx || ky) want = [kx * max, ky * max];
      else if (ring) {
        // the story: swim over to it, then lazily round it
        const goal = roundRing(ring, startBox());
        const dx = goal.x - fish.x, dy = goal.y - fish.y;
        const d = Math.hypot(dx, dy) || 1;
        const speed = Math.min(max, Math.max(fcfg('circle_speed', 140), (d - 200) * 2));
        want = [dx / d * speed, dy / d * speed];
      } else if (pointer.inside && !pointer.keyed) {
        const [px, py] = aim(pointer.x, pointer.y);
        const dx = px - fish.x, dy = py - fish.y;
        const d = Math.hypot(dx, dy);
        const stop = fishLen() * 0.3;
        const speed = Math.min(max, Math.max(0, d - stop) * num('swim_ease', 3.2));
        if (d > 1) want = [dx / d * speed, dy / d * speed];
      }
      const k = Math.min(1, dt * 4);
      fish.vx += (want[0] - fish.vx) * k;
      fish.vy += (want[1] - fish.vy) * k;
    }

    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;
    if (Math.abs(fish.vx) > 30) fish.facing = Math.sign(fish.vx);
  }
