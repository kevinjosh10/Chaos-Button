// ─── Main App Controller ───
import { dbPush, dbUpdate, dbGet, getNow, getTodayKey, getWeekKey } from './firebase.js';
import { initAuth, loginUser, getCurrentUser, processInput, isElevated, incrementClicks, getUserId } from './auth.js';
import { triggerChaos, getChaosLevel, startCooldown, isCooldownActive, forceEffect } from './chaos-engine.js';
import { createGroup, joinGroup, sendMessage, listenMessages, stopMessageListener, getGroupInfo, renameGroup } from './social.js';
import { updateLeaderboard, listenLeaderboard, stopLeaderboardListener, checkAchievements, getAllAchievements } from './gamification.js';
import { injectNavButton, renderDashboard } from './metrics.js';
import { listenAnnouncements, listenGlobalClicks, stopAllListeners, listenAdminCommands, listenAllOnlineStatus, listenUserCommands } from './realtime.js';
import { canClick, batchWrite, flushBatch, startCleanupCycle } from './performance.js';

// ─── DOM References ───
const $ = id => document.getElementById(id);
const BOOT_TIME = Date.now();

// Screens
const loginScreen = $('login-screen');
const appScreen = $('app');

// Login
const usernameInput = $('username-input');
const displayNameInput = $('displayname-input');
const loginBtn = $('login-btn');

// Home
const chaosBtn = $('chaos-btn');
const cooldownBar = $('cooldown-bar');
const cooldownFill = $('cooldown-fill');
const totalClicksEl = $('total-clicks');
const globalClicksEl = $('global-clicks');
const chaosFill = $('chaos-fill');
const chaosLevelText = $('chaos-level-text');
const eventFeed = $('event-feed');

// Leaderboard
const lbTabs = $('lb-tabs');
const lbList = $('leaderboard-list');

// Chat
const chatMessages = $('chat-messages');
const chatInput = $('chat-input');
const sendBtn = $('send-btn');
const groupIdDisplay = $('group-id-display');

// Profile
const profileAvatar = $('profile-avatar');
const profileName = $('profile-name');
const profileRole = $('profile-role');
const pTotal = $('p-total');
const pDaily = $('p-daily');
const pRank = $('p-rank');
const pGroupId = $('p-group-id');
const copyGroupBtn = $('copy-group-btn');
const joinGroupInput = $('join-group-input');
const joinGroupBtn = $('join-group-btn');
const createGroupBtn = $('create-group-btn');
const achievementsGrid = $('achievements-grid');

// Announcement
const announcementBanner = $('announcement-banner');
const announcementText = $('announcement-text');
const closeAnnouncement = $('close-announcement');

// Achievement toast
const achToast = $('achievement-toast');
const achTitle = $('ach-title');
const achDesc = $('ach-desc');

// Nav
const bottomNav = $('bottom-nav');

// ─── State ───
let currentTab = 'home';
let currentLbPeriod = 'daily';
let messageCount = 0;
let globalTotalClicks = 0;

// ═══════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════

async function init() {
  // Try to restore session
  const user = await initAuth();
  if (user) {
    showApp(user);
  }
  bindLoginEvents();
  startCleanupCycle();
}

function bindLoginEvents() {
  loginBtn.addEventListener('click', handleLogin);
  usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  displayNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') usernameInput.focus();
  });
}

async function handleLogin() {
  const username = usernameInput.value.trim();
  const displayName = displayNameInput.value.trim();
  if (username.length < 2 || displayName.length < 2) {
    if (username.length < 2) usernameInput.style.borderColor = '#ef4444';
    if (displayName.length < 2) displayNameInput.style.borderColor = '#ef4444';
    setTimeout(() => { usernameInput.style.borderColor = ''; displayNameInput.style.borderColor = ''; }, 1000);
    return;
  }

  loginBtn.innerHTML = '<span>Loading...</span>';
  loginBtn.disabled = true;

  const user = await loginUser(username, displayName);
  if (user) {
    showApp(user);
    if (user.role === 'god') {
      dbPush('announcements', {
        text: 'ONLINE NOW. PREPARE FOR CHAOS.',
        author: '👁️ GOD IS HERE',
        timestamp: getNow(),
        active: true
      }).catch(() => {});
    }
  } else {
    loginBtn.innerHTML = '<span>ENTER THE CHAOS</span>';
    loginBtn.disabled = false;
  }
}

