// ─── Firebase Configuration & Utilities ───
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getDatabase, ref, set, get, push, update, remove,
  onValue, onChildAdded, onChildRemoved, off,
  query, orderByChild, limitToLast, limitToFirst,
  serverTimestamp, onDisconnect
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwwpFedYxihu3sTTtpgc2ihPKCxrfxYmA",
  authDomain: "chaos-button.firebaseapp.com",
  projectId: "chaos-button",
  databaseURL: "https://chaos-button-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "chaos-button.firebasestorage.app",
  messagingSenderId: "244683999540",
  appId: "1:244683999540:web:1a0b3aec54d3e59501bd61"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ─── Utility helpers ───
export function dbRef(path) {
  return ref(db, path);
}

export async function dbSet(path, data) {
  return set(ref(db, path), data);
}

export async function dbGet(path) {
  const snap = await get(ref(db, path));
  return snap.exists() ? snap.val() : null;
}

export async function dbPush(path, data) {
  const newRef = push(ref(db, path));
  await set(newRef, data);
  return newRef.key;
}

export async function dbUpdate(path, data) {
  return update(ref(db, path), data);
}

export async function dbRemove(path) {
  return remove(ref(db, path));
}

export function dbListen(path, callback) {
  const r = ref(db, path);
  onValue(r, (snap) => callback(snap.val()), { onlyOnce: false });
  return r;
}

export function dbListenChildAdded(path, callback) {
  const r = ref(db, path);
  onChildAdded(r, (snap) => callback(snap.key, snap.val()));
  return r;
}

export function dbOff(refObj) {
  off(refObj);
}

export function dbQuery(path, orderBy, limitCount, fromEnd = true) {
  const r = ref(db, path);
  const q = query(r, orderByChild(orderBy), fromEnd ? limitToLast(limitCount) : limitToFirst(limitCount));
  return q;
}

export function dbListenQuery(q, callback) {
  onValue(q, (snap) => callback(snap.val()));
  return q;
}

export function getNow() {
  return Date.now();
}

export function getTodayKey() {
  return new Date().toISOString().split('T')[0]; // "2026-04-18"
}

export function getWeekKey() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export { db, ref, onValue, onChildAdded, off, query, orderByChild, limitToLast, push, set, get, update, onDisconnect, serverTimestamp };
