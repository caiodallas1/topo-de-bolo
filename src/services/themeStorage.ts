const THEME_KEY = 'topo-themes-v2';
const DB_NAME = 'topo-express-db';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

let themeCache: string | null = null;
let installed = false;

const nativeGetItem = Storage.prototype.getItem;
const nativeSetItem = Storage.prototype.setItem;
const nativeRemoveItem = Storage.prototype.removeItem;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function idbRemove(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function installThemeStorageShim() {
  if (installed) return;

  const legacy = nativeGetItem.call(localStorage, THEME_KEY);
  let stored: string | null = null;

  try {
    stored = await idbGet(THEME_KEY);
  } catch (error) {
    console.warn('Topo Express: IndexedDB indisponível ao iniciar.', error);
  }

  themeCache = stored ?? legacy;

  if (!stored && legacy) {
    try {
      await idbSet(THEME_KEY, legacy);
    } catch (error) {
      console.warn('Topo Express: não foi possível migrar temas antigos.', error);
    }
  }

  if (legacy) {
    try {
      nativeRemoveItem.call(localStorage, THEME_KEY);
    } catch {}
  }

  Storage.prototype.getItem = function (key: string) {
    if (this === localStorage && key === THEME_KEY) return themeCache;
    return nativeGetItem.call(this, key);
  };

  Storage.prototype.setItem = function (key: string, value: string) {
    if (this === localStorage && key === THEME_KEY) {
      themeCache = String(value);
      void idbSet(THEME_KEY, themeCache).catch((error) => {
        console.error('Topo Express: falha ao salvar catálogo grande no IndexedDB.', error);
      });
      return;
    }
    return nativeSetItem.call(this, key, value);
  };

  Storage.prototype.removeItem = function (key: string) {
    if (this === localStorage && key === THEME_KEY) {
      themeCache = null;
      void idbRemove(THEME_KEY).catch(console.error);
      return;
    }
    return nativeRemoveItem.call(this, key);
  };

  installed = true;
}
