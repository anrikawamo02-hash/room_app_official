(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);

  const room = params.get('room') || '';
  const unit = params.get('unit') || room;
  const cat = params.get('cat') || 'main';

  const VALID_CATS = new Set([
    'main',
    'kitchen',
    'vanity',
    'bath',
    'toilet',
    'closet',
    'entrance'
  ]);

  const MAX_IMAGES = 30;

  const scroller = document.querySelector('.scroller');
  const counter = document.getElementById('counter');

  if (!scroller) return;

  function updateCounter() {
    if (!counter) return;

    const total = scroller.children.length;

    if (total === 0) {
      counter.textContent = '0/0';
      return;
    }

    const width = scroller.clientWidth || 1;
    const current = Math.round(scroller.scrollLeft / width) + 1;
    const safeCurrent = Math.min(Math.max(current, 1), total);

    counter.textContent = `${safeCurrent}/${total}`;
  }

  function showEmptyMessage() {
    scroller.innerHTML = `
      <div class="slide">
        <div class="slide-empty">写真準備中</div>
      </div>
    `;

    if (counter) {
      counter.textContent = '0/0';
    }
  }

  if (!room || !unit || !VALID_CATS.has(cat)) {
    showEmptyMessage();
    return;
  }

    const catFolder = `${cat}${unit}`;
  const basePath = `photos_v2/${room}/${catFolder}/`;

  const savedLanguage =
    localStorage.getItem('selectedLanguage') || 'ja';

  const imageLanguage =
    ['en', 'es', 'ko', 'zh'].includes(savedLanguage)
      ? savedLanguage
      : 'ja';

  scroller.innerHTML = '';

  let loadedCount = 0;
  let finishedCount = 0;

  for (let i = 1; i <= MAX_IMAGES; i++) {
    const num = String(i).padStart(2, '0');

    const defaultImgPath = `${basePath}${num}.png`;
    const localizedImgPath =
      `${basePath}${num}_${imageLanguage}.png`;

    const useLocalizedImage = imageLanguage !== 'ja';

    const slide = document.createElement('div');
    slide.className = 'slide';

    const frame = document.createElement('div');
    frame.className = 'photo-frame';

    const img = document.createElement('img');

    img.src = useLocalizedImage
      ? localizedImgPath
      : defaultImgPath;

    img.alt = `${cat} ${unit} ${num}`;

    img.addEventListener('load', () => {
      if (img.naturalWidth > img.naturalHeight) {
        frame.classList.add('photo-frame-landscape');
      } else {
        frame.classList.add('photo-frame-portrait');
      }

      loadedCount += 1;
      finishedCount += 1;
      updateCounter();
    });

    img.addEventListener('error', () => {
      if (
        useLocalizedImage &&
        img.dataset.fallbackTried !== '1'
      ) {
        img.dataset.fallbackTried = '1';
        img.src = defaultImgPath;
        return;
      }

      finishedCount += 1;
      slide.remove();

      if (
        finishedCount === MAX_IMAGES &&
        loadedCount === 0
      ) {
        showEmptyMessage();
        return;
      }

      updateCounter();
    });

    frame.appendChild(img);
    slide.appendChild(frame);
    scroller.appendChild(slide);
  }

  scroller.addEventListener(
    'scroll',
    () => {
      requestAnimationFrame(updateCounter);
    },
    { passive: true }
  );

  updateCounter();
})();
