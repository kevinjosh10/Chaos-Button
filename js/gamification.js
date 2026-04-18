// ─── Gamification — Leaderboards & Achievements ───
import { dbGet, dbSet, dbUpdate, dbListen, dbOff, getNow, getTodayKey, getWeekKey } from './firebase.js';
import { getCurrentUser } from './auth.js';

// ─── Leaderboard ───
let _lbListeners = {};

export async function updateLeaderboard(userId, displayName, clicks) {
  const todayKey = getTodayKey();
  const weekKey = getWeekKey();
  const user = getCurrentUser();
  if (!user) return;

  // Use individual sets to avoid permission issues
  try {
    await dbSet(`leaderboards/alltime/${userId}`, { displayName, username: displayName, clicks: user.totalClicks });
    await dbSet(`leaderboards/daily/${todayKey}/${userId}`, { displayName, username: displayName, clicks: user.dailyClicks });
    await dbSet(`leaderboards/weekly/${weekKey}/${userId}`, { displayName, username: displayName, clicks: user.weeklyClicks });
  } catch (e) {
    console.warn('Leaderboard update failed:', e);
  }
}

export function listenLeaderboard(period, callback) {
  const key = _getLeaderboardPath(period);
  if (_lbListeners[period]) {
    dbOff(_lbListeners[period]);
  }
  _lbListeners[period] = dbListen(key, (data) => {
    const sorted = _sortLeaderboard(data);
    callback(sorted);
  });
}

export function stopLeaderboardListener(period) {
  if (_lbListeners[period]) {
    dbOff(_lbListeners[period]);
    delete _lbListeners[period];
  }
}

function _getLeaderboardPath(period) {
  if (period === 'daily') return `leaderboards/daily/${getTodayKey()}`;
  if (period === 'weekly') return `leaderboards/weekly/${getWeekKey()}`;
  return 'leaderboards/alltime';
}

function _sortLeaderboard(data) {
  if (!data) return [];
  return Object.entries(data)
    .map(([id, val]) => ({ id, displayName: val.displayName || val.username, username: val.username, clicks: val.clicks || 0 }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 50);
}

// ─── Achievements ───
const ACHIEVEMENTS = [
  { id: 'first_click', emoji: '👆', name: 'First Click', desc: 'Click the button for the first time', check: u => u.totalClicks >= 1 },
  { id: 'clicks_10', emoji: '🔟', name: 'Getting Started', desc: 'Reach 10 clicks', check: u => u.totalClicks >= 10 },
  { id: 'clicks_50', emoji: '✋', name: 'High Five', desc: 'Reach 50 clicks', check: u => u.totalClicks >= 50 },
  { id: 'clicks_100', emoji: '💯', name: 'Century', desc: 'Reach 100 clicks', check: u => u.totalClicks >= 100 },
  { id: 'clicks_500', emoji: '🔥', name: 'On Fire', desc: 'Reach 500 clicks', check: u => u.totalClicks >= 500 },
  { id: 'clicks_1000', emoji: '💀', name: 'Chaos Addict', desc: 'Reach 1,000 clicks', check: u => u.totalClicks >= 1000 },
  { id: 'clicks_5000', emoji: '👑', name: 'Chaos Royalty', desc: 'Reach 5,000 clicks', check: u => u.totalClicks >= 5000 },
  { id: 'rare_witness', emoji: '👁️', name: 'Rare Witness', desc: 'Witness a rare event', check: null, manual: true },
  { id: 'combo_master', emoji: '⚡', name: 'Combo Master', desc: 'Trigger a combo effect', check: null, manual: true },
  { id: 'group_maker', emoji: '👥', name: 'Social Butterfly', desc: 'Create a group', check: u => u.groupId != null },
  { id: 'chatter', emoji: '💬', name: 'Chatterbox', desc: 'Send 10 messages', check: null, manual: true },
  { id: 'daily_25', emoji: '📅', name: 'Daily Grinder', desc: 'Get 25 clicks in one day', check: u => u.dailyClicks >= 25 },
  { id: 'void_survivor', emoji: '🕳️', name: 'Void Survivor', desc: 'Survive a void event', check: null, manual: true },
  { id: 'storm_chaser', emoji: '🌪️', name: 'Storm Chaser', desc: 'Experience a chaos storm', check: null, manual: true },
  { id: 'ultimate_chaos', emoji: '⚡', name: 'Ultimate Witness', desc: 'See the ultimate chaos', check: null, manual: true },
];

export function getAllAchievements() {
  return ACHIEVEMENTS;
}

export function checkAchievements(user, eventContext = {}) {
  if (!user) return [];
  const current = user.achievements || [];
  const newlyUnlocked = [];

  for (const ach of ACHIEVEMENTS) {
    if (current.includes(ach.id)) continue;

    let unlocked = false;

    // Manual (event-triggered) achievements
    if (ach.manual) {
      if (ach.id === 'rare_witness' && eventContext.tier === 'rare') unlocked = true;
      if (ach.id === 'combo_master' && eventContext.combo && eventContext.combo.length > 0) unlocked = true;
      if (ach.id === 'void_survivor' && eventContext.effect && eventContext.effect.id === 'void') unlocked = true;
      if (ach.id === 'storm_chaser' && eventContext.effect && eventContext.effect.id === 'storm') unlocked = true;
      if (ach.id === 'ultimate_chaos' && eventContext.effect && eventContext.effect.id === 'ultimate') unlocked = true;
      if (ach.id === 'chatter' && eventContext.messageCount >= 10) unlocked = true;
    } else if (ach.check) {
      unlocked = ach.check(user);
    }

    if (unlocked) {
      current.push(ach.id);
      newlyUnlocked.push(ach);
    }
  }

  if (newlyUnlocked.length > 0) {
    user.achievements = current;
  }

  return newlyUnlocked;
}

export function getAchievementById(id) {
  return ACHIEVEMENTS.find(a => a.id === id);
}
