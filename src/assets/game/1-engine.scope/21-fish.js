  // ------------------------------------------------------------ the fish --

  /* Him, the way 05-fish.scope draws him in the portfolio: the drawing cut
     into strips with a wave run down them, nose steady. `rot` and `flip`
     as there: `flip`'s sign is which drawing, its size how far through a
     turn. And on his head, the level's hat. */
  function drawFish(x, y, rot, flip, len, hat, lift = 0) {
    const side = flip >= 0 ? 'right' : 'left';
    const sheet = sheets[side];
    if (!sheet) return;
    const h = len * shape[side];
    const wiggle = 0.55 * h * 0.14;
    const steady = 0.26;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(Math.max(0.02, Math.abs(flip)), 1);

    const strips = Math.max(10, Math.round(len / 4));
    const stripW = sheet.width / strips;
    const outW = len / strips;
    for (let i = 0; i < strips; i++) {
      const u = (i + 0.5) / strips;
      const s = side === 'left' ? u : 1 - u;
      const amount = Math.pow(clamp((s - steady) / (1 - steady), 0, 1), 1.6);
      const dy = Math.sin(fish.phase - s * 1.2 * Math.PI * 2) * wiggle * amount;
      ctx.drawImage(sheet, i * stripW, 0, stripW + 0.6, sheet.height,
                    -len / 2 + i * outW, -h / 2 + dy, outW + 0.8, h);
    }

    if (hat) {
      const hx = num('hat_x', 0.78), hy = num('hat_y', 0.2);
      ctx.translate(side === 'right' ? (hx - 0.5) * len : (0.5 - hx) * len, (hy - 0.5) * h);
      if (side === 'left') ctx.scale(-1, 1);
      ctx.translate(0, -lift);
      ctx.rotate(-0.12);
      drawHat(hat, len * num('hat_size', 0.34));
    }
    ctx.restore();
  }

  /* A tunnel to a place with a different hat: the new one floats in the
     tunnel, drifting along it towards him, and he swims up under it. At
     that moment (`u` of the way through) it drops onto his head and knocks
     the old one off to be left behind. Going back to the start there is
     nothing to pick up, and the old one just comes off. */
  function hatPick(from, to, dir, total) {
    const old = hatOf(from), fresh = hatOf(to);
    if (old === fresh) return null;
    const u = 0.38;
    return { u, old, fresh, slid: Math.round(dir * total * easeInOut(u)), at: 0 };
  }

  function hatSpot(m, len) {
    const side = m.dir >= 0 ? 'right' : 'left';
    const h = len * shape[side];
    const e = easeInOut(m.pick.u);
    return {
      x: lerp(m.p0.x, m.p1.x, e) + (num('hat_x', 0.78) - 0.5) * len * m.dir,
      y: view.h / 2 + (num('hat_y', 0.2) - 0.5) * h,
      lift: len * 0.28
    };
  }

  function drawLooseHat(kind, x, y, rot, face, len) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(face, 1);
    drawHat(kind, len * num('hat_size', 0.34));
    ctx.restore();
  }

  /* The hats in the tunnel: `u` and `slid` as in drawMove, between a and b
     on the screen. Gives back the hat on his head and how far above it. */
  function tunnelHats(m, u, slid, a, b, len) {
    const pick = m.pick;
    if (!pick) return { hat: hatOf(m.from), lift: 0 };
    const spot = hatSpot(m, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.max(a, 0), 0, Math.min(b, view.w) - Math.max(a, 0), view.h);
    ctx.clip();
    if (u < pick.u) {
      if (pick.fresh) {
        const x = spot.x - (slid - pick.slid) * 0.55;
        const bob = Math.sin(clock * 3) * 7 * clamp(Math.abs(x - spot.x) / 120, 0, 1);
        drawLooseHat(pick.fresh, x, spot.y - spot.lift + bob, -0.12, m.dir, len);
      }
    } else {
      if (!pick.at) {
        pick.at = clock;
        for (let i = 0; i < 8; i++) puff(spot.x + rand(-20, 20), spot.y + rand(-10, 20), 0.8);
        if (sound()) { sound().tap(0.8); sound().bubble(1); }
      }
      // the old one, left behind with the tunnel
      if (pick.old) {
        const t = clock - pick.at;
        drawLooseHat(pick.old, spot.x - (slid - pick.slid) - m.dir * 40 * t, spot.y - 50 * t + 70 * t * t,
                     -0.12 - m.dir * 2.4 * t, m.dir, len);
      }
    }
    ctx.restore();
    if (u < pick.u) return { hat: pick.old, lift: 0 };
    const drop = clamp((clock - pick.at) / 0.22, 0, 1);
    return { hat: pick.fresh, lift: spot.lift * (1 - drop * drop) };
  }

  /* Three hats, each drawn sitting on (0, 0) and facing +x. */
  function drawHat(kind, s) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    if (kind === 'conductor') {
      // a train conductor's cap: navy, a gold band, a black peak
      ctx.fillStyle = '#1f2f5c';
      ctx.strokeStyle = '#0e1630';
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, 0);
      ctx.lineTo(-s * 0.46, -s * 0.5);
      ctx.quadraticCurveTo(0, -s * 0.62, s * 0.46, -s * 0.5);
      ctx.lineTo(s * 0.4, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e0b341';
      ctx.fillRect(-s * 0.41, -s * 0.16, s * 0.82, s * 0.12);
      ctx.beginPath();
      ctx.arc(s * 0.05, -s * 0.33, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.ellipse(s * 0.45, -s * 0.02, s * 0.3, s * 0.07, 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'tricorn') {
      // a pirate's tricorn: black, gold edged, a little skull on the front
      ctx.fillStyle = '#17141a';
      ctx.strokeStyle = '#d9a93e';
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, -s * 0.12);
      ctx.quadraticCurveTo(-s * 0.3, -s * 0.72, 0, -s * 0.58);
      ctx.quadraticCurveTo(s * 0.32, -s * 0.72, s * 0.66, -s * 0.16);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.2, s * 0.08, s * 0.04);
      ctx.quadraticCurveTo(-s * 0.2, -s * 0.12, -s * 0.62, -s * 0.12);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f2ead8';
      ctx.beginPath();
      ctx.arc(s * 0.1, -s * 0.3, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(s * 0.06, -s * 0.24, s * 0.08, s * 0.06);
    } else {
      // a yellow hard hat with a lamp on the front
      ctx.fillStyle = '#f2c230';
      ctx.strokeStyle = '#a07a10';
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.06, s * 0.42, s * 0.42, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.04, -s * 0.47);
      ctx.lineTo(-s * 0.04, -s * 0.08);
      ctx.stroke();
      ctx.fillStyle = '#e3b11f';
      ctx.beginPath();
      ctx.ellipse(s * 0.05, -s * 0.04, s * 0.6, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath();
      ctx.arc(s * 0.3, -s * 0.24, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(s * 0.3, -s * 0.24, 0, s * 0.3, -s * 0.24, s * 0.5);
      glow.addColorStop(0, 'rgba(255, 240, 170, .45)');
      glow.addColorStop(1, 'rgba(255, 240, 170, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(s * 0.3, -s * 0.24, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function hatOf(place) {
    if (!place || place.kind === 'start') return null;
    return levels[place.i] ? levels[place.i].hat : null;
  }

  /* Him, free: turning the way he's going, his nose following his climb. */
  function drawFree(dt) {
    const speed = Math.hypot(fish.vx, fish.vy);
    const flipRate = dt / 0.12;
    fish.flip = fish.facing > 0 ? Math.min(1, fish.flip + flipRate) : Math.max(-1, fish.flip - flipRate);
    fish.phase += dt * Math.PI * 2 * 1.5 * (1 + Math.min(speed / 500, 2) * 0.8);
    const pitch = clamp(Math.atan2(fish.vy, Math.max(Math.abs(fish.vx), 60)) * 0.6, -0.8, 0.8);
    const rot = pitch * (fish.flip >= 0 ? 1 : -1) + (scene === 'room' ? rollAngle() : 0);
    drawFree.rot = rot;
    if (Math.random() < dt * 0.6) puff(fish.x + fish.facing * fishLen() * 0.45, fish.y - fishTall() * 0.1, 0.7);
    frosted(scene === 'room' ? roomRect(0, 0) : null, soft => {
      if (!soft) drawBubbles(dt);
      drawFish(fish.x, fish.y, rot, fish.flip, fishLen(), hatOf(here));
    });
  }
