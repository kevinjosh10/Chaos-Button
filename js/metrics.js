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
        <h4>Powers (Global Broadcast)</h4>
        <div class="panel-btn-row">
          <button class="panel-btn warning" id="mp-global-chaos">🌪️ Global Chaos</button>
          <button class="panel-btn danger" id="mp-force-rare">⚡ Force Rare</button>
        </div>
        <div class="panel-btn-row" style="margin-top:0.5rem;">
          <button class="panel-btn" id="mp-force-medium">🟡 Force Medium</button>
          <button class="panel-btn" id="mp-force-storm">💀 Force Storm</button>
        </div>
        <div class="panel-btn-row" style="margin-top:0.5rem;">
          <button class="panel-btn" id="mp-normalize" style="background:#10b981; width:100%;">🟢 Normalize (Cancel All Effects)</button>
        </div>
        <div class="panel-btn-row" style="margin-top:1rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top:1rem;">
          <button class="panel-btn" id="mp-nuke-global" style="background:var(--color-error); width:100%; border:2px solid #fff; font-weight:bold; color:black; text-shadow:none;">☢️ LAUNCH NUKE</button>
        </div>
      </div>
      
      <div class="panel-card">
        <h4>👁️ Omni-Sight (Spy Groups)</h4>
        <button class="panel-btn primary" id="mp-load-groups" style="width:100%; margin-bottom: 1rem;">Load Active Factions</button>
        <div id="mp-groups-list" style="max-height: 150px; overflow-y: auto; margin-bottom: 1rem;"></div>
        <div id="mp-spy-chat" class="panel-log" style="height: 200px; display:none; flex-direction:column; background: #000; border: 1px solid #333;"></div>
      </div>

      <div class="panel-card">
        <h4>Granular Wipes</h4>
        <div class="panel-btn-row" style="margin-bottom:0.5rem;">
          <button class="panel-btn danger" id="mp-clear-lb">🏆 Clear Leaderboards</button>
          <button class="panel-btn danger" id="mp-clear-log">📜 Clear Activity</button>
        </div>
        <div class="panel-btn-row" style="margin-bottom:0.5rem;">
          <button class="panel-btn danger" id="mp-clear-users">👥 Delete Users</button>
          <button class="panel-btn danger" id="mp-clear-clicks">🎯 Reset Clicks</button>
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
    const user = getCurrentUser();
    dbPush('adminCommands', { type: 'force_effect', tier: 'global_chaos', senderId: user.id, timestamp: getNow() });
    await _logActivity('🌪️ Global Chaos globally broadcasted by admin');
  });

  document.getElementById('mp-force-rare').addEventListener('click', async () => {
    if (!_v()) return;
    const user = getCurrentUser();
    dbPush('adminCommands', { type: 'force_effect', tier: 'rare', senderId: user.id, timestamp: getNow() });
    await _logActivity('⚡ Rare event globally broadcasted by admin');
  });

  document.getElementById('mp-force-medium').addEventListener('click', async () => {
    if (!_v()) return;
    const user = getCurrentUser();
    dbPush('adminCommands', { type: 'force_effect', tier: 'medium', senderId: user.id, timestamp: getNow() });
    await _logActivity('🟡 Medium event globally broadcasted by admin');
  });

  document.getElementById('mp-force-storm').addEventListener('click', async () => {
    if (!_v()) return;
    const user = getCurrentUser();
    dbPush('adminCommands', { type: 'force_effect', tier: 'storm', senderId: user.id, timestamp: getNow() });
    await _logActivity('💀 Chaos storm globally broadcasted by admin');
  });

  document.getElementById('mp-normalize').addEventListener('click', async () => {
    if (!_v()) return;
    const user = getCurrentUser();
    dbPush('adminCommands', { type: 'normalize', senderId: user.id, timestamp: getNow() });
    await _logActivity('🟢 Normalized all client effects globally');
  });

  document.getElementById('mp-nuke-global').addEventListener('click', async () => {
    if (!_v()) return;
    if (!confirm("Launch nuclear strike against all clients?")) return;
    const user = getCurrentUser();
    dbPush('adminCommands', { type: 'force_effect', tier: 'nuke', senderId: user.id, timestamp: getNow() });
    await _logActivity('☢️ NUKE launched globally by admin');
  });

  // Omni-sight logic
  let _spyListener = null;
  document.getElementById('mp-load-groups').addEventListener('click', async () => {
     if (!_v()) return;
     const list = document.getElementById('mp-groups-list');
     const chatBox = document.getElementById('mp-spy-chat');
     list.innerHTML = 'Loading...';
     
     import('./social.js').then(async ({ getAllGroups }) => {
       const groups = await getAllGroups();
       if (!groups || Object.keys(groups).length === 0) {
         list.innerHTML = 'No active groups.';
         return;
       }
       
       list.innerHTML = Object.entries(groups).map(([gid, g]) => {
          return `<div class="panel-btn" style="background:#222; text-align:left; margin-bottom:4px; font-size:0.8rem; padding:6px; cursor:pointer;" onclick="window.spyGroup('${gid}', '${g.name ? g.name.replace(/'/g, "\\\\'") : gid}')">👁️ ${g.name || gid} (${Object.keys(g.members||{}).length} users)</div>`;
       }).join('');
     });
  });
  
  window.spyGroup = (groupId, groupName) => {
     if (_spyListener) dbOff(_spyListener);
     const chatBox = document.getElementById('mp-spy-chat');
     chatBox.style.display = 'flex';
     chatBox.innerHTML = `<div style="padding:4px; background:#111; border-bottom:1px solid #333; font-weight:bold; color:var(--color-primary); flex-shrink:0;">Wiretapping: ${groupName}</div><div id="mp-spy-msgs" style="flex:1; overflow-y:auto; padding:4px;"></div>`;
     
     const msgsEl = document.getElementById('mp-spy-msgs');
     import('./firebase.js').then(({ dbListenChildAdded }) => {
       _spyListener = dbListenChildAdded(`messages/${groupId}`, (key, msg) => {
          const m = document.createElement('div');
          m.style.fontSize = '0.75rem';
          m.style.marginBottom = '2px';
          if (msg.type === 'system') {
             m.style.color = '#888';
             m.textContent = msg.text;
          } else {
             m.innerHTML = `<strong style="color:#aaa;">${msg.displayName||msg.username}:</strong> <span style="color:#fff;">${msg.text}</span>`;
          }
          msgsEl.appendChild(m);
          msgsEl.scrollTop = msgsEl.scrollHeight;
       });
     });
  };

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

  async function broadcastReload() {
    dbPush('adminCommands', { type: 'reload', timestamp: getNow() });
  }

  document.getElementById('mp-clear-lb').addEventListener('click', async () => {
    if (!_v()) return;
    if (confirm("Wipe all leaderboards?")) {
      await dbSet('leaderboards', null);
      broadcastReload();
    }
  });

  document.getElementById('mp-clear-log').addEventListener('click', async () => {
    if (!_v()) return;
    if (confirm("Wipe activity feed?")) {
      await dbSet('activityLogs', null);
      broadcastReload();
    }
  });

  document.getElementById('mp-clear-users').addEventListener('click', async () => {
    if (!_v()) return;
    if (confirm("Delete ALL users and force log out?")) {
      await dbSet('users', null);
      broadcastReload();
    }
  });

  document.getElementById('mp-clear-clicks').addEventListener('click', async () => {
    if (!_v()) return;
    if (confirm("Reset everyone's clicks to 0 without deleting accounts?")) {
      const users = await dbGet('users');
      if (users) {
        Object.keys(users).forEach(uid => {
          dbUpdate(`users/${uid}`, { totalClicks: 0, dailyClicks: 0, weeklyClicks: 0 }).catch(() => {});
        });
      }
      await dbSet('globalStats', null);
      await dbSet('leaderboards', null);
      broadcastReload();
    }
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
        broadcastReload(); // Broadcast reload instead of local reload to refresh all clients
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
    author: '👁️ GOD',
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