function showApp(user) {
  loginScreen.classList.remove('active');
  appScreen.classList.add('active');

  updateProfileUI(user);
  bindAppEvents();
  startRealtimeListeners();
  setupChat(user);
  renderAchievements(user);

  // Inject elevated nav if applicable
  if (isElevated()) {
    injectNavButton();
  }

  // Update global click counter
  updateGlobalClicks();
}

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════

function bindAppEvents() {
  // Bottom nav
  bottomNav.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page === 'metrics') return; // handled by metrics module
      navigateTo(page);
    });
  });

  // Chaos button
  chaosBtn.addEventListener('click', handleChaosClick);

  // Leaderboard tabs
  lbTabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      lbTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentLbPeriod = tab.dataset.tab;
      loadLeaderboard(currentLbPeriod);
    });
  });

  // Chat
  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });

  // Profile - Group
  createGroupBtn.addEventListener('click', handleCreateGroup);
  joinGroupBtn.addEventListener('click', handleJoinGroup);
  copyGroupBtn.addEventListener('click', handleCopyGroupId);
  $('rename-group-btn').addEventListener('click', async () => {
    const user = getCurrentUser();
    if (!user || !user.groupId) return;
    const newName = prompt("Enter new faction name:", "");
    if (newName && newName.trim().length > 2) {
      const res = await renameGroup(user.groupId, newName.trim());
      if (res) updateProfileUI(user);
    }
  });

  // Announcement close
  closeAnnouncement.addEventListener('click', () => {
    announcementBanner.classList.add('hidden');
  });
}

function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(`page-${page}`).classList.add('active');

  // Update nav
  bottomNav.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  currentTab = page;

  // Load data for the page
  if (page === 'leaderboard') {
    loadLeaderboard(currentLbPeriod);
  }
  if (page === 'profile') {
    const user = getCurrentUser();
    if (user) updateProfileUI(user);
  }
}

// ═══════════════════════════════════════
// CHAOS BUTTON
// ═══════════════════════════════════════

async function handleChaosClick() {
  if (!canClick() || isCooldownActive()) return;

  const user = getCurrentUser();
  if (!user) return;

  // Trigger chaos effect
  const result = triggerChaos();

  // Increment clicks
  const updates = await incrementClicks();
  if (updates) {
    batchWrite(`users/${user.id}`, updates);
  }

  // Update UI
  totalClicksEl.textContent = user.totalClicks;
  updateChaosIndicator(result.chaosLevel);

  // Add to feed
  addFeedItem(result);

  // Log activity
  dbPush('activityLogs', {
    userId: user.id,
    username: user.displayName || user.username,
    event: result.effect.name,
    tier: result.tier,
    timestamp: getNow()
  }).catch(() => {});

  // Start cooldown for medium/rare
  if (result.tier !== 'normal') {
    startCooldown(result.tier, chaosBtn, cooldownBar, cooldownFill);
  }

  // Announce Rare effects automatically
  if (result.tier === 'rare') {
    dbPush('announcements', {
      text: `🔥 ${user.displayName} just triggered a RARE chaos event!`,
      author: 'System',
      timestamp: getNow(),
      active: true
    }).catch(() => {});
  }

  // Update leaderboard (batched)
  updateLeaderboard(user.id, user.displayName || user.username, user.totalClicks).catch(() => {});

  // Update global counter
  globalTotalClicks++;
  globalClicksEl.textContent = formatNumber(globalTotalClicks);
  dbUpdate('globalStats', { totalClicks: globalTotalClicks }).catch(() => {});

  // Check achievements
  const newAch = checkAchievements(user, {
    tier: result.tier,
    effect: result.effect,
    combo: result.combo,
    messageCount
  });
  if (newAch.length > 0) {
    showAchievementToast(newAch[0]);
    batchWrite(`users/${user.id}`, { achievements: user.achievements });
    renderAchievements(user);
  }
}

function addFeedItem(result) {
  const item = document.createElement('div');
  item.className = `feed-item ${result.tier}`;
  const prefix = result.tier === 'rare' ? '🔥 ' : result.tier === 'medium' ? '⚡ ' : '';
  item.textContent = `${prefix}${result.effect.name}${result.combo.length > 0 ? ' + COMBO!' : ''}`;
  eventFeed.insertBefore(item, eventFeed.firstChild);

  // Keep max 10 items
  while (eventFeed.children.length > 10) {
    eventFeed.removeChild(eventFeed.lastChild);
  }
}

