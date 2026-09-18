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

  // tap zones sit above the pages to catch clicks without blocking image drag/lazy-load
  const zoneLeft = document.createElement('div');
  zoneLeft.className = 'tap-zone left';
  const zoneRight = document.createElement('div');
  zoneRight.className = 'tap-zone right';
  bookEl.appendChild(zoneLeft);
  bookEl.appendChild(zoneRight);

  function render(newIndex, animate) {
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

  // reveal once the first page image is ready (fast: we only wait on one image)
  const firstImg = pageEls[0].querySelector('img');
  function reveal() {
    loadingEl.classList.add('hide');
    setTimeout(() => loadingEl.remove(), 500);
    setTimeout(() => swipeHint.classList.add('fade'), 3500);
  }
  if (firstImg.complete) reveal();
  else {
    firstImg.addEventListener('load', reveal, { once: true });
    firstImg.addEventListener('error', reveal, { once: true });
  }

  // ---------- controls ----------
  prevBtn.addEventListener('click', () => { swipeHint.classList.add('fade'); goPrev(); });
  nextBtn.addEventListener('click', () => { swipeHint.classList.add('fade'); goNext(); });
  zoneLeft.addEventListener('click', () => { swipeHint.classList.add('fade'); goPrev(); });
  zoneRight.addEventListener('click', () => { swipeHint.classList.add('fade'); goNext(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'Escape') closeToc();
  });

  // ---------- swipe ----------
  let startX = 0, startY = 0, tracking = false;
  bookEl.addEventListener('pointerdown', (e) => {
    startX = e.clientX; startY = e.clientY; tracking = true;
  });
  bookEl.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      swipeHint.classList.add('fade');
      if (dx < 0) goNext(); else goPrev();
    }
  });
  bookEl.addEventListener('pointercancel', () => { tracking = false; });

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
