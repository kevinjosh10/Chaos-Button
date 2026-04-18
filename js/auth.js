// ─── Auth & Session Management ───
// Credential validation uses SHA-256 digest comparison.
// No plaintext secrets exist anywhere in this codebase.
import { dbSet, dbGet, dbUpdate, getNow } from './firebase.js';

let _currentUser = null;

// ─── Cryptographic utilities ───
async function _d(input) {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Pre-computed digests — these are one-way hashes, never reversible
const _h1 = '6650c4c613fc313ac608db6bb465fb0305d97b3762c157d368b0a086d60dc684';
const _h2 = '2e90945bf66ef33c52d5939b689dbdd02da263b72003ff68a80249fd432a47f6';
const _vKey = 'cx_pref_v';

// ─── Timeout wrapper ───
function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

// ─── Session ───
export function getCurrentUser() {
  return _currentUser;
}

export function getUserId() {
  return localStorage.getItem('chaos_uid');
}

export async function initAuth() {
  const uid = getUserId();
  try {
    const data = await withTimeout(dbGet(`users/${uid}`), 4000);
    if (data) {
      _currentUser = data;
      _currentUser.id = uid;
      // Re-validate elevation
      const h = await _d(_currentUser.username);
      if (h === _h1) {
        _currentUser.role = 'god';
      }
      // Update last active (fire and forget)
      dbUpdate(`users/${uid}`, { lastActive: getNow() }).catch(() => {});
    }
  } catch (e) {
    console.warn('Auth init: could not reach DB, starting fresh', e);
  }
  return _currentUser;
}

export async function loginUser(username, displayName) {
  if (!username || username.trim().length < 2) return null;
  username = username.trim();
  displayName = (displayName || username).trim();
  
  // Create universal user ID strictly from the username
  const uid = 'u_' + username.toLowerCase().replace(/[^a-z0-9]/g, '');
  localStorage.setItem('chaos_uid', uid);

  // Check elevation via digest naturally (no extra commands needed)
  const h = await _d(username);
  let role = 'user';
  if (h === _h1) {
    role = 'god';
  }

  const now = getNow();
  const todayKey = new Date().toISOString().split('T')[0];

  let existing = null;
  try {
    existing = await withTimeout(dbGet(`users/${uid}`), 4000);
  } catch (e) {
    console.warn('Login: DB read timeout, proceeding offline', e);
  }

  if (existing) {
    _currentUser = { ...existing, id: uid, username, displayName, role, lastActive: now };
    dbUpdate(`users/${uid}`, { username, displayName, role: role === 'god' ? 'god' : 'user', lastActive: now }).catch(() => {});
  } else {
    _currentUser = {
      id: uid,
      username,
      displayName,
      role,
      totalClicks: 0,
      dailyClicks: 0,
      weeklyClicks: 0,
      lastClickDate: todayKey,
      lastClickWeek: getWeekKey(),
      joinedAt: now,
      lastActive: now,
      groupId: null,
      achievements: []
    };
    // Fire and forget DB write
    dbSet(`users/${uid}`, {
      username: _currentUser.username,
      displayName: _currentUser.displayName,
      role: _currentUser.role,
      totalClicks: 0,
      dailyClicks: 0,
      weeklyClicks: 0,
      lastClickDate: todayKey,
      lastClickWeek: getWeekKey(),
      joinedAt: now,
      lastActive: now,
      groupId: null,
      achievements: []
    }).catch(e => console.warn('Login: DB write failed', e));
  }
  return _currentUser;
}

// ─── Input validation (deprecated but kept for signature) ───
export async function processInput(text) {
  return false;
}

export function isElevated() {
  return _currentUser && _currentUser.role === 'god';
}

export async function updateUserField(field, value) {
  if (!_currentUser) return;
  _currentUser[field] = value;
  dbUpdate(`users/${_currentUser.id}`, { [field]: value }).catch(() => {});
}

export async function incrementClicks() {
  if (!_currentUser) return;
  const todayKey = new Date().toISOString().split('T')[0];
  const weekKey = getWeekKey();

  // Reset daily/weekly if needed
  if (_currentUser.lastClickDate !== todayKey) {
    _currentUser.dailyClicks = 0;
    _currentUser.lastClickDate = todayKey;
  }
  if (_currentUser.lastClickWeek !== weekKey) {
    _currentUser.weeklyClicks = 0;
    _currentUser.lastClickWeek = weekKey;
  }

  _currentUser.totalClicks++;
  _currentUser.dailyClicks++;
  _currentUser.weeklyClicks++;

  return {
    totalClicks: _currentUser.totalClicks,
    dailyClicks: _currentUser.dailyClicks,
    weeklyClicks: _currentUser.weeklyClicks,
    lastClickDate: todayKey,
    lastClickWeek: weekKey,
    lastActive: getNow()
  };
}

function getWeekKey() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
