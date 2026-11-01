/* The gear in the top right corner, and the small panel it opens (in Game Mode
   a stone in the middle of the screen, 11-game.css, with only what's to do with
   the game, and the game waits for it). What the
   settings in it do is wired up where they are used (Scroll lock and Dive
   speed in 06-bowl.scope); this only opens and closes it. It closes on a
   second click, a click anywhere else, or Escape. */

(() => {
  'use strict';

  const btn = document.getElementById('settings-toggle');
  const panel = document.getElementById('settings');
  if (!btn || !panel) return;

  const open = () => !panel.hidden;
  const show = on => {
    panel.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    if (Portfolio.game && document.body.classList.contains('game-open')) Portfolio.game.settings(on);
  };

  btn.addEventListener('click', () => show(!open()));

  document.addEventListener('click', event => {
    // Sound beside the gear is one of the panel's settings too: it stays open
    if (event.target.closest && event.target.closest('.sound-toggle')) return;
    if (open() && !panel.contains(event.target) && !btn.contains(event.target)) show(false);
  });

  // Escape closes the panel first; the detail page's own Escape waits for
  // the next press.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !open()) return;
    event.stopImmediatePropagation();
    show(false);
    btn.focus();
  }, true);
})();
