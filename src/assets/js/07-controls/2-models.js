/* The Gallery's 3D models. The viewer itself is <model-viewer>, loaded by
   the page only when there are models. Each model is fetched once its panel
   comes on screen, not with the page: the detail pages start hidden, which
   <model-viewer>'s own lazy loading doesn't notice them leaving. It stops
   turning by itself while somebody is turning it, and starts again
   (auto-rotate-delay, 2.5s) once they let go — and as it does, it comes
   back to the middle of the view at its first zoom. And the "Drag to turn"
   hint goes once somebody has.

   Alt and the middle button drag the model across the view instead of
   turning it.

   An animation showcase has a row of buttons under it, one per animation
   in the file: pressing one plays it on the model from its start, on a
   loop, and marks that button.

   The round button in the top left of each view puts the zoom back where
   it started, leaving the angle as it is. */

(() => {
  'use strict';

  const viewers = document.querySelectorAll('.model-stage model-viewer[data-src]');
  const load = viewer => { if (!viewer.src) viewer.src = viewer.dataset.src; };

  const seen = window.IntersectionObserver && new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      load(entry.target);
      seen.unobserve(entry.target);
    });
  }, { rootMargin: '200px' });

  viewers.forEach(viewer => {
    if (seen) seen.observe(viewer);
    else load(viewer);

    /* Back to the middle, at the first zoom, the moment it starts turning
       by itself again: auto-rotate-delay after the last time anybody
       touched it. The angle is left as it is. */
    const delay = Number(viewer.getAttribute('auto-rotate-delay')) || 3000;
    let pressed = false;
    let settle = 0;
    const later = () => {
      clearTimeout(settle);
      settle = setTimeout(() => {
        if (pressed) return;               // still held: letting go asks again
        const orbit = viewer.getCameraOrbit();
        viewer.cameraTarget = 'auto auto auto';
        viewer.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad auto`;
        viewer.fieldOfView = 'auto';
      }, delay);
    };

    /* Alt and the middle button: a drag across the view. <model-viewer>'s
       own panning is off (disable-pan), so the camera's target is moved by
       hand — along the screen's right and up, by as far as the pointer went
       at the model's distance. Caught on the way in, before the viewer can
       take it as a turn. */
    let pan = null;

    // held still under the pointer for as long as it is pressed
    viewer.addEventListener('pointerdown', event => {
      pressed = true;
      viewer.autoRotate = false;
      if (event.button !== 1 || !event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      pan = { id: event.pointerId, x: event.clientX, y: event.clientY };
      viewer.setPointerCapture(event.pointerId);
      viewer.classList.add('is-panning');
    }, true);
    // and the browser's own middle-button scrolling stays out of it
    viewer.addEventListener('mousedown', event => {
      if (event.button === 1 && event.altKey) event.preventDefault();
    }, true);

    viewer.addEventListener('pointermove', event => {
      if (!pan || event.pointerId !== pan.id) return;
      const dx = event.clientX - pan.x;
      const dy = event.clientY - pan.y;
      pan.x = event.clientX;
      pan.y = event.clientY;

      const { theta, phi, radius } = viewer.getCameraOrbit();
      const fov = viewer.getFieldOfView() * Math.PI / 180;
      const k = 2 * radius * Math.tan(fov / 2) / Math.max(1, viewer.clientHeight);
      // the screen's right and up, in the model's space
      const right = { x: Math.cos(theta), z: -Math.sin(theta) };
      const up = { x: -Math.cos(phi) * Math.sin(theta), y: Math.sin(phi),
                   z: -Math.cos(phi) * Math.cos(theta) };
      const to = viewer.getCameraTarget();
      viewer.cameraTarget = `${to.x + (up.x * dy - right.x * dx) * k}m ` +
                            `${to.y + up.y * dy * k}m ` +
                            `${to.z + (up.z * dy - right.z * dx) * k}m`;
      viewer.jumpCameraToGoal();
      viewer.parentElement.classList.add('is-turned');
      later();
    });
    const endPan = event => {
      if (!pan || event.pointerId !== pan.id) return;
      pan = null;
      viewer.classList.remove('is-panning');
    };
    viewer.addEventListener('pointerup', endPan);
    viewer.addEventListener('pointercancel', endPan);

    // let go anywhere, the drag may have left the panel
    const resume = () => {
      if (!viewer.autoRotate) viewer.autoRotate = true;
      if (pressed) { pressed = false; later(); }
    };
    window.addEventListener('pointerup', resume);
    window.addEventListener('pointercancel', resume);

    const stage = viewer.closest('.model');
    const clips = stage ? stage.querySelectorAll('.clip[data-clip]') : [];
    clips.forEach(btn => btn.addEventListener('click', () => {
      load(viewer);
      viewer.animationName = btn.dataset.clip;
      viewer.currentTime = 0;
      viewer.play();
      clips.forEach(other => other.setAttribute('aria-pressed', String(other === btn)));
    }));

    const reset = stage && stage.querySelector('.model-reset');
    if (reset) reset.addEventListener('click', () => {
      const orbit = viewer.getCameraOrbit();
      viewer.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad auto`;
      viewer.fieldOfView = 'auto';
    });

    viewer.addEventListener('camera-change', event => {
      if (event.detail && event.detail.source === 'user-interaction') {
        viewer.parentElement.classList.add('is-turned');
        later();                           // a turn or a zoom puts it off
      }
    });
  });
})();
