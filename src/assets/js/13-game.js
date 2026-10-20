/* Game Mode: the joystick under the overview swaps the page for another
   view, behind a band of water that sweeps across the screen. Left to right
   on the way in, right to left on the way out; the views change while the
   band covers the whole screen, so neither is ever seen half drawn. The
   view itself is still under construction (sections/game.html). */

(() => {
  'use strict';

  const toggle = document.getElementById('game-toggle');
  const layer  = document.getElementById('game-layer');
  const back   = document.getElementById('game-back');
  const sweep  = document.getElementById('sweep');
  const main   = document.getElementById('main');
  if (!toggle || !layer || !sweep) return;

  const get = (path, fallback) => window.Aquarium ? Aquarium.get(path, fallback) : fallback;
  const isOpen = () => !layer.hidden;
  let running = false;

  function show(on) {
    layer.hidden = !on;
    document.body.classList.toggle('game-open', on);
    toggle.setAttribute('aria-expanded', String(on));
    if (main) {
      main.inert = on;
      if (on) main.setAttribute('aria-hidden', 'true');
      else main.removeAttribute('aria-hidden');
    }
  }

  /* The band is 160vw wide and leans by `sweep_angle`, so its edges stick
     out by tan(angle) × half the screen's height either side of its middle.
     It starts wholly off one side, covers the screen at its halfway point,
     and leaves wholly off the other. The two halves meet at the same speed:
     it gathers pace on the way in and loses it on the way out. */
  function cross(forward, swap) {
    const reduce = Portfolio.reduceMotion.matches;
    const time = Math.max(0, Number(get('game.sweep_time', 1.1))) * 1000;
    if (reduce || !time || typeof sweep.animate !== 'function') { swap(); return; }

    running = true;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const band = w * 1.6;
    const angle = Number(get('game.sweep_angle', 10));
    const lean = Math.abs(Math.tan(angle * Math.PI / 180)) * h / 2 + 2;
    const off = -band - lean;          // wholly off the left
    const on  = w + lean;              // wholly off the right
    const mid = (w - band) / 2;        // covering the screen
    const from = forward ? off : on;
    const to   = forward ? on : off;
    // the top edge leans the way it is going
    const at = x => ({ transform: `translateX(${x}px) skewX(${forward ? -angle : angle}deg)` });

    sweep.classList.add('is-running');
    const half = time / 2;
    sweep.animate([at(from), at(mid)], { duration: half, easing: 'cubic-bezier(.45, 0, .8, .45)', fill: 'forwards' })
      .finished.then(() => {
        swap();
        return sweep.animate([at(mid), at(to)], { duration: half, easing: 'cubic-bezier(.2, .55, .55, 1)', fill: 'forwards' }).finished;
      })
      .finally(() => {
        sweep.getAnimations().forEach(a => a.cancel());
        sweep.classList.remove('is-running');
        running = false;
      });
  }

  function open() {
    if (running || isOpen()) return;
    cross(true, () => {
      show(true);
      const title = document.getElementById('game-title');
      if (title) title.focus({ preventScroll: true });
    });
  }

  function close() {
    if (running || !isOpen()) return;
    cross(false, () => {
      show(false);
      toggle.focus({ preventScroll: true });
    });
  }

  toggle.addEventListener('click', open);
  if (back) back.addEventListener('click', close);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) close();
  });
})();
