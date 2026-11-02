/* Level mechanic: a push puzzle on a grid, from the sublevel's `field`, `moves`
   and `stars` (game.yaml; the rules are in Game-PushPuzzle.md). He is on the
   grid until the chest is hit: then the stars fly out, the room is beaten and
   he swims free again. */

(() => {
  'use strict';

  if (!window.Portfolio || !Portfolio.game) return;

  Portfolio.game.mechanic('pushpuzzle', game => {
    const { clamp, lerp, rand } = game;

    const $ = id => document.getElementById(id);
    const page = {
      moves: $('game-moves'), left: $('game-moves-left'), out: $('game-out'),
      retry: $('game-retry'), results: $('game-results'), rows: $('game-results-rows'),
      totalMoves: $('game-results-moves'), totalStars: $('game-results-stars'),
      hide: $('game-results-hide'), show: $('game-results-show')
    };
    if (page.retry) page.retry.addEventListener('click', () => game.resetRoom());
    if (page.hide) page.hide.addEventListener('click', () => { game.kept.collapsed = true; });
    if (page.show) page.show.addEventListener('click', () => { game.kept.collapsed = false; });

    const SHAKE = 0.3;           // seconds something shakes when it can't move
    const SLIDE = 0.16;          // seconds a pushed thing takes to get there
    const LUNGE = 0.22;          // seconds he takes to hit something and come back
    const OUT_FLASH = 1.6;       // seconds of the counter going (.game-moves.is-out)
    const STAR_GAP = 0.35;       // seconds between the stars leaving the chest
    const STAR_FLIGHT = 0.75;    // seconds a star is in the air
    const STAR_STAY = 1.6;       // seconds they stay once the room is beaten
    const STAR_FADE = 0.5;

    const hash = n => {
      const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return v - Math.floor(v);
    };

    const keyOf = (i, n) => i + '.' + n;

    /* ---------------------------------------------------------- the field -- */

    function parse(rows) {
      const f = { rock: [], algae: [], things: [], start: null, chest: null };
      f.grid = rows.map(row => String(row).trim().split(/\s+/));
      f.rows = f.grid.length;
      f.cols = f.grid[0].length;
      f.grid.forEach((line, r) => line.forEach((ch, c) => {
        if (ch === 'S') f.start = { r, c };
        else if (ch === 'G') f.chest = { r, c };
        else if (ch === 'H' || ch === 'C') {
          f.things.push({ kind: ch, r, c, fromR: r, fromC: c, moved: -9, hit: -9 });
        }
      }));
      return f;
    }

    /* Where the grid goes, for the screen as it is now: as tall as the screen
       lets it, with a band of rock over it for the hint and the same under it,
       so its middle row is on the openings. The rock fills in the sides. */
    const BAND = 60;

    function fit(f) {
      const { w, h } = game.view;
      const across = (w - (w > 640 ? 78 : game.border() + 8) * 2) / f.cols;
      const down = (h - BAND * 2) / f.rows;
      const cell = Math.max(24, Math.min(across, down));
      return { cell, x0: (w - cell * f.cols) / 2, y0: h / 2 - cell * f.rows / 2 };
    }

    const at = (box, r, c) => [box.x0 + (c + 0.5) * box.cell, box.y0 + (r + 0.5) * box.cell];
    const inside = (f, r, c) => r >= 0 && c >= 0 && r < f.rows && c < f.cols;
    // the row level with the openings
    const byOpening = (f, r) => r === Math.floor(f.rows / 2);
    const thingAt = (f, r, c) => f.things.find(t => t.r === r && t.c === c);

    /* A thing can be pushed there: on the grid, no rock, no chest, nothing there. */
    function free(f, r, c) {
      if (!inside(f, r, c)) return false;
      const ch = f.grid[r][c];
      return ch !== 'X' && ch !== 'G' && !thingAt(f, r, c);
    }

    /* ----------------------------------------------------------- the rules -- */

    function spend(room, n) {
      const p = room.puzzle;
      p.left -= n;
      p.used += n;
    }

    function outIfOut(room) {
      const p = room.puzzle;
      if (p.left > 0 || p.state !== 'play') return;
      p.state = 'out';
      p.outAt = game.clock;
    }

    /* Nothing happens, and it costs nothing. */
    function bump(p, dr, dc) {
      p.lunge = { at: game.clock, dr, dc, far: 0.12 };
      const sound = game.sound();
      if (sound) sound.tap(0.25);
    }

    /* He goes in, and it costs what the space costs. */
    function enter(room, r, c, cost) {
      const p = room.puzzle;
      spend(room, cost);
      p.r = r;
      p.c = c;
      p.wade = cost > 1 ? game.clock : -9;
      if (cost > 1) {
        const [x, y] = at(fit(p.field), r, c);
        for (let i = 0; i < 5; i++) game.puff(x + rand(-14, 14), y + rand(-14, 14), 0.7);
      }
    }

    function step(room, dr, dc) {
      const p = room.puzzle;
      if (p.state !== 'play') return;
      const f = p.field;
      const r = p.r + dr, c = p.c + dc;
      if (dc) p.facing = dc;
      const sound = game.sound();

      // out by the way he came, which costs nothing
      if (!inside(f, r, c) && dc < 0 && byOpening(f, p.r)) {
        game.goBack();
        return;
      }
      if (!inside(f, r, c) || f.grid[r][c] === 'X') { bump(p, dr, dc); return; }

      if (f.grid[r][c] === 'G') {
        spend(room, 1);
        p.lunge = { at: game.clock, dr, dc, far: 0.3 };
        openChest(room);
        return;
      }

      const cost = f.grid[r][c] === 'A' ? 2 : 1;
      const thing = thingAt(f, r, c);
      if (thing && !free(f, r + dr, c + dc)) {
        if (thing.kind === 'C') {
          spend(room, 1);
          p.lunge = { at: game.clock, dr, dc, far: 0.3 };
          breakClam(room, thing);
          outIfOut(room);
        } else {
          thing.hit = game.clock;
          bump(p, dr, dc);
        }
        return;
      }

      if (cost > p.left) { bump(p, dr, dc); return; }    // not enough left to get in
      if (thing) {
        // it goes on a space, and he goes with it
        thing.fromR = thing.r;
        thing.fromC = thing.c;
        thing.r = r + dr;
        thing.c = c + dc;
        thing.moved = game.clock;
        if (sound) sound.tap(0.55);
      } else if (sound) sound.bubble(cost > 1 ? 0.7 : 0.35);
      enter(room, r, c, cost);
      outIfOut(room);
    }

    function breakClam(room, thing) {
      const f = room.puzzle.field;
      f.things.splice(f.things.indexOf(thing), 1);
      const box = fit(f);
      const [x, y] = at(box, thing.r, thing.c);
      for (let i = 0; i < 12; i++) {
        const a = rand(0, Math.PI * 2);
        const v = rand(60, 220);
        room.puzzle.shards.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          s: rand(0.07, 0.15) * box.cell, rot: rand(0, 6), spin: rand(-7, 7), born: game.clock
        });
      }
      for (let i = 0; i < 6; i++) game.puff(x + rand(-12, 12), y + rand(-12, 12), 0.8);
      const sound = game.sound();
      if (sound) sound.crack(0.8);
    }

    function starsFor(p) {
      const s = p.stars;
      return p.used <= s[0] ? 3 : p.used <= s[1] ? 2 : 1;
    }

    function openChest(room) {
      const p = room.puzzle;
      const stars = starsFor(p);
      p.state = 'won';
      p.win = { at: game.clock, stars, landed: 0 };
      const key = keyOf(room.i, room.n);
      const best = game.kept[key];
      game.kept[key] = { stars: Math.max(best ? best.stars : 0, stars),
                         used: Math.min(best ? best.used : p.used, p.used) };
      const box = fit(p.field);
      const [x, y] = at(box, p.field.chest.r, p.field.chest.c);
      for (let i = 0; i < 8; i++) game.puff(x + rand(-16, 16), y + rand(-16, 16), 0.8);
      const sound = game.sound();
      if (sound) { sound.tap(0.9); sound.bubble(0.9); }
    }

    /* ------------------------------------------------------------ the art -- */

    /* The ocean floor doesn't change, and is the same under every puzzle:
       painted once for a size. Each space is its own bed of gravel, pebble on
       pebble, the big ones first, with a little water between the beds. */
    const PEBBLES = ['#6f8aa3', '#88a5bd', '#55708c', '#a3bccf', '#5f7f9f', '#435a75', '#7796b3', '#94aabb', '#4f7596', '#6a86ad'];
    const gravel = { canvas: null, key: '' };

    function bakeGravel(f, cell) {
      const dpr = game.view.dpr;
      const key = [f.cols, f.rows, Math.round(cell * 100), dpr].join(':');
      if (gravel.key === key) return gravel.canvas;
      const c = gravel.canvas || game.softCanvas();
      const w = f.cols * cell, h = f.rows * cell;
      c.width = Math.ceil(w * dpr);
      c.height = Math.ceil(h * dpr);
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gap = Math.max(1.5, cell * 0.022);
      g.beginPath();
      for (let r = 0; r < f.rows; r++) {
        for (let col = 0; col < f.cols; col++) {
          const x = col * cell + gap, y = r * cell + gap, s = cell - gap * 2;
          if (g.roundRect) g.roundRect(x, y, s, s, cell * 0.07);
          else g.rect(x, y, s, s);
        }
      }
      g.fillStyle = '#2f3f50';
      g.fill();
      g.clip();
      const area = f.cols * f.rows;
      let k = 0;
      for (const [count, lo, hi] of [[70, 0.05, 0.085], [120, 0.032, 0.055], [150, 0.016, 0.03]]) {
        for (let i = 0; i < count * area; i++) {
          k += 7;
          const x = hash(k) * w, y = hash(k + 1) * h;
          const rx = lerp(lo, hi, hash(k + 2)) * cell;
          const ry = rx * lerp(0.62, 0.95, hash(k + 3));
          const tilt = hash(k + 4) * Math.PI;
          g.fillStyle = 'rgba(8, 16, 28, .55)';
          g.beginPath();
          g.ellipse(x + rx * 0.12, y + ry * 0.28, rx, ry, tilt, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = PEBBLES[Math.floor(hash(k + 5) * PEBBLES.length)];
          g.beginPath();
          g.ellipse(x, y, rx, ry, tilt, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = 'rgba(232, 244, 255, .16)';
          g.beginPath();
          g.ellipse(x - rx * 0.22, y - ry * 0.28, rx * 0.5, ry * 0.42, tilt, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.fillStyle = 'rgba(8, 44, 54, .2)';
      g.fillRect(0, 0, w, h);
      game.paintNow(c);
      gravel.canvas = c;
      gravel.key = key;
      return c;
    }

    /* All the room's rock as outlines: everything on the screen and past it,
       less the water. The water is the spaces that aren't rock, the way in on
       the left and, once it's open, the way on to the right. So walls and rock
       spaces are one stone. Worked out on a lattice of the grid's lines, the
       openings' and the edges off the screen, which aren't faces. */
    function rockOutlines(f, open) {
      const { w, h } = game.view;
      const box = fit(f);
      const g = game.gapH() / 2;
      const x1 = box.x0 + f.cols * box.cell, y1 = box.y0 + f.rows * box.cell;
      const sorted = list => [...new Set(list)].sort((a, b) => a - b);
      const xs = [-80, w + 80];
      const ys = [-80, h + 80, h / 2 - g, h / 2 + g];
      for (let c = 0; c <= f.cols; c++) xs.push(box.x0 + c * box.cell);
      for (let r = 0; r <= f.rows; r++) ys.push(box.y0 + r * box.cell);
      const X = sorted(xs), Y = sorted(ys);
      const nx = X.length - 1, ny = Y.length - 1;       // spaces on the lattice

      const water = (x, y) => {
        if (x < box.x0) return Math.abs(y - h / 2) < g;
        if (x > x1) return open && Math.abs(y - h / 2) < g;
        if (y < box.y0 || y > y1) return false;
        const r = Math.floor((y - box.y0) / box.cell), c = Math.floor((x - box.x0) / box.cell);
        return f.grid[r][c] !== 'X';
      };
      const solid = (j, i) => {
        if (j < 0 || i < 0 || j >= ny || i >= nx) return false;
        return !water((X[i] + X[i + 1]) / 2, (Y[j] + Y[j + 1]) / 2);
      };

      // every edge between rock and not, rock on its right hand
      const edges = new Map();
      const add = (a, b) => {
        const key = a[0] + ',' + a[1];
        if (!edges.has(key)) edges.set(key, []);
        edges.get(key).push(b);
      };
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          if (!solid(j, i)) continue;
          if (!solid(j - 1, i)) add([i, j], [i + 1, j]);
          if (!solid(j, i + 1)) add([i + 1, j], [i + 1, j + 1]);
          if (!solid(j + 1, i)) add([i + 1, j + 1], [i, j + 1]);
          if (!solid(j, i - 1)) add([i, j + 1], [i, j]);
        }
      }

      // joined up into loops: where rock touches itself at a corner only, keep
      // the turn towards the rock
      const loops = [];
      for (const key of edges.keys()) {
        while (edges.get(key).length) {
          const [i0, j0] = key.split(',').map(Number);
          const loop = [[i0, j0]];
          let dir = null;
          let here = [i0, j0];
          for (;;) {
            const list = edges.get(here[0] + ',' + here[1]);
            let pick = 0;
            if (list.length > 1 && dir) {
              const right = [-dir[1], dir[0]];
              const found = list.findIndex(n => n[0] - here[0] === right[0] && n[1] - here[1] === right[1]);
              if (found >= 0) pick = found;
            }
            const next = list.splice(pick, 1)[0];
            dir = [next[0] - here[0], next[1] - here[1]];
            here = next;
            if (here[0] === i0 && here[1] === j0) break;
            loop.push(here);
          }
          loops.push(loop);
        }
      }

      const under = (a, b) => (a[0] === b[0] && (a[0] === 0 || a[0] === nx))
                           || (a[1] === b[1] && (a[1] === 0 || a[1] === ny));
      return loops.map(loop => {
        // straight runs as one edge, so that a long face is one long face
        const n = loop.length;
        const kept = loop.filter((p, k) => {
          const a = loop[(k + n - 1) % n], b = loop[(k + 1) % n];
          return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
        });
        let pts = kept.map(p => [X[p[0]], Y[p[1]]]);
        let rough = kept.map((p, k) => !under(p, kept[(k + 1) % kept.length]));
        // the engine wants to start on an edge that isn't a face: a pool of
        // water has none, so it gets one, too small to see
        const first = rough.indexOf(false);
        if (first > 0) {
          pts = pts.slice(first).concat(pts.slice(0, first));
          rough = rough.slice(first).concat(rough.slice(0, first));
        } else if (first < 0) {
          const [a, b] = [pts[0], pts[1]];
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          const on = [mid[0] + Math.sign(b[0] - a[0]) * 0.5, mid[1] + Math.sign(b[1] - a[1]) * 0.5];
          pts = [mid, on].concat(pts.slice(1), [a, ]);
          rough = [false].concat(pts.slice(1).map(() => true));
        }
        return { pts, rough };
      });
    }

    const rockFor = (i, n, f, open) => ({
      key: 'puzzle' + i + '.' + n + ':' + open,
      outlines: () => rockOutlines(f, open)
    });

    const fadeOf = room => room.titled
      ? 1 - clamp((game.clock - room.wonAt - 0.3) / Math.max(0.1, game.num('reveal_time', 1.4)), 0, 1)
      : 1;

    function drawAlgae(ctx, x, y, s, clock, seed) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const k = seed * 11 + i * 3;
        const bx = x + (i / 8 - 0.5) * s * 0.76;
        const by = y + s * 0.4;
        const tall = s * (0.45 + hash(k) * 0.32);
        const sway = Math.sin(clock * 1.4 + hash(k + 1) * 6) * s * 0.09;
        ctx.strokeStyle = i % 3 === 0 ? '#2f8a54' : i % 3 === 1 ? '#3fa864' : '#277548';
        ctx.lineWidth = Math.max(2, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx - sway * 0.5, by - tall * 0.55, bx + sway, by - tall);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawCrab(ctx, s) {
      ctx.lineCap = 'round';
      // legs, then a claw each side, out from under the shell
      ctx.strokeStyle = '#d9603a';
      ctx.lineWidth = Math.max(2, s * 0.045);
      for (const side of [-1, 1]) {
        for (const n of [0, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * s * 0.2, s * (0.14 + n * 0.07));
          ctx.lineTo(side * s * (0.34 + n * 0.03), s * (0.32 + n * 0.02));
          ctx.stroke();
        }
        ctx.fillStyle = '#e8734a';
        ctx.beginPath();
        ctx.ellipse(side * s * 0.33, s * 0.09, s * 0.095, s * 0.07, side * -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // the shell it lives in, a spiral
      ctx.fillStyle = '#c79a5e';
      ctx.strokeStyle = '#6d4a24';
      ctx.lineWidth = Math.max(1.5, s * 0.025);
      ctx.beginPath();
      ctx.arc(0, -s * 0.05, s * 0.27, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4.5; a += 0.25) {
        const rad = s * 0.24 * (1 - a / (Math.PI * 5));
        const px = Math.cos(a) * rad, py = -s * 0.05 + Math.sin(a) * rad;
        if (a) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.stroke();
      // eyes on stalks
      for (const side of [-1, 1]) {
        ctx.strokeStyle = '#d9603a';
        ctx.lineWidth = Math.max(1.5, s * 0.025);
        ctx.beginPath();
        ctx.moveTo(side * s * 0.15, s * 0.14);
        ctx.lineTo(side * s * 0.17, -s * 0.0);
        ctx.stroke();
        ctx.fillStyle = '#10181c';
        ctx.beginPath();
        ctx.arc(side * s * 0.17, -s * 0.01, s * 0.032, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawClam(ctx, s) {
      const shell = (top, fill) => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = '#6f3f5a';
        ctx.lineWidth = Math.max(1.5, s * 0.025);
        ctx.beginPath();
        ctx.moveTo(-s * 0.34, s * 0.06);
        for (let n = 1; n <= 7; n++) {
          // scalloped along the edge that opens
          const a = Math.PI - n / 7 * Math.PI;
          const rad = s * (n % 2 ? 0.36 : 0.33);
          ctx.lineTo(Math.cos(a) * rad, s * 0.06 - Math.sin(a) * rad * top);
        }
        ctx.lineTo(0, s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = Math.max(1, s * 0.015);
        ctx.strokeStyle = 'rgba(111, 63, 90, .6)';
        for (const a of [0.5, 1.1, 1.57, 2.04, 2.64]) {
          ctx.beginPath();
          ctx.moveTo(0, s * 0.06);
          ctx.lineTo(Math.cos(a) * s * 0.3, s * 0.06 - Math.sin(a) * s * 0.3 * top);
          ctx.stroke();
        }
      };
      shell(-0.45, '#c98aa8');
      shell(1, '#eab2c8');
      // a pearl, just showing
      ctx.fillStyle = '#fff4ea';
      ctx.beginPath();
      ctx.arc(0, s * 0.09, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawChest(ctx, s, open) {
      const w = s * 0.72, h = s * 0.38;
      if (open > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(0, -s * 0.05, 0, 0, -s * 0.05, s * 0.6);
        glow.addColorStop(0, `rgba(255, 214, 120, ${0.55 * open})`);
        glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(-s * 0.6, -s * 0.65, s * 1.2, s * 1.2);
        ctx.restore();
      }
      ctx.fillStyle = '#8a5a2b';
      ctx.strokeStyle = '#3f2510';
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.fillRect(-w / 2, -s * 0.02, w, h);
      ctx.strokeRect(-w / 2, -s * 0.02, w, h);
      // the lid: tips back, and its underside shows
      const lift = open;
      ctx.save();
      ctx.translate(0, -s * 0.02);
      ctx.scale(1, 1 - lift * 1.6);
      ctx.fillStyle = lift > 0.5 ? '#3a2412' : '#a26c35';
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(-w / 2, -s * 0.13);
      ctx.quadraticCurveTo(0, -s * 0.3, w / 2, -s * 0.13);
      ctx.lineTo(w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (lift > 0.1) {
        ctx.fillStyle = '#ffd468';
        ctx.fillRect(-w / 2 + 3, -s * 0.02, w - 6, s * 0.05);
      }
      ctx.fillStyle = '#e0b341';
      ctx.strokeStyle = '#6d5210';
      ctx.fillRect(-w / 2 - 1, s * 0.09, w + 2, s * 0.045);
      ctx.fillRect(-s * 0.05, -s * 0.03, s * 0.1, s * 0.15);
      ctx.strokeRect(-s * 0.05, -s * 0.03, s * 0.1, s * 0.15);
    }

    function starPath(ctx, x, y, r) {
      ctx.beginPath();
      for (let n = 0; n < 10; n++) {
        const a = -Math.PI / 2 + n * Math.PI / 5;
        const rad = n % 2 ? r * 0.44 : r;
        const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
        if (n) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
    }

    function goldStar(ctx, x, y, r, rot) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.shadowColor = 'rgba(255, 200, 80, .8)';
      ctx.shadowBlur = r * 0.6;
      starPath(ctx, 0, 0, r);
      ctx.fillStyle = '#ffc94d';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1.5, r * 0.07);
      ctx.strokeStyle = '#a0701a';
      ctx.stroke();
      ctx.restore();
    }

    function starStone(box) {
      const r = clamp(box.cell * 0.46, 26, 70);
      const gap = r * 2.5;
      return { r, gap, pw: gap * 3 + r * 0.6, ph: r * 3 };
    }

    /* The stars: three frames on a stone in the middle of the screen, and the
       ones earned flying into them from the chest, one after the other. */
    function drawStars(room, box) {
      const p = room.puzzle;
      const win = p.win;
      if (!win) return;
      const ctx = game.ctx;
      const clock = game.clock;
      const age = clock - win.at;
      const landed = landedAt(win);
      const alpha = 1 - clamp((age - landed - STAR_STAY) / STAR_FADE, 0, 1);
      if (alpha <= 0) return;
      const { w, h } = game.view;
      const { r, gap, pw, ph } = starStone(box);
      ctx.save();
      ctx.globalAlpha *= alpha * clamp(age / 0.25, 0, 1);

      // the stone
      const pad = 34;
      ctx.drawImage(game.plate(pw, ph, 29), w / 2 - pw / 2 - pad, h / 2 - ph / 2 - pad, pw + pad * 2, ph + pad * 2);

      // the frames
      for (let n = 0; n < 3; n++) {
        starPath(ctx, w / 2 + (n - 1) * gap, h / 2, r);
        ctx.fillStyle = 'rgba(10, 2, 8, .7)';
        ctx.fill();
        ctx.lineWidth = Math.max(1.5, r * 0.06);
        ctx.strokeStyle = 'rgba(255, 214, 228, .3)';
        ctx.stroke();
      }

      // the stars
      const [sx, sy] = at(box, p.field.chest.r, p.field.chest.c);
      for (let n = 0; n < win.stars; n++) {
        const t = (age - n * STAR_GAP) / STAR_FLIGHT;
        if (t <= 0) continue;
        const u = clamp(t, 0, 1);
        const e = u * u * (3 - 2 * u);
        const tx = w / 2 + (n - 1) * gap, ty = h / 2;
        const x = lerp(sx, tx, e);
        const y = lerp(sy, ty, e) - Math.sin(Math.PI * u) * box.cell * 1.3;
        // a little pop as it lands
        const pop = u >= 1 ? 1 + 0.25 * clamp(1 - (t - 1) * STAR_FLIGHT / 0.18, 0, 1) : lerp(0.4, 1, e);
        goldStar(ctx, x, y, r * 0.92 * pop, (1 - e) * 5);
      }
      ctx.restore();
    }

    const landedAt = win => (win.stars - 1) * STAR_GAP + STAR_FLIGHT + 0.3;

    function drawShards(p, dt, ctx, clock) {
      for (let i = p.shards.length - 1; i >= 0; i--) {
        const s = p.shards[i];
        const age = clock - s.born;
        if (age > 1.6) { p.shards.splice(i, 1); continue; }
        const drag = Math.exp(-3.5 * dt);
        s.vx *= drag;
        s.vy = s.vy * drag + 170 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rot += s.spin * dt;
        ctx.save();
        ctx.globalAlpha *= clamp(1.6 - age, 0, 1);
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.fillStyle = '#eab2c8';
        ctx.strokeStyle = '#6f3f5a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s.s, s.s * 0.5);
        ctx.quadraticCurveTo(0, -s.s, s.s, s.s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    /* ----------------------------------------------------- what's on the page -- */

    function setHidden(el, hide) {
      if (el && el.hidden !== hide) el.hidden = hide;
    }

    function starsRow(got) {
      const stars = document.createElement('span');
      stars.className = 'game-stars';
      stars.setAttribute('role', 'img');
      stars.setAttribute('aria-label', `${got} of 3 stars`);
      for (let k = 0; k < 3; k++) {
        const star = document.createElement('i');
        star.className = 'game-star' + (k < got ? ' is-got' : '');
        stars.appendChild(star);
      }
      return stars;
    }

    function fillResults(i) {
      const subs = game.subsOf(i);
      const bests = subs.map((sub, n) => game.kept[keyOf(i, n)] || { stars: 0, used: 0 });
      const stamp = i + ':' + JSON.stringify(bests);
      if (page.rows.dataset.stamp === stamp) return;
      page.rows.dataset.stamp = stamp;
      page.rows.textContent = '';
      bests.forEach((best, n) => {
        const row = page.rows.insertRow();
        const name = document.createElement('th');
        name.scope = 'row';
        name.textContent = `Level ${i + 1}.${n + 1}`;
        row.appendChild(name);
        row.insertCell().textContent = best.used || '–';
        row.insertCell().appendChild(starsRow(best.stars));
      });
      page.totalMoves.textContent = bests.reduce((sum, b) => sum + b.used, 0);
      page.totalStars.textContent = bests.reduce((sum, b) => sum + b.stars, 0) + ' / ' + subs.length * 3;
    }

    return {
      setup(room, sub) {
        const field = parse(sub.field || ['S O O O O O O G']);
        room.puzzle = {
          field,
          r: field.start ? field.start.r : 0, c: field.start ? field.start.c : 0,
          left: sub.moves || 20, used: 0,
          stars: sub.stars || [1, 2, 3],
          state: 'play',
          facing: 1, lunge: null, wade: -9, outAt: 0,
          shards: [], win: null, freed: false
        };
      },

      solids: () => [],

      rock(room, open) {
        return room.puzzle ? rockFor(room.i, room.n, room.puzzle.field, open) : null;
      },

      inset(room) {
        if (!room.puzzle) return null;
        const box = fit(room.puzzle.field);
        return { x: box.x0, top: box.y0, y: box.y0 };
      },

      under(room) {
        const p = room.puzzle;
        if (!p) return;
        const fade = fadeOf(room);
        if (fade <= 0) return;
        const ctx = game.ctx;
        const f = p.field;
        const box = fit(f);
        ctx.save();
        ctx.globalAlpha *= fade;
        ctx.drawImage(bakeGravel(f, box.cell), box.x0, box.y0, f.cols * box.cell, f.rows * box.cell);
        ctx.restore();
      },

      /* Everything the rooms of this level will want. */
      ahead(i, n, sub) {
        const f = parse(sub.field || []);
        return [
          () => bakeGravel(f, fit(f).cell),
          () => {
            const { pw, ph } = starStone(fit(f));
            game.plate(pw, ph, 29);
          },
          ...[false, true].map(open => () => {
            const rock = rockFor(i, n, f, open);
            game.rockAhead(rock.key, rock.outlines, i);
          })
        ];
      },

      holds: room => !!room.puzzle && !room.puzzle.freed,

      steer(room) {
        const p = room.puzzle;
        const box = fit(p.field);
        let [x, y] = at(box, p.r, p.c);
        if (p.lunge) {
          const t = (game.clock - p.lunge.at) / LUNGE;
          if (t >= 1) p.lunge = null;
          else {
            const out = Math.sin(Math.PI * t) * p.lunge.far * box.cell;
            x += p.lunge.dc * out;
            y += p.lunge.dr * out;
          }
        }
        const win = p.win;
        if (win && game.clock - win.at >= landedAt(win)) {
          p.freed = true;
          const sound = game.sound();
          if (sound) sound.tap(0.6);
          game.beatRoom();
        }
        // algae holds him back
        const wading = game.clock - p.wade < 0.45;
        return { x, y, len: box.cell * 0.82, facing: p.facing, rate: wading ? 5 : p.lunge ? 26 : 14 };
      },

      press(room, dx, dy) {
        step(room, dy, dx);
      },

      /* A click on a space next to him is a step there. Left of the grid, beside
         him at the way in, is the way out. */
      tap(room, x, y) {
        const p = room.puzzle;
        const box = fit(p.field);
        const c = Math.floor((x - box.x0) / box.cell);
        const r = Math.floor((y - box.y0) / box.cell);
        const dr = r - p.r, dc = c - p.c;
        if (Math.abs(dr) + Math.abs(dc) !== 1) {
          if (!(c < 0 && p.c === 0 && dr === 0)) return;
          step(room, 0, -1);
          return;
        }
        step(room, dr, dc);
      },

      draw(room, dt) {
        const p = room.puzzle;
        if (!p) return;
        const ctx = game.ctx;
        const clock = game.clock;
        const box = fit(p.field);
        const f = p.field;
        const fade = fadeOf(room);
        if (fade > 0) {
          ctx.save();
          ctx.globalAlpha *= fade;
          f.grid.forEach((line, r) => line.forEach((ch, c) => {
            if (ch !== 'A') return;
            const [x, y] = at(box, r, c);
            drawAlgae(ctx, x, y, box.cell, clock, r * 7 + c);
          }));
          for (const t of f.things) {
            const u = clamp((clock - t.moved) / SLIDE, 0, 1);
            const e = 1 - (1 - u) * (1 - u);
            const shake = clamp(1 - (clock - t.hit) / SHAKE, 0, 1);
            const [x0, y0] = at(box, t.fromR, t.fromC);
            const [x1, y1] = at(box, t.r, t.c);
            ctx.save();
            ctx.translate(lerp(x0, x1, e) + Math.sin(clock * 60) * box.cell * 0.03 * shake, lerp(y0, y1, e));
            if (t.kind === 'H') drawCrab(ctx, box.cell);
            else drawClam(ctx, box.cell);
            ctx.restore();
          }
          const [cx, cy] = at(box, f.chest.r, f.chest.c);
          ctx.save();
          ctx.translate(cx, cy);
          drawChest(ctx, box.cell, p.win ? clamp((clock - p.win.at) / 0.25, 0, 1) : 0);
          ctx.restore();
          drawShards(p, dt, ctx, clock);
          ctx.restore();
        }
        drawStars(room, box);
      },

      plates(room) {
        const p = room.puzzle;
        if (!page.moves) return;
        const showing = p && !p.freed && !(p.state === 'out' && game.clock - p.outAt >= OUT_FLASH);
        setHidden(page.moves, !showing);
        if (p) {
          const text = String(Math.max(0, p.left));
          if (page.left.textContent !== text) page.left.textContent = text;
          page.moves.classList.toggle('is-out', p.state === 'out');
        }

        const outPanel = p && p.state === 'out' && game.clock - p.outAt >= OUT_FLASH;
        if (outPanel && page.out.hidden) {
          page.out.hidden = false;
          page.retry.focus({ preventScroll: true });
          const sound = game.sound();
          if (sound) sound.tap(0.5);
        } else setHidden(page.out, !outPanel);

        // once the stars have gone, or straight away coming back to the room
        const starsGone = !p || !p.win || game.clock - p.win.at >= landedAt(p.win) + STAR_STAY + STAR_FADE;
        const results = room.titled && starsGone;
        if (results) fillResults(room.i);
        setHidden(page.results, !results || !!game.kept.collapsed);
        if (results && !game.kept.collapsed) game.stoneBehind(page.results, 17);
        setHidden(page.show, !results || !game.kept.collapsed);
      }
    };
  });
})();
