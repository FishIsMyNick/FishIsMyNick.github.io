/* Level mechanic: a crate to dash into, at the sublevel's `crate`
   [across, down], as shares of the screen. Swimming into it only bumps it. */

(() => {
  'use strict';

  if (!window.Portfolio || !Portfolio.game) return;

  Portfolio.game.mechanic('crate', game => {
    const { clamp, rand } = game;

    /* A wooden crate, bobbing a little, and shaking when he bumps it without
       dashing. */
    function drawCrate(c, ctx, clock) {
      const shake = clamp(1 - (clock - c.hit) / 0.25, 0, 1);
      const bob = Math.sin(clock * 1.6) * 3;
      const s = c.s;
      ctx.save();
      ctx.translate(c.x + Math.sin(clock * 60) * 3 * shake, c.y + bob);
      ctx.rotate(Math.sin(clock * 1.1) * 0.03);
      ctx.fillStyle = '#a8703c';
      ctx.strokeStyle = '#5a3615';
      ctx.lineWidth = Math.max(2, s * 0.035);
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.06) : ctx.rect(-s / 2, -s / 2, s, s);
      ctx.fill();
      ctx.stroke();
      // planks
      ctx.strokeStyle = 'rgba(70, 40, 15, .55)';
      ctx.lineWidth = Math.max(1, s * 0.018);
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-s / 2, -s / 2 + i * s / 4);
        ctx.lineTo(s / 2, -s / 2 + i * s / 4);
        ctx.stroke();
      }
      // the frame and the brace
      const f = s * 0.13;
      ctx.fillStyle = '#c48a4e';
      ctx.strokeStyle = '#5a3615';
      ctx.lineWidth = Math.max(1.5, s * 0.025);
      for (const [x, y, ww, hh] of [[-s / 2, -s / 2, s, f], [-s / 2, s / 2 - f, s, f],
                                    [-s / 2, -s / 2, f, s], [s / 2 - f, -s / 2, f, s]]) {
        ctx.fillRect(x, y, ww, hh);
        ctx.strokeRect(x, y, ww, hh);
      }
      ctx.save();
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s * 0.62, -f / 2, s * 1.24, f);
      ctx.strokeRect(-s * 0.62, -f / 2, s * 1.24, f);
      ctx.restore();
      // nails
      ctx.fillStyle = '#3a240f';
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.beginPath();
        ctx.arc(x * (s / 2 - f / 2), y * (s / 2 - f / 2), s * 0.022, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* The crate goes: planks everywhere, and the room is beaten. */
    function smash(room) {
      const c = room.crate;
      const fish = game.fish;
      room.crate = null;
      room.planks = [];
      for (let i = 0; i < 16; i++) {
        const a = rand(0, Math.PI * 2);
        const v = rand(120, 420);
        room.planks.push({
          x: c.x + rand(-c.s, c.s) * 0.3, y: c.y + rand(-c.s, c.s) * 0.3,
          vx: Math.cos(a) * v + fish.vx * 0.25, vy: Math.sin(a) * v + fish.vy * 0.25,
          w: rand(0.18, 0.5) * c.s, h: rand(0.06, 0.12) * c.s,
          rot: rand(0, Math.PI), spin: rand(-6, 6), born: game.clock
        });
      }
      for (let i = 0; i < 14; i++) game.puff(c.x + rand(-c.s, c.s) * 0.4, c.y + rand(-c.s, c.s) * 0.4, 1.4);
      game.slowFish(0.5);
      const sound = game.sound();
      if (sound) { sound.crack(1.2); sound.tap(1); }
      game.beatRoom();
    }

    function drawPlanks(planks, dt, ctx, clock) {
      for (let i = planks.length - 1; i >= 0; i--) {
        const p = planks[i];
        const age = clock - p.born;
        if (age > 2.2) { planks.splice(i, 1); continue; }
        // water slows them down fast, then they sink
        const drag = Math.exp(-3 * dt);
        p.vx *= drag; p.vy = p.vy * drag + 140 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.spin * dt; p.spin *= drag;
        ctx.save();
        ctx.globalAlpha = clamp(2.2 - age, 0, 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = '#b07a44';
        ctx.strokeStyle = '#5a3615';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }

    return {
      setup(room, sub) {
        const at = sub.crate || [0.62, 0.5];
        const { w, h } = game.view;
        const s = clamp(Math.min(w, h) * game.num('crate_size', 0.15), 60, 150);
        room.crate = { x: w * at[0], y: h * at[1], s, hit: 0 };
      },

      solids(room) {
        const c = room.crate;
        if (!c) return [];
        return [{
          l: c.x - c.s / 2, t: c.y - c.s / 2, r: c.x + c.s / 2, b: c.y + c.s / 2,
          touch(hard) {
            if (hard) { smash(room); return true; }
            c.hit = game.clock;
            return false;
          }
        }];
      },

      draw(room, dt) {
        if (room.crate) drawCrate(room.crate, game.ctx, game.clock);
        if (room.planks) drawPlanks(room.planks, dt, game.ctx, game.clock);
      }
    };
  });
})();
