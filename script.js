/* ==========================================================================
   INTERACTIVE BIRTHDAY SURPRISE - JAVASCRIPT ENGINE
   Controls bow & arrow physics, cinematic transitions, blooming heart tree,
   audio playback, and URL / local name personalization.
   ========================================================================== */

(function () {
  'use strict';

  // --- DOM Elements ---
  const appContainer = document.getElementById('appContainer');
  const sceneIntro = document.getElementById('sceneIntro');
  const sceneCinematic = document.getElementById('sceneCinematic');
  const sceneTree = document.getElementById('sceneTree');

  const heartTarget = document.getElementById('heartTarget');
  const heartElement = document.getElementById('heartElement');
  const bowSvg = document.getElementById('bowSvg');
  const bowStave = document.getElementById('bowStave');
  const bowString = document.getElementById('bowString');
  const arrowGroup = document.getElementById('arrowGroup');
  const pullIndicator = document.getElementById('pullIndicator');
  const flyingArrow = document.getElementById('flyingArrow');
  const burstCanvas = document.getElementById('burstCanvas');
  const treeCanvas = document.getElementById('treeCanvas');
  const ambientCanvas = document.getElementById('ambientCanvas');

  const scene2RecipientName = document.getElementById('scene2RecipientName');
  const scene3RecipientName = document.getElementById('scene3RecipientName');
  const wishSubtitleText = document.getElementById('wishSubtitleText');
  const finalWishCard = document.getElementById('finalWishCard');

  // Nav & Modals
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const editNameBtn = document.getElementById('editNameBtn');
  const shareLinkBtn = document.getElementById('shareLinkBtn');
  const cardEditBtn = document.getElementById('cardEditBtn');
  const replayBtn = document.getElementById('replayBtn');

  const nameModal = document.getElementById('nameModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const recipientNameInput = document.getElementById('recipientNameInput');
  const customWishInput = document.getElementById('customWishInput');
  const saveNameBtn = document.getElementById('saveNameBtn');
  const copyShareUrlBtn = document.getElementById('copyShareUrlBtn');
  const toastMessage = document.getElementById('toastMessage');

  const bgMusic = document.getElementById('bgMusic');

  // --- State Variables ---
  let isSoundEnabled = true;
  let isMusicPlaying = false;
  let isDragging = false;
  let hasShot = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let currentPullDist = 0;
  const MAX_PULL = 60;

  // Recipient details
  let recipientName = 'Dearest One';
  let customWish = 'to someone worth celebrating';

  // Web Audio Context for synthesized magical chimes
  let audioCtx = null;

  // ==========================================================================
  // INITIALIZATION & URL PARAMETER PARSING
  // ==========================================================================
  function init() {
    loadPersonalization();
    setupEventListeners();
    setupAmbientParticles();
    resizeCanvases();
    window.addEventListener('resize', debounce(resizeCanvases, 200));

    // Handle deep-link testing hash (e.g. #cinematic, #tree, or #edit)
    if (window.location.hash === '#cinematic') {
      showScene('cinematic', true);
    } else if (window.location.hash === '#tree') {
      showScene('tree', true);
    } else {
      showScene('intro');
      if (window.location.hash === '#edit') {
        openModal();
      }
    }
  }

  function loadPersonalization() {
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get('name');
    const urlWish = params.get('wish');

    const storedName = localStorage.getItem('birthday_recipient_name');
    const storedWish = localStorage.getItem('birthday_custom_wish');

    if (urlName && urlName.trim()) {
      recipientName = urlName.trim();
    } else if (storedName && storedName.trim()) {
      recipientName = storedName.trim();
    }

    if (urlWish && urlWish.trim()) {
      customWish = urlWish.trim();
    } else if (storedWish && storedWish.trim()) {
      customWish = storedWish.trim();
    }

    updatePersonalizationDOM();
  }

  function updatePersonalizationDOM() {
    scene2RecipientName.textContent = recipientName;
    scene3RecipientName.textContent = recipientName;
    wishSubtitleText.textContent = customWish;
    document.title = `Happy Birthday ${recipientName}! 🎂✨`;

    recipientNameInput.value = recipientName === 'Dearest One' ? '' : recipientName;
    customWishInput.value = customWish === 'to someone worth celebrating' ? '' : customWish;
  }

  // ==========================================================================
  // SCENE TRANSITIONS
  // ==========================================================================
  let cinematicTimer = null;

  function showScene(sceneName, immediate = false) {
    if (cinematicTimer) clearTimeout(cinematicTimer);

    // Hide all scenes cleanly
    [sceneIntro, sceneCinematic, sceneTree].forEach(s => {
      s.classList.remove('active', 'animate');
      s.style.display = 'none';
    });
    appContainer.className = 'experience-container';

    if (sceneName === 'intro') {
      appContainer.classList.add('stage-intro');
      sceneIntro.style.display = 'flex';
      // Force reflow before adding active class for opacity transition
      void sceneIntro.offsetWidth;
      sceneIntro.classList.add('active');
      hasShot = false;
      resetBowAndArrow();
      heartElement.style.transform = '';
      heartElement.style.opacity = '1';
      if (pullIndicator) pullIndicator.style.opacity = '1';
    } else if (sceneName === 'cinematic') {
      appContainer.classList.add('stage-cinematic');
      sceneCinematic.style.display = 'flex';
      void sceneCinematic.offsetWidth;
      sceneCinematic.classList.add('active');

      if (immediate) {
        sceneCinematic.classList.add('animate');
      } else {
        setTimeout(() => {
          sceneCinematic.classList.add('animate');
        }, 80);

        cinematicTimer = setTimeout(() => {
          showScene('tree');
        }, 4400);
      }
    } else if (sceneName === 'tree') {
      appContainer.classList.add('stage-tree');
      sceneTree.style.display = 'flex';
      void sceneTree.offsetWidth;
      sceneTree.classList.add('active');
      startHeartTreeAnimation(immediate);
    }
  }

  // ==========================================================================
  // BOW & ARROW INTERACTIVITY
  // ==========================================================================
  function resetBowAndArrow() {
    bowString.setAttribute('d', 'M 50,45 L 50,120 L 50,195');
    bowStave.setAttribute('d', 'M 50,45 Q 18,120 50,195');
    arrowGroup.style.transform = 'translate(0px, 0px)';
    arrowGroup.style.opacity = '1';
    currentPullDist = 0;
  }

  function onPointerDown(e) {
    if (hasShot) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    arrowGroup.classList.add('dragging');
    if (pullIndicator) pullIndicator.style.opacity = '0.3';
    initAudioContext();
  }

  function onPointerMove(e) {
    if (!isDragging || hasShot) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    let pull = -dx * 0.788 + dy * 0.615;

    if (pull < 0) pull = 0;
    if (pull > MAX_PULL) pull = MAX_PULL;
    currentPullDist = pull;

    const nockX = 50 - pull;
    const nockY = 120;

    bowString.setAttribute('d', `M 50,45 L ${nockX},${nockY} L 50,195`);
    const staveMid = 18 - pull * 0.12;
    bowStave.setAttribute('d', `M 50,45 Q ${staveMid},120 50,195`);
    arrowGroup.style.transform = `translate(${-pull}px, 0px)`;
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    arrowGroup.classList.remove('dragging');
    shootArrow();
  }

  function shootArrow() {
    if (hasShot) return;
    hasShot = true;

    playArrowTwangSound();

    bowString.setAttribute('d', 'M 50,45 L 50,120 L 50,195');
    bowStave.setAttribute('d', 'M 50,45 Q 18,120 50,195');
    arrowGroup.style.opacity = '0';
    if (pullIndicator) pullIndicator.style.opacity = '0';

    const arrowHead = document.getElementById('arrowHead');
    const arrowHeadRect = arrowHead.getBoundingClientRect();
    const startX = arrowHeadRect.left + arrowHeadRect.width / 2;
    const startY = arrowHeadRect.top + arrowHeadRect.height / 2;

    const heartRect = heartElement.getBoundingClientRect();
    const targetX = heartRect.left + heartRect.width / 2;
    const targetY = heartRect.top + heartRect.height / 2;

    const deltaX = targetX - startX;
    const deltaY = targetY - startY;
    const angleRad = Math.atan2(deltaY, deltaX);
    const angleDeg = (angleRad * 180) / Math.PI;

    flyingArrow.style.display = 'block';
    flyingArrow.style.left = `${startX}px`;
    flyingArrow.style.top = `${startY}px`;
    flyingArrow.style.transform = `translate(-20%, -50%) rotate(${angleDeg}deg) scale(0.9)`;
    flyingArrow.style.transition = 'none';

    void flyingArrow.offsetWidth;

    flyingArrow.style.transition = 'left 0.42s cubic-bezier(0.2, 0.9, 0.4, 1), top 0.42s cubic-bezier(0.2, 0.9, 0.4, 1), transform 0.42s ease-out';
    flyingArrow.style.left = `${targetX}px`;
    flyingArrow.style.top = `${targetY}px`;
    flyingArrow.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg) scale(0.7)`;

    setTimeout(() => {
      onHeartImpact(targetX, targetY);
      flyingArrow.style.display = 'none';
    }, 410);
  }

  function onHeartImpact(x, y) {
    startBackgroundMusic();

    heartElement.style.transition = 'transform 0.14s ease-out';
    heartElement.style.transform = 'scale(0.78)';

    setTimeout(() => {
      heartElement.style.transform = 'scale(1.4)';
      heartElement.style.opacity = '0';
      triggerHeartBurst(x, y);
    }, 110);

    setTimeout(() => {
      showScene('cinematic');
    }, 620);
  }

  // ==========================================================================
  // PARTICLE EXPLOSION (HEART BURST)
  // ==========================================================================
  function triggerHeartBurst(originX, originY) {
    const ctx = burstCanvas.getContext('2d');
    burstCanvas.width = window.innerWidth;
    burstCanvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#ff2a7a', '#ff6b9d', '#ff80ab', '#f6d365', '#ffffff', '#e6005c'];
    const count = 80;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.7;
      const speed = Math.random() * 9 + 4;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 2,
        size: Math.random() * 14 + 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        isHeart: Math.random() > 0.35,
        alpha: 1,
        decay: Math.random() * 0.018 + 0.015
      });
    }

    let burstAnimId;
    function renderBurst() {
      ctx.clearRect(0, 0, burstCanvas.width, burstCanvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22;
        p.vx *= 0.96;
        p.rotation += p.rotSpeed;
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);

          if (p.isHeart) {
            drawMiniHeart(ctx, 0, 0, p.size, p.color);
          } else {
            drawSparkleStar(ctx, 0, 0, p.size * 0.7, p.color);
          }
          ctx.restore();
        }
      });

      if (alive) {
        burstAnimId = requestAnimationFrame(renderBurst);
      } else {
        ctx.clearRect(0, 0, burstCanvas.width, burstCanvas.height);
        cancelAnimationFrame(burstAnimId);
      }
    }

    renderBurst();
  }

  function drawMiniHeart(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.4, x, y + size);
    ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 1.4, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.closePath();
    ctx.fill();
  }

  function drawSparkleStar(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(Math.cos(((18 + i * 90) * Math.PI) / 180) * r + x, -Math.sin(((18 + i * 90) * Math.PI) / 180) * r + y);
      ctx.lineTo(Math.cos(((54 + i * 90) * Math.PI) / 180) * (r * 0.3) + x, -Math.sin(((54 + i * 90) * Math.PI) / 180) * (r * 0.3) + y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ==========================================================================
  // SCENE 3: HEART BLOSSOM TREE ENGINE
  // ==========================================================================
  let treeAnimId = null;

  function startHeartTreeAnimation(immediate = false) {
    if (treeAnimId) cancelAnimationFrame(treeAnimId);

    const ctx = treeCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    treeCanvas.width = w * dpr;
    treeCanvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const isMobile = w < 600;
    const rootX = isMobile ? w * 0.56 : w * 0.65;
    const rootY = h;
    const trunkHeight = isMobile ? h * 0.44 : h * 0.48;
    const heartCenterY = rootY - trunkHeight;
    const heartCenterX = rootX;
    const heartScale = isMobile ? Math.min(w * 0.38, 160) : Math.min(w * 0.28, 250);

    const petals = generateHeartPetals(heartCenterX, heartCenterY, heartScale);

    if (immediate) {
      finalWishCard.classList.add('is-in');
      startTreeAmbientLoop(ctx, rootX, rootY, trunkHeight, heartScale, petals);
      return;
    }

    let progress = 0;
    const trunkDuration = 55;
    const bloomDuration = 85;

    function renderTreeFrame() {
      ctx.clearRect(0, 0, w, h);
      progress++;

      const growT = Math.min(1, progress / trunkDuration);
      drawHeartTreeBranches(ctx, rootX, rootY, trunkHeight, heartScale, growT);

      if (progress > trunkDuration * 0.35) {
        const bloomProgress = (progress - trunkDuration * 0.35) / bloomDuration;
        drawBlooms(ctx, petals, bloomProgress);
      }

      if (progress === Math.floor(trunkDuration * 0.75)) {
        finalWishCard.classList.add('is-in');
      }

      if (progress < trunkDuration + bloomDuration + 30) {
        treeAnimId = requestAnimationFrame(renderTreeFrame);
      } else {
        startTreeAmbientLoop(ctx, rootX, rootY, trunkHeight, heartScale, petals);
      }
    }

    renderTreeFrame();
  }

  function generateHeartPetals(cx, cy, scale) {
    const list = [];
    const colors = [
      '#ff4081', '#f50057', '#ff80ab', '#ffb6c1', '#f48fb1',
      '#ffab91', '#ffe082', '#ffffff', '#e91e63', '#ff6090',
      '#ffd54f', '#ff8a80'
    ];
    const totalPetals = 320;

    for (let i = 0; i < totalPetals; i++) {
      const t = Math.PI * 2 * Math.random();
      const r = Math.pow(Math.random(), 0.6);

      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

      const px = cx + (hx / 17) * scale * r + (Math.random() - 0.5) * 14;
      const py = cy + (hy / 18) * scale * r + (Math.random() - 0.5) * 14;

      const distFromCenter = Math.hypot(px - cx, py - cy);

      list.push({
        x: px,
        y: py,
        size: Math.random() * 12 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        delay: distFromCenter / scale,
        scale: 0
      });
    }

    return list.sort((a, b) => a.delay - b.delay);
  }

  function drawHeartTreeBranches(ctx, rootX, rootY, trunkH, heartScale, t) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const barkGrad = ctx.createLinearGradient(rootX - 10, rootY, rootX + 10, rootY - trunkH);
    barkGrad.addColorStop(0, '#36161b');
    barkGrad.addColorStop(0.5, '#4e2229');
    barkGrad.addColorStop(1, '#5c2d35');
    ctx.strokeStyle = barkGrad;

    const trunkTopY = rootY - trunkH * 0.72;
    ctx.lineWidth = Math.max(7, trunkH * 0.05);
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    const currentY = rootY - (rootY - trunkTopY) * t;
    ctx.quadraticCurveTo(rootX - 6, (rootY + currentY) / 2, rootX, currentY);
    ctx.stroke();

    if (t > 0.3) {
      const branchT = (t - 0.3) / 0.7;
      ctx.lineWidth = Math.max(4.5, trunkH * 0.03);

      // Left Heart Lobe Branch
      ctx.beginPath();
      ctx.moveTo(rootX, trunkTopY);
      const leftControlX = rootX - heartScale * 0.95;
      const leftControlY = trunkTopY - heartScale * 0.45;
      const leftTargetX = rootX - heartScale * 0.45;
      const leftTargetY = trunkTopY - heartScale * 0.85;

      const lx = lerp(rootX, leftTargetX, branchT);
      const ly = lerp(trunkTopY, leftTargetY, branchT);
      const lcx = lerp(rootX, leftControlX, branchT);
      const lcy = lerp(trunkTopY, leftControlY, branchT);
      ctx.quadraticCurveTo(lcx, lcy, lx, ly);
      ctx.stroke();

      // Right Heart Lobe Branch
      ctx.beginPath();
      ctx.moveTo(rootX, trunkTopY);
      const rightControlX = rootX + heartScale * 0.95;
      const rightControlY = trunkTopY - heartScale * 0.45;
      const rightTargetX = rootX + heartScale * 0.45;
      const rightTargetY = trunkTopY - heartScale * 0.85;

      const rx = lerp(rootX, rightTargetX, branchT);
      const ry = lerp(trunkTopY, rightTargetY, branchT);
      const rcx = lerp(rootX, rightControlX, branchT);
      const rcy = lerp(trunkTopY, rightControlY, branchT);
      ctx.quadraticCurveTo(rcx, rcy, rx, ry);
      ctx.stroke();

      if (branchT > 0.4) {
        const subT = (branchT - 0.4) / 0.6;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rootX - 5, trunkTopY - 10);
        ctx.quadraticCurveTo(rootX - heartScale * 0.4, trunkTopY - heartScale * 0.3, rootX - heartScale * 0.25 * subT, trunkTopY - heartScale * 0.6 * subT);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rootX + 5, trunkTopY - 10);
        ctx.quadraticCurveTo(rootX + heartScale * 0.4, trunkTopY - heartScale * 0.3, rootX + heartScale * 0.25 * subT, trunkTopY - heartScale * 0.6 * subT);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawBlooms(ctx, petals, bloomProgress) {
    petals.forEach(p => {
      const localProgress = Math.max(0, Math.min(1, (bloomProgress - p.delay * 0.6) / 0.4));
      if (localProgress > 0) {
        const s = easeOutBack(localProgress);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.scale(s, s);
        drawMiniHeart(ctx, -p.size / 2, -p.size / 2, p.size, p.color);
        ctx.restore();
      }
    });
  }

  function startTreeAmbientLoop(ctx, rootX, rootY, trunkH, heartScale, petals) {
    let tick = 0;
    function loop() {
      tick += 0.02;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      drawHeartTreeBranches(ctx, rootX, rootY, trunkH, heartScale, 1);

      petals.forEach((p, idx) => {
        const sway = Math.sin(tick + idx * 0.2) * 1.5;
        ctx.save();
        ctx.translate(p.x, p.y + sway);
        ctx.rotate(((p.rotation + sway * 2) * Math.PI) / 180);
        drawMiniHeart(ctx, -p.size / 2, -p.size / 2, p.size, p.color);
        ctx.restore();
      });

      treeAnimId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==========================================================================
  // AMBIENT DRIFTING PARTICLES & PETALS CANVAS
  // ==========================================================================
  function setupAmbientParticles() {
    const ctx = ambientCanvas.getContext('2d');
    let w = (ambientCanvas.width = window.innerWidth);
    let h = (ambientCanvas.height = window.innerHeight);

    const particles = [];
    const count = 35;
    const colors = ['rgba(255, 128, 171, 0.45)', 'rgba(255, 64, 129, 0.35)', 'rgba(255, 235, 238, 0.7)', 'rgba(246, 211, 101, 0.45)'];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.random() * 0.8 - 0.2,
        vy: Math.random() * 0.8 + 0.3,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * 360,
        spin: (Math.random() - 0.5) * 2,
        isHeart: Math.random() > 0.5
      });
    }

    function animateAmbient() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.vx + Math.sin(p.y * 0.01) * 0.4;
        p.y += p.vy;
        p.angle += p.spin;

        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }
        if (p.x > w + 20) p.x = -20;
        if (p.x < -20) p.x = w + 20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.isHeart) {
          drawMiniHeart(ctx, -p.size / 2, -p.size / 2, p.size, p.color);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      requestAnimationFrame(animateAmbient);
    }

    animateAmbient();
  }

  // ==========================================================================
  // AUDIO & SOUND SYNTHESIS
  // ==========================================================================
  function initAudioContext() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function startBackgroundMusic() {
    if (!isSoundEnabled) return;

    initAudioContext();

    if (bgMusic) {
      bgMusic.volume = 0.85;
      const playPromise = bgMusic.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isMusicPlaying = true;
            updateSoundIcon();
          })
          .catch(err => {
            console.log('Audio autoplay prevented or media missing, using Web Audio chime melody fallback', err);
            playSynthesizedMelody();
          });
      }
    } else {
      playSynthesizedMelody();
    }
  }

  function playArrowTwangSound() {
    if (!isSoundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      // Ignore
    }
  }

  function playSynthesizedMelody() {
    if (!audioCtx) return;
    isMusicPlaying = true;
    updateSoundIcon();

    const notes = [
      { f: 392.00, t: 0.0, d: 1.2 },
      { f: 493.88, t: 0.4, d: 1.2 },
      { f: 587.33, t: 0.8, d: 1.2 },
      { f: 739.99, t: 1.2, d: 1.4 },
      { f: 659.25, t: 1.8, d: 2.0 },
      { f: 587.33, t: 2.5, d: 1.8 },
      { f: 493.88, t: 3.2, d: 2.2 },
      { f: 587.33, t: 4.2, d: 2.5 },
    ];

    notes.forEach(n => {
      const startTime = audioCtx.currentTime + n.t;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + n.d);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + n.d + 0.1);
    });
  }

  function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    if (!isSoundEnabled) {
      if (bgMusic) bgMusic.pause();
      isMusicPlaying = false;
    } else {
      if (bgMusic && bgMusic.paused && hasShot) {
        bgMusic.play();
        isMusicPlaying = true;
      }
    }
    updateSoundIcon();
  }

  function updateSoundIcon() {
    soundIcon.textContent = isSoundEnabled ? '🔊' : '🔇';
    soundToggleBtn.setAttribute('title', isSoundEnabled ? 'Mute Music' : 'Unmute Music');
  }

  // ==========================================================================
  // EVENT LISTENERS & MODAL MANAGEMENT
  // ==========================================================================
  function setupEventListeners() {
    bowSvg.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    heartTarget.addEventListener('click', () => {
      if (!hasShot) shootArrow();
    });

    soundToggleBtn.addEventListener('click', toggleSound);

    editNameBtn.addEventListener('click', openModal);
    cardEditBtn.addEventListener('click', openModal);

    shareLinkBtn.addEventListener('click', copyPersonalizedShareLink);
    copyShareUrlBtn.addEventListener('click', copyPersonalizedShareLink);

    closeModalBtn.addEventListener('click', closeModal);
    nameModal.addEventListener('click', (e) => {
      if (e.target === nameModal) closeModal();
    });

    saveNameBtn.addEventListener('click', handleSaveName);
    recipientNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSaveName();
    });

    replayBtn.addEventListener('click', () => {
      finalWishCard.classList.remove('is-in');
      showScene('intro');
    });
  }

  function openModal() {
    nameModal.classList.add('open');
    nameModal.setAttribute('aria-hidden', 'false');
    recipientNameInput.focus();
  }

  function closeModal() {
    nameModal.classList.remove('open');
    nameModal.setAttribute('aria-hidden', 'true');
  }

  function handleSaveName() {
    const inputName = recipientNameInput.value.trim();
    const inputWish = customWishInput.value.trim();

    recipientName = inputName || 'Dearest One';
    customWish = inputWish || 'to someone worth celebrating';

    localStorage.setItem('birthday_recipient_name', recipientName);
    localStorage.setItem('birthday_custom_wish', customWish);

    updatePersonalizationDOM();
    closeModal();
    showToast(`✨ Personalized for ${recipientName}! Replaying... 🎁`);

    setTimeout(() => {
      finalWishCard.classList.remove('is-in');
      showScene('intro');
    }, 400);
  }

  function copyPersonalizedShareLink() {
    const nameToShare = recipientNameInput.value.trim() || recipientName;
    const wishToShare = customWishInput.value.trim() || customWish;

    const url = new URL(window.location.origin + window.location.pathname);
    if (nameToShare && nameToShare !== 'Dearest One') {
      url.searchParams.set('name', nameToShare);
    }
    if (wishToShare && wishToShare !== 'to someone worth celebrating') {
      url.searchParams.set('wish', wishToShare);
    }

    const shareUrl = url.toString();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('🔗 Personalized link copied! Send it on WhatsApp/IG 💖');
      }).catch(() => {
        fallbackCopyText(shareUrl);
      });
    } else {
      fallbackCopyText(shareUrl);
    }
  }

  function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('🔗 Link copied to clipboard! 💖');
    } catch (err) {
      prompt('Copy this personalized link to share:', text);
    }
    document.body.removeChild(textArea);
  }

  let toastTimeout = null;
  function showToast(msg) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastMessage.textContent = msg;
    toastMessage.classList.add('show');
    toastTimeout = setTimeout(() => {
      toastMessage.classList.remove('show');
    }, 3200);
  }

  // ==========================================================================
  // HELPER FUNCTIONS & MATH
  // ==========================================================================
  function resizeCanvases() {
    ambientCanvas.width = window.innerWidth;
    ambientCanvas.height = window.innerHeight;
    burstCanvas.width = window.innerWidth;
    burstCanvas.height = window.innerHeight;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
