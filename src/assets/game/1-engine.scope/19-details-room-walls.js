  /* A details room's walls: the same rock all round, with the shaft up
     through the middle of the ceiling, and the groove of the scroll bar. It
     darkens as the page scrolls: a shade the shape of the rock, laid over
     it, stronger the deeper he is. */
  function roomShape(i) {
    const { w, h } = view;
    const b = border(), t = borderTop();
    const H = holeW() / 2;
    const far = OVERLAP;
    return shapeOf('room' + i, () => rockShape(
      [[w / 2 + H, -far], [w + far, -far], [w + far, h + far], [-far, h + far], [-far, -far],
       [w / 2 - H, -far], [w / 2 - H, t], [b, t], [b, h - b], [w - b, h - b], [w - b, t], [w / 2 + H, t]],
      [false, false, false, false, false, true, true, true, true, true, true, true], rockAmp(), 40 + i));
  }

  function bakeRoom(i, hasBar) {
    return bakeRock(`room${i}:${hasBar}`, () => {
      drawRock(roomShape(i), 40 + i);
      if (hasBar) drawGroove(barTrack(), 40 + i);
    });
  }

  function bakeRoomShade(i) {
    return bakeRock('roomshade' + i, () => {
      ctx.fillStyle = '#000000';
      ctx.fill(roomShape(i).outline);
    });
  }

  function roomFrame(i) {
    const bar = barPlace();
    stampBaked(bakeRoom(i, !!bar));
    const dark = clamp(roomDepth() - 0.4, 0, 1) * 0.55;
    if (dark > 0) {
      ctx.save();
      ctx.globalAlpha = dark;
      stampBaked(bakeRoomShade(i));
      ctx.restore();
    }
    if (bar) drawStone(bar, 40 + i);
  }

  /* The room's scroll bar, cut into its right wall: a groove down the middle
     of the rock and a stone that slides in it. The wall stays as thick as the
     others. Nothing when the page fits. */
  function barTrack() {
    const b = border();
    const t = borderTop();
    return { x: view.w - b / 2, wide: b * 0.8, y0: t + 8, len: view.h - t - b - 16 };
  }

  function barPlace() {
    if (roomSize.most <= 0) return null;
    const track = barTrack();
    const size = clamp(track.len * roomSize.client / roomSize.height, 48, track.len * 0.8);
    return { ...track, size, most: roomSize.most,
             y: track.y0 + (track.len - size) * clamp(roomSize.scroll / roomSize.most, 0, 1) };
  }

  /* A loose stone: a squared-off blob with an uneven edge, all of it a face,
     centred on 0,0 so its pits and pebbles travel with it. */
  function stoneShape(wide, tall, seed) {
    const pts = [];
    const steps = Math.max(32, Math.round(tall / 2));
    const round = (wide + tall) * 2 / steps;
    const pow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
    for (let k = 0; k < steps; k++) {
      const a = k / steps * Math.PI * 2;
      const bump = 2.4 * wobble(k * round * 2.2, seed);
      pts.push([pow(Math.cos(a), 0.65) * (wide / 2 - 1.6) + Math.cos(a) * bump,
                pow(Math.sin(a), 0.65) * (tall / 2 - 1.6) + Math.sin(a) * bump]);
    }
    const outline = new Path2D();
    pts.forEach(([x, y], k) => (k ? outline.lineTo(x, y) : outline.moveTo(x, y)));
    outline.closePath();
    // a few cracks across it, each from one side part of the way over
    const cracks = [];
    for (let k = 0; k < Math.floor(tall / 34); k++) {
      const dir = hash(seed + k * 3) < 0.5 ? -1 : 1;
      const y = (k + 0.5 + (hash(seed + k * 3 + 1) - 0.5) * 0.5) * 34 - tall / 2 + (tall % 34) / 2;
      const reach = wide * (0.35 + hash(seed + k * 3 + 2) * 0.4);
      cracks.push([[dir * wide / 2, y],
                   [dir * (wide / 2 - reach * 0.5), y + (hash(seed + k) - 0.5) * 8],
                   [dir * (wide / 2 - reach), y + (hash(seed + k + 9) - 0.5) * 12]]);
    }
    return { outline, faces: [[...pts, pts[0]]], out: 1, pts, cracks };
  }

  function drawGroove(bar, seed) {
    const half = bar.wide * 0.34;
    const groove = new Path2D();
    const top = bar.y0 - 4, bottom = bar.y0 + bar.len + 4;
    const side = (y, dir) => bar.x + dir * (half + 1.2 * wobble(y, seed + dir));
    const steps = Math.ceil((bottom - top) / 8);
    groove.moveTo(side(top, -1), top + 3);
    for (let k = 1; k <= steps; k++) {
      const y = top + (bottom - top) * k / steps;
      groove.lineTo(side(y, -1), y);
    }
    groove.quadraticCurveTo(bar.x, bottom + 5, side(bottom, 1), bottom);
    for (let k = steps - 1; k >= 0; k--) {
      const y = top + (bottom - top) * k / steps;
      groove.lineTo(side(y, 1), y);
    }
    groove.quadraticCurveTo(bar.x, top - 5, side(top, -1), top + 3);
    groove.closePath();
    ctx.fillStyle = 'rgba(10, 2, 8, .34)';
    ctx.fill(groove);
    ctx.strokeStyle = 'rgba(255, 214, 228, .06)';
    ctx.lineWidth = 1;
    ctx.stroke(groove);
  }

  /* The stone, standing a little proud of the groove; its shadow stays on
     the wall, off the room. */
  function drawStone(bar, seed) {
    const pad = 30;
    const tall = Math.round(bar.size);
    const stone = shapeOf(`stone${tall}`, () => stoneShape(bar.wide, tall, seed));
    const img = bake(`stone${tall}`, bar.wide + pad * 2, tall + pad * 2, () => {
      ctx.translate(bar.wide / 2 + pad, tall / 2 + pad);
      drawRock(stone, seed);
      // rounded: lit on the room's side, in shadow on the other, cracks over it
      ctx.clip(stone.outline);
      const shade = ctx.createLinearGradient(-bar.wide / 2, 0, bar.wide / 2, 0);
      shade.addColorStop(0, 'rgba(255, 214, 228, .14)');
      shade.addColorStop(0.45, 'rgba(255, 214, 228, 0)');
      shade.addColorStop(1, 'rgba(10, 2, 8, .55)');
      ctx.fillStyle = shade;
      ctx.fillRect(-bar.wide, -tall, bar.wide * 2, tall * 2);
      ctx.strokeStyle = 'rgba(10, 2, 8, .55)';
      ctx.lineWidth = 1.2;
      for (const crack of stone.cracks) {
        ctx.beginPath();
        crack.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    });
    ctx.save();
    ctx.beginPath();
    ctx.rect(view.w - border(), 0, border(), view.h);
    ctx.clip();
    ctx.translate(bar.x, bar.y + bar.size / 2);
    ctx.drawImage(img, -bar.wide / 2 - pad, -tall / 2 - pad, bar.wide + pad * 2, tall + pad * 2);
    const dark = barHot ? 0 : clamp(roomDepth() - 0.4, 0, 1) * 0.55;
    if (dark > 0) {
      ctx.globalAlpha = dark;
      ctx.fillStyle = '#000000';
      ctx.fill(stone.outline);
    }
    ctx.restore();
  }

  function chevron(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-8, -14); ctx.lineTo(8, 0); ctx.lineTo(-8, 14);
    ctx.lineTo(-14, 14); ctx.lineTo(2, 0); ctx.lineTo(-14, -14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