function updateChaosIndicator(level) {
  chaosFill.style.width = level + '%';
  let text = 'Calm';
  if (level > 80) text = '☠️ MAXIMUM';
  else if (level > 60) text = '🔥 Inferno';
  else if (level > 40) text = '⚡ Intense';
  else if (level > 20) text = '🌀 Rising';
  chaosLevelText.textContent = text;
}

// ═══════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════

function loadLeaderboard(period) {
  listenLeaderboard(period, (entries) => {
    renderLeaderboard(entries);
  });
}

function renderLeaderboard(entries) {
  if (!entries || entries.length === 0) {
    lbList.innerHTML = '<div class="lb-empty">No data yet. Start clicking!</div>';
    return;
  }

  const user = getCurrentUser();
  lbList.innerHTML = entries.map((entry, i) => {
    const rank = i + 1;
    const topClass = rank <= 3 ? ` top-${rank}` : '';
    const medals = ['🥇', '🥈', '🥉'];
    const initial = (entry.displayName || entry.username || '?')[0].toUpperCase();
    const isMe = entry.id === user?.id;
    return `
      <div class="lb-item${topClass}${isMe ? ' own' : ''}">
        <span class="lb-rank">${rank <= 3 ? medals[rank - 1] : '#' + rank}</span>
        <div class="lb-avatar">${initial}</div>
        <div class="lb-info">
          <div class="lb-name">${escapeHtml(entry.displayName || entry.username)}${isMe ? ' (You)' : ''}</div>
        </div>
        <span class="lb-clicks">${formatNumber(entry.clicks)}</span>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════
// CHAT
// ═══════════════════════════════════════

function setupChat(user) {
  if (user.groupId) {
    startChatListener(user.groupId);
    groupIdDisplay.textContent = user.groupId;
    pGroupId.textContent = user.groupId;
  }
}

function startChatListener(groupId) {
  chatMessages.innerHTML = ''; // Clear
  listenMessages(groupId, (key, msg) => {
    appendMessage(msg);
  });
}

function appendMessage(msg) {
  const user = getCurrentUser();
  const isOwn = msg.userId === user?.id;
  const isSystem = msg.type === 'system';

  const el = document.createElement('div');
  el.className = `msg ${isSystem ? 'system' : isOwn ? 'own' : 'other'}`;

  if (isSystem) {
    el.textContent = msg.text;
  } else {
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    el.innerHTML = `
      ${!isOwn ? `<div class="msg-author">${escapeHtml(msg.displayName || msg.username)}</div>` : ''}
      <div class="msg-text">${escapeHtml(msg.text)}</div>
      <div class="msg-time">${time}</div>
    `;
  }

  // Remove empty state
  const empty = chatMessages.querySelector('.chat-empty');
  if (empty) empty.remove();

  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function handleSendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  const user = getCurrentUser();
  if (!user) return;

  // Check for special input
  const result = await processInput(text);
  if (result === 'elevated') {
    chatInput.value = '';
    // Show subtle confirmation
    const toast = document.createElement('div');
    toast.className = 'feed-item rare';
    toast.textContent = '✨ Something has changed...';
    toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999;padding:1rem 2rem;font-size:1rem;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
    return;
  }

  if (!user.groupId) {
    // Show hint to create/join group
    chatMessages.innerHTML = '<div class="chat-empty">Create or join a group first! Go to Profile → Group.</div>';
    chatInput.value = '';
    return;
  }

  await sendMessage(text);
  chatInput.value = '';
  messageCount++;
}

// ═══════════════════════════════════════
// PROFILE & GROUPS
// ═══════════════════════════════════════

function updateProfileUI(user) {
  if (!user) return;
  const initial = (user.displayName || user.username || '?')[0].toUpperCase();
  profileAvatar.textContent = initial;
  profileName.textContent = user.displayName || user.username;

  if (isElevated()) {
    profileRole.textContent = '👑 ADMIN';
    profileRole.classList.remove('hidden');
  }

  pTotal.textContent = formatNumber(user.totalClicks || 0);
  pDaily.textContent = formatNumber(user.dailyClicks || 0);
  totalClicksEl.textContent = formatNumber(user.totalClicks || 0);

  const renameBtn = $('rename-group-btn');
  const membersEl = $('p-group-members');
  const membersCountEl = $('p-group-members-count');
  const joinActions = $('group-join-actions');
  
  if (user.groupId) {
    pGroupId.textContent = "Loading...";
    
    getGroupInfo(user.groupId).then(g => {
      if (g) {
        pGroupId.textContent = g.name || user.groupId;
        groupIdDisplay.textContent = g.name || user.groupId;
        if (joinActions) joinActions.classList.add('hidden');
        
        if (g.createdBy === user.id) {
           renameBtn.classList.remove('hidden');
        } else {
           renameBtn.classList.add('hidden');
        }
        
        const memIds = Object.keys(g.members || {});
        membersCountEl.textContent = `(${memIds.length} members)`;
        membersEl.textContent = `Group ID: ${user.groupId}`;
      } else {
        pGroupId.textContent = user.groupId;
        groupIdDisplay.textContent = user.groupId;
      }
    });

  } else {
    pGroupId.textContent = 'No group';
    groupIdDisplay.textContent = 'No Group';
    membersCountEl.textContent = '';
    membersEl.textContent = '';
    renameBtn.classList.add('hidden');
    if (joinActions) joinActions.classList.remove('hidden');
  }
}

async function handleCreateGroup() {
  const groupId = await createGroup();
  if (groupId) {
    pGroupId.textContent = groupId;
    groupIdDisplay.textContent = groupId;
    startChatListener(groupId);
    navigateTo('chat');

    // Check group achievement
    const user = getCurrentUser();
    const newAch = checkAchievements(user);
    if (newAch.length > 0) {
      showAchievementToast(newAch[0]);
      batchWrite(`users/${user.id}`, { achievements: user.achievements });
      renderAchievements(user);
    }
  }
}

async function handleJoinGroup() {
  const groupId = joinGroupInput.value.trim();
  if (!groupId) return;

  const success = await joinGroup(groupId);
  if (success) {
    pGroupId.textContent = groupId;
    groupIdDisplay.textContent = groupId;
    joinGroupInput.value = '';
    startChatListener(groupId);
    navigateTo('chat');
  } else {
    joinGroupInput.style.borderColor = '#ef4444';
    setTimeout(() => joinGroupInput.style.borderColor = '', 1000);
  }
}

function handleCopyGroupId() {
  const user = getCurrentUser();
  if (!user?.groupId) return;
  navigator.clipboard.writeText(user.groupId).then(() => {
    copyGroupBtn.textContent = '✅ Copied!';
    setTimeout(() => copyGroupBtn.textContent = '📋 Copy', 1500);
  }).catch(() => {});
}

// ═══════════════════════════════════════
// ACHIEVEMENTS
// ═══════════════════════════════════════

function renderAchievements(user) {
  const all = getAllAchievements();
  const unlocked = user?.achievements || [];

  achievementsGrid.innerHTML = all.map(ach => {
    const isUnlocked = unlocked.includes(ach.id);
    return `
      <div class="ach-item ${isUnlocked ? 'unlocked' : 'locked'}" title="${ach.desc}">
        <span class="ach-emoji">${ach.emoji}</span>
        <span>${isUnlocked ? ach.name : '???'}</span>
      </div>
    `;
  }).join('');
}

function showAchievementToast(ach) {
  achTitle.textContent = `🏅 ${ach.name}`;
  achDesc.textContent = ach.desc;
  achToast.classList.add('show');
  setTimeout(() => achToast.classList.remove('show'), 3500);
}

// ═══════════════════════════════════════
// REALTIME LISTENERS
// ═══════════════════════════════════════

function startRealtimeListeners() {
  // Announcements
  listenAnnouncements((announcement) => {
    if (announcement && announcement.text) {
      if (announcement.author.includes('GOD')) {
        announcementText.innerHTML = `<span style="font-weight:900; color: #fff; text-shadow: 0 0 10px #fff, 0 0 20px #00f0ff;">${announcement.author}:</span> <span style="font-style: italic; letter-spacing: 1px;">${announcement.text}</span>`;
        announcementBanner.style.background = 'linear-gradient(45deg, rgba(255,0,110,0.8), rgba(0,240,255,0.8))';
        announcementBanner.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.5)';
      } else {
        announcementText.textContent = `[${announcement.author}] ${announcement.text}`;
        announcementBanner.style.background = 'rgba(0, 0, 0, 0.4)';
        announcementBanner.style.boxShadow = 'none';
      }
      announcementBanner.classList.remove('hidden');
    } else {
      announcementBanner.classList.add('hidden');
    }
  });

  // Global clicks
  listenGlobalClicks((count) => {
    globalTotalClicks = count;
    globalClicksEl.textContent = formatNumber(count);
  });

  // Targeted Attacks
  const user = getCurrentUser();
  if (user) {
    listenUserCommands(user.id, (data, key) => {
       if (!data) return;
       if (data.timestamp && data.timestamp < BOOT_TIME) return;
       if (user.role === 'god') return; // God immunity
       
       if (data.type === 'targeted_effect' && data.tier) {
         forceEffect(data.tier);
         
         const toast = document.createElement('div');
         toast.className = 'achievement-toast show';
         toast.innerHTML = `<span class="ach-icon">🎯</span><div class="ach-info"><strong>Rival Strike</strong><span>${escapeHtml(data.senderName)} sent ${data.tier} chaos!</span></div>`;
         document.body.appendChild(toast);
         setTimeout(() => { toast.classList.remove('show'); setTimeout(()=>toast.remove(), 500); }, 3000);
       }
    });
  }

  // Live Players list
  listenAllOnlineStatus((statusData) => {
     const listEl = $('players-list');
     if (!listEl) return;
     const now = Date.now();
     
     const onlineUids = Object.keys(statusData).filter(uid => statusData[uid].state === 'online');
     const targets = onlineUids.filter(uid => uid !== user?.id);
     
     if (targets.length === 0) {
       listEl.innerHTML = '<div class="lb-empty">No other active players right now.</div>';
       return;
     }
     
     listEl.innerHTML = targets.map((uid) => {
        return `
          <div class="lb-item" style="cursor:pointer;" onclick="window.targetPlayer('${uid}')">
            <span class="lb-rank">🟢</span>
            <div class="lb-info">
              <div class="lb-name">Player_${uid.slice(-4)}</div>
            </div>
            <span class="lb-clicks" style="color:var(--color-primary); font-size: 0.8rem;">Target 🎯</span>
          </div>
        `;
     }).join('');
  });
  
  window.targetPlayer = async (uid) => {
    if (!uid) return;
    const choice = confirm("Launch a tactical strike against this player?\\n\\n[OK] for Rare Chaos\\n[Cancel] for Medium Chaos");
    const tier = choice ? 'rare' : 'medium';
    const sender = getCurrentUser();
    
    import('./firebase.js').then(({ dbPush }) => {
      dbPush(`userCommands/${uid}`, {
        type: 'targeted_effect',
        tier: tier,
        senderId: sender.id,
        senderName: sender.displayName || sender.username,
        timestamp: Date.now()
      }).then(() => alert(`Strategic ${tier} chaos payload sent.`));
    });
  };

  // Admin Commands
  listenAdminCommands((data) => {
    if (!data || !data.timestamp || data.timestamp < BOOT_TIME) return;
    const user = getCurrentUser();
    
    // God immunity from all remote commands
    if (user?.role === 'god' && data.senderId !== user.id) return;
    
    // Commands targeted at specific users
    if (data.type === 'reload') {
      window.location.reload();
      return;
    }
    
    // Commands that bypass sender check
    if (data.type === 'normalize') {
      document.body.className = '';
      const fx = document.getElementById('fx-container');
      if (fx) fx.innerHTML = '';
      return;
    }
    
    // Ignore effects triggered by ourselves
    if (data.senderId === user?.id) return; 

    if (data.type === 'force_effect' && data.tier) {
      if (data.tier === 'storm') {
        const effects = ['rare', 'medium', 'medium', 'normal', 'normal'];
        effects.forEach((t, i) => setTimeout(() => forceEffect(t), i * 500));
      } else if (data.tier === 'global_chaos') {
        for (let i = 0; i < 5; i++) setTimeout(() => forceEffect('normal'), i * 300);
        forceEffect('medium');
      } else {
        forceEffect(data.tier);
      }
    }
  });
}

async function updateGlobalClicks() {
  try {
    const stats = await dbGet('globalStats');
    if (stats && stats.totalClicks) {
      globalTotalClicks = stats.totalClicks;
      globalClicksEl.textContent = formatNumber(globalTotalClicks);
    }
  } catch (e) {
    console.warn('Could not load global stats:', e);
  }
}

// ═══════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Start ───
init();
