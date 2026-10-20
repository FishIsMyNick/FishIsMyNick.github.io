/* Glass, and water. All synthesised — there is no audio file to ship.

   A tap is a filtered noise transient, two ringing partials and the low thud
   of the panel flexing. A crack is the same with the ring bent downwards. The
   shatter is a handful of those at once, falling.

   The splash is the one that has to be built rather than filtered: noise
   alone only ever sounds like a hiss. What makes water sound like water is
   the bubbles — a pocket of trapped air rings at a pitch set by its size, and
   shrinks as it rises, so the note slides upwards as it fades. One big one
   for the cavity he leaves behind him and a scatter of small ones after it,
   under a short bright hit and a thin wash of falling droplets.

   Levels come from the `sound` block in src/content/aquarium.yaml. */

(() => {
  'use strict';

  const cfg = (path, fallback) => Aquarium.get('sound.' + path, fallback);

  const sound = (() => {
    let ctx = null;
    let master = null;
    let enabled = cfg('enabled', true) !== false;

    function ready() {
      if (!enabled) return false;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        const soften = ctx.createBiquadFilter();
        soften.type = 'lowpass';
        soften.frequency.value = 9000;
        master.connect(soften).connect(ctx.destination);
      }
      master.gain.value = Number(cfg('volume', 0.5)) || 0;
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }

    /* A burst of noise, shaped by an envelope and a filter. */
    function noise(t, { dur, type, freq, q, gain, decay }) {
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, decay);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(filter).connect(g).connect(master);
      src.start(t);
      return filter;
    }

    /* One ringing partial of the glass. */
    function ring(t, freq, amp, decay, bend) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (bend) osc.frequency.exponentialRampToValueAtTime(freq * bend, t + decay);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + decay + 0.03);
    }

    function tap(strength = 1) {
      if (!ready()) return;
      const s = strength * Number(cfg('tap', 1));
      const t = ctx.currentTime;

      noise(t, { dur: 0.09, type: 'bandpass', freq: 3100 + Math.random() * 900,
                 q: 1.1, gain: 0.3 * s, decay: 6 });

      [{ f: 1840, a: 0.16, d: 0.17 },
       { f: 3160, a: 0.11, d: 0.12 },
       { f: 5380, a: 0.04, d: 0.07 }].forEach(p => {
        ring(t, p.f * (0.97 + Math.random() * 0.06), p.a * s, p.d);
      });

      const low = ctx.createOscillator();
      low.type = 'sine';
      low.frequency.setValueAtTime(185, t);
      low.frequency.exponentialRampToValueAtTime(88, t + 0.08);
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0.2 * s, t);
      lg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      low.connect(lg).connect(master);
      low.start(t);
      low.stop(t + 0.13);
    }

    /* A tap that doesn't quite hold: the ring slides down instead of staying
       put, which is what a crack sounds like. */
    function crack(strength = 1) {
      if (!ready()) return;
      const s = strength * Number(cfg('crack', 1));
      const t = ctx.currentTime;

      tap(strength * 0.8);
      noise(t + 0.01, { dur: 0.16, type: 'highpass', freq: 2400,
                        q: 0.6, gain: 0.26 * s, decay: 3 });
      ring(t + 0.012, 2400, 0.1 * s, 0.26, 0.55);
      ring(t + 0.02, 1260, 0.08 * s, 0.3, 0.6);
    }

    /* The break: the panel letting go, then the pieces landing. */
    function shatter(strength = 1) {
      if (!ready()) return;
      const s = strength * Number(cfg('shatter', 1));
      const t = ctx.currentTime;

      noise(t, { dur: 0.5, type: 'highpass', freq: 1800, q: 0.4,
                 gain: 0.32 * s, decay: 2.2 });

      for (let i = 0; i < 9; i++) {
        const at = t + 0.02 + Math.random() * 0.42;
        ring(at, 2200 + Math.random() * 4200, (0.05 + Math.random() * 0.06) * s,
             0.08 + Math.random() * 0.18, 0.8);
      }

      const low = ctx.createOscillator();
      low.type = 'triangle';
      low.frequency.setValueAtTime(140, t);
      low.frequency.exponentialRampToValueAtTime(52, t + 0.3);
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0.26 * s, t);
      lg.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      low.connect(lg).connect(master);
      low.start(t);
      low.stop(t + 0.36);
    }

    /* A bubble in water, which is the whole trick to making this sound wet.

       A pocket of air trapped under the surface rings at a pitch set by how
       big it is, and it shrinks as it rises and loses air — so the note slides
       *up* as it dies away, quickly. That rising blip is what the ear hears as
       water; noise on its own is only ever a hiss. Small bubbles are high and
       short, the big one left by something heavy going in is low and longer. */
    function bubble_(t, freq, rise, amp, dur) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * rise, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    }

    /* Water taking him. Four things happening at once, in the order water
       does them:

         the hit     a short burst of noise, bright at the front and closing
                     down fast — the surface being broken
         the cavity  the big bubble he leaves behind him, low and rising
         the fizz    a scatter of smaller bubbles over the next third of a
                     second, each one higher and shorter than the last
         the wash    the droplets coming back down, a thin hiss under it all

       Nothing here is a recording: it is four oscillators and two bursts of
       noise. `strength` is how hard he went in — it moves the pitch of the
       cavity, how many bubbles there are and how long the wash runs, rather
       than simply turning the whole thing up. */
    function splash(strength = 1) {
      if (!ready()) return;
      const s = Math.min(strength, 1.6) * Number(cfg('splash', 0.9));
      const big = Math.min(Math.max(strength, 0.2), 1.6);   // how heavy it was
      const t = ctx.currentTime;
      const r = (a, b) => a + Math.random() * (b - a);

      // 1. the surface breaking: bright, and shutting down within a tenth
      const hit = noise(t, { dur: 0.4, type: 'bandpass', freq: 1800,
                             q: 0.55, gain: 0.34 * s, decay: 4.5 });
      hit.frequency.setValueAtTime(2200 + r(-300, 400), t);
      hit.frequency.exponentialRampToValueAtTime(420, t + 0.13);
      hit.frequency.exponentialRampToValueAtTime(190, t + 0.38);

      // 2. the cavity behind him — the "bloop". Lower the harder he hit.
      bubble_(t + 0.012, (300 - big * 110) * r(0.92, 1.08), r(1.8, 2.4),
              0.17 * s, 0.1 + big * 0.055);

      // 3. the fizz: a handful of smaller ones, thinning out
      const n = Math.round(4 + big * 7);
      for (let i = 0; i < n; i++) {
        const when = t + 0.03 + Math.pow(Math.random(), 1.5) * (0.16 + big * 0.22);
        bubble_(when, r(420, 1250), r(1.5, 2.3),
                r(0.012, 0.05) * s, r(0.035, 0.085));
      }

      // 4. the wash of droplets falling back in
      const wash = noise(t + 0.05, { dur: 0.5 + big * 0.5, type: 'highpass',
                                     freq: 1500, q: 0.5,
                                     gain: 0.085 * s * big, decay: 1.5 });
      wash.frequency.setValueAtTime(900, t + 0.05);
      wash.frequency.linearRampToValueAtTime(2600, t + 0.5 + big * 0.4);

      // and a little weight under the whole thing, for a heavy landing
      if (big > 0.6) {
        const low = ctx.createOscillator();
        low.type = 'sine';
        low.frequency.setValueAtTime(130, t);
        low.frequency.exponentialRampToValueAtTime(58, t + 0.18);
        const lg = ctx.createGain();
        lg.gain.setValueAtTime(0.1 * s * big, t);
        lg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        low.connect(lg).connect(master);
        low.start(t);
        low.stop(t + 0.26);
      }
    }

    /* One bubble leaving his mouth: a short upward blip. */
    function bubble(strength = 1) {
      if (!ready()) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420 + Math.random() * 280, t);
      osc.frequency.exponentialRampToValueAtTime(1400 + Math.random() * 600, t + 0.07);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05 * strength, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + 0.11);
    }

    return {
      tap, crack, shatter, splash, bubble,
      get enabled() { return enabled; },
      set enabled(v) { enabled = v; if (!v && ctx) ctx.suspend(); }
    };
  })();

  // A viewer's own choice is remembered, and wins over `sound.enabled`.
  const soundKey = 'portfolio.sound';
  try {
    const saved = localStorage.getItem(soundKey);
    if (saved !== null) sound.enabled = saved === 'on';
  } catch (err) { /* no storage: the setting stands */ }

  const btn = document.getElementById('sound-toggle');
  if (btn) {
    const paint = () => {
      // the icon follows aria-pressed (see 06-title.css)
      btn.setAttribute('aria-pressed', String(sound.enabled));
      btn.title = sound.enabled ? 'Sound on' : 'Sound off';
    };
    paint();
    btn.addEventListener('click', () => {
      sound.enabled = !sound.enabled;
      paint();
      try { localStorage.setItem(soundKey, sound.enabled ? 'on' : 'off'); } catch (err) { /* fine */ }
      if (sound.enabled) sound.tap(0.8);
    });
  }

  // Hand the whole kit to anything else that wants it (the bowl and the fish).
  Portfolio.sound = sound;

})();
