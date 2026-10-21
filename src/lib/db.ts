// Device storage: one IndexedDB database holding the workspace and app
// state. IndexedDB holds far more than localStorage (curricula, references and
// notes can run to tens of megabytes) and survives offline use and restarts.

const DB_NAME = 'deep-tutor-pro';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;
const memory = new Map<string, unknown>(); // fallback when IndexedDB is unavailable
let memoryOnly = false;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB is not available'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Storage is blocked by another open copy of the app.'));
    });
    dbPromise.catch(() => {
      memoryOnly = true;
    });
  }
  return dbPromise;
}

export const isMemoryOnly = () => memoryOnly;

export async function dbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await open();
    return await new Promise<T | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return memory.get(key) as T | undefined;
  }
}

export async function dbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Saving was aborted (the device may be out of space).'));
    });
  } catch (err) {
    if (memoryOnly) {
      memory.set(key, value);
      return;
    }
    throw err;
  }
}

export async function dbDelete(key: string): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    memory.delete(key);
  }
}

/** Ask the browser to keep this app's data even when the device is low on space. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null;
  } catch {
    return null;
  }
}
