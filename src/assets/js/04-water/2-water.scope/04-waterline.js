  // ------------------------------------------------------- the waterline --

  /* The waterline. Once he has finished turning over at the top of his leap,
     it comes up from below the screen and climbs, without stopping, to
     `surface_end` — he lands in it somewhere on the way up. It is kept in page coordinates, which do not
     change when the page scrolls: scrolling takes you down past it, it does
     not follow you. */
  function restingSurface() {
    const start = Number(get('water.surface_start', 0.5));
    return window.scrollY + view.h * start;
  }

  let resting = 0;
  let rise = null;
  let risen = false;       // it has finished climbing and stays where it is

  function remeasureSurface() {
    if (!state.broken && !rise) resting = restingSurface();
  }

  /* Called once, when he starts to fall. A second call is ignored, so the
     climb is never restarted halfway up.

     Where it comes to rest is the top of the pond (#waterline), the band
     under the opening screen. The page goes down with it while it climbs, so
     that on screen it does what it always did — comes up from below and
     stops `surface_end` from the top — and by the time it stops the pond is
     in view and he has fallen past the quote. Without a #waterline it simply
     stops `surface_end` from the top of the screen, and the page stays put. */
  Aquarium.raiseSurface = () => {
    if (rise || risen) return;
    const end = Number(get('water.surface_end', 0.17));
    const scrollFrom = window.scrollY;
    const mark = document.getElementById('waterline');
    const to = mark
      ? mark.getBoundingClientRect().top + scrollFrom
      : scrollFrom + view.h * end;
    rise = {
      from: scrollFrom + view.h + 40,
      to,
      at: clock,
      time: Math.max(0.2, Number(get('water.rise_time', 3.4))),
      scrollFrom,
      scrollTo: mark ? Math.max(0, to - view.h * end) : scrollFrom
    };
    resting = rise.from;
    // the page is being moved for him, so he isn't to be carried with it
    state.autoScroll = rise.scrollTo !== scrollFrom;
    // After a hero click the page doesn't stop where the water does: the
    // bowl module takes the scroll from here and carries it on down to the
    // group, and the water only climbs.
    if (state.heading && Aquarium.leadRise && Aquarium.leadRise({ ...rise })) rise.led = true;
  };

  Aquarium.dropSurface = () => {
    rise = null; risen = false; state.autoScroll = false; remeasureSurface();
  };

  /* The page above the line has been cut away by `by` pixels: the line is
     that much nearer the top of the page now, though not on the screen.
     If it is still climbing (the dive given up partway, by a scroll), the
     climb moves with it. */
  Aquarium.shiftSurface = by => {
    resting -= by;
    if (rise) { rise.from -= by; rise.to -= by; rise.scrollFrom -= by; rise.scrollTo -= by; }
  };

  /* Whether the line is still on its way up. He dives until it isn't. */
  Aquarium.surfaceRising = () => !!rise;

  /* And how long it has left to go, in seconds; 0 once it is up. */
  Aquarium.surfaceLeft = () => rise ? Math.max(0, rise.at + rise.time - clock) : 0;

  /* One steady climb, slowing down only over the last `rise_ease` of it, so
     it never looks as if it has stopped partway. Starts at 0, ends at 1. */
  function steady(p) {
    const k = clamp(Number(get('water.rise_ease', 0.15)), 0.01, 1);
    const v = 1 / (1 - k / 2);
    if (p < 1 - k) return p * v;
    const q = p - (1 - k);
    return ((1 - k) + q - (q * q) / (2 * k)) * v;
  }

  function climb() {
    if (!rise) return;
    const p = clamp((clock - rise.at) / rise.time, 0, 1);
    resting = lerp(rise.from, rise.to, steady(p));
    // 'instant', or the stylesheet's smooth scrolling would chase every frame
    if (state.autoScroll && !rise.led) {
      window.scrollTo({ top: lerp(rise.scrollFrom, rise.scrollTo, steady(p)), behavior: 'instant' });
    }
    if (p >= 1) {
      if (!rise.led) state.autoScroll = false;
      rise = null;
      risen = true;
      if (Aquarium.onSettled) Aquarium.onSettled();
    }
  }
