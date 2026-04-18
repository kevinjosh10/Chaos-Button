// ─── Analytics & Metrics Module ───
// This module handles advanced analytics dashboard rendering
// and metric collection for power users.
import { dbGet, dbPush, dbSet, dbListen, dbOff, dbUpdate, getNow } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { forceEffect } from './chaos-engine.js';

let _panelEl = null;
let _activityRef = null;
let _usersRef = null;

function _v() {
  const u = getCurrentUser();
  return u && u.role === 'god';
}

export function renderDashboard() {
  if (!_v()) return;
  if (_panelEl) { _panelEl.remove(); }

  _panelEl = document.createElement('div');
  _panelEl.className = 'panel-overlay';
  _panelEl.id = 'metrics-panel';
  _panelEl.innerHTML = `
    <div class="panel-header">
      <h2>👑 Command Center</h2>
      <button class="panel-close" id="mp-close">✕</button>
    </div>
    <div class="panel-body">
      <div class="panel-card">
        <h4>Live Stats</h4>
        <div class="panel-stat-row">
          <div class="panel-stat"><span class="val" id="mp-users">0</span><label>Users</label></div>
          <div class="panel-stat"><span class="val" id="mp-clicks">0</span><label>Total</label></div>
          <div class="panel-stat"><span class="val" id="mp-online">0</span><label>Active</label></div>
        </div>
      </div>

      <div class="panel-card">
        <h4>Powers</h4>
        <div class="panel-btn-row">
          <button class="panel-btn warning" id="mp-global-chaos">🌪️ Global Chaos</button>
          <button class="panel-btn danger" id="mp-force-rare">⚡ Force Rare</button>
        </div>
        <div class="panel-btn-row" style="margin-top:0.5rem;">
          <button class="panel-btn" id="mp-force-medium">🟡 Force Medium</button>
          <button class="panel-btn" id="mp-force-storm">💀 Force Storm</button>
        </div>
        <div class="panel-btn-row" style="margin-top:1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
          <button class="panel-btn" id="mp-nuke-db" style="background: var(--color-error); width: 100%;">🚨 FACTORY RESET DATABASE</button>
        </div>
      </div>

      <div class="panel-card">
        <h4>Announcement</h4>
        <input type="text" class="panel-input" id="mp-ann-input" placeholder="Type announcement..." maxlength="200">
        <div class="panel-btn-row">
          <button class="panel-btn warning" id="mp-ann-send">📢 Broadcast</button>
          <button class="panel-btn danger" id="mp-ann-clear">🗑️ Clear All</button>
        </div>
      </div>

      <div class="panel-card">
        <h4>Activity Log</h4>
        <div class="panel-log" id="mp-activity-log"></div>
      </div>

      <div class="panel-card">
        <h4>Rare Event Log</h4>
        <div class="panel-log" id="mp-rare-log"></div>
      </div>
    </div>
  `;

  document.body.appendChild(_panelEl);
  _bindEvents();
  _loadData();
}

function _bindEvents() {
  document.getElementById('mp-close').addEventListener('click', closeDashboard);

  document.getElementById('mp-global-chaos').addEventListener('click', async () => {
    if (!_v()) return;
    // Trigger multiple effects
    for (let i = 0; i < 5; i++) {
      setTimeout(() => forceEffect('normal'), i * 300);
    }
    forceEffect('medium');
    await _logActivity('🌪️ Global Chaos triggered by admin');
  });

  document.getElementById('mp-force-rare').addEventListener('click', async () => {
    if (!_v()) return;
    forceEffect('rare');
    await _logActivity('⚡ Rare event forced by admin');
  });

  document.getElementById('mp-force-medium').addEventListener('click', async () => {
    if (!_v()) return;
    forceEffect('medium');
    await _logActivity('🟡 Medium event forced by admin');
  });

  document.getElementById('mp-force-storm').addEventListener('click', async () => {
    if (!_v()) return;
    // Trigger chaos storm
    const effects = ['rare', 'medium', 'medium', 'normal', 'normal'];
    effects.forEach((tier, i) => {
      setTimeout(() => forceEffect(tier), i * 500);
    });
    await _logActivity('💀 Chaos storm unleashed by admin');
  });

  document.getElementById('mp-ann-send').addEventListener('click', async () => {
    if (!_v()) return;
    const input = document.getElementById('mp-ann-input');
    const text = input.value.trim();
    if (!text) return;
    await postAnnouncement(text);
    input.value = '';
  });

  document.getElementById('mp-ann-clear').addEventListener('click', async () => {
    if (!_v()) return;
    await dbSet('announcements', null);
  });

  document.getElementById('mp-nuke-db').addEventListener('click', async () => {
    if (!_v()) return;
    const confirmChoice = window.confirm("WARNING: This will permanently wipe ALL users, clicks, leaderboards, groups, and chat logs. Are you completely sure?");
    if (confirmChoice) {
      document.getElementById('mp-nuke-db').textContent = 'WIPING...';
      try {
        await dbSet('users', null);
        await dbSet('leaderboards', null);
        await dbSet('messages', null);
        await dbSet('activityLogs', null);
        await dbSet('groups', null);
        await dbSet('globalStats', null);
        await dbSet('announcements', null);
        alert("Database wiped completely. Taking you back to login.");
        window.location.reload();
      } catch (e) {
        alert("Error wiping DB: " + e.message);
        document.getElementById('mp-nuke-db').textContent = '🚨 FACTORY RESET DATABASE';
      }
    }
  });
}

