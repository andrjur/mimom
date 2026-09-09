import type { PersonSession, StoredAudio } from '../typistTypes';

const SESSION_KEY = 'neuroindikov_sessions_v3';
const ACTIVE_KEY = 'neuroindikov_active_v3';
const DB_NAME = 'neuroindikov-audio-v1';
const STORE = 'audio';

const withoutBlobs = (sessions: PersonSession[]) => sessions.map(session => ({
  ...session,
  audio: session.audio.map(({ blob: _blob, ...audio }) => audio)
}));

export function saveSessions(sessions: PersonSession[], activeId: string) {
  // Keep a small recoverable snapshot even when large logs fill browser storage.
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(withoutBlobs(sessions).map(({ clientLogs: _logs, ...session }) => session)));
    localStorage.setItem(ACTIVE_KEY, activeId);
  } catch { /* IndexedDB below remains the primary store. */ }
  void saveSessionSnapshot(sessions, activeId).catch(() => {
    window.dispatchEvent(new CustomEvent('typist-storage-error'));
  });
}

export function loadSessions(): { sessions: PersonSession[]; activeId: string | null } {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const sessions = raw ? JSON.parse(raw) : [];
    return { sessions: Array.isArray(sessions) ? sessions.slice(0, 8) : [], activeId: localStorage.getItem(ACTIVE_KEY) };
  } catch {
    return { sessions: [], activeId: null };
  }
}

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
      if (!req.result.objectStoreNames.contains('sessions')) req.result.createObjectStore('sessions');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let snapshotQueue: Promise<void> = Promise.resolve();
function saveSessionSnapshot(sessions: PersonSession[], activeId: string) {
  const snapshot = { sessions: withoutBlobs(sessions), activeId };
  snapshotQueue = snapshotQueue.catch(() => undefined).then(async () => {
    const db = await openAudioDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('sessions', 'readwrite');
        tx.objectStore('sessions').put(snapshot, 'current');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  });
  return snapshotQueue;
}

export async function restoreSessions(): Promise<{ sessions: PersonSession[]; activeId: string | null }> {
  const db = await openAudioDb();
  try {
    const saved = await new Promise<{ sessions: PersonSession[]; activeId: string } | undefined>((resolve, reject) => {
      const req = db.transaction('sessions', 'readonly').objectStore('sessions').get('current');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const snapshot = saved?.sessions?.length ? saved : loadSessions();
    return { ...snapshot, sessions: await restoreAudio(snapshot.sessions) };
  } finally { db.close(); }
}

export async function saveAudio(audio: StoredAudio) {
  if (!audio.blob) return;
  const db = await openAudioDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(audio);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function restoreAudio(sessions: PersonSession[]): Promise<PersonSession[]> {
  const db = await openAudioDb();
  const hydrated = await Promise.all(sessions.map(async session => ({
    ...session,
    audio: await Promise.all(session.audio.map(audio => new Promise<StoredAudio>((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(audio.id);
      req.onsuccess = () => resolve(req.result || audio);
      req.onerror = () => resolve(audio);
    })))
  })));
  db.close();
  return hydrated;
}

export async function deleteAudio(ids: string[]) {
  const db = await openAudioDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    ids.forEach(id => tx.objectStore(STORE).delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
