// ─── Chaos Engine — Effect System ───
// Probability: 70% Normal, 29.2% Medium, 0.8% Rare
// Combo: 10-15% chance of multi-effects

const EMOJIS_RAIN = ['💥', '🔥', '⚡', '🌀', '💀', '👻', '🤯', '🎉', '✨', '🌈', '☄️', '🪐'];
const MEMES = [
  '😤 BRUH MOMENT',
  '💀 SKILL ISSUE',
  '🤡 CLOWN DETECTED',
  '🗿 Moyai.',
  '👁️ HE WATCHES',
  '🐸 It\'s Wednesday',
  '📈 STONKS',
  '💿 DISK SCRATCH',
  '🦧 RETURN TO MONKE',
  '🤖 01001000 01001001'
];
const CONFETTI_COLORS = ['#00f0ff', '#ff006e', '#8b5cf6', '#fbbf24', '#10b981', '#ef4444', '#f472b6'];
const FAKE_MESSAGES = [
  '⚠️ System Alert: Chaos levels critical!',
  '🔧 Recalibrating chaos matrix...',
  '📡 Signal lost... reconnecting...',
  '🧪 Experimental mode activated',
  '💾 Saving your progress... jk',
  '🔒 Firewall breach detected!',
  '🛸 Unknown entity detected nearby',
];
const FAKE_LOADING_MSGS = [
  'Downloading more RAM...',
  'Reticulating splines...',
  'Generating chaos particles...',
  'Buffering the unbufferable...',
  'Consulting the chaos oracle...',
];

// ─── Effect Definitions ───
const NORMAL_EFFECTS = [
  { id: 'shake', name: 'Screen Shake', exec: fxShake },
  { id: 'color_flash', name: 'Color Flash', exec: fxColorFlash },
  { id: 'gradient', name: 'Gradient Shift', exec: fxGradient },
  { id: 'emoji_rain', name: 'Emoji Rain', exec: fxEmojiRain },
  { id: 'confetti', name: 'Confetti Burst', exec: fxConfetti },
  { id: 'cursor_trail', name: 'Cursor Trail', exec: fxCursorTrail },
  { id: 'resize', name: 'Button Resize', exec: fxResize },
  { id: 'rotate', name: 'Button Spin', exec: fxRotate },
  { id: 'ghost', name: 'Ghost Buttons', exec: fxGhostButtons },
  { id: 'glow', name: 'Glow Pulse', exec: fxGlowPulse },
  { id: 'meme', name: 'Meme Popup', exec: fxMemePopup },
];

const MEDIUM_EFFECTS = [
  { id: 'blur', name: 'Reality Blur', exec: fxBlur },
  { id: 'grayscale', name: 'Color Drain', exec: fxGrayscale },
  { id: 'invert', name: 'Inverted World', exec: fxInvert },
  { id: 'glitch', name: 'Glitch Wave', exec: fxGlitch },
  { id: 'layout_shift', name: 'Layout Chaos', exec: fxLayoutShift },
  { id: 'button_move', name: 'Button Run!', exec: fxButtonMove },
  { id: 'fake_popup', name: 'System Alert', exec: fxFakePopup },
  { id: 'fake_loading', name: 'Loading...', exec: fxFakeLoading },
  { id: 'jitter', name: 'Jitter Madness', exec: fxJitter },
];

const RARE_EFFECTS = [
  { id: 'ultimate', name: '⚡ ULTIMATE CHAOS', exec: fxUltimate },
  { id: 'storm', name: '🌪️ CHAOS STORM', exec: fxStorm },
  { id: 'void', name: '🕳️ VOID MODE', exec: fxVoid },
  { id: 'god_glitch', name: '👁️ GOD GLITCH', exec: fxGodGlitch },
  { id: 'multi_combo', name: '💥 MULTI-COMBO', exec: fxMultiCombo },
];

// ─── Cooldown State ───
let _lastMedium = 0;
let _lastRare = 0;
let _cooldownActive = false;
let _chaosLevel = 0;
let _trailActive = false;
let _trailHandler = null;

