// ─── Performance Utilities ───
// Debounce, batch writes, effect cleanup

import { dbUpdate } from './firebase.js';

// ─── Click Debounce ───
const MIN_CLICK_INTERVAL = 200; // ms
let _lastClickTime = 0;

export function canClick() {
  const now = Date.now();
  if (now - _lastClickTime < MIN_CLICK_INTERVAL) return false;
  _lastClickTime = now;
  return true;
}

// ─── Batch DB Writes ───
const _writeQueue = {};
let _flushTimer = null;
const FLUSH_INTERVAL = 2000; // 2 seconds

export function batchWrite(path, data) {
  _writeQueue[path] = { ...(_writeQueue[path] || {}), ...data };
  if (!_flushTimer) {
    _flushTimer = setTimeout(flushBatch, FLUSH_INTERVAL);
  }
}

export async function flushBatch() {
  if (_flushTimer) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }
  const paths = Object.keys(_writeQueue);
  if (paths.length === 0) return;

  const promises = paths.map(path => {
    const data = _writeQueue[path];
    delete _writeQueue[path];
    return dbUpdate(path, data).catch(err => {
      console.warn('Batch write failed for', path, err);
    });
  });

  await Promise.allSettled(promises);
}

// ─── Effect Cleanup ───
export function cleanupEffects() {
  const container = document.getElementById('fx-container');
  if (!container) return;
  // Remove particles that have finished their animations
  const particles = container.querySelectorAll('[class*="fx-"]');
  particles.forEach(p => {
    const animations = p.getAnimations();
    if (animations.length === 0) {
      p.remove();
    }
  });
}

// Periodic cleanup
let _cleanupInterval = null;
export function startCleanupCycle() {
  if (_cleanupInterval) return;
  _cleanupInterval = setInterval(cleanupEffects, 5000);
}

export function stopCleanupCycle() {
  if (_cleanupInterval) {
    clearInterval(_cleanupInterval);
    _cleanupInterval = null;
  }
}

// ─── General Debounce ───
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Throttle ───
export function throttle(fn, limit) {
  let inThrottle = false;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ─── Flush on page unload ───
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushBatch();
  });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushBatch();
    }
  });
}
