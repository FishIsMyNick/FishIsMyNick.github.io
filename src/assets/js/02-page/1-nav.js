/* The year in the footer, and the sticky nav bar. */

(() => {
  'use strict';

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // The sticky nav stays out of the way until the title has scrolled past.
  // While the page is locked it is hidden by the stylesheet, so there is
  // nothing extra to do here.
  const topbar = document.getElementById('topbar');
  const titleBand = document.querySelector('.band--title');
  if (topbar && titleBand) {
    if (window.IntersectionObserver) {
      new IntersectionObserver(([entry]) => {
        topbar.classList.toggle('is-visible', !entry.isIntersecting);
      }, { threshold: 0 }).observe(titleBand);
    } else {
      const onScroll = () => topbar.classList.toggle(
        'is-visible', window.scrollY > titleBand.offsetHeight);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

})();