// ─── Main Trigger ───
export function triggerChaos() {
  const roll = Math.random() * 100;
  let tier, effects, chosen;

  if (roll < 0.8 && canTrigger('rare')) {
    tier = 'rare';
    chosen = pickRandom(RARE_EFFECTS);
    _lastRare = Date.now();
    _chaosLevel = Math.min(100, _chaosLevel + 30);
  } else if (roll < 30 && canTrigger('medium')) {
    tier = 'medium';
    chosen = pickRandom(MEDIUM_EFFECTS);
    _lastMedium = Date.now();
    _chaosLevel = Math.min(100, _chaosLevel + 10);
  } else {
    tier = 'normal';
    chosen = pickRandom(NORMAL_EFFECTS);
    _chaosLevel = Math.min(100, _chaosLevel + 3);
  }

  // Execute primary effect
  chosen.exec();

  // Combo check (10-15%)
  const comboRoll = Math.random() * 100;
  let comboEffects = [];
  if (comboRoll < 12.5) {
    const secondary = pickRandom(NORMAL_EFFECTS);
    if (secondary.id !== chosen.id) {
      setTimeout(() => secondary.exec(), 200);
      comboEffects.push(secondary);
    }
  }

  // Decay chaos over time
  setTimeout(() => { _chaosLevel = Math.max(0, _chaosLevel - 5); }, 3000);

  return {
    tier,
    effect: chosen,
    combo: comboEffects,
    chaosLevel: _chaosLevel
  };
}

// Force a specific tier (admin power)
export function forceEffect(tier) {
  let chosen;
  if (tier === 'rare') {
    chosen = pickRandom(RARE_EFFECTS);
    _chaosLevel = Math.min(100, _chaosLevel + 30);
  } else if (tier === 'medium') {
    chosen = pickRandom(MEDIUM_EFFECTS);
    _chaosLevel = Math.min(100, _chaosLevel + 10);
  } else {
    chosen = pickRandom(NORMAL_EFFECTS);
    _chaosLevel = Math.min(100, _chaosLevel + 3);
  }
  chosen.exec();
  return { tier, effect: chosen, combo: [], chaosLevel: _chaosLevel };
}

export function getChaosLevel() { return _chaosLevel; }

export function getCooldownRemaining(tier) {
  const now = Date.now();
  if (tier === 'rare') {
    const cd = 15000; // 15s
    const elapsed = now - _lastRare;
    return Math.max(0, cd - elapsed);
  }
  if (tier === 'medium') {
    const cd = 7000; // 7s
    const elapsed = now - _lastMedium;
    return Math.max(0, cd - elapsed);
  }
  return 0;
}

export function startCooldown(tier, buttonEl, cooldownBar, cooldownFill) {
  const duration = tier === 'rare' ? (10000 + Math.random() * 10000) : (5000 + Math.random() * 5000);
  if (tier === 'normal') return;

  _cooldownActive = true;
  buttonEl.classList.add('on-cooldown');
  cooldownBar.classList.add('active');
  cooldownFill.style.width = '0%';

  const startTime = Date.now();
  const tick = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(100, (elapsed / duration) * 100);
    cooldownFill.style.width = progress + '%';
    if (elapsed < duration) {
      requestAnimationFrame(tick);
    } else {
      _cooldownActive = false;
      buttonEl.classList.remove('on-cooldown');
      cooldownBar.classList.remove('active');
    }
  };
  requestAnimationFrame(tick);
}

export function isCooldownActive() { return _cooldownActive; }

// ─── Helpers ───
function canTrigger(tier) {
  const now = Date.now();
  if (tier === 'rare') return (now - _lastRare) > 15000;
  if (tier === 'medium') return (now - _lastMedium) > 7000;
  return true;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getContainer() {
  return document.getElementById('fx-container');
}

function addBodyClass(cls, duration) {
  document.body.classList.add(cls);
  setTimeout(() => document.body.classList.remove(cls), duration);
}

function getChaosBtn() {
  return document.getElementById('chaos-btn');
}

// ═══════════════════════════════════════
// NORMAL EFFECTS
// ═══════════════════════════════════════

function fxShake() {
  addBodyClass('fx-shake', 500);
}

function fxColorFlash() {
  addBodyClass('fx-color-flash', 800);
}

function fxGradient() {
  addBodyClass('fx-gradient', 2000);
}

function fxEmojiRain() {
  const container = getContainer();
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'fx-emoji-particle';
      el.textContent = pickRandom(EMOJIS_RAIN);
      
      const size = 1.5 + Math.random() * 2;
      el.style.fontSize = size + 'rem';
      
      const startX = Math.random() * 120 - 10;
      el.style.left = startX + 'vw';
      el.style.top = '-100px';
      
      const duration = 1.5 + Math.random() * 2;
      const rotateStart = (Math.random() - 0.5) * 180;
      const rotateEnd = rotateStart + (Math.random() - 0.5) * 720;
      const drift = (Math.random() - 0.5) * 80;

      el.animate([
        { transform: `translate3d(0, 0, 0) rotate(${rotateStart}deg)`, opacity: 1 },
        { transform: `translate3d(${drift}vw, 120vh, 0) rotate(${rotateEnd}deg)`, opacity: 0 }
      ], {
        duration: duration * 1000,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
      });

      container.appendChild(el);
      setTimeout(() => el.remove(), duration * 1000);
    }, i * 40);
  }
}

