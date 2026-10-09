(() => {
  const app = document.getElementById('app');
  const autoBtn = document.getElementById('autoBtn');
  const blackBtn = document.getElementById('blackBtn');
  const lavBtn = document.getElementById('lavBtn');
  const status = document.getElementById('status');
  const bubble = document.getElementById('bubble');
  const voiceBtn = document.getElementById('voiceBtn');
  const lipBtn = document.getElementById('lipBtn');
  const micBtn = document.getElementById('micBtn');
  const sendBtn = document.getElementById('sendBtn');
  const msg = document.getElementById('msg');
  const renBase = document.getElementById('renImage') || document.querySelector('.ren-base');
  const eyeLayer = document.getElementById('eyeLayer');
  const mouthLayer = document.getElementById('mouthLayer');

  const JP = {
    waiting: '\u5f85\u3063\u3066\u308b',
    listening: '\u805e\u3044\u3066\u308b',
    thinking: '\u8003\u3048\u4e2d',
    speaking: '\u8a71\u3057\u3066\u308b',
    replying: '\u8fd4\u4e8b\u4e2d',
    ren: '\u84ee',
    anri: '\u674f\u91cc',
    micNext: '\u30de\u30a4\u30af\u6a5f\u80fd\u306f\u6b21\u306e\u6bb5\u968e\u3067\u3064\u306a\u3050\u3067\u3002',
    demoReply: '\u3046\u3093\u3002\u3053\u306e\u611f\u3058\u3067\u3001\u5c11\u3057\u305a\u3064\u674f\u91cc\u597d\u307f\u306b\u4ed5\u4e0a\u3052\u3066\u3044\u3053\u304b\u3002',
    voiceOn: '\ud83d\udd0a \u97f3\u58f0ON',
    voiceOff: '\ud83d\udd07 \u97f3\u58f0OFF',
    displayCheck: '\u8868\u793a\u78ba\u8a8d',
    displayAuto: '\u81ea\u52d5',
    displayDay: '\u663c',
    displayNight: '\u591c',
    mouthPractice: '\u53e3\u30d1\u30af\u7df4\u7fd2',
    mouthStop: '\u53e3\u30d1\u30af\u505c\u6b62'
  };

  /*
    å¶ä½ä¸­ã®å±éã«ã¼ã«
    - åãã­ãã£ã¼ã«ã¯ããã©ã«ãã¼åä½ãã§æ±ãã
    - ãã©ã«ãã¼åã®ãã¡ã¤ã«åã¯å±éï¼
      ren_base.png / eyes_half.png / eyes_closed.png /
      mouth_small.png / mouth_open.png / mouth_round.png
    - ç®åã¯éå¸¸åä½ãå£åã¯ä¸ã®ãå£ãã¯ç·´ç¿ããã¿ã³ã§ç¢ºèªããã
  */
  const REN_PROFILES = {
    spring_summer: {
      day: 'images/spring_summer_day_main',
      night: 'images/spring_summer_night_main'
    },
    winter: {
      day: 'images/winter_day_main',
      night: 'images/winter_night_main'
    }
  };

  // éçºä¸­ã¯ãã¼ã¸ãåèª­ã¿è¾¼ã¿ãããã³ã«ææ°ç»åãåããããããã
  const DEV_ASSET_VERSION = Date.now();

  // 3/1ã8/31 = æ¥å¤ã9/1ã2ææ« = ç§å¬ï¼winterãã©ã«ãã¼ï¼
  function getSeason(date = new Date()) {
    const month = date.getMonth() + 1;
    return month >= 3 && month <= 8 ? 'spring_summer' : 'winter';
  }

  // 06:00ã17:59 = dayã18:00ã05:59 = night
  function getTimeSlot(date = new Date()) {
    const hour = date.getHours();
    return hour >= 6 && hour < 18 ? 'day' : 'night';
  }

  function withVersion(path) {
    return `${path}?v=${DEV_ASSET_VERSION}`;
  }

  function buildAssets(season, slot) {
    const folder = REN_PROFILES[season]?.[slot];
    if (!folder) return null;

    return {
      key: `${season}:${slot}`,
      folder,
      base: withVersion(`${folder}/ren_base.png`),
      eyesHalf: withVersion(`${folder}/eyes_half.png`),
      eyesClosed: withVersion(`${folder}/eyes_closed.png`),
      mouthSmall: withVersion(`${folder}/mouth_small.png`),
      mouthOpen: withVersion(`${folder}/mouth_open.png`),
      mouthRound: withVersion(`${folder}/mouth_round.png`)
    };
  }

  let displayMode = 'auto';
  let displayCheckButtons = {};

  let activeAssets = null;
  let activeProfileKey = '';
  let switchToken = 0;
  let blinkToken = 0;
  let blinkTimer = null;

  let eyeAvailability = {
    half: false,
    closed: false
  };

  let mouthAvailability = {
    small: false,
    open: false,
    round: false
  };

  let mouthPracticeOn = false;
  let mouthPracticeToken = 0;

  function currentProfile() {
    const now = new Date();
    const season = getSeason(now);
    const slot = displayMode === 'auto' ? getTimeSlot(now) : displayMode;
    return { season, slot };
  }

  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  function hideEyes() {
    if (!eyeLayer) return;
    eyeLayer.style.opacity = '0';
  }

  function showEyes(src) {
    if (!eyeLayer) return;
    eyeLayer.src = src;
    eyeLayer.style.opacity = '1';
  }

  // 髭比較テスト：通常時はOFF（元の表示）。「round」の口パーツだけ補正する。
  let beardCompareOn = false;
  let beardCompareBtn = null;

  function updateBeardCompare() {
    if (!mouthLayer) return;
    const isRound = !!activeAssets &&
      mouthLayer.getAttribute('src') === activeAssets.mouthRound;
    mouthLayer.classList.toggle('beard-compare-active', beardCompareOn && isRound);
    if (beardCompareBtn) {
      beardCompareBtn.textContent = beardCompareOn ? '上髭調整 ON' : '上髭調整 OFF';
      beardCompareBtn.setAttribute('aria-pressed', String(beardCompareOn));
      beardCompareBtn.classList.toggle('active', beardCompareOn);
    }
  }

  function createBeardCompareButton() {
    const controls = lipBtn?.parentElement;
    if (!controls || document.getElementById('beardCompareBtn')) return;
    beardCompareBtn = document.createElement('button');
    beardCompareBtn.type = 'button';
    beardCompareBtn.id = 'beardCompareBtn';
    beardCompareBtn.className = 'mini-btn beard-compare-btn';
    beardCompareBtn.setAttribute('aria-label', '丸い口の上髭の調整を比較');
    beardCompareBtn.addEventListener('click', () => {
      beardCompareOn = !beardCompareOn;
      updateBeardCompare();
    });
    controls.appendChild(beardCompareBtn);
    updateBeardCompare();
  }

  function hideMouth() {
    if (!mouthLayer) return;
    mouthLayer.style.opacity = '0';
    mouthLayer.removeAttribute('src');
    updateBeardCompare();
  }

  function showMouth(src) {
    if (!mouthLayer || !src) return;
    mouthLayer.src = src;
    mouthLayer.style.opacity = '1';
    updateBeardCompare();
  }

  function updateLipButton() {
    if (!lipBtn) return;

    const hasAnyMouth =
      mouthAvailability.small ||
      mouthAvailability.open ||
      mouthAvailability.round;

    lipBtn.disabled = !hasAnyMouth;
    lipBtn.style.opacity = hasAnyMouth ? '1' : '0.55';
    lipBtn.classList.toggle('active', mouthPracticeOn);
    lipBtn.textContent = mouthPracticeOn ? JP.mouthStop : JP.mouthPractice;
  }

  function stopMouthPractice() {
    mouthPracticeOn = false;
    mouthPracticeToken += 1;
    hideMouth();
    updateLipButton();
  }

  async function runMouthPractice() {
    if (!activeAssets) return;

    const frames = [
      { available: mouthAvailability.small, src: activeAssets.mouthSmall },
      { available: mouthAvailability.open, src: activeAssets.mouthOpen },
      { available: mouthAvailability.round, src: activeAssets.mouthRound }
    ].filter((frame) => frame.available);

    if (!frames.length) {
      stopMouthPractice();
      return;
    }

    mouthPracticeOn = true;
    const token = ++mouthPracticeToken;
    updateLipButton();

    while (mouthPracticeOn && token === mouthPracticeToken) {
      // éå¸¸ï¼éãå£ï¼
      hideMouth();
      await sleep(700);
      if (!mouthPracticeOn || token !== mouthPracticeToken) break;

      // å° â å¤§ â ãã»ãï¼å­å¨ããç´ æã ãé çªã«ç¢ºèªï¼
      for (const frame of frames) {
        showMouth(frame.src);
        await sleep(900);
        if (!mouthPracticeOn || token !== mouthPracticeToken) break;
      }

      if (!mouthPracticeOn || token !== mouthPracticeToken) break;

      // 1å¨ãã¨ã«éå¸¸ã¸æ»ã
      hideMouth();
      await sleep(700);
    }

    hideMouth();
  }

  function stopBlinking() {
    blinkToken += 1;
    if (blinkTimer) {
      clearTimeout(blinkTimer);
      blinkTimer = null;
    }
    hideEyes();
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function blinkOnce(token) {
    if (!activeAssets || !eyeAvailability.half || token !== blinkToken) return;

    // éç¼ï¼ãã¼ã¹ï¼â åç®
    showEyes(activeAssets.eyesHalf);
    await sleep(70);
    if (token !== blinkToken) return;

    // éãç®ãã¾ã ç¡ãå¶ä½éä¸­ã§ã¯ãåç®ã ãç¢ºèªã§ããã
    if (eyeAvailability.closed) {
      showEyes(activeAssets.eyesClosed);
      await sleep(95);
      if (token !== blinkToken) return;

      showEyes(activeAssets.eyesHalf);
      await sleep(70);
      if (token !== blinkToken) return;
    }

    // åç® â éç¼ï¼ãã¼ã¹ï¼
    hideEyes();
  }

  function scheduleNextBlink() {
    if (!eyeAvailability.half || !activeAssets) return;

    const token = blinkToken;
    const nextBlink = 3200 + Math.random() * 3000;

    blinkTimer = setTimeout(async () => {
      if (token !== blinkToken) return;

      await blinkOnce(token);

      if (token !== blinkToken) return;

      // åã®ç¢ºå®è¨­å®ï¼ã¾ãã«äºåº¦ç¬ãï¼6%ï¼
      if (Math.random() < 0.06) {
        await sleep(140);
        if (token !== blinkToken) return;
        await blinkOnce(token);
      }

      if (token === blinkToken) {
        scheduleNextBlink();
      }
    }, nextBlink);
  }

  async function switchBaseImage(nextSrc, instant = false) {
    if (!renBase) return false;

    const myToken = ++switchToken;
    const loaded = await preloadImage(nextSrc);

    if (myToken !== switchToken) return false;

    if (!loaded) {
      renBase.style.opacity = '1';
      console.log('Base image could not be loaded:', nextSrc);
      return false;
    }

    const currentSrc = renBase.getAttribute('src') || '';

    if (currentSrc === nextSrc) {
      renBase.style.opacity = '1';
      return true;
    }

    if (!instant) {
      renBase.style.opacity = '0';
      await sleep(360);
      if (myToken !== switchToken) return false;
    }

    renBase.src = nextSrc;

    requestAnimationFrame(() => {
      if (myToken === switchToken) {
        renBase.style.opacity = '1';
      }
    });

    return true;
  }

  async function prepareEyes(assets, tokenAtStart) {
    const [half, closed] = await Promise.all([
      preloadImage(assets.eyesHalf),
      preloadImage(assets.eyesClosed)
    ]);

    if (tokenAtStart !== switchToken || activeAssets?.key !== assets.key) {
      return;
    }

    eyeAvailability = { half, closed };

    stopBlinking();

    // stopBlinking() increments blinkToken, so start a fresh cycle after it.
    if (eyeAvailability.half) {
      scheduleNextBlink();
    }
  }

  async function prepareMouth(assets, tokenAtStart) {
    const [small, open, round] = await Promise.all([
      preloadImage(assets.mouthSmall),
      preloadImage(assets.mouthOpen),
      preloadImage(assets.mouthRound)
    ]);

    if (tokenAtStart !== switchToken || activeAssets?.key !== assets.key) {
      return;
    }

    mouthAvailability = { small, open, round };
    updateLipButton();
  }

  function updateDisplayCheckButtons() {
    Object.entries(displayCheckButtons).forEach(([mode, button]) => {
      button.classList.toggle('is-active', mode === displayMode);
    });
  }

  async function applyCurrentRen(instant = false) {
    const { season, slot } = currentProfile();
    const assets = buildAssets(season, slot);

    updateDisplayCheckButtons();

    if (!assets) return;

    if (activeProfileKey === assets.key && activeAssets) {
      return;
    }

    stopBlinking();
    stopMouthPractice();

    const switched = await switchBaseImage(assets.base, instant);
    if (!switched) return;

    activeAssets = assets;
    activeProfileKey = assets.key;

    const tokenAtStart = switchToken;
    prepareEyes(assets, tokenAtStart);
    prepareMouth(assets, tokenAtStart);
  }

  function createDisplayCheckPanel() {
    document.getElementById('renDisplayCheckPanel')?.remove();
    document.getElementById('renDisplayCheckStyle')?.remove();

    const panel = document.createElement('div');
    panel.id = 'renDisplayCheckPanel';
    panel.className = 'ren-display-check';

    const label = document.createElement('span');
    label.className = 'ren-display-check__label';
    label.textContent = JP.displayCheck;

    const group = document.createElement('div');
    group.className = 'ren-display-check__group';

    [
      ['auto', JP.displayAuto],
      ['day', JP.displayDay],
      ['night', JP.displayNight]
    ].forEach(([mode, text]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ren-display-check__btn';
      button.dataset.mode = mode;
      button.textContent = text;

      button.addEventListener('click', () => {
        displayMode = mode;
        applyCurrentRen();
      });

      group.appendChild(button);
      displayCheckButtons[mode] = button;
    });

    panel.append(label, group);

    const themeContainer = lavBtn?.parentElement;
    if (themeContainer?.parentElement) {
      themeContainer.insertAdjacentElement('afterend', panel);
    } else if (app) {
      app.prepend(panel);
    } else {
      document.body.prepend(panel);
    }

    const style = document.createElement('style');
    style.id = 'renDisplayCheckStyle';
    style.textContent = `
      .ren-display-check {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin: 10px 0 12px;
        padding: 8px 10px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 14px;
        background: rgba(255,255,255,.04);
        font-size: 13px;
      }

      .ren-display-check__label {
        opacity: .72;
        white-space: nowrap;
      }

      .ren-display-check__group {
        display: flex;
        gap: 6px;
      }

      .ren-display-check__btn {
        appearance: none;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 999px;
        padding: 7px 12px;
        background: rgba(255,255,255,.05);
        color: inherit;
        font: inherit;
        font-weight: 700;
      }

      .ren-display-check__btn.is-active {
        background: #f5f5f7;
        color: #111216;
      }
    `;

    document.head.appendChild(style);
  }

  // èªåè¡¨ç¤ºæã¯ã6æã»18æãªã©ã®åãæ¿ãããæ¾ãã
  setInterval(() => {
    if (displayMode === 'auto') {
      const { season, slot } = currentProfile();
      const nextKey = `${season}:${slot}`;

      if (nextKey !== activeProfileKey) {
        applyCurrentRen();
      }
    }
  }, 60 * 1000);

  if (renBase) {
    renBase.style.transition = 'opacity 360ms ease';
  }

  hideEyes();
  hideMouth();

  function clearThemeClasses() {
    app?.classList.remove('theme-lavender', 'theme-morning', 'theme-evening');
  }

  function setActive(btn) {
    [autoBtn, blackBtn, lavBtn].forEach((button) => {
      if (button) button.classList.toggle('active', button === btn);
    });
  }

  function applyAuto() {
    clearThemeClasses();
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      app?.classList.add('theme-morning');
    } else if (hour >= 12 && hour < 18) {
      app?.classList.add('theme-evening');
    }

    setActive(autoBtn);
  }

  autoBtn?.addEventListener('click', applyAuto);

  blackBtn?.addEventListener('click', () => {
    clearThemeClasses();
    setActive(blackBtn);
  });

  lavBtn?.addEventListener('click', () => {
    clearThemeClasses();
    app?.classList.add('theme-lavender');
    setActive(lavBtn);
  });

  let voiceOn = true;

  voiceBtn?.addEventListener('click', () => {
    voiceOn = !voiceOn;
    voiceBtn.classList.toggle('active', voiceOn);
    voiceBtn.textContent = voiceOn ? JP.voiceOn : JP.voiceOff;
  });

  // æ¢å­ã®ãå£ãã¯ç·´ç¿ããã¿ã³ã ããä½¿ãã
  // 1åæ¼ãã¨ éå¸¸ â å° â å¤§ â ãã»ã â éå¸¸â¦ ãç¹°ãè¿ãã
  // ãã1åæ¼ãã¨åæ­¢ãã¦éå¸¸ã®éãå£ã¸æ»ãã
  if (lipBtn) {
    lipBtn.disabled = true;
    lipBtn.classList.remove('active');
    lipBtn.textContent = JP.mouthPractice;
    lipBtn.style.opacity = '0.55';

    lipBtn.addEventListener('click', () => {
      if (mouthPracticeOn) {
        stopMouthPractice();
      } else {
        runMouthPractice();
      }
    });
  }

  function showBubble(who, text) {
    if (!bubble) return;

    bubble.textContent = '';

    const whoEl = document.createElement('div');
    whoEl.className = 'who';
    whoEl.textContent = who;

    const textEl = document.createElement('div');
    textEl.textContent = text;

    bubble.append(whoEl, textEl);
  }

  micBtn?.addEventListener('click', () => {
    if (status) status.textContent = JP.listening;
    showBubble(JP.ren, JP.micNext);

    setTimeout(() => {
      if (status) status.textContent = JP.waiting;
    }, 1200);
  });

  function sendDemo() {
    if (!msg) return;

    const value = msg.value.trim();
    if (!value) return;

    if (status) status.textContent = JP.thinking;
    showBubble(JP.anri, value);

    setTimeout(() => {
      if (status) status.textContent = voiceOn ? JP.speaking : JP.replying;
      showBubble(JP.ren, JP.demoReply);

      setTimeout(() => {
        if (status) status.textContent = JP.waiting;
      }, 1000);
    }, 500);

    msg.value = '';
  }

  sendBtn?.addEventListener('click', sendDemo);

  msg?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendDemo();
    }
  });

  applyAuto();
  createDisplayCheckPanel();
  createBeardCompareButton(); // テストボタンを追加（OFFが元の見た目）
  applyCurrentRen(true);
})();
