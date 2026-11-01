  // ------------------------------------------------------------- bubbles --

  function puff(x, y, size) {
    bubbles.push({ x, y, r: rand(2, 5) * size, vx: rand(-20, 20), vy: rand(-70, -30),
                   born: clock, life: rand(0.8, 1.6) });
    if (bubbles.length > 160) bubbles.shift();
  }

  function drawBubbles(dt, drift) {
    ctx.save();
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      const age = (clock - b.born) / b.life;
      if (age >= 1) { bubbles.splice(i, 1); continue; }
      b.x += (b.vx + (drift ? drift[0] : 0)) * dt;
      b.y += (b.vy + (drift ? drift[1] : 0)) * dt;
      const a = (1 - age) * 0.55;
      ctx.strokeStyle = `rgba(226, 250, 255, ${a})`;
      ctx.fillStyle = `rgba(226, 250, 255, ${a * 0.18})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