function fxConfetti() {
  const container = getContainer();
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'fx-confetti-particle';
    el.style.background = pickRandom(CONFETTI_COLORS);
    
    // Varying shapes
    const shape = Math.random();
    if (shape < 0.3) {
      el.style.borderRadius = '50%';
      el.style.width = el.style.height = (6 + Math.random() * 10) + 'px';
    } else if (shape < 0.6) {
      el.style.width = (4 + Math.random() * 4) + 'px';
      el.style.height = (12 + Math.random() * 20) + 'px';
    } else {
      el.style.width = el.style.height = (8 + Math.random() * 10) + 'px';
    }

    let x = centerX - (parseInt(el.style.width)/2 || 5);
    let y = centerY;
    let vx = (Math.random() - 0.5) * 40;
    let vy = (Math.random() - 0.5) * 40 - 20; // explosive bias upwards
    let rotZ = Math.random() * 360;
    let rotX = Math.random() * 360;
    let rZSpeed = (Math.random() - 0.5) * 20;
    let rXSpeed = (Math.random() - 0.5) * 20;

    container.appendChild(el);

    let time = 0;
    function animateConfetti() {
      if (time > 2500) { el.remove(); return; }
      time += 16;
      
      vy += 0.8; // Gravity
      vx *= 0.96; // Air resistance horizontal
      vy *= 0.98; // Air resistance vertical
      
      x += vx;
      y += vy;
      rotZ += rZSpeed;
      rotX += rXSpeed;

      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotateZ(${rotZ}deg) rotateX(${rotX}deg)`;
      
      if (time > 1800) {
          el.style.opacity = Math.max(0, 1 - (time - 1800) / 700);
      }

      requestAnimationFrame(animateConfetti);
    }
    
    requestAnimationFrame(animateConfetti);
  }
}

function fxCursorTrail() {
  if (_trailActive) return;
  _trailActive = true;
  const container = getContainer();
  _trailHandler = (e) => {
    const dot = document.createElement('div');
    dot.className = 'fx-trail-dot';
    const colors = ['#00f0ff', '#ff006e', '#8b5cf6', '#fbbf24'];
    dot.style.background = pickRandom(colors);
    dot.style.boxShadow = `0 0 8px ${dot.style.background}`;
    dot.style.left = (e.touches ? e.touches[0].clientX : e.clientX) + 'px';
    dot.style.top = (e.touches ? e.touches[0].clientY : e.clientY) + 'px';
    container.appendChild(dot);
    setTimeout(() => dot.remove(), 600);
  };
  document.addEventListener('mousemove', _trailHandler);
  document.addEventListener('touchmove', _trailHandler);
  setTimeout(() => {
    document.removeEventListener('mousemove', _trailHandler);
    document.removeEventListener('touchmove', _trailHandler);
    _trailActive = false;
  }, 3000);
}

function fxResize() {
  const btn = getChaosBtn();
  const big = Math.random() > 0.5;
  btn.classList.add(big ? 'fx-resize' : 'fx-resize-small');
  setTimeout(() => btn.classList.remove('fx-resize', 'fx-resize-small'), 1500);
}

function fxRotate() {
  const btn = getChaosBtn();
  btn.classList.add('fx-rotate');
  setTimeout(() => btn.classList.remove('fx-rotate'), 900);
}

function fxGhostButtons() {
  const container = getContainer();
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const ghost = document.createElement('div');
      ghost.className = 'fx-ghost-btn';
      ghost.textContent = pickRandom(['💥', '⚡', '🌀', '👀']);
      ghost.style.left = (Math.random() * 80 + 10) + 'vw';
      ghost.style.top = (Math.random() * 80 + 10) + 'vh';
      container.appendChild(ghost);
      setTimeout(() => ghost.remove(), 2500);
    }, i * 150);
  }
}

function fxGlowPulse() {
  const btn = getChaosBtn();
  btn.classList.add('fx-glow-pulse');
  setTimeout(() => btn.classList.remove('fx-glow-pulse'), 1700);
}

function fxMemePopup() {
  const container = getContainer();
  const popup = document.createElement('div');
  popup.className = 'fx-meme-popup';
  popup.textContent = pickRandom(MEMES);
  container.appendChild(popup);
  setTimeout(() => popup.remove(), 1800);
}

// ═══════════════════════════════════════
// MEDIUM EFFECTS
// ═══════════════════════════════════════

function fxBlur() {
  addBodyClass('fx-blur', 2000);
}

function fxGrayscale() {
  addBodyClass('fx-grayscale', 2500);
}

function fxInvert() {
  addBodyClass('fx-invert', 1500);
}

function fxGlitch() {
  addBodyClass('fx-glitch', 1500);
}

function fxLayoutShift() {
  addBodyClass('fx-layout-shift', 1500);
}

function fxButtonMove() {
  const wrapper = document.getElementById('chaos-button-wrapper');
  wrapper.classList.add('fx-button-move');
  setTimeout(() => wrapper.classList.remove('fx-button-move'), 1800);
}

function fxFakePopup() {
  const container = getContainer();
  const popup = document.createElement('div');
  popup.className = 'fx-fake-popup';
  popup.innerHTML = `<h3>${pickRandom(['⚠️ Warning', '🔒 Security', '📡 Alert', '🧪 Experiment'])}</h3><p>${pickRandom(FAKE_MESSAGES)}</p>`;
  container.appendChild(popup);
  setTimeout(() => popup.remove(), 2500);
}

function fxFakeLoading() {
  const container = getContainer();
  const overlay = document.createElement('div');
  overlay.className = 'fx-fake-loading';
  overlay.innerHTML = `<div class="spinner"></div><p>${pickRandom(FAKE_LOADING_MSGS)}</p>`;
  container.appendChild(overlay);
  setTimeout(() => overlay.remove(), 3500);
}

function fxJitter() {
  addBodyClass('fx-jitter', 1500);
}

// ═══════════════════════════════════════
// RARE EFFECTS
// ═══════════════════════════════════════

function fxUltimate() {
  addBodyClass('fx-ultimate', 3000);
  fxConfetti();
  fxEmojiRain();
  setTimeout(() => fxShake(), 500);
}

function fxStorm() {
  addBodyClass('fx-storm', 5000);
  let count = 0;
  const interval = setInterval(() => {
    const effect = pickRandom(NORMAL_EFFECTS);
    effect.exec();
    count++;
    if (count > 6) clearInterval(interval);
  }, 600);
}

function fxVoid() {
  addBodyClass('fx-void', 4000);
  // Black hole effect
  const container = getContainer();
  const hole = document.createElement('div');
  hole.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
    width: 0; height: 0; border-radius: 50%; background: radial-gradient(circle, #000 40%, transparent 70%);
    z-index: 210; transition: all 2s ease; pointer-events: none;
  `;
  container.appendChild(hole);
  requestAnimationFrame(() => {
    hole.style.width = '300vmax';
    hole.style.height = '300vmax';
    hole.style.opacity = '0.8';
  });
  setTimeout(() => {
    hole.style.width = '0';
    hole.style.height = '0';
    hole.style.opacity = '0';
    setTimeout(() => hole.remove(), 2000);
  }, 2500);
}

function fxGodGlitch() {
  addBodyClass('fx-god-glitch', 3000);
  fxGlitch();
  setTimeout(() => fxInvert(), 500);
  setTimeout(() => {
    fxEmojiRain();
    fxShake();
  }, 1000);
}

function fxMultiCombo() {
  // Fire 3-5 random effects rapidly
  const count = 3 + Math.floor(Math.random() * 3);
  const all = [...NORMAL_EFFECTS, ...MEDIUM_EFFECTS];
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const effect = pickRandom(all);
      effect.exec();
    }, i * 400);
  }
  fxConfetti();
}
