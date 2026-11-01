  // ------------------------------------------------------------- drifting --

  let motes = [];
  let ripples = [];
  const splashes = [];     // waves running out along the line
  const drops = [];        // and what was thrown up off it

  function scatter() {
    const count = Math.round(Number(get('water.motes', 90)));
    motes = [];
    for (let i = 0; i < count; i++) {
      motes.push({
        x: rand(0, view.w),
        y: rand(0, view.h),
        r: rand(0.6, 2.2),
        drift: rand(-6, 6),
        rise: rand(4, 16),
        phase: rand(0, Math.PI * 2)
      });
    }
  }
