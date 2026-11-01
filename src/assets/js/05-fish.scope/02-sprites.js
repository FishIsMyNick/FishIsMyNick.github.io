  // --------------------------------------------------------- the sprites --

  /* Two drawings, one for each way he goes: `fish-sprite-left` and
     `fish-sprite-right`, both inlined into the page by the build.

     He is no longer one drawing held up to a mirror. When he comes about, the
     drawing he is wearing is squashed down through nothing and the other one
     opens out on the far side of it — so the turn is the same movement it
     always was, but what you see afterwards is a drawing made to face that
     way rather than a flipped copy of the other one.

     Each file is trimmed to its ink with a transparent background, so there is
     nothing to crop here and nothing to read back off a canvas. */

  const sheets = { left: null, right: null };
  const shades = { left: null, right: null };
  const shape = { left: 0.46, right: 0.46 };   // height ÷ length, per drawing
  let ready = false;

  function loadSprites() {
    let settled = 0;

    const finish = () => {
      if (++settled < 2) return;
      // one drawing missing is not worth a fishless page: the other does both
      if (!sheets.left && sheets.right) {
        sheets.left = sheets.right; shades.left = shades.right; shape.left = shape.right;
      }
      if (!sheets.right && sheets.left) {
        sheets.right = sheets.left; shades.right = shades.left; shape.right = shape.left;
      }
      ready = !!sheets.right;
    };

    for (const side of ['left', 'right']) {
      const img = document.getElementById('fish-sprite-' + side);
      if (!img) { finish(); continue; }

      const take = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w && h) {
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          sheets[side] = c;
          shape[side] = h / w;
          shades[side] = silhouette(c);
        }
        finish();
      };

      if (img.complete && img.naturalWidth) take();
      else {
        img.addEventListener('load', take, { once: true });
        img.addEventListener('error', finish, { once: true });
      }
    }
  }

  /* Which drawing he is wearing this frame. `flip` is the width he is drawn
     at, signed: it eases from one side to the other and the swap happens as it
     passes through zero, which is the middle of the turn. */
  function sideNow() {
    return fish.flip >= 0 ? 'right' : 'left';
  }

  /* How tall he is for his length, in the drawing he is wearing. */
  function bodyRatio() {
    return shape[sideNow()] || 0.46;
  }

  /* A black copy of him, softened once here rather than on every frame, so
     that his shadow costs one more blit and not a filter. */
  function silhouette(src) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);

    if (!('filter' in g)) return c;
    const soft = document.createElement('canvas');
    soft.width = c.width; soft.height = c.height;
    const sg = soft.getContext('2d');
    sg.filter = `blur(${Math.max(2, c.width * 0.02)}px)`;
    sg.drawImage(c, 0, 0);
    return soft;
  }
