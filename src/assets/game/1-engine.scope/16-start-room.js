  // ------------------------------------------------------------ the start --

  /* The light in the mouth of a tunnel, coming from the edge of the screen at
     (x, y). All of it is drawn, the half past the edge too: as the place
     slides away that half comes on screen, over the tunnel's water, so the
     light has no edge where the place ends. It goes under the rock. */
  function mouthLight(x, y, reach) {
    const pulse = 0.5 + Math.sin(clock * 2.4) * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(x, y, 0, x, y, reach);
    glow.addColorStop(0, `rgba(255, 186, 120, ${0.10 + pulse * 0.08})`);
    glow.addColorStop(1, 'rgba(255, 186, 120, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);
    ctx.restore();
  }

  /* The coral wall: rock along the right edge with a passage through the
     middle of it, lipped where it opens, and coral growing off its face.
     The passage is lit warm from the far end, calling him in. */
  function coral() {
    const { w, h } = view;
    const x0 = w - wallW();
    const g = gapH() / 2;
    const cy = h / 2;
    const far = 90;
    const amp = clamp(wallW() * 0.16, 10, 22);

    mouthLight(w, cy, wallW() + g * 1.6);

    const upper = shapeOf('coral-up', () => rockShape(
      [[w + far, -far], [x0, -far], [x0, cy - g], [w + far, cy - g]],
      [false, true, true, false], amp, 3.1));
    const lower = shapeOf('coral-down', () => rockShape(
      [[x0, h + far], [w + far, h + far], [w + far, cy + g], [x0, cy + g]],
      [false, false, true, true], amp, 3.1));
    stampRock('start', () => {
      drawRock(upper, 1);
      drawRock(lower, 2);
    });

    // coral on the face, none in the mouth of the passage
    const clear = (x, y) => Math.abs(y - cy) < g + 26 || x > x0 + wallW() * 0.5 || y < 70;   // and the buttons
    coralOn(upper, 14, 1, 1, clear);
    coralOn(lower, 14, 2, 1, clear);
  }
