  // ----------------------------------------------------------------- rock --

  /* All the rock in the game is drawn here, so the start's wall, the walls
     round a level and the tunnels between them are the same stone: a
     purple-brown, lit along the edge it shows to the water and darker the
     further in, with a soft shadow cast onto the water in front of it. */
  const ROCK = { deep: '#1c0f18', base: '#33202c', mid: '#4a2f3d', light: '#6b4757', rim: '#9a6f80' };

  /* The unevenness of a rock face at `t` along it: three waves of different
     lengths, so it never repeats in a way the eye catches. The same `t`
     always gives the same bump, so a face that slides keeps its shape. */
  function wobble(t, seed) {
    return Math.sin(t * 0.021 + seed) * 0.5
         + Math.sin(t * 0.057 + seed * 2.3) * 0.32
         + Math.sin(t * 0.143 + seed * 4.1) * 0.18;
  }

  /* A piece of rock. `pts` go round its outline; `rough[i]` says whether the
     edge from pts[i] to the next is a face onto the water (the rest are off
     the screen). Faces get an uneven edge, `amp` deep, and where two faces
     meet the corner is rounded off into a lip. The first edge must not be a
     face. Gives back the outline as a Path2D and the faces as point lists.
     `span` is the stretch along a face that has bumps, the screen unless
     said: past its ends a face runs dead straight, so that the rock of the
     place and of the passage joining it lie on the same line where they
     overlap. */
  function rockShape(pts, rough, amp, seed, span = null) {
    const n = pts.length;
    const R = 24;
    const outline = new Path2D();
    const faces = [];
    let face = null;
    let first = true;
    let last = null;
    const add = (x, y) => {
      if (first) { outline.moveTo(x, y); first = false; } else outline.lineTo(x, y);
      if (face) face.push([x, y]);
      last = [x, y];
    };

    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      if (!rough[i]) {
        if (face) { faces.push(face); face = null; }
        add(p[0], p[1]);
        continue;
      }
      const prev = rough[(i - 1 + n) % n], next = rough[(i + 1) % n];
      const dx = q[0] - p[0], dy = q[1] - p[1];
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const nx = -uy, ny = ux;
      const cutA = prev ? Math.min(R, len / 3) : 0;
      const cutB = next ? Math.min(R, len / 3) : 0;
      const flat = Math.abs(ux) > Math.abs(uy);
      const steps = Math.max(2, Math.ceil((len - cutA - cutB) / 7));
      let begun = false;
      for (let k = 0; k <= steps; k++) {
        const d = cutA + (len - cutA - cutB) * k / steps;
        const x = p[0] + ux * d, y = p[1] + uy * d;
        // fade the bumps out where a face meets an edge that isn't one
        const taper = (prev ? 1 : clamp(d / R, 0, 1)) * (next ? 1 : clamp((len - d) / R, 0, 1));
        const along = flat ? x : y;
        const lo = span ? span[0] : 0, hi = span ? span[1] : flat ? view.w : view.h;
        const pinned = clamp(Math.min(along - lo, hi - along) / 40, 0, 1);
        const off = amp * wobble(along, seed + (flat ? 0 : 7.7)) * taper * pinned;
        const px = x + nx * off, py = y + ny * off;
        if (!begun) {
          begun = true;
          if (!face) face = [];
          // round the corner from the face before onto this one
          if (cutA && last) {
            for (let c = 1; c < 6; c++) {
              const t = c / 6;
              add((1 - t) * (1 - t) * last[0] + 2 * (1 - t) * t * p[0] + t * t * px,
                  (1 - t) * (1 - t) * last[1] + 2 * (1 - t) * t * p[1] + t * t * py);
            }
          }
        }
        add(px, py);
      }
    }
    if (face) faces.push(face);
    outline.closePath();

    // which side of each face the water is on: the outline's winding says
    let area = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      area += p[0] * q[1] - q[0] * p[1];
    }
    return { outline, faces, out: area > 0 ? 1 : -1, pts };
  }

  function strokeFace(face) {
    ctx.beginPath();
    ctx.moveTo(face[0][0], face[0][1]);
    for (let i = 1; i < face.length; i++) ctx.lineTo(face[i][0], face[i][1]);
    ctx.stroke();
  }

  /* Draw a piece: its shadow on the water, the stone, the light along its
     face, and the pits and pebbles in it. `dark` 0–1 takes the light down
     with depth. */
  function drawRock(shape, seed, dark = 0) {
    const tone = c => css(mix(c, '#000000', dark * 0.55));
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // the shadow it throws on the water: wide soft strokes along the face,
    // the half inside the rock is covered by the rock
    for (const [wid, a] of [[46, 0.07], [28, 0.09], [14, 0.12]]) {
      ctx.strokeStyle = `rgba(0, 8, 12, ${a})`;
      ctx.lineWidth = wid;
      shape.faces.forEach(strokeFace);
    }

    ctx.fillStyle = tone(ROCK.deep);
    ctx.fill(shape.outline);
    ctx.clip(shape.outline);

    // lighter towards the face it shows the water: layers of light along
    // the face, each narrower, so the stone rounds off towards its edge
    const layers = [[110, ROCK.base, 0.55], [72, ROCK.base, 0.6], [46, ROCK.mid, 0.55],
                    [26, ROCK.mid, 0.6], [12, ROCK.light, 0.55], [4, ROCK.rim, 0.55]];
    for (const [wid, c, a] of layers) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = tone(c);
      ctx.lineWidth = wid;
      shape.faces.forEach(strokeFace);
    }
    ctx.globalAlpha = 1;

    // pits and pebbles, fixed to the stone
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const f of shape.faces) for (const [x, y] of f) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    if (x0 < x1 || y0 < y1) {
      x0 -= 90; y0 -= 90; x1 += 90; y1 += 90;
      const cell = 46;
      for (let gx = Math.floor(x0 / cell); gx <= Math.ceil(x1 / cell); gx++) {
        for (let gy = Math.floor(y0 / cell); gy <= Math.ceil(y1 / cell); gy++) {
          const k = gx * 7919 + gy * 104729 + seed * 31;
          const x = (gx + hash(k)) * cell, y = (gy + hash(k + 1)) * cell;
          const r = 3 + hash(k + 2) * 13;
          const pit = hash(k + 3) < 0.55;
          ctx.fillStyle = pit ? 'rgba(10, 2, 8, .32)' : 'rgba(255, 214, 228, .06)';
          ctx.beginPath();
          ctx.ellipse(x, y, r, r * (0.55 + hash(k + 4) * 0.4), hash(k + 5) * Math.PI, 0, Math.PI * 2);
          ctx.fill();
          if (pit && r > 9) {
            // a lit lip on the pit's lower edge
            ctx.strokeStyle = 'rgba(255, 214, 228, .07)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(x, y + 1.5, r, r * 0.6, 0, 0.15 * Math.PI, 0.85 * Math.PI);
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }

  /* Coral on a piece's faces: fans and knobbly branches, growing out into
     the water. `count` of them, the same ones every frame. */
  function coralOn(shape, count, seed, scale = 1, avoid = null) {
    const colours = ['#ff7a59', '#ff9a76', '#e8577a', '#c86bd6', '#ffb35c'];
    const points = [];
    for (const f of shape.faces) for (let i = 2; i < f.length - 2; i++) points.push([f, i]);
    if (!points.length) return;
    for (let c = 0; c < count; c++) {
      const k = seed * 97 + c * 13;
      const [f, i] = points[Math.floor(hash(k) * points.length)];
      const [x, y] = f[i];
      if (avoid && avoid(x, y)) continue;
      if (x < -20 || y < -20 || x > view.w + 20 || y > view.h + 20) continue;
      const tx = f[i + 1][0] - f[i - 1][0], ty = f[i + 1][1] - f[i - 1][1];
      const out = Math.atan2(-tx * shape.out, ty * shape.out);
      const size = (12 + hash(k + 1) * 24) * scale;
      const sway = Math.sin(clock * 0.9 + c) * 0.08;
      const col = colours[(c + seed) % colours.length];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(out + (hash(k + 2) - 0.5) * 1.1 + sway);
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineCap = 'round';
      if ((c + seed) % 3 === 0) {
        ctx.lineWidth = size * 0.18;
        for (let fi = -2; fi <= 2; fi++) {
          ctx.beginPath();
          ctx.moveTo(-size * 0.15, 0);
          ctx.quadraticCurveTo(size * 0.5, fi * size * 0.15, size, fi * size * 0.35);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(size, fi * size * 0.35, size * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.lineWidth = size * 0.22;
        ctx.beginPath();
        ctx.moveTo(-size * 0.15, 0);
        ctx.lineTo(size, 0);
        ctx.moveTo(size * 0.55, 0);
        ctx.lineTo(size * 0.9, -size * 0.4);
        ctx.moveTo(size * 0.35, 0);
        ctx.lineTo(size * 0.7, size * 0.35);
        ctx.stroke();
        for (const [px, py] of [[size, 0], [size * 0.9, -size * 0.4], [size * 0.7, size * 0.35]]) {
          ctx.beginPath();
          ctx.arc(px, py, size * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  /* A panel made of the same stone: behind `el` (in its own stacking context),
     its shape rough all the way round and its shadow falling past it. Painted
     for the size it is now; `stones` are painted again if the screen changes. */
  const STONE_PAD = 34;
  const stones = new Map();

  function plateShape(pw, ph, seed) {
    const R = Math.min(34, pw / 4, ph / 4);
    const amp = 7;
    const corners = [[pw - R, R, -Math.PI / 2], [pw - R, ph - R, 0], [R, ph - R, Math.PI / 2], [R, R, Math.PI]];
    const pts = [];
    corners.forEach(([cx, cy, from], n) => {
      const [nx, ny] = corners[(n + 1) % 4];
      for (let k = 0; k < 8; k++) {
        const a = from + k / 8 * Math.PI / 2;
        pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R, Math.cos(a), Math.sin(a)]);
      }
      const a = from + Math.PI / 2;
      const ox = cx + Math.cos(a) * R, oy = cy + Math.sin(a) * R;
      const tx = nx + Math.cos(a) * R - ox, ty = ny + Math.sin(a) * R - oy;
      const steps = Math.max(1, Math.ceil(Math.hypot(tx, ty) / 7));
      for (let k = 0; k < steps; k++) {
        pts.push([ox + tx * k / steps, oy + ty * k / steps, Math.cos(a), Math.sin(a)]);
      }
    });
    // the bumps, inwards only so the words keep their room; the walk round
    // ends where it began, so its last stretch blends into its first
    let along = 0;
    const round = pts.reduce((sum, p, n) => {
      const q = pts[(n + 1) % pts.length];
      return sum + Math.hypot(q[0] - p[0], q[1] - p[1]);
    }, 0);
    const blend = Math.min(80, round / 4);
    const edge = pts.map((p, n) => {
      const late = clamp((along - (round - blend)) / blend, 0, 1);
      const bump = lerp(wobble(along, seed), wobble(along - round, seed), late);
      const off = amp * (bump - 1);
      const q = pts[(n + 1) % pts.length];
      along += Math.hypot(q[0] - p[0], q[1] - p[1]);
      return [p[0] + p[2] * off, p[1] + p[3] * off];
    });
    const outline = new Path2D();
    edge.forEach(([x, y], k) => (k ? outline.lineTo(x, y) : outline.moveTo(x, y)));
    outline.closePath();
    return { outline, faces: [[...edge, edge[0]]], out: 1, pts: edge };
  }

  /* The same stone as a picture, for the canvas: `pw` by `ph`, with STONE_PAD
     more all round for its shadow. */
  function plateOf(pw, ph, seed) {
    return bake(`plate${Math.round(pw)}:${Math.round(ph)}:${seed}`, pw + STONE_PAD * 2, ph + STONE_PAD * 2, () => {
      ctx.translate(STONE_PAD, STONE_PAD);
      drawRock(plateShape(pw, ph, seed), seed);
    });
  }

  function stoneBehind(el, seed) {
    if (!el) return;
    stones.set(el, seed);
    const pw = el.offsetWidth, ph = el.offsetHeight;
    if (!pw || !ph) return;
    const size = pw + 'x' + ph;
    let c = el.querySelector(':scope > .stone-plate');
    if (c && c.dataset.size === size) return;
    if (!c) {
      c = softCanvas();
      c.className = 'stone-plate';
      c.setAttribute('aria-hidden', 'true');
      el.prepend(c);
    }
    c.dataset.size = size;
    c.style.width = pw + STONE_PAD * 2 + 'px';
    c.style.height = ph + STONE_PAD * 2 + 'px';
    paintOn(pw + STONE_PAD * 2, ph + STONE_PAD * 2, () => {
      ctx.translate(STONE_PAD, STONE_PAD);
      drawRock(plateShape(pw, ph, seed), seed);
    }, c, window.devicePixelRatio || 1);
    el.classList.add('has-stone');
  }
