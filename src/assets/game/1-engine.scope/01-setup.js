/* The Fishy Adventure: the game in the Game Mode view.

   Fish swims after the cursor, and a click is a dash. The places he can be,
   one at a time:

       start    the title and the story, and a coral wall on the right with
                a hole through it. Into the hole is into the first level.
       tunnel   between two places, 3s. The place he's leaving slides off
                to the left and the tunnel slides in after it from the
                right, so he is seen going in. He faces right and swims,
                but drifts back across the screen to the left, because the
                tunnel goes past faster still. It is just long enough that
                its far end reaches the left of the screen as he does, with
                the next place right behind it. The level's number above
                the tunnel, the project's name under it.
       level    one project, played as a few rooms (sublevels) in a row. Rock
                walls round the screen, open on the left (back the way he
                came), solid on the right and in the floor. How a room is
                beaten is its level's mechanic (2-mechanics). Then the rock on the right
                cracks and breaks away, on to the next room. After the last
                room the floor goes too, and the water fades off the
                project's title page.
       dive     down the hole, 2s, the same way turned on its side: the
                level slides up off the screen, the shaft up after it and
                the room up behind that. Nose down, drifting up the screen.
                The water darkens.
       room     the project's details, the same page as in the portfolio,
                to scroll through. A button takes him back up (`rise`, the
                dive the other way round) into the level he left.

   Nothing fades between places: they are laid end to end and slid past,
   picking up speed and losing it again. One canvas draws all of it, under
   the text, and the text of each place slides with it. The levels and their order are
   game.levels in site.yaml; every number is the `game` block of
   aquarium.yaml. 08-game/1-view.js opens and closes the view and calls enter() and
   leave() here, so nothing runs while it's shut. */


  const layer = document.getElementById('game-layer');
  const canvas = document.getElementById('game-canvas');
  const dataEl = document.getElementById('game-data');
  if (!layer || !canvas || !dataEl) return;
  let ctx = canvas.getContext('2d');

  let data = {};
  try { data = JSON.parse(dataEl.textContent); } catch (err) { return; }
  const levels = data.levels || [];

  const { clamp, lerp, rand, mix, css } = Aquarium;
  const num = (key, fallback) => {
    const v = Number(Aquarium.get('game.' + key, fallback));
    return Number.isFinite(v) ? v : fallback;
  };
  const colorAt = d => Aquarium.colorAt ? Aquarium.colorAt(clamp(d, 0, 1)) : mix('#06455a', '#03212e', d);
  const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const sound = () => Portfolio.sound;

  const $ = id => document.getElementById(id);
  const hud = {
    tunnelTop: $('game-tunnel-top'),
    tunnelBottom: $('game-tunnel-bottom'),
    goalLevel: $('game-goal-level'),
    goalText: $('game-goal-text')
  };
  const room = $('game-room');
  const roomBody = $('game-room-body');
  const roomUp = $('game-room-up');
  const roomBar = $('game-room-bar');
  const resetBtn = $('game-reset');
  const fadeEl = $('game-fade');
  const pages = Array.from(layer.querySelectorAll('.game-page'));

  /* Each beaten level's title page: its cover filling the level, faded at
     its edges into a ground of the colour round them, like a vignette: at
     most 20px of solid colour, a 100px fade into the picture, the corners
     well rounded. The fade is one mask, made here for the size of the
     level and shared by every page; the ground is read off the part of each
     picture that shows (a page opened from disk can't read its pictures,
     and keeps its deep colour). */
  const edges = [];
  let pageMask = null;

  function vignette(w, h) {
    const k = 0.25;                                    // drawn small, scaled up smooth
    const c = document.createElement('canvas');
    c.width = Math.max(8, Math.round(w * k));
    c.height = Math.max(8, Math.round(h * k));
    const g = c.getContext('2d');
    g.scale(k, k);
    g.globalCompositeOperation = 'lighter';
    const solid = 20, fade = 100, R = 190, steps = 32;
    for (let n = 0; n < steps; n++) {
      const u = n / (steps - 1);
      const inset = solid + fade * u;
      const r = Math.max(10, R - fade * u);
      // each ring adds the same, so the fade climbs evenly from edge to inside
      g.fillStyle = `rgba(0, 0, 0, ${1 / steps})`;
      g.beginPath();
      if (g.roundRect) g.roundRect(inset, inset, w - inset * 2, h - inset * 2, r);
      else g.rect(inset, inset, w - inset * 2, h - inset * 2);
      g.fill();
    }
    return c;
  }

  /* A level's title page, picture and fade together, painted once onto a
     canvas of its own. Shown for the first time as it is, a picture this big
     through a mask stops everything just as the level is won. */
  function bakePage(i) {
    const page = pages[i];
    const img = page && page.querySelector('img');
    if (!img || !img.naturalWidth || !pageMask) return;
    const rock = num('border', 30);
    const pw = Math.round((view.w - rock * 2) * view.dpr), ph = Math.round((view.h - rock * 2) * view.dpr);
    let c = page.querySelector('canvas');
    if (c && c.width === pw && c.height === ph) return;
    if (!c) {
      c = softCanvas();
      page.appendChild(c);
    }
    c.width = pw;
    c.height = ph;
    const g = c.getContext('2d');
    const scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
    const sw = pw / scale, sh = ph / scale;
    g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, pw, ph);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(pageMask, 0, 0, pw, ph);
    paintNow(c);
    page.classList.add('is-baked');
  }

  function fitPages() {
    const rock = num('border', 30);
    const w = (layer.clientWidth || window.innerWidth) - rock * 2;
    const h = (layer.clientHeight || window.innerHeight) - rock * 2;
    if (w < 10 || h < 10) return;
    if (fitPages.size !== w + 'x' + h) {
      fitPages.size = w + 'x' + h;
      edges.length = 0;
      pageMask = vignette(w, h);
      layer.style.setProperty('--vignette', `url("${pageMask.toDataURL('image/png')}")`);
    }
    pages.forEach((page, i) => {
      const img = page.querySelector('img');
      if (!img || !img.naturalWidth || edges[i]) return;
      try {
        // the part of the picture that shows, the way `object-fit: cover` crops it
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const scale = Math.max(w / iw, h / ih);
        const sw = w / scale, sh = h / scale;
        const n = 48;
        const c = document.createElement('canvas');
        c.width = c.height = n;
        const g = c.getContext('2d');
        g.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, n, n);
        const px = g.getImageData(0, 0, n, n).data;
        let r = 0, gr = 0, b = 0, count = 0;
        for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) {
            if (x > 2 && x < n - 3 && y > 2 && y < n - 3) continue;
            const k = (y * n + x) * 4;
            r += px[k]; gr += px[k + 1]; b += px[k + 2]; count++;
          }
        }
        edges[i] = { r: Math.round(r / count), g: Math.round(gr / count), b: Math.round(b / count) };
        page.style.backgroundColor = css(edges[i]);
      } catch (err) { /* left on the page's own colour */ }
    });
  }

  pages.forEach(page => {
    const img = page.querySelector('img');
    if (!img) return;
    if (img.complete && img.naturalWidth) fitPages();
    else img.addEventListener('load', () => fitPages(), { once: true });
  });

  /* A repeatable random: the same seed draws the same coral every frame. */
  function hash(n) {
    let t = (n * 2654435761) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
