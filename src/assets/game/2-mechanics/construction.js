/* Level mechanic: a level that isn't built yet. Nothing to play: a big sign in
   the middle of the room, the sublevel's `sign` (one line to an item) and under
   it its `note`, where *word* is the accent. The ways on are open from the
   start (`notBuilt`). */

(() => {
  'use strict';

  if (!window.Portfolio || !Portfolio.game) return;

  Portfolio.game.mechanic('construction', game => {
    const { clamp } = game;
    const YELLOW = '#f2c230', BLACK = '#17141a', ACCENT = '#b8330a';

    // black and yellow, leaning, across a board
    function stripes(ctx, x, y, w, h) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = YELLOW;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = BLACK;
      const step = h * 1.6;
      for (let sx = x - h; sx < x + w + h; sx += step * 2) {
        ctx.beginPath();
        ctx.moveTo(sx, y + h);
        ctx.lineTo(sx + h, y);
        ctx.lineTo(sx + h + step, y);
        ctx.lineTo(sx + step, y + h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    /* The note, wrapped to `wide`: lines of words, each knowing if it's marked. */
    function wrapped(ctx, note, wide, small, font) {
      const words = String(note).split(/\s+/).map(word => {
        const marked = /^\*.*\*/.test(word);
        return { text: word.replace(/\*/g, ''), marked };
      });
      const space = ctx.measureText(' ').width;
      const lines = [[]];
      let used = 0;
      for (const word of words) {
        ctx.font = `${word.marked ? 800 : 600} ${small}px ${font}`;
        word.w = ctx.measureText(word.text).width;
        if (used && used + space + word.w > wide) { lines.push([]); used = 0; }
        lines[lines.length - 1].push(word);
        used += (used ? space : 0) + word.w;
      }
      return { lines, space };
    }

    function sign(ctx, cx, cy, sub, wide) {
      const heading = sub.sign || ['Under', 'Construction'];
      const band = wide * 0.045;
      const size = wide * 0.13;
      const small = Math.max(15, wide * 0.042);
      const font = getComputedStyle(document.documentElement).getPropertyValue('--sans') || 'sans-serif';
      ctx.font = `600 ${small}px ${font}`;
      const note = wrapped(ctx, sub.note || '', wide * 0.84, small, font);
      const noteTall = sub.note ? note.lines.length * small * 1.3 + size * 0.3 : 0;
      const headTall = heading.length * size * 1.15;
      const tall = band * 2 + size * 0.6 + headTall + noteTall;
      const x = cx - wide / 2, y = cy - tall / 2;
      ctx.fillStyle = 'rgba(0, 8, 12, .35)';
      ctx.fillRect(x + 6, y + 8, wide, tall);
      ctx.fillStyle = '#ffc94d';
      ctx.fillRect(x, y, wide, tall);
      stripes(ctx, x, y, wide, band);
      stripes(ctx, x, y + tall - band, wide, band);
      ctx.fillStyle = BLACK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const headTop = y + band + size * 0.3;
      heading.forEach((line, k) => {
        const text = String(line).toUpperCase();
        let px = size;
        ctx.font = `800 ${px}px ${font}`;
        const fits = ctx.measureText(text).width;
        if (fits > wide * 0.88) {
          px *= wide * 0.88 / fits;
          ctx.font = `800 ${px}px ${font}`;
        }
        ctx.fillText(text, cx, headTop + (k + 0.5) * size * 1.15);
      });
      if (!sub.note) return;
      ctx.textAlign = 'left';
      note.lines.forEach((line, k) => {
        const lineW = line.reduce((sum, word) => sum + word.w, 0) + note.space * (line.length - 1);
        let wx = cx - lineW / 2;
        const wy = headTop + headTall + size * 0.15 + (k + 0.5) * small * 1.3;
        for (const word of line) {
          ctx.font = `${word.marked ? 800 : 600} ${small}px ${font}`;
          ctx.fillStyle = word.marked ? ACCENT : BLACK;
          ctx.fillText(word.text, wx, wy);
          wx += word.w + note.space;
        }
      });
    }

    /* It doesn't move: painted once for a size and stamped down. */
    const scene = { canvas: null, key: '' };

    function bakeScene(sub) {
      const { w, h, dpr } = game.view;
      const key = [w, h, dpr, JSON.stringify(sub)].join(':');
      if (scene.key === key) return scene.canvas;
      const c = scene.canvas || game.softCanvas();
      c.width = Math.ceil(w * dpr);
      c.height = Math.ceil(h * dpr);
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sign(ctx, w / 2, h / 2, sub, clamp(w * 0.46, 260, 840));
      game.paintNow(c);
      scene.canvas = c;
      scene.key = key;
      return c;
    }

    return {
      notBuilt: true,
      setup() {},
      solids: () => [],

      draw(room) {
        const { w, h } = game.view;
        game.ctx.drawImage(bakeScene(game.subsOf(room.i)[room.n]), 0, 0, w, h);
      },

      ahead(i, n, sub) {
        return [() => bakeScene(sub)];
      }
    };
  });
})();
