/* The only things the modules share. Everything else in each file stays
   private to it, so a module can be removed without breaking the others. */

window.Portfolio = {

  // One media query, read by anything that animates.
  reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),

  // Every setting from src/content/aquarium.yaml, written into the page by
  // the build. Also reachable as Aquarium.config, which is the name to use
  // when trying values in the console.
  aquarium: (() => {
    const el = document.getElementById('aquarium-config');
    try {
      return el ? JSON.parse(el.textContent) : {};
    } catch (err) {
      console.error('aquarium.yaml did not survive the build as valid JSON:', err);
      return {};
    }
  })(),

  // The sound module fills these in once the audio graph exists. Until then
  // calling one does nothing, so nothing else has to check.
  sound: { tap() {}, crack() {}, shatter() {}, splash() {}, bubble() {} }

};


/* The aquarium's own front door: the settings, the state everything reads,
   and the two things worth doing by hand.

       Aquarium.config.fish.dash_distance = 120
       Aquarium.break_()     skip the tapping
       Aquarium.reset()      put him back in a whole bowl
*/
window.Aquarium = (() => {
  'use strict';

  const config = Portfolio.aquarium;

  /* Settings are read through here rather than straight off the object, so a
     value deleted from the YAML falls back to something sensible instead of
     stopping the page, and an edit in the console is picked up on the next
     frame. */
  function get(path, fallback) {
    let node = config;
    for (const key of path.split('.')) {
      if (node == null || typeof node !== 'object') return fallback;
      node = node[key];
    }
    if (node === undefined || node === null) return fallback;
    return node;
  }

  /* A [low, high] pair in the YAML means "somewhere in here". A single number
     means exactly that. Either is accepted wherever a range is read. */
  function range(path, lo, hi) {
    const v = get(path, null);
    if (Array.isArray(v) && v.length >= 2) return [Number(v[0]), Number(v[1])];
    if (typeof v === 'number') return [v, v];
    return [lo, hi];
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const rand  = (a, b) => a + Math.random() * (b - a);
  const pick  = ([a, b]) => rand(a, b);

  function rgb(hex) {
    const h = String(hex || '').replace('#', '');
    const n = h.length === 3
      ? h.split('').map(c => c + c).join('')
      : h.padEnd(6, '0').slice(0, 6);
    const v = parseInt(n, 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
  }

  function mix(a, b, t) {
    const x = typeof a === 'string' ? rgb(a) : a;
    const y = typeof b === 'string' ? rgb(b) : b;
    return {
      r: Math.round(lerp(x.r, y.r, t)),
      g: Math.round(lerp(x.g, y.g, t)),
      b: Math.round(lerp(x.b, y.b, t))
    };
  }

  const css  = (c, alpha) => alpha === undefined
    ? `rgb(${c.r}, ${c.g}, ${c.b})`
    : `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;

  /* Everything the modules need to know about each other. One object rather
     than events: there are four of them, they all run inside one frame, and
     this stays readable. */
  const state = {
    broken: false,       // has the glass gone
    taps: 0,             // how many times it has been hit
    breakTime: 0,        // when it went, in scene seconds
    bowl: null,          // where the glass is on screen, in CSS pixels
    surfaceY: 0,         // the waterline, in screen pixels (may be negative)
    surfacePageY: 0,     // the same line, in page pixels — it never moves
    pour: 0,             // how far the water has come up, 0 to 1
    lastClick: null,     // where the page was last clicked, for the dash
    depth: 0,            // 0 at the surface, 1 as deep as the page goes
    pointer: { x: 0, y: 0, moved: 0, inside: false }
  };

  /* One multiplier for anything that moves on its own. Visitors who have
     asked their system for less movement get the `motion` block's share of it;
     everyone else gets all of it. What they do themselves — clicking, and the
     fish coming over — is never slowed down. */
  function motion() {
    if (get('motion.respect_reduced_motion', true) === false) return 1;
    return Portfolio.reduceMotion.matches
      ? clamp(Number(get('motion.reduced_scale', 0.3)), 0, 1)
      : 1;
  }

  return { config, get, range, state, motion, clamp, lerp, rand, pick, rgb, mix, css };
})();
