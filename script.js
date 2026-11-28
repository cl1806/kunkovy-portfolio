const root = document.documentElement;

// Определяем тип перехода до отрисовки страницы
const navState = window.name || '';
window.name = '';

if (navState === 'nav:logo') {
  root.classList.add('no-preloader', 'is-page-entering');
} else if (navState === 'nav:smooth') {
  root.classList.add('no-preloader', 'is-page-entering');
} else {
  root.classList.add('is-loading');
}

// Страховка на случай, если отдельный файл остался в .jpg или .png (или наоборот в .webp)
window.addEventListener(
  'error',
  (e) => {
    const target = e.target;
    if (!target || target.tagName !== 'IMG' || target.dataset.extFallbackTried) return;
    const rawSrc = target.getAttribute('src') || '';
    if (!rawSrc) return;

    target.dataset.extFallbackTried = '1';
    if (/\.webp(\?.*)?$/i.test(rawSrc)) {
      target.src = rawSrc.replace(/\.webp(\?.*)?$/i, '.jpg$1');
    } else if (/\.(jpe?g|png)(\?.*)?$/i.test(rawSrc)) {
      target.src = rawSrc.replace(/\.(jpe?g|png)(\?.*)?$/i, '.webp$2');
    }
  },
  true
);

function initApp() {
  const logoLink = document.getElementById('logo-link');
  const preloader = document.getElementById('preloader');
  const preloaderFill = document.getElementById('preloader-fill');
  const preloaderPercent = document.getElementById('preloader-percent');
  const siteHeader = document.getElementById('site-header');
  let isBusy = false;

  // Гарантируем наличие актуальной фавиконки в <head>
  if (!document.querySelector('link[rel="icon"][href*="v=4"]')) {
    const icon32 = document.createElement('link');
    icon32.rel = 'icon';
    icon32.type = 'image/png';
    icon32.sizes = '32x32';
    icon32.href = 'Логотипы/favicon-32x32.png?v=4';
    document.head.appendChild(icon32);
  }

  // Плавное проявление контента после перехода между страницами
  if (root.classList.contains('is-page-entering')) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('is-page-entering');
      });
    });
  }

  // 1. Анимация процентов (0% -> 100%) на GPU
  function runLoader(duration, onComplete) {
    if (!preloader || !preloaderFill || !preloaderPercent) {
      root.classList.remove('is-loading');
      if (onComplete) onComplete();
      return;
    }

    isBusy = true;
    root.classList.remove('no-preloader');
    preloaderFill.style.transform = 'scaleX(0)';
    preloaderPercent.textContent = '0%';
    preloader.classList.remove('is-hidden');
    root.classList.add('is-loading');

    let lastShownPercent = -1;
    const startTime = performance.now();

    function animateProgress(now) {
      const elapsed = now - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - rawProgress, 3);
      const percent = Math.round(eased * 100);

      preloaderFill.style.transform = `scaleX(${eased.toFixed(4)})`;

      if (percent !== lastShownPercent) {
        preloaderPercent.textContent = percent + '%';
        lastShownPercent = percent;
      }

      if (rawProgress < 1) {
        requestAnimationFrame(animateProgress);
      } else {
        setTimeout(() => {
          isBusy = false;
          if (onComplete) onComplete();
        }, 120);
      }
    }

    requestAnimationFrame(animateProgress);
  }

  // Нажатие на логотип -> анимация процентов + переход на главную
  if (logoLink) {
    logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (isBusy) return;

      const rawHref = logoLink.getAttribute('href') || './';
      const targetHref = rawHref === 'index.html' ? './' : rawHref;
      const pathname = window.location.pathname;
      const isHomePage =
        pathname.endsWith('/') ||
        pathname.endsWith('/index.html') ||
        pathname === 'index.html';

      window.name = 'nav:logo';

      runLoader(950, () => {
        if (isHomePage && (targetHref === './' || targetHref === 'index.html')) {
          window.location.reload();
        } else {
          window.location.href = targetHref;
        }
      });
    });
  }

  // 2. Плавный переход на другие страницы сайта
  document.querySelectorAll('a[href]').forEach((link) => {
    if (link.id === 'logo-link') return;

    const href = link.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('http') ||
      link.target === '_blank'
    ) {
      return;
    }

    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (isBusy) return;
      isBusy = true;

      window.name = 'nav:smooth';
      root.classList.add('is-page-leaving');

      setTimeout(() => {
        window.location.href = href;
      }, 300);
    });
  });

  // Оптимизированная фоновая лента работ на главной (параллельное декодирование WebP вне основного потока)
  const heroSection = document.getElementById('hero-section');
  const heroMarquee = document.getElementById('hero-marquee');
  const marqueeTrack1 = document.getElementById('marquee-track-1');
  const marqueeTrack2 = document.getElementById('marquee-track-2');
  let marqueeInitialized = false;

  function toSafeRequestUrl(rawSrc) {
    return encodeURI(String(rawSrc || '').replace(/%23/g, '#')).replace(/#/g, '%23');
  }

  function drawCoverThumbnail(source, canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const srcW = source.naturalWidth || source.width;
    const srcH = source.naturalHeight || source.height;
    if (!ctx || !srcW || !srcH) return;

    const targetW = canvas.width;
    const targetH = canvas.height;
    const targetRatio = targetW / targetH;
    const srcRatio = srcW / srcH;

    let sx = 0;
    let sy = 0;
    let sWidth = srcW;
    let sHeight = srcH;

    if (srcRatio > targetRatio) {
      sWidth = Math.round(srcH * targetRatio);
      sx = Math.round((srcW - sWidth) / 2);
    } else {
      sHeight = Math.round(srcW / targetRatio);
      sy = Math.round((srcH - sHeight) / 2);
    }

    ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
  }

  function loadViaImageElement(src, task, onDone) {
    const loaderImg = new Image();
    loaderImg.decoding = 'async';

    const finish = () => {
      if (loaderImg.naturalWidth) {
        drawCoverThumbnail(loaderImg, task.c1);
        drawCoverThumbnail(loaderImg, task.c2);
      }
      loaderImg.src = '';
      onDone();
    };

    loaderImg.onload = () => {
      if (typeof loaderImg.decode === 'function') {
        loaderImg.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    };
    loaderImg.onerror = onDone;
    loaderImg.src = src;
  }

  function decodeQueueInParallel(tasks, concurrency = 6) {
    let cursor = 0;
    const canOffThreadDecode =
      typeof fetch === 'function' &&
      typeof createImageBitmap === 'function' &&
      window.location.protocol !== 'file:';

    function runNext() {
      if (cursor >= tasks.length) return;
      const task = tasks[cursor++];
      const requestUrl = toSafeRequestUrl(task.src);

      if (canOffThreadDecode) {
        fetch(requestUrl, { priority: 'low' })
          .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('HTTP ' + res.status))))
          .then((blob) =>
            createImageBitmap(blob, {
              resizeWidth: 220,
              resizeHeight: 275,
              resizeQuality: 'medium'
            }).catch(() => createImageBitmap(blob))
          )
          .then((bitmap) => {
            drawCoverThumbnail(bitmap, task.c1);
            drawCoverThumbnail(bitmap, task.c2);
            if (typeof bitmap.close === 'function') bitmap.close();
            runNext();
          })
          .catch(() => {
            loadViaImageElement(task.src, task, runNext);
          });
      } else {
        loadViaImageElement(task.src, task, runNext);
      }
    }

    const workers = Math.min(concurrency, tasks.length);
    for (let i = 0; i < workers; i++) {
      runNext();
    }
  }

  function prepareMarqueeTrack(trackEl, sources) {
    if (!trackEl || sources.length === 0) return [];

    const TILE_W = 200;
    const TILE_H = 250;
    const total = sources.length;
    const tasks = [];

    trackEl.innerHTML = '';

    for (let i = 0; i < total; i++) {
      const c1 = document.createElement('canvas');
      c1.width = TILE_W;
      c1.height = TILE_H;
      c1.className = 'marquee-tile';
      trackEl.appendChild(c1);
      tasks.push({ src: sources[i], c1, c2: null });
    }

    for (let i = 0; i < total; i++) {
      const c2 = document.createElement('canvas');
      c2.width = TILE_W;
      c2.height = TILE_H;
      c2.className = 'marquee-tile';
      trackEl.appendChild(c2);
      tasks[i].c2 = c2;
    }

    return tasks;
  }

  function initMarquee() {
    if (marqueeInitialized || !marqueeTrack1 || !marqueeTrack2) return;
    marqueeInitialized = true;

    const readSources = (track) =>
      Array.from(track.querySelectorAll('[data-src], img'))
        .map((el) => el.getAttribute('data-src') || el.getAttribute('src'))
        .filter(Boolean);

    let sources1 = readSources(marqueeTrack1);
    const sources2 = readSources(marqueeTrack2);

    try {
      const rawWorks = localStorage.getItem('kunkovy_custom_works');
      const customWorks = rawWorks ? JSON.parse(rawWorks) : [];
      if (customWorks.length > 0) {
        const customSources = customWorks
          .map((item) => {
            const coverFile =
              Array.isArray(item.series) && item.series.length > 0
                ? item.series[0].filename
                : item.filename;
            const cleanName = String(coverFile || '').trim().replace(/^Работы\/\d{4}\//i, '');
            return `Работы/${item.year}/${cleanName.replace(/#/g, '%23')}`;
          })
          .filter(Boolean);
        sources1 = [...customSources.reverse(), ...sources1];
      }
    } catch (e) {}

    const tasks1 = prepareMarqueeTrack(marqueeTrack1, sources1);
    const tasks2 = prepareMarqueeTrack(marqueeTrack2, sources2);

    const interleaved = [];
    const maxLen = Math.max(tasks1.length, tasks2.length);
    for (let i = 0; i < maxLen; i++) {
      if (tasks1[i]) interleaved.push(tasks1[i]);
      if (tasks2[i]) interleaved.push(tasks2[i]);
    }

    decodeQueueInParallel(interleaved, 6);

    if (heroSection && heroMarquee && 'IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            heroMarquee.classList.toggle('is-paused', !entry.isIntersecting);
          });
        },
        { threshold: 0.02 }
      );
      heroObserver.observe(heroSection);
    }
  }

  initMarquee();

  if (root.classList.contains('is-loading')) {
    runLoader(950, () => {
      if (preloader) preloader.classList.add('is-hidden');
      root.classList.remove('is-loading');
    });
  }

  // 3. Скрытие шапки при скролле вниз и кнопка «Наверх»
  const scrollTopBtn = document.getElementById('scroll-top-btn');

  function updateScrollTopVisibility() {
    if (!scrollTopBtn) return;
    if (window.scrollY > 120) {
      scrollTopBtn.classList.add('is-visible');
    } else {
      scrollTopBtn.classList.remove('is-visible');
    }
  }

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  if (siteHeader || scrollTopBtn) {
    let lastScrollY = window.scrollY;

    window.addEventListener(
      'scroll',
      () => {
        const currentScrollY = window.scrollY;

        if (siteHeader) {
          if (currentScrollY <= 40) {
            siteHeader.classList.remove('is-minimized');
          } else if (currentScrollY > lastScrollY && currentScrollY > 60) {
            siteHeader.classList.add('is-minimized');
          } else if (currentScrollY < lastScrollY) {
            siteHeader.classList.remove('is-minimized');
          }
        }

        updateScrollTopVisibility();
        lastScrollY = currentScrollY;
      },
      { passive: true }
    );

    window.addEventListener('resize', updateScrollTopVisibility, { passive: true });
    updateScrollTopVisibility();
  }

  // 4. Фильтрация работ по годам
  const projectsGrid = document.getElementById('projects-grid');
  const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
  const emptyState = document.getElementById('projects-empty');
  const emptyYearText = document.getElementById('projects-empty-year');
  let activeYear = 'all';

  function getAllCards() {
    return Array.from(document.querySelectorAll('.project-card'));
  }

  function getCardYear(card) {
    if (card.dataset.year) return card.dataset.year.trim();
    const metaEl = card.querySelector('.project-meta');
    const match = metaEl ? metaEl.textContent.match(/20\d{2}/) : null;
    return match ? match[0] : '';
  }

  function applyYearFilter(year) {
    activeYear = year;
    let visibleCount = 0;

    getAllCards().forEach((card) => {
      const cardYear = getCardYear(card);
      const isMatch = year === 'all' || cardYear === year;
      card.classList.toggle('is-hidden', !isMatch);
      if (isMatch) visibleCount++;
    });

    if (emptyState) {
      emptyState.hidden = visibleCount > 0;
      if (emptyYearText && year !== 'all') {
        emptyYearText.textContent = year;
      }
    }

    updateScrollTopVisibility();
  }

  if (filterButtons.length > 0) {
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const rawFilter = btn.dataset.filter || btn.textContent.trim();
        const selectedYear = rawFilter.toLowerCase() === 'все' ? 'all' : rawFilter;

        filterButtons.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        applyYearFilter(selectedYear);
      });
    });
  }

  // 5. Полноразмерный просмотр работ и серий (Lightbox + зум + сквозное листание)
  const lightbox = document.getElementById('lightbox');

  if (projectsGrid && lightbox) {
    let lightboxCounter = document.getElementById('lightbox-counter');
    if (!lightboxCounter) {
      lightboxCounter = document.createElement('div');
      lightboxCounter.id = 'lightbox-counter';
      lightboxCounter.className = 'lightbox-counter';
      lightbox.prepend(lightboxCounter);
    }

    const lightboxStage = document.getElementById('lightbox-stage');
    const lightboxMedia = document.getElementById('lightbox-media');
    const lightboxMeta = document.getElementById('lightbox-meta');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDesc = document.getElementById('lightbox-desc');
    const lightboxZoomTip = document.getElementById('lightbox-zoom-tip');
    const lightboxSeriesBar = document.getElementById('lightbox-series-bar');
    const seriesPrevBtn = document.getElementById('series-prev-btn');
    const seriesNextBtn = document.getElementById('series-next-btn');
    const seriesLabel = document.getElementById('series-label');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    let visibleCards = [];
    let currentVisibleIndex = 0;
    let currentSeriesSlides = [];
    let currentSlideIndex = 0;

    const ZOOM_TARGET = 2.0;
    const MIN_SCALE = 1;
    const MAX_SCALE = 4;
    let zoomScale = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let panStartX = 0;
    let panStartY = 0;

    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    function getMediaBaseSize() {
      const target = lightboxMedia ? (lightboxMedia.firstElementChild || lightboxMedia) : null;
      if (!target) return { width: 0, height: 0 };
      return {
        width: target.offsetWidth || 0,
        height: target.offsetHeight || 0
      };
    }

    function clampPan(nextX, nextY, scale) {
      if (scale <= 1.02) return { x: 0, y: 0 };
      const { width, height } = getMediaBaseSize();
      const scaledW = width * scale;
      const scaledH = height * scale;
      const maxX = Math.max(0, (scaledW - window.innerWidth * 0.8) / 2);
      const maxY = Math.max(0, (scaledH - window.innerHeight * 0.8) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, nextX)),
        y: Math.min(maxY, Math.max(-maxY, nextY))
      };
    }

    function applyZoomTransform() {
      if (!lightboxMedia) return;
      const isZoomed = zoomScale > 1.02;
      lightbox.classList.toggle('is-zoomed', isZoomed);
      lightboxMedia.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoomScale})`;

      if (lightboxZoomTip) {
        if (isZoomed) {
          lightboxZoomTip.textContent = 'Перетаскивайте работу для просмотра деталей • Нажми дважды, чтобы вернуть исходный масштаб';
        } else if (currentSeriesSlides.length > 1) {
          lightboxZoomTip.textContent = 'Листайте серию стрелками или свайпом • Нажми дважды, чтобы увеличить';
        } else {
          lightboxZoomTip.textContent = 'Нажми дважды, чтобы увеличить работу';
        }
      }
    }

    function resetZoom() {
      zoomScale = 1;
      panX = 0;
      panY = 0;
      isDragging = false;
      lightbox.classList.remove('is-dragging');
      applyZoomTransform();
    }

    function setZoomAtPoint(targetScale, clientX, clientY) {
      if (!lightboxMedia) return;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));

      if (nextScale <= 1.02) {
        resetZoom();
        return;
      }

      const wasUnzoomed = zoomScale <= 1.02;
      lightbox.classList.add('is-zoomed');
      void lightboxMedia.offsetWidth;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const offsetX = typeof clientX === 'number' ? clientX - centerX : 0;
      const offsetY = typeof clientY === 'number' ? clientY - centerY : 0;

      const prevScale = wasUnzoomed ? 1 : zoomScale;
      const factor = nextScale / prevScale;
      const rawPanX = panX - offsetX * (factor - 1);
      const rawPanY = panY - offsetY * (factor - 1);

      zoomScale = nextScale;
      const clamped = clampPan(rawPanX, rawPanY, zoomScale);
      panX = clamped.x;
      panY = clamped.y;
      applyZoomTransform();
    }

    function toggleZoomAtPoint(clientX, clientY) {
      if (zoomScale > 1.02) {
        resetZoom();
      } else {
        setZoomAtPoint(ZOOM_TARGET, clientX, clientY);
      }
    }

    function getVisibleCards() {
      return getAllCards().filter((card) => !card.classList.contains('is-hidden'));
    }

    function extractCardSlides(card) {
      const metaEl = card.querySelector('.project-meta');
      const titleEl = card.querySelector('h3');
      const descEl = card.querySelector('p');
      const baseMeta = metaEl ? metaEl.textContent : '';
      const baseTitle = titleEl ? titleEl.textContent : '';
      const baseDesc = descEl ? descEl.textContent : '';

      const seriesAttr = card.getAttribute('data-series');
      if (seriesAttr && seriesAttr.trim()) {
        const rawItems = seriesAttr.split('|').map((s) => s.trim()).filter(Boolean);
        if (rawItems.length > 0) {
          return rawItems.map((entry, idx) => {
            const parts = entry.split('::');
            const src = (parts[0] || '').trim();
            const slideTitle = (parts[1] || '').trim() || `${baseTitle} (${idx + 1}/${rawItems.length})`;
            const slideDesc = (parts[2] || '').trim() || baseDesc;
            return {
              src,
              alt: slideTitle,
              meta: baseMeta,
              title: slideTitle,
              desc: slideDesc
            };
          });
        }
      }

      const seriesNodes = Array.from(card.querySelectorAll('.series-slides > div'));
      if (seriesNodes.length > 0) {
        return seriesNodes.map((node) => ({
          src: node.getAttribute('data-src'),
          meta: baseMeta,
          title: node.getAttribute('data-title') || baseTitle,
          desc: node.getAttribute('data-desc') || baseDesc
        }));
      }

      const img = card.querySelector('.project-preview img');
      const placeholder = card.querySelector('.preview-placeholder');

      return [{
        src: img ? img.getAttribute('src') : '',
        alt: img ? img.alt : '',
        placeholder: placeholder ? placeholder.textContent : 'Превью работы',
        meta: baseMeta,
        title: baseTitle,
        desc: baseDesc
      }];
    }

    function renderLightbox(cardIndex, slideIndex = 0) {
      visibleCards = getVisibleCards();
      if (visibleCards.length === 0) return;

      currentVisibleIndex = (cardIndex + visibleCards.length) % visibleCards.length;
      const card = visibleCards[currentVisibleIndex];

      currentSeriesSlides = extractCardSlides(card);
      currentSlideIndex = (slideIndex + currentSeriesSlides.length) % currentSeriesSlides.length;
      const slide = currentSeriesSlides[currentSlideIndex];

      resetZoom();

      const totalAll = getAllCards().length;
      const currentPos = currentVisibleIndex + 1;
      const visibleTotal = visibleCards.length;

      if (currentSeriesSlides.length > 1) {
        lightboxCounter.textContent = `Серия: лист ${currentSlideIndex + 1} / ${currentSeriesSlides.length}`;
        if (lightboxSeriesBar) lightboxSeriesBar.hidden = false;
        if (seriesLabel) seriesLabel.textContent = `Лист ${currentSlideIndex + 1} / ${currentSeriesSlides.length}`;
      } else {
        if (lightboxSeriesBar) lightboxSeriesBar.hidden = true;
        if (activeYear === 'all') {
          lightboxCounter.textContent = `${currentPos} / ${totalAll} • Проектов: ${totalAll}`;
        } else {
          lightboxCounter.textContent = `${currentPos} / ${visibleTotal} (${activeYear}) • Проектов: ${totalAll}`;
        }
      }

      lightboxMedia.innerHTML = '';

      if (slide.src) {
        const fullImg = document.createElement('img');
        fullImg.src = slide.src;
        fullImg.alt = slide.alt || slide.title || '';
        fullImg.draggable = false;
        fullImg.addEventListener('dragstart', (e) => e.preventDefault());
        lightboxMedia.appendChild(fullImg);
      } else {
        const fullPlaceholder = document.createElement('div');
        fullPlaceholder.className = 'lightbox-placeholder';
        fullPlaceholder.textContent = slide.placeholder || 'Превью работы';
        lightboxMedia.appendChild(fullPlaceholder);
      }

      if (lightboxMeta) lightboxMeta.textContent = slide.meta;
      if (lightboxTitle) lightboxTitle.textContent = slide.title;
      if (lightboxDesc) lightboxDesc.textContent = slide.desc;
    }

    function openLightbox(card, startZoomed = false) {
      visibleCards = getVisibleCards();
      const index = visibleCards.indexOf(card);
      if (index === -1) return;

      renderLightbox(index, 0);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      if (startZoomed) {
        setZoomAtPoint(ZOOM_TARGET);
      }
    }

    function closeLightbox() {
      resetZoom();
      currentSeriesSlides = [];
      currentSlideIndex = 0;
      if (lightboxSeriesBar) lightboxSeriesBar.hidden = true;
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    function showPrev() {
      visibleCards = getVisibleCards();
      if (visibleCards.length === 0) return;

      if (currentSeriesSlides.length > 1 && currentSlideIndex > 0) {
        renderLightbox(currentVisibleIndex, currentSlideIndex - 1);
      } else {
        const prevCardIndex = (currentVisibleIndex - 1 + visibleCards.length) % visibleCards.length;
        const prevSlides = extractCardSlides(visibleCards[prevCardIndex]);
        renderLightbox(prevCardIndex, Math.max(0, prevSlides.length - 1));
      }
    }

    function showNext() {
      visibleCards = getVisibleCards();
      if (visibleCards.length === 0) return;

      if (currentSeriesSlides.length > 1 && currentSlideIndex < currentSeriesSlides.length - 1) {
        renderLightbox(currentVisibleIndex, currentSlideIndex + 1);
      } else {
        const nextCardIndex = (currentVisibleIndex + 1) % visibleCards.length;
        renderLightbox(nextCardIndex, 0);
      }
    }

    projectsGrid.addEventListener(
      'touchend',
      (e) => {
        if (e.target.closest('.owner-card-controls')) return;
        const card = e.target.closest('.project-card');
        if (!card || e.changedTouches.length !== 1) return;

        const touch = e.changedTouches[0];
        const now = Date.now();
        const dt = now - lastTapTime;
        const dist = Math.hypot(touch.clientX - lastTapX, touch.clientY - lastTapY);

        if (dt > 0 && dt < 340 && dist < 40) {
          e.preventDefault();
          lastTapTime = 0;
          openLightbox(card, true);
        } else {
          lastTapTime = now;
          lastTapX = touch.clientX;
          lastTapY = touch.clientY;
        }
      },
      { passive: false }
    );

    projectsGrid.addEventListener('click', (e) => {
      if (e.target.closest('.owner-card-controls')) return;
      const card = e.target.closest('.project-card');
      if (card) openLightbox(card, false);
    });

    projectsGrid.addEventListener('dblclick', (e) => {
      if (e.target.closest('.owner-card-controls')) return;
      const card = e.target.closest('.project-card');
      if (card) {
        e.preventDefault();
        openLightbox(card, true);
      }
    });

    projectsGrid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.project-card');
        if (card) {
          e.preventDefault();
          openLightbox(card, false);
        }
      }
    });

    if (lightboxStage) {
      lightboxStage.addEventListener('dblclick', (e) => {
        e.preventDefault();
        toggleZoomAtPoint(e.clientX, e.clientY);
      });

      lightboxStage.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.35 : -0.35;
          setZoomAtPoint(+(zoomScale + delta).toFixed(2), e.clientX, e.clientY);
        },
        { passive: false }
      );

      lightboxStage.addEventListener('mousedown', (e) => {
        if (zoomScale <= 1.02 || e.button !== 0) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        panStartX = panX;
        panStartY = panY;
        lightbox.classList.add('is-dragging');
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const clamped = clampPan(
          panStartX + (e.clientX - dragStartX),
          panStartY + (e.clientY - dragStartY),
          zoomScale
        );
        panX = clamped.x;
        panY = clamped.y;
        applyZoomTransform();
      });

      window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        lightbox.classList.remove('is-dragging');
      });

      let touchMoved = false;
      let isPinching = false;
      let pinchStartDist = 0;
      let pinchStartScale = 1;
      let swipeStartX = 0;
      let swipeStartY = 0;

      function getTouchDistance(t1, t2) {
        return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      }

      lightboxStage.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches.length === 2) {
            isPinching = true;
            isDragging = false;
            touchMoved = true;
            pinchStartDist = getTouchDistance(e.touches[0], e.touches[1]);
            pinchStartScale = zoomScale;
            lightbox.classList.add('is-dragging');
            return;
          }

          if (e.touches.length !== 1) return;
          const touch = e.touches[0];
          touchMoved = false;
          swipeStartX = touch.clientX;
          swipeStartY = touch.clientY;

          if (zoomScale > 1.02) {
            isDragging = true;
            dragStartX = touch.clientX;
            dragStartY = touch.clientY;
            panStartX = panX;
            panStartY = panY;
            lightbox.classList.add('is-dragging');
          }
        },
        { passive: true }
      );

      lightboxStage.addEventListener(
        'touchmove',
        (e) => {
          if (isPinching && e.touches.length === 2) {
            e.preventDefault();
            const dist = getTouchDistance(e.touches[0], e.touches[1]);
            if (pinchStartDist > 0) {
              const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
              const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
              const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale * (dist / pinchStartDist)));
              setZoomAtPoint(nextScale, midX, midY);
            }
            return;
          }

          if (e.touches.length !== 1) return;
          const touch = e.touches[0];
          if (Math.hypot(touch.clientX - swipeStartX, touch.clientY - swipeStartY) > 6) {
            touchMoved = true;
          }

          if (isDragging && zoomScale > 1.02) {
            e.preventDefault();
            const clamped = clampPan(
              panStartX + (touch.clientX - dragStartX),
              panStartY + (touch.clientY - dragStartY),
              zoomScale
            );
            panX = clamped.x;
            panY = clamped.y;
            applyZoomTransform();
          }
        },
        { passive: false }
      );

      lightboxStage.addEventListener(
        'touchend',
        (e) => {
          if (isPinching && e.touches.length < 2) {
            isPinching = false;
            lightbox.classList.remove('is-dragging');
            if (zoomScale <= 1.02) resetZoom();
            return;
          }

          if (isDragging) {
            isDragging = false;
            lightbox.classList.remove('is-dragging');
          }

          if (e.changedTouches.length !== 1) return;
          const touch = e.changedTouches[0];

          if (touchMoved && zoomScale <= 1.02) {
            const dx = touch.clientX - swipeStartX;
            const dy = touch.clientY - swipeStartY;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
              if (dx < 0) showNext();
              else showPrev();
            }
            return;
          }

          if (touchMoved) return;

          const now = Date.now();
          const dt = now - lastTapTime;
          const dist = Math.hypot(touch.clientX - lastTapX, touch.clientY - lastTapY);

          if (dt > 0 && dt < 340 && dist < 40) {
            e.preventDefault();
            lastTapTime = 0;
            toggleZoomAtPoint(touch.clientX, touch.clientY);
          } else {
            lastTapTime = now;
            lastTapX = touch.clientX;
            lastTapY = touch.clientY;
          }
        },
        { passive: false }
      );
    }

    if (seriesPrevBtn) {
      seriesPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showPrev();
      });
    }

    if (seriesNextBtn) {
      seriesNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showNext();
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', showPrev);
    if (nextBtn) nextBtn.addEventListener('click', showNext);

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || (e.target === lightboxStage && zoomScale <= 1.02)) {
        if (zoomScale > 1.02) {
          resetZoom();
        } else {
          closeLightbox();
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;

      if (e.key === 'Escape') {
        if (zoomScale > 1.02) {
          resetZoom();
        } else {
          closeLightbox();
        }
      } else if (e.key === 'ArrowLeft') {
        showPrev();
      } else if (e.key === 'ArrowRight') {
        showNext();
      }
    });
  }

  // 6. Скрытый режим владельца (авто-вставка по годам + сортировка и удаление карточек без правки кода)
  const ownerPanel = document.getElementById('owner-panel');
  const ownerPanelTitle = document.getElementById('owner-panel-title');
  const ownerForm = document.getElementById('owner-form');
  const ownerExitBtn = document.getElementById('owner-exit-btn');
  const ownerModeBtns = Array.from(document.querySelectorAll('.owner-mode-btn'));
  const ownerYearSelect = document.getElementById('owner-year');
  const ownerFolderYear = document.getElementById('owner-folder-year');
  const ownerSeriesFolderYear = document.getElementById('owner-series-folder-year');
  const ownerHintYear = document.getElementById('owner-hint-year');
  const ownerCategoryInput = document.getElementById('owner-category');
  const ownerTitleLabel = document.getElementById('owner-title-label');
  const ownerTitleInput = document.getElementById('owner-title');
  const ownerSingleFileField = document.getElementById('owner-single-file-field');
  const ownerFilenameInput = document.getElementById('owner-filename');
  const ownerFileInput = document.getElementById('owner-file-input');
  const ownerSeriesBox = document.getElementById('owner-series-box');
  const ownerSeriesFilesInput = document.getElementById('owner-series-files-input');
  const ownerSeriesAddRowBtn = document.getElementById('owner-series-add-row');
  const ownerSeriesList = document.getElementById('owner-series-list');
  const ownerDescLabel = document.getElementById('owner-desc-label');
  const ownerDescInput = document.getElementById('owner-desc');
  const ownerSubmitBtn = document.getElementById('owner-submit-btn');
  const ownerDownloadBtn = document.getElementById('owner-download-html');
  const ownerCopyFullHtmlBtn = document.getElementById('owner-copy-full-html');
  const ownerCopyBtn = document.getElementById('owner-copy-code');
  const ownerStatus = document.getElementById('owner-status');
  const footerCopy = document.getElementById('footer-copy');
  const STORAGE_KEY_ADMIN = 'kunkovy_owner_mode';
  const STORAGE_KEY_WORKS = 'kunkovy_custom_works';
  let ownerPublishMode = 'single';
  let lastGeneratedCardHTML = '';
  let ownerHideTimer = null;

  function formatSheetsCount(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} лист`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} листа`;
    return `${count} листов`;
  }

  function cleanSheetTitleFromFilename(filename) {
    return String(filename || '')
      .replace(/\.[^/.]+$/, '')
      .trim();
  }

  function getSavedCustomWorks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_WORKS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCustomWorks(list) {
    try {
      localStorage.setItem(STORAGE_KEY_WORKS, JSON.stringify(list));
    } catch (e) {}
  }

  function encodeImagePath(year, filename) {
    const cleanName = String(filename || '').trim().replace(/^Работы\/\d{4}\//i, '');
    const safeName = cleanName.replace(/#/g, '%23');
    return `Работы/${year}/${safeName}`;
  }

  function normalizeSrcForDedupe(src) {
    try {
      return decodeURIComponent(String(src || '').trim())
        .replace(/\.[^/.]+$/, '')
        .toLowerCase();
    } catch (e) {
      return String(src || '')
        .trim()
        .replace(/\.[^/.]+$/, '')
        .toLowerCase();
    }
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function insertCardByYear(cardEl) {
    if (!projectsGrid || !cardEl) return;
    const targetYear = parseInt(getCardYear(cardEl), 10) || 0;
    const existingCards = getAllCards().filter((c) => c !== cardEl);

    // Ищем первую карточку с таким же или более ранним годом и вставляем перед ней
    const anchor = existingCards.find((c) => {
      const y = parseInt(getCardYear(c), 10) || 0;
      return targetYear > 0 && y > 0 && y <= targetYear;
    });

    if (anchor) {
      projectsGrid.insertBefore(cardEl, anchor);
    } else {
      projectsGrid.appendChild(cardEl);
    }
  }

  function syncOwnerCardControls(isOwnerVisible) {
    if (!projectsGrid) return;
    document.body.classList.toggle('is-owner-active', Boolean(isOwnerVisible));

    getAllCards().forEach((card) => {
      const preview = card.querySelector('.project-preview');
      if (!preview) return;

      const existing = preview.querySelector('.owner-card-controls');
      if (!isOwnerVisible) {
        if (existing) existing.remove();
        return;
      }

      if (!existing) {
        const controls = document.createElement('div');
        controls.className = 'owner-card-controls';
        controls.innerHTML = `
          <button class="owner-card-move" type="button" data-card-act="prev" title="Сдвинуть левее / выше">←</button>
          <button class="owner-card-move" type="button" data-card-act="next" title="Сдвинуть правее / ниже">→</button>
          <button class="owner-card-remove" type="button" data-card-act="remove" title="Удалить карточку">Удалить ✕</button>
        `;
        preview.prepend(controls);
      }
    });
  }

  function buildCardMarkup(item) {
    const safeCategory = escapeHTML(item.category);
    const safeDesc = escapeHTML(item.desc);
    const safeYear = escapeHTML(item.year);

    if (Array.isArray(item.series) && item.series.length > 0) {
      const sheetsText = formatSheetsCount(item.series.length);
      const safeTitle = escapeHTML(item.title);
      const coverSrc = encodeImagePath(item.year, item.series[0].filename);

      const seriesAttrValue = item.series
        .map((sheet, idx) => {
          const sheetPath = encodeImagePath(item.year, sheet.filename);
          const sheetTitle = (sheet.title || '').trim() || `Лист ${idx + 1}`;
          return `${sheetPath}::${sheetTitle}`;
        })
        .join('|');

      return `<article class="project-card" data-year="${safeYear}" data-series="${escapeHTML(seriesAttrValue)}" ${item.id ? `data-custom-id="${item.id}"` : ''} tabindex="0" role="button" aria-label="Открыть серию работ ${safeTitle} (${sheetsText})">
          <div class="project-preview">
            <span class="series-badge">Серия</span>
            <img src="${coverSrc}" alt="${safeTitle}" loading="lazy" decoding="async">
            <span class="preview-zoom-hint">Листать серию ↗</span>
          </div>
          <div class="project-info">
            <div class="project-meta">${safeCategory} • ${safeYear}</div>
            <h3>${safeTitle}</h3>
            <p>${safeDesc}</p>
          </div>
        </article>`;
    }

    const imgSrc = encodeImagePath(item.year, item.filename);
    const safeTitle = escapeHTML(item.title);

    return `<article class="project-card" data-year="${safeYear}" ${item.id ? `data-custom-id="${item.id}"` : ''} tabindex="0" role="button" aria-label="Открыть работу в полном размере">
          <div class="project-preview">
            <img src="${imgSrc}" alt="${safeTitle}" loading="lazy" decoding="async">
            <span class="preview-zoom-hint">Во весь экран ↗</span>
          </div>
          <div class="project-info">
            <div class="project-meta">${safeCategory} • ${safeYear}</div>
            <h3>${safeTitle}</h3>
            <p>${safeDesc}</p>
          </div>
        </article>`;
  }

  function renderStoredWorks(isOwnerVisible) {
    if (!projectsGrid) return;
    projectsGrid.querySelectorAll('[data-custom-id]').forEach((el) => el.remove());

    const existingStaticSrcs = new Set();
    projectsGrid.querySelectorAll('.project-card').forEach((card) => {
      const img = card.querySelector('.project-preview img');
      if (img) existingStaticSrcs.add(normalizeSrcForDedupe(img.getAttribute('src')));
      const seriesAttr = card.getAttribute('data-series');
      if (seriesAttr) {
        seriesAttr.split('|').forEach((entry) => {
          const path = entry.split('::')[0];
          if (path) existingStaticSrcs.add(normalizeSrcForDedupe(path));
        });
      }
    });

    const works = getSavedCustomWorks();
    const unpublishedDrafts = works.filter((item) => {
      const coverFile =
        Array.isArray(item.series) && item.series.length > 0
          ? item.series[0].filename
          : item.filename;
      const itemSrc = normalizeSrcForDedupe(encodeImagePath(item.year, coverFile));
      return !existingStaticSrcs.has(itemSrc);
    });

    if (unpublishedDrafts.length !== works.length) {
      saveCustomWorks(unpublishedDrafts);
    }

    unpublishedDrafts.forEach((item) => {
      const temp = document.createElement('div');
      temp.innerHTML = buildCardMarkup(item);
      const card = temp.firstElementChild;
      if (card) {
        insertCardByYear(card);
      }
    });

    syncOwnerCardControls(isOwnerVisible);

    if (isOwnerVisible && ownerStatus && unpublishedDrafts.length > 0) {
      ownerStatus.innerHTML = `Локальных черновиков на этом ПК: <strong>${unpublishedDrafts.length}</strong>. Чтобы они появились на телефонах, скачайте или скопируйте обновлённый <strong>works.html</strong> и замените им файл в репозитории GitHub.`;
    }

    applyYearFilter(activeYear);
  }

  function buildCleanWorksHTML() {
    const clone = document.documentElement.cloneNode(true);
    clone.classList.remove('is-loading', 'no-preloader', 'is-page-entering', 'is-page-leaving');

    const clonedBody = clone.querySelector('body');
    if (clonedBody) {
      clonedBody.classList.remove('is-owner-active');
      if (!clonedBody.className.trim()) clonedBody.removeAttribute('class');
      clonedBody.removeAttribute('style');
    }

    const clonedPreloader = clone.querySelector('#preloader');
    if (clonedPreloader) clonedPreloader.classList.remove('is-hidden');

    const clonedFill = clone.querySelector('#preloader-fill');
    if (clonedFill) clonedFill.style.transform = 'scaleX(0)';

    const clonedPercent = clone.querySelector('#preloader-percent');
    if (clonedPercent) clonedPercent.textContent = '0%';

    const clonedHeader = clone.querySelector('#site-header');
    if (clonedHeader) clonedHeader.classList.remove('is-minimized');

    const clonedPanel = clone.querySelector('#owner-panel');
    if (clonedPanel) {
      clonedPanel.classList.remove('is-open');
      clonedPanel.hidden = true;
    }

    const clonedSeriesList = clone.querySelector('#owner-series-list');
    if (clonedSeriesList) clonedSeriesList.innerHTML = '';

    const clonedSeriesBox = clone.querySelector('#owner-series-box');
    if (clonedSeriesBox) clonedSeriesBox.hidden = true;

    const clonedSingleField = clone.querySelector('#owner-single-file-field');
    if (clonedSingleField) clonedSingleField.hidden = false;

    clone.querySelectorAll('.owner-mode-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.ownerMode === 'single');
    });

    clone.querySelectorAll('.owner-card-controls, .owner-card-remove').forEach((el) => el.remove());
    clone.querySelectorAll('.project-card').forEach((card) => {
      card.classList.remove('is-hidden');
      card.removeAttribute('data-custom-id');
    });

    clone.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.filter === 'all');
    });

    const clonedEmpty = clone.querySelector('#projects-empty');
    if (clonedEmpty) clonedEmpty.hidden = true;

    const clonedScrollTop = clone.querySelector('#scroll-top-btn');
    if (clonedScrollTop) clonedScrollTop.classList.remove('is-visible');

    const clonedLightbox = clone.querySelector('#lightbox');
    if (clonedLightbox) {
      clonedLightbox.classList.remove('is-open', 'is-zoomed', 'is-dragging');
      clonedLightbox.setAttribute('aria-hidden', 'true');
    }

    const clonedSeriesBar = clone.querySelector('#lightbox-series-bar');
    if (clonedSeriesBar) clonedSeriesBar.hidden = true;

    const clonedMedia = clone.querySelector('#lightbox-media');
    if (clonedMedia) {
      clonedMedia.innerHTML = '';
      clonedMedia.removeAttribute('style');
    }

    const clonedCounter = clone.querySelector('#lightbox-counter');
    if (clonedCounter) clonedCounter.textContent = '';

    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  function updateSeriesRowNumbers() {
    if (!ownerSeriesList) return;
    Array.from(ownerSeriesList.querySelectorAll('.owner-series-item')).forEach((row, idx) => {
      const numEl = row.querySelector('.owner-series-num');
      if (numEl) numEl.textContent = String(idx + 1);
    });
  }

  function createSeriesSheetRow(filename = '', title = '') {
    if (!ownerSeriesList) return;
    const row = document.createElement('div');
    row.className = 'owner-series-item';
    row.innerHTML = `
      <span class="owner-series-num">1</span>
      <input type="text" class="series-item-file" value="${escapeHTML(filename)}" placeholder="Имя файла.webp">
      <input type="text" class="series-item-title" value="${escapeHTML(title)}" placeholder="Название листа (например: Лист 1)">
      <div class="owner-series-item-actions">
        <button type="button" class="owner-series-mini-btn" data-series-act="up" title="Выше">↑</button>
        <button type="button" class="owner-series-mini-btn" data-series-act="down" title="Ниже">↓</button>
        <button type="button" class="owner-series-mini-btn owner-series-mini-btn--del" data-series-act="remove" title="Удалить лист">✕</button>
      </div>
    `;
    ownerSeriesList.appendChild(row);
    updateSeriesRowNumbers();
  }

  function setOwnerPublishMode(mode) {
    ownerPublishMode = mode === 'series' ? 'series' : 'single';
    const isSeries = ownerPublishMode === 'series';

    ownerModeBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.ownerMode === ownerPublishMode);
    });

    if (ownerPanelTitle) {
      ownerPanelTitle.textContent = isSeries ? 'Добавить серию работ' : 'Добавить новую работу';
    }
    if (ownerTitleLabel) {
      ownerTitleLabel.textContent = isSeries ? 'Название серии' : 'Название работы';
    }
    if (ownerTitleInput) {
      ownerTitleInput.placeholder = isSeries ? 'Например: Серия «Метро»' : 'Например: Новый плакат';
    }
    if (ownerDescLabel) {
      ownerDescLabel.textContent = isSeries ? 'Описание серии' : 'Описание работы';
    }
    if (ownerSubmitBtn) {
      ownerSubmitBtn.textContent = isSeries ? 'Добавить серию' : 'Добавить работу';
    }

    if (ownerCategoryInput) {
      const val = ownerCategoryInput.value.trim();
      if (isSeries && (val === '' || val === 'Плакат')) {
        ownerCategoryInput.value = 'Серия плакатов';
      } else if (!isSeries && (val === '' || val === 'Серия плакатов')) {
        ownerCategoryInput.value = 'Плакат';
      }
    }

    if (ownerSingleFileField) ownerSingleFileField.hidden = isSeries;
    if (ownerFilenameInput) ownerFilenameInput.required = !isSeries;
    if (ownerSeriesBox) ownerSeriesBox.hidden = !isSeries;
  }

  function setOwnerMode(enabled, shouldScroll = false) {
    if (!ownerPanel) return;
    clearTimeout(ownerHideTimer);

    try {
      if (enabled) localStorage.setItem(STORAGE_KEY_ADMIN, '1');
      else localStorage.removeItem(STORAGE_KEY_ADMIN);
    } catch (e) {}

    renderStoredWorks(enabled);

    if (enabled) {
      ownerPanel.hidden = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ownerPanel.classList.add('is-open');
          if (shouldScroll) {
            ownerPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    } else {
      ownerPanel.classList.remove('is-open');
      ownerHideTimer = setTimeout(() => {
        if (!ownerPanel.classList.contains('is-open')) {
          ownerPanel.hidden = true;
        }
      }, 480);
    }
  }

  if (projectsGrid) {
    const urlParams = new URLSearchParams(window.location.search);
    let isAdmin = urlParams.get('admin') === '1' || window.location.hash === '#admin';

    try {
      if (localStorage.getItem(STORAGE_KEY_ADMIN) === '1') {
        isAdmin = true;
      }
    } catch (e) {}

    if (isAdmin && ownerPanel) {
      setOwnerMode(true, false);
    } else {
      renderStoredWorks(false);
    }

    ownerModeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        setOwnerPublishMode(btn.dataset.ownerMode);
      });
    });

    if (footerCopy) {
      let clickCount = 0;
      let clickTimer = null;

      footerCopy.addEventListener('click', () => {
        clickCount++;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 1500);

        if (clickCount >= 5) {
          clickCount = 0;
          setOwnerMode(true, true);
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф')) {
        if (ownerPanel) {
          e.preventDefault();
          const willOpen = !ownerPanel.classList.contains('is-open');
          setOwnerMode(willOpen, willOpen);
        }
      }
    });

    if (ownerExitBtn) {
      ownerExitBtn.addEventListener('click', () => {
        setOwnerMode(false, false);
      });
    }

    if (ownerYearSelect) {
      ownerYearSelect.addEventListener('change', () => {
        const y = ownerYearSelect.value;
        if (ownerFolderYear) ownerFolderYear.textContent = y;
        if (ownerSeriesFolderYear) ownerSeriesFolderYear.textContent = y;
        if (ownerHintYear) ownerHintYear.textContent = y;
      });
    }

    if (ownerFileInput && ownerFilenameInput) {
      ownerFileInput.addEventListener('change', () => {
        const file = ownerFileInput.files && ownerFileInput.files[0];
        if (file) {
          ownerFilenameInput.value = file.name;
        }
      });
    }

    if (ownerSeriesFilesInput) {
      ownerSeriesFilesInput.addEventListener('change', () => {
        const files = Array.from(ownerSeriesFilesInput.files || []);
        if (files.length === 0) return;

        files.forEach((file) => {
          createSeriesSheetRow(file.name, cleanSheetTitleFromFilename(file.name));
        });

        ownerSeriesFilesInput.value = '';
      });
    }

    if (ownerSeriesAddRowBtn) {
      ownerSeriesAddRowBtn.addEventListener('click', () => {
        createSeriesSheetRow('', '');
      });
    }

    if (ownerSeriesList) {
      ownerSeriesList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-series-act]');
        if (!btn) return;
        const row = btn.closest('.owner-series-item');
        if (!row) return;

        const act = btn.dataset.seriesAct;
        if (act === 'remove') {
          row.remove();
          updateSeriesRowNumbers();
        } else if (act === 'up' && row.previousElementSibling) {
          ownerSeriesList.insertBefore(row, row.previousElementSibling);
          updateSeriesRowNumbers();
        } else if (act === 'down' && row.nextElementSibling) {
          ownerSeriesList.insertBefore(row.nextElementSibling, row);
          updateSeriesRowNumbers();
        }
      });
    }

    // Управление карточками в режиме владельца: перемещение (← / →) и удаление
    projectsGrid.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-card-act]');
      if (!actionBtn) return;
      e.stopPropagation();

      const card = actionBtn.closest('.project-card');
      if (!card) return;

      const act = actionBtn.dataset.cardAct;
      if (act === 'remove') {
        const customId = card.dataset.customId;
        if (customId) {
          const updated = getSavedCustomWorks().filter((item) => String(item.id) !== String(customId));
          saveCustomWorks(updated);
        }
        card.remove();
        applyYearFilter(activeYear);
        if (ownerStatus) {
          ownerStatus.innerHTML = 'Карточка удалена. Нажмите <strong>«Скачать обновлённый works.html»</strong> (или «Скопировать весь works.html»), чтобы сохранить изменения на GitHub.';
        }
      } else if (act === 'prev') {
        let prev = card.previousElementSibling;
        while (prev && (!prev.classList.contains('project-card') || prev.classList.contains('is-hidden'))) {
          prev = prev.previousElementSibling;
        }
        if (prev) {
          projectsGrid.insertBefore(card, prev);
          if (ownerStatus) {
            ownerStatus.innerHTML = 'Порядок карточек изменён. Не забудьте скачать или скопировать обновлённый <strong>works.html</strong>.';
          }
        }
      } else if (act === 'next') {
        let next = card.nextElementSibling;
        while (next && (!next.classList.contains('project-card') || next.classList.contains('is-hidden'))) {
          next = next.nextElementSibling;
        }
        if (next) {
          projectsGrid.insertBefore(next, card);
          if (ownerStatus) {
            ownerStatus.innerHTML = 'Порядок карточек изменён. Не забудьте скачать или скопировать обновлённый <strong>works.html</strong>.';
          }
        }
      }
    });

    if (ownerForm) {
      ownerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const year = ownerYearSelect.value;
        const category = ownerCategoryInput.value.trim() || (ownerPublishMode === 'series' ? 'Серия плакатов' : 'Плакат');
        const title = ownerTitleInput.value.trim();
        const desc = ownerDescInput.value.trim();

        if (!title || !desc) return;

        if (ownerPublishMode === 'series') {
          const rows = ownerSeriesList ? Array.from(ownerSeriesList.querySelectorAll('.owner-series-item')) : [];
          const sheets = rows
            .map((row, idx) => {
              const fileVal = (row.querySelector('.series-item-file')?.value || '').trim();
              const titleVal = (row.querySelector('.series-item-title')?.value || '').trim();
              if (!fileVal) return null;
              return {
                filename: fileVal,
                title: titleVal || cleanSheetTitleFromFilename(fileVal) || `Лист ${idx + 1}`
              };
            })
            .filter(Boolean);

          if (sheets.length < 2) {
            if (ownerStatus) {
              ownerStatus.innerHTML = 'Для серии добавьте минимум <strong>2 листа</strong> (выберите файлы или нажмите «+ Добавить лист»).';
            }
            return;
          }

          const newSeriesItem = {
            id: Date.now(),
            year,
            category,
            title,
            desc,
            series: sheets
          };

          const currentWorks = getSavedCustomWorks();
          currentWorks.push(newSeriesItem);
          saveCustomWorks(currentWorks);

          lastGeneratedCardHTML = buildCardMarkup(newSeriesItem);
          renderStoredWorks(true);

          ownerTitleInput.value = '';
          ownerDescInput.value = '';
          if (ownerSeriesList) ownerSeriesList.innerHTML = '';

          if (ownerStatus) {
            ownerStatus.innerHTML = `Серия <strong>«${escapeHTML(title)}»</strong> (${formatSheetsCount(sheets.length)}) добавлена в раздел <strong>${year}</strong>! Нажмите <strong>«Скачать обновлённый works.html»</strong> (или «Скопировать весь works.html») и обновите файл на GitHub.`;
          }
          return;
        }

        const filename = ownerFilenameInput.value.trim();
        if (!filename) return;

        const newItem = {
          id: Date.now(),
          year,
          category,
          title,
          filename,
          desc
        };

        const currentWorks = getSavedCustomWorks();
        currentWorks.push(newItem);
        saveCustomWorks(currentWorks);

        lastGeneratedCardHTML = buildCardMarkup(newItem);
        renderStoredWorks(true);

        ownerTitleInput.value = '';
        ownerFilenameInput.value = '';
        ownerDescInput.value = '';
        if (ownerFileInput) ownerFileInput.value = '';

        if (ownerStatus) {
          ownerStatus.innerHTML = `Работа <strong>«${escapeHTML(newItem.title)}»</strong> добавлена в раздел <strong>${year}</strong>! Нажмите <strong>«Скачать обновлённый works.html»</strong> (или «Скопировать весь works.html») и обновите файл на GitHub.`;
        }
      });
    }

    if (ownerDownloadBtn) {
      ownerDownloadBtn.addEventListener('click', () => {
        const fullHTML = buildCleanWorksHTML();
        const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'works.html';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        if (ownerStatus) {
          ownerStatus.innerHTML = 'Файл <strong>works.html</strong> скачан. Загрузите его в репозиторий на GitHub (и сами картинки в <strong>Работы/год/</strong>), чтобы работы появились на телефонах.';
        }
      });
    }

    if (ownerCopyFullHtmlBtn) {
      ownerCopyFullHtmlBtn.addEventListener('click', async () => {
        const fullHTML = buildCleanWorksHTML();
        try {
          await navigator.clipboard.writeText(fullHTML);
          if (ownerStatus) {
            ownerStatus.innerHTML = 'Весь код <strong>works.html</strong> скопирован! Откройте <strong>works.html</strong> на GitHub → нажмите карандаш (Edit) → <strong>Ctrl+A</strong> → <strong>Ctrl+V</strong> → <strong>Commit changes</strong>.';
          }
        } catch (err) {
          if (ownerStatus) {
            ownerStatus.textContent = 'Не удалось скопировать автоматически — используйте кнопку «Скачать обновлённый works.html».';
          }
        }
      });
    }

    if (ownerCopyBtn) {
      ownerCopyBtn.addEventListener('click', async () => {
        const works = getSavedCustomWorks();
        const codeToCopy =
          lastGeneratedCardHTML ||
          (works.length > 0 ? buildCardMarkup(works[works.length - 1]) : '');

        if (!codeToCopy) {
          if (ownerStatus) ownerStatus.textContent = 'Сначала добавьте работу или серию через форму выше.';
          return;
        }

        try {
          await navigator.clipboard.writeText(codeToCopy);
          if (ownerStatus) ownerStatus.textContent = 'HTML-код карточки скопирован в буфер обмена.';
        } catch (err) {
          if (ownerStatus) ownerStatus.textContent = 'Не удалось скопировать автоматически — используйте кнопку «Скачать обновлённый works.html».';
        }
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
