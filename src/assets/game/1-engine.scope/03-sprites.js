  // ------------------------------------------------------------ sprites --

  const sheets = { left: null, right: null };
  const shape = { left: 0.46, right: 0.46 };

  for (const side of ['left', 'right']) {
    const img = $('fish-sprite-' + side);
    if (!img) continue;
    const take = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0);
      sheets[side] = c;
      shape[side] = h / w;
    };
    if (img.complete && img.naturalWidth) take();
    else img.addEventListener('load', take, { once: true });
  }
