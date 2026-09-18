(function () {
  const total = BOOK_PAGES.length;

  const loadingEl = document.getElementById('loading');
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
  const ZOOM_SCALE = 2.4;
  const TAP_MOVE_TOLERANCE = 10;
  const SWIPE_THRESHOLD = 45;
  const DOUBLE_TAP_MS = 260;
  let zoomed = false;
  let panX = 0, panY = 0;
  let panStartX = 0, panStartY = 0;
  let dragOriginX = 0, dragOriginY = 0;
  let downX = 0, downY = 0, moved = false, tracking = false;
  let lastTapTime = 0, lastTapX = 0, lastTapY = 0;
  let pendingTap = null;

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

  // reveal once the intro video finishes playing, fading slowly into the book
  const introVideo = document.getElementById('introVideo');
  let revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    loadingEl.classList.add('hide');
    setTimeout(() => loadingEl.remove(), 1200);
    setTimeout(() => swipeHint.classList.add('fade'), 3500);
  }
  if (introVideo) {
    introVideo.addEventListener('ended', reveal);
    introVideo.addEventListener('error', reveal);
    // Safety net: if autoplay is blocked or the video stalls, never strand visitors.
    setTimeout(reveal, 7000);
  } else {
    reveal();
  }

  // ---------- controls ----------
  prevBtn.addEventListener('click', () => { swipeHint.classList.add('fade'); goPrev(); });
  nextBtn.addEventListener('click', () => { swipeHint.classList.add('fade'); goNext(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'Escape') { closeToc(); resetZoom(); }
  });

  // ---------- zoom (double-tap to zoom in on the current page, drag to pan, tap to exit) ----------
  function currentImg() {
    const el = pageEls[currentIndex];
    return el ? el.querySelector('img') : null;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function applyPan() {
    const img = currentImg();
    if (!img) return;
    img.style.transform = 'scale(' + ZOOM_SCALE + ') translate(' + (panX / ZOOM_SCALE) + 'px, ' + (panY / ZOOM_SCALE) + 'px)';
  }

  function zoomIn(clientX, clientY) {
    const el = pageEls[currentIndex];
    const img = currentImg();
    if (!el || !img) return;
    const rect = el.getBoundingClientRect();
    const originX = ((clientX - rect.left) / rect.width) * 100;
    const originY = ((clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = clamp(originX, 20, 80) + '% ' + clamp(originY, 20, 80) + '%';
    panX = 0; panY = 0;
    zoomed = true;
    img.classList.add('zoomed');
    document.body.classList.add('zoom-active');
    applyPan();
  }

  function resetZoom() {
    if (!zoomed) return;
    zoomed = false;
    panX = 0; panY = 0;
    const img = currentImg();
    if (img) {
      img.classList.remove('zoomed', 'panning');
      img.style.transform = '';
      img.style.transformOrigin = '';
    }
    document.body.classList.remove('zoom-active');
  }

  bookEl.addEventListener('pointerdown', (e) => {
    tracking = true;
    moved = false;
    downX = e.clientX; downY = e.clientY;
    if (zoomed) {
      panStartX = panX; panStartY = panY;
      dragOriginX = e.clientX; dragOriginY = e.clientY;
    }
  });

  bookEl.addEventListener('pointermove', (e) => {
    if (!tracking) return;
    const dx = e.clientX - downX, dy = e.clientY - downY;
    if (Math.abs(dx) > TAP_MOVE_TOLERANCE || Math.abs(dy) > TAP_MOVE_TOLERANCE) moved = true;
    if (zoomed && moved) {
      const img = currentImg();
      if (img) img.classList.add('panning');
      panX = panStartX + (e.clientX - dragOriginX);
      panY = panStartY + (e.clientY - dragOriginY);
      applyPan();
    }
  });

  function endTracking() {
    tracking = false;
    const img = currentImg();
    if (img) img.classList.remove('panning');
  }

  bookEl.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    endTracking();
    const dx = e.clientX - downX, dy = e.clientY - downY;

    if (zoomed) {
      if (moved) return; // was a pan
      resetZoom(); // plain tap while zoomed exits immediately, no delay needed
      return;
    }

    if (moved) {
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        swipeHint.classList.add('fade');
        if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
        if (dx < 0) goNext(); else goPrev();
      }
      return;
    }

    // genuine tap: disambiguate single (flip) vs double (zoom in)
    const now = Date.now();
    const isDoubleTap = (now - lastTapTime < DOUBLE_TAP_MS) &&
      Math.abs(e.clientX - lastTapX) < 30 && Math.abs(e.clientY - lastTapY) < 30;
    lastTapTime = isDoubleTap ? 0 : now;
    lastTapX = e.clientX; lastTapY = e.clientY;

    if (isDoubleTap) {
      if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
      zoomIn(e.clientX, e.clientY);
      return;
    }

    const tapX = e.clientX;
    pendingTap = setTimeout(() => {
      pendingTap = null;
      const rect = bookEl.getBoundingClientRect();
      swipeHint.classList.add('fade');
      if (tapX - rect.left > rect.width / 2) goNext(); else goPrev();
    }, DOUBLE_TAP_MS);
  });

  bookEl.addEventListener('pointercancel', endTracking);

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
