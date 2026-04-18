// ─── Social System — Groups & Chat ───
import { dbSet, dbGet, dbPush, dbUpdate, dbListen, dbListenChildAdded, dbOff, getNow } from './firebase.js';
import { getCurrentUser, updateUserField } from './auth.js';

let _messageListener = null;
let _messageCallback = null;

// ─── Groups ───
export async function createGroup() {
  const user = getCurrentUser();
  if (!user) return null;

  const groupId = 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);

  try {
    await dbSet(`groups/${groupId}`, {
      name: `${user.username}'s Group`,
      createdBy: user.id,
      createdAt: getNow(),
      members: { [user.id]: true }
    });

    await updateUserField('groupId', groupId);

    // System message
    dbPush(`messages/${groupId}`, {
      userId: 'system',
      username: 'System',
      text: `${user.username} created the group!`,
      timestamp: getNow(),
      type: 'system'
    }).catch(() => {});
  } catch (e) {
    console.warn('Create group failed:', e);
    // Still set locally
    user.groupId = groupId;
  }

  return groupId;
}

export async function joinGroup(groupId) {
  const user = getCurrentUser();
  if (!user || !groupId) return false;

  try {
    const group = await dbGet(`groups/${groupId}`);
    if (!group) return false;

    await dbUpdate(`groups/${groupId}/members`, { [user.id]: true });
    await updateUserField('groupId', groupId);

    dbPush(`messages/${groupId}`, {
      userId: 'system',
      username: 'System',
      text: `${user.username} joined the group!`,
      timestamp: getNow(),
      type: 'system'
    }).catch(() => {});

    return true;
  } catch (e) {
    console.warn('Join group failed:', e);
    return false;
  }
}

export async function leaveGroup() {
  const user = getCurrentUser();
  if (!user || !user.groupId) return;

  const groupId = user.groupId;

  try {
    dbPush(`messages/${groupId}`, {
      userId: 'system',
      username: 'System',
      text: `${user.username} left the group.`,
      timestamp: getNow(),
      type: 'system'
    }).catch(() => {});

    dbUpdate(`groups/${groupId}/members`, { [user.id]: null }).catch(() => {});
    await updateUserField('groupId', null);
  } catch (e) {
    console.warn('Leave group failed:', e);
  }

  stopMessageListener();
}

// ─── Chat ───
export async function sendMessage(text) {
  const user = getCurrentUser();
  if (!user || !user.groupId || !text.trim()) return;

  try {
    await dbPush(`messages/${user.groupId}`, {
      userId: user.id,
      username: user.username,
      text: text.trim(),
      timestamp: getNow(),
      type: 'user'
    });
  } catch (e) {
    console.warn('Send message failed:', e);
  }
}

export function listenMessages(groupId, callback) {
  stopMessageListener();
  if (!groupId) return;

  _messageCallback = callback;
  _messageListener = dbListenChildAdded(`messages/${groupId}`, (key, msg) => {
    if (_messageCallback) {
      _messageCallback(key, msg);
    }
  });
}

export function stopMessageListener() {
  if (_messageListener) {
    dbOff(_messageListener);
    _messageListener = null;
    _messageCallback = null;
  }
}

export async function getGroupInfo(groupId) {
  if (!groupId) return null;
  try {
    return await dbGet(`groups/${groupId}`);
  } catch (e) {
    return null;
  }
}