async function _loadData() {
  // Count users
  const users = await dbGet('users');
  if (users) {
    const userCount = Object.keys(users).length;
    const totalClicks = Object.values(users).reduce((s, u) => s + (u.totalClicks || 0), 0);
    
    // Get real-time online status
    const statusObj = await dbGet('status');
    let activeCount = 0;
    if (statusObj) {
      activeCount = Object.values(statusObj).filter(s => s.state === 'online').length;
    } else {
      // Fallback
      const now = Date.now();
      activeCount = Object.values(users).filter(u => now - (u.lastActive || 0) < 300000).length;
    }

    const usersEl = document.getElementById('mp-users');
    const clicksEl = document.getElementById('mp-clicks');
    const onlineEl = document.getElementById('mp-online');
    if (usersEl) usersEl.textContent = userCount;
    if (clicksEl) clicksEl.textContent = totalClicks;
    if (onlineEl) onlineEl.textContent = activeCount;
  }

  // Load activity logs
  const logs = await dbGet('activityLogs');
  if (logs) {
    const logEl = document.getElementById('mp-activity-log');
    const rareLogEl = document.getElementById('mp-rare-log');
    if (!logEl || !rareLogEl) return;

    const entries = Object.values(logs).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 30);
    logEl.innerHTML = '';
    rareLogEl.innerHTML = '';

    entries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'panel-log-item' + (entry.tier === 'rare' ? ' rare' : '');
      const time = new Date(entry.timestamp).toLocaleTimeString();
      item.textContent = `[${time}] ${entry.username}: ${entry.event}`;
      logEl.appendChild(item);

      if (entry.tier === 'rare') {
        const rareItem = item.cloneNode(true);
        rareLogEl.appendChild(rareItem);
      }
    });
  }
}

async function _logActivity(text) {
  const user = getCurrentUser();
  await dbPush('activityLogs', {
    userId: user?.id || 'admin',
    username: user?.username || 'Admin',
    event: text,
    tier: 'system',
    timestamp: getNow()
  });
}

export async function postAnnouncement(text) {
  const user = getCurrentUser();
  if (!_v()) return;

  await dbPush('announcements', {
    text,
    author: user?.username || 'Admin',
    timestamp: getNow(),
    active: true
  });
}

export function closeDashboard() {
  if (_panelEl) {
    _panelEl.remove();
    _panelEl = null;
  }
}

export function isDashboardOpen() {
  return _panelEl !== null;
}

// ─── Add nav button for elevated users ───
export function injectNavButton() {
  if (!_v()) return;
  const nav = document.getElementById('bottom-nav');
  if (!nav || document.getElementById('nav-metrics')) return;

  const btn = document.createElement('button');
  btn.className = 'nav-btn';
  btn.id = 'nav-metrics';
  btn.setAttribute('data-page', 'metrics');
  btn.innerHTML = `<span class="nav-icon">👑</span><span class="nav-label">Panel</span>`;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    renderDashboard();
  });
  nav.appendChild(btn);
}
