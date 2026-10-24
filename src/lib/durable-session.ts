// Secondary copies of the session recovery token. Web views and browsers can
// wipe localStorage after an app update or republish, while IndexedDB and the
// native app's own storage usually survive. These copies are only ever used to
// ask the server for a fresh session, so revoked tokens are still rejected.

const DB_NAME = 'truheirs-auth'
const STORE = 'kv'
const KEY = 'session_backup'
const NATIVE_KEY = 'truheirs_session_backup'

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE) }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function idbSet(value: string | null) {
  const db = await openDb()
  if (!db) return
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      if (value === null) tx.objectStore(STORE).delete(KEY)
      else tx.objectStore(STORE).put(value, KEY)
      tx.oncomplete = tx.onerror = tx.onabort = () => resolve()
    } catch { resolve() }
  })
  db.close()
}

async function idbGet(): Promise<string | null> {
  const db = await openDb()
  if (!db) return null
  const value = await new Promise<string | null>(resolve => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null)
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
  db.close()
  return value
}

function nativeStorage(): any | null {
  try {
    const w = window as any
    if (!w.natively?.injected || typeof w.NativelyStorage !== 'function') return null
    return new w.NativelyStorage()
  } catch {
    return null
  }
}

function nativeGet(): Promise<string | null> {
  const storage = nativeStorage()
  if (!storage) return Promise.resolve(null)
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), 1500)
    try {
      storage.getStorageValue(NATIVE_KEY, (res: any) => {
        clearTimeout(timer)
        const value = typeof res === 'string' ? res : res?.value
        resolve(typeof value === 'string' && value ? value : null)
      })
    } catch {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

export function saveDurableBackup(serialized: string) {
  void idbSet(serialized)
  try { nativeStorage()?.setStorageValue(NATIVE_KEY, serialized) } catch { /* ignore */ }
}

export function clearDurableBackup() {
  void idbSet(null)
  try { nativeStorage()?.removeStorageValue(NATIVE_KEY) } catch { /* ignore */ }
}

export async function readDurableBackup(): Promise<string | null> {
  const fromIdb = await idbGet()
  if (fromIdb) return fromIdb
  return nativeGet()
}
