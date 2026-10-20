/* Project previews: empty-state fallback, and play on hover. */

(() => {
  'use strict';

  /* A row's video is optional. Until a clip is dropped into media/, the panel
     falls back to an empty water panel instead of a broken video box.        */

  /* A studio logo is optional too. Until media/<logo>.png exists, the corner
     falls back to the studio's name. */
  document.querySelectorAll('.media-studio-logo').forEach(img => {
    const bare = () => {
      const corner = img.closest('.media-studio');
      if (corner) corner.classList.remove('has-logo');
      img.remove();
    };
    img.addEventListener('error', bare);
    // the file may already have failed before this script ran
    if (img.complete && !img.naturalWidth) bare();
  });

  /* A reference's icon is fetched from its site. Offline, or when there is
     none, the bubble shows the site's first letter instead. */
  document.querySelectorAll('.ref-icon img').forEach(img => {
    const bare = () => {
      img.parentElement.classList.add('is-bare');
      img.remove();
    };
    img.addEventListener('error', bare);
    if (img.complete && !img.naturalWidth) bare();
  });

  /* A panel with more than one picture (a hero panel, or any media named as
     a folder) fades from each to the next. Each panel keeps its own clock
     and holds every picture for a fresh random time (`hero.hold` in
     aquarium.yaml), so they never change together. The hero panels stop
     once the glass is broken: they are gone by then. */
  const { get, range, pick } = Aquarium;
  document.querySelectorAll('.slides').forEach(set => {
    const photos = [...set.querySelectorAll('.slide')];
    set.style.setProperty('--slide-fade', Math.max(0, Number(get('hero.fade', 2))) + 's');
    if (photos.length < 2 || Portfolio.reduceMotion.matches) return;
    const hero = !!set.closest('.showcase');
    let on = 0;
    const next = () => {
      if (hero && document.body.classList.contains('is-breaking')) return;
      if (!document.hidden) {
        photos[on].classList.remove('is-on');
        on = (on + 1) % photos.length;
        photos[on].classList.add('is-on');
      }
      setTimeout(next, pick(range('hero.hold', 7, 9)) * 1000);
    };
    setTimeout(next, pick(range('hero.hold', 7, 9)) * 1000);
  });

  document.querySelectorAll('.media').forEach(fig => {
    if (fig.querySelector('.slides')) return;      // pictures, nothing to play
    // its own clip, not the cover waiting over a split thumbnail
    const video = fig.querySelector('video:not(.media-cover video)');
    if (!video) { fig.classList.add('is-empty'); return; }

    const markEmpty = () => fig.classList.add('is-empty');
    const poster = video.getAttribute('poster');

    // Either file alone is enough: a panel with a .jpg and no .mp4 keeps
    // showing the picture, it just has nothing to play on hover; one with
    // an .mp4 and no picture shows the clip's first frame (no poster).
    if (!video.querySelector('source')) video.dataset.noClip = '';
    let still = false;
    if (poster) {
      const probe = new Image();
      probe.onload = () => { still = true; };
      probe.onerror = markEmpty;
      probe.src = poster;
    }
    video.addEventListener('error', () => {
      video.dataset.noClip = '';
      if (!still) markEmpty();
    }, true);

    if (Portfolio.reduceMotion.matches) {
      video.setAttribute('controls', '');
      return;
    }

    const play = () => {
      if (fig.classList.contains('is-empty') || 'noClip' in video.dataset) return;
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    };
    const stop = () => { video.pause(); };

    // On a detail page the clips play on their own while they're on screen;
    // in the gallery they wait for the row to be hovered.
    if (fig.closest('.detail-layer') && window.IntersectionObserver) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) play(); else stop();
      }, { threshold: 0.25 }).observe(fig);
      return;
    }

    const row = fig.closest('.entry, .showcase-item') || fig;
    row.addEventListener('pointerenter', play);
    row.addEventListener('pointerleave', stop);
    row.addEventListener('focusin', play);
    row.addEventListener('focusout', stop);
  });

  /* A professional project's row shows its cover in the thumbnail's place
     while it is hovered: the clip, playing, or else the picture. It is only
     fetched on the first hover, and only faded up once it is actually
     playing (or loaded), so a slow connection keeps the thumbnail rather
     than showing a blank. Leaving the row fades it back out and pauses it;
     the next hover carries on from there. Not for reduced motion. */
  document.querySelectorAll('.media-cover').forEach(layer => {
    const el = layer.querySelector('video, img');
    if (!el || Portfolio.reduceMotion.matches) return;
    const row = layer.closest('.entry') || layer.parentElement;
    const fig = layer.parentElement;
    const isVideo = el.tagName === 'VIDEO';
    let hovered = false;

    // the studio's logo is kept over the cover (07-work.css, .is-covered)
    const show = () => {
      if (!hovered) return;
      layer.classList.add('is-showing');
      fig.classList.add('is-covered');
    };
    el.addEventListener(isVideo ? 'playing' : 'load', show);

    const enter = () => {
      hovered = true;
      if (!el.getAttribute('src')) el.src = el.dataset.src;
      if (isVideo) {
        const p = el.play();
        if (p && p.catch) p.catch(() => {});
        if (!el.paused && el.readyState >= 3) show();
      } else if (el.complete && el.naturalWidth) {
        show();
      }
    };
    const leave = () => {
      hovered = false;
      layer.classList.remove('is-showing');
      fig.classList.remove('is-covered');
      if (isVideo) el.pause();
    };

    row.addEventListener('pointerenter', enter);
    row.addEventListener('pointerleave', leave);
    row.addEventListener('focusin', enter);
    row.addEventListener('focusout', leave);
  });

})();
