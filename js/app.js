(function () {
  const total = BOOK_PAGES.length;

  const bookEl = document.getElementById('book');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageIndicator = document.getElementById('pageIndicator');
  const swipeHint = document.getElementById('swipeHint');
  const tocBtn = document.getElementById('tocBtn');
  const tocOverlay = document.getElementById('tocOverlay');
  const tocClose = document.getElementById('tocClose');
  const tocList = document.getElementById('tocList');

  let currentIndex = 0;
  const pageEls = [];

  // zoom state (declared early: render() below calls resetZoom() before the
  // rest of the zoom feature is defined further down this file)
  const MAX_SCALE = 4;
  const DOUBLE_TAP_SCALE = 2.5;
  const SNAP_BACK_BELOW = 1.08;
  const TAP_MOVE_TOLERANCE = 10;
  const SWIPE_DISTANCE = 32;
  const FLICK_DISTANCE = 16;
  const FLICK_SPEED = 0.3;
  const DOUBLE_TAP_MS = 260;
  const HINT_DEFAULT = swipeHint.textContent;
  let scale = 1, tx = 0, ty = 0;
  let zoomed = false;
  const pointers = new Map();
  let gesture = null;
  let downX = 0, downY = 0, downTime = 0, moved = false, swipeFired = false;
  let lastTapTime = 0, lastTapX = 0, lastTapY = 0;
  let pendingTap = null;
  let wheelTimer = null;

  // ---------- build the page stack (page 0 sits on top, like a closed book) ----------
  BOOK_PAGES.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'page';
    const img = document.createElement('img');
    img.src = p.src;
    img.alt = p.label || '';
    img.loading = i <= 1 ? 'eager' : 'lazy';
    if (i <= 1) img.fetchPriority = 'high';
    el.appendChild(img);
    bookEl.appendChild(el);
    pageEls.push(el);
  });

  function render(newIndex, animate) {
    resetZoom();
    newIndex = Math.max(0, Math.min(total - 1, newIndex));
    pageEls.forEach((el, i) => {
      const flipped = i < newIndex;
      el.style.zIndex = flipped ? i : total * 2 - i;
      if (!animate) el.classList.add('no-anim');
      el.classList.toggle('flipped', flipped);
      if (!animate) {
        // eslint-disable-next-line no-unused-expressions
        el.offsetHeight; // force reflow so the class removal below doesn't re-animate later
        el.classList.remove('no-anim');
      }
    });
    currentIndex = newIndex;
    updateIndicator();
  }

  function updateIndicator() {
    pageIndicator.textContent = (currentIndex + 1) + ' / ' + total;
    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= total - 1;
    highlightToc();
  }

  function goNext() {
    if (currentIndex < total - 1) render(currentIndex + 1, true);
  }
  function goPrev() {
    if (currentIndex > 0) render(currentIndex - 1, true);
  }

  render(0, false);
  setTimeout(() => swipeHint.classList.add('fade'), 3500);

  // ---------- controls ----------
  prevBtn.addEventListener('click', () => { swipeHint.classList.add('fade'); goPrev(); });
  nextBtn.addEventListener('click', () => { swipeHint.classList.add('fade'); goNext(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'Escape') { closeToc(); resetZoom(); }
  });

  // ---------- zoom: pinch, double-tap toggle, drag to pan ----------
  function currentImg() {
    const el = pageEls[currentIndex];
    return el ? el.querySelector('img') : null;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function clampTranslate() {
    const r = bookEl.getBoundingClientRect();
    tx = clamp(tx, r.width * (1 - scale), 0);
    ty = clamp(ty, r.height * (1 - scale), 0);
  }

  function applyTransform() {
    const img = currentImg();
    if (img) img.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
  }

  function setPanning(on) {
    const img = currentImg();
    if (img) img.classList.toggle('panning', on);
  }

  function setZoomed(on) {
    if (zoomed === on) return;
    zoomed = on;
    document.body.classList.toggle('zoom-active', on);
    if (on) {
      swipeHint.textContent = '雙擊或雙指縮小還原';
      swipeHint.classList.remove('fade');
    } else {
      swipeHint.textContent = HINT_DEFAULT;
      swipeHint.classList.add('fade');
    }
  }

  // zoom to newScale keeping the content under (cx, cy) fixed; cx/cy are book-local px
  function zoomTo(newScale, cx, cy) {
    newScale = clamp(newScale, 1, MAX_SCALE);
    tx = cx - (cx - tx) * (newScale / scale);
    ty = cy - (cy - ty) * (newScale / scale);
    scale = newScale;
    clampTranslate();
    applyTransform();
    setZoomed(scale > 1.001);
  }

  function resetZoom() {
    if (!zoomed && scale === 1) return;
    scale = 1; tx = 0; ty = 0;
    setPanning(false);
    applyTransform();
    setZoomed(false);
  }

  function fireSwipe(dx) {
    swipeFired = true;
    swipeHint.classList.add('fade');
    if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
    if (dx < 0) goNext(); else goPrev();
  }

  function startPinch() {
    if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
    const [a, b] = [...pointers.values()];
    const r = bookEl.getBoundingClientRect();
    const mx = (a.x + b.x) / 2 - r.left;
    const my = (a.y + b.y) / 2 - r.top;
    gesture = {
      type: 'pinch',
      d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      s0: scale,
      px: (mx - tx) / scale,
      py: (my - ty) / scale,
    };
    moved = true;
    setPanning(true);
  }

  bookEl.addEventListener('pointerdown', (e) => {
    bookEl.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      downX = e.clientX; downY = e.clientY; downTime = Date.now(); moved = false; swipeFired = false;
      gesture = { type: 'pan', startTx: tx, startTy: ty, ox: e.clientX, oy: e.clientY };
    } else if (pointers.size === 2) {
      startPinch();
    }
  });

  bookEl.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (!gesture) return;

    if (gesture.type === 'pinch' && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const r = bookEl.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - r.left;
      const my = (a.y + b.y) / 2 - r.top;
      scale = clamp(gesture.s0 * (Math.hypot(a.x - b.x, a.y - b.y) / gesture.d0), 1, MAX_SCALE);
      tx = mx - gesture.px * scale;
      ty = my - gesture.py * scale;
      clampTranslate();
      applyTransform();
      setZoomed(scale > 1.001);
    } else if (gesture.type === 'pan' && pointers.size === 1) {
      if (Math.abs(e.clientX - downX) > TAP_MOVE_TOLERANCE || Math.abs(e.clientY - downY) > TAP_MOVE_TOLERANCE) moved = true;
      if (!zoomed && moved && !swipeFired) {
        const dx = e.clientX - downX, dy = e.clientY - downY;
        if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.2) fireSwipe(dx);
      }
      if (zoomed && moved) {
        setPanning(true);
        tx = gesture.startTx + (e.clientX - gesture.ox);
        ty = gesture.startTy + (e.clientY - gesture.oy);
        clampTranslate();
        applyTransform();
      }
    }
  });

  function onPointerEnd(e, cancelled) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);

    if (pointers.size >= 1) {
      // a pinch lost one finger: keep panning with the remaining one, never count it as a tap
      if (gesture && gesture.type === 'pinch') {
        const rem = [...pointers.values()][0];
        gesture = { type: 'pan', startTx: tx, startTy: ty, ox: rem.x, oy: rem.y };
        downX = rem.x; downY = rem.y;
      }
      return;
    }

    gesture = null;
    setPanning(false);
    if (cancelled) return;

    if (zoomed && scale < SNAP_BACK_BELOW) { resetZoom(); return; }

    if (moved) {
      const dx = e.clientX - downX, dy = e.clientY - downY;
      const speed = Math.abs(dx) / Math.max(1, Date.now() - downTime);
      if (!zoomed && !swipeFired && Math.abs(dx) > FLICK_DISTANCE && Math.abs(dx) > Math.abs(dy) && speed > FLICK_SPEED) fireSwipe(dx);
      return;
    }

    // genuine tap: double tap toggles zoom; single tap flips (only when not zoomed)
    const now = Date.now();
    const isDoubleTap = (now - lastTapTime < DOUBLE_TAP_MS) &&
      Math.abs(e.clientX - lastTapX) < 30 && Math.abs(e.clientY - lastTapY) < 30;
    lastTapTime = isDoubleTap ? 0 : now;
    lastTapX = e.clientX; lastTapY = e.clientY;

    if (isDoubleTap) {
      if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
      if (zoomed) {
        resetZoom();
      } else {
        const r = bookEl.getBoundingClientRect();
        zoomTo(DOUBLE_TAP_SCALE, e.clientX - r.left, e.clientY - r.top);
      }
      return;
    }

    if (zoomed) return;
    const tapX = e.clientX;
    pendingTap = setTimeout(() => {
      pendingTap = null;
      const r = bookEl.getBoundingClientRect();
      swipeHint.classList.add('fade');
      if (tapX - r.left > r.width / 2) goNext(); else goPrev();
    }, DOUBLE_TAP_MS);
  }

  bookEl.addEventListener('pointerup', (e) => onPointerEnd(e, false));
  bookEl.addEventListener('pointercancel', (e) => onPointerEnd(e, true));

  // desktop: trackpad pinch / ctrl+wheel zooms, plain wheel pans while zoomed
  bookEl.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !zoomed) return;
    e.preventDefault();
    setPanning(true);
    const r = bookEl.getBoundingClientRect();
    if (e.ctrlKey) {
      zoomTo(scale * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
    } else {
      tx -= e.deltaX; ty -= e.deltaY;
      clampTranslate();
      applyTransform();
    }
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      setPanning(false);
      if (zoomed && scale < SNAP_BACK_BELOW) resetZoom();
    }, 140);
  }, { passive: false });

  // ---------- table of contents ----------
  const tocEntries = [];
  BOOK_PAGES.forEach((p, idx) => {
    if (p.inToc) tocEntries.push({ idx, label: p.tocLabel || p.label, sub: p.tocSub || '' });
  });

  tocEntries.forEach((entry, i) => {
    const item = document.createElement('button');
    item.className = 'toc-item';
    item.dataset.idx = String(entry.idx);
    const num = String(i + 1).padStart(2, '0');
    item.innerHTML =
      '<span class="toc-num">' + num + '</span>' +
      '<span class="toc-text">' +
      '<span class="toc-label">' + entry.label + '</span>' +
      (entry.sub ? '<span class="toc-sub">' + entry.sub + '</span>' : '') +
      '</span>';
    item.addEventListener('click', () => {
      render(entry.idx, true);
      closeToc();
    });
    tocList.appendChild(item);
  });

  function highlightToc() {
    tocList.querySelectorAll('.toc-item').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.idx) === currentIndex);
    });
  }

  function openToc() { tocOverlay.hidden = false; }
  function closeToc() { tocOverlay.hidden = true; }

  tocBtn.addEventListener('click', openToc);
  tocClose.addEventListener('click', closeToc);
  tocOverlay.addEventListener('click', (e) => {
    if (e.target === tocOverlay) closeToc();
  });
})();
