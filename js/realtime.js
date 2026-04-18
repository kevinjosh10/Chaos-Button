// ─── Realtime Sync Manager ───
import { dbListen, dbOff, dbListenChildAdded } from './firebase.js';

let _listeners = {};

export function startListener(name, path, callback) {
  stopListener(name); // clean up existing
  _listeners[name] = dbListen(path, callback);
}

export function startChildListener(name, path, callback) {
  stopListener(name);
  _listeners[name] = dbListenChildAdded(path, callback);
}

export function stopListener(name) {
  if (_listeners[name]) {
    dbOff(_listeners[name]);
    delete _listeners[name];
  }
}

export function stopAllListeners() {
  Object.keys(_listeners).forEach(name => {
    dbOff(_listeners[name]);
  });
  _listeners = {};
}

// ─── Announcement Listener ───
export function listenAnnouncements(callback) {
  startListener('announcements', 'announcements', (data) => {
    if (!data || typeof data !== 'object') {
      callback(null);
      return;
    }
    try {
      // Get most recent active announcement
      const entries = Object.entries(data);
      const active = entries
        .filter(([k, v]) => v && typeof v === 'object' && typeof v.text === 'string' && v.text.length > 0)
        .map(([k, v]) => ({ id: k, ...v }))
        .filter(a => a.active !== false)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(active.length > 0 ? active[0] : null);
    } catch (e) {
      callback(null);
    }
  });
}

// ─── Activity Feed Listener ───
export function listenActivity(callback) {
  startChildListener('activity', 'activityLogs', (key, data) => {
    callback(key, data);
  });
}

// ─── Global Click Counter ───
export function listenGlobalClicks(callback) {
  startListener('globalClicks', 'globalStats/totalClicks', (val) => {
    callback(val || 0);
  });
}

// ─── Online Users (simple presence) ───
export function listenOnlineCount(callback) {
  startListener('onlineCount', 'globalStats/onlineCount', (val) => {
    callback(val || 0);
  });
}

export function listenAllOnlineStatus(callback) {
  startListener('allOnline', 'status', (data) => {
    callback(data || {});
  });
}

// ─── Commands ───
export function listenAdminCommands(callback) {
  startChildListener('adminCommands', 'adminCommands', (key, data) => {
    callback(data, key);
  });
}

export function listenUserCommands(uid, callback) {
  startChildListener('userCommands', `userCommands/${uid}`, (key, data) => {
    callback(data, key);
  });
}
