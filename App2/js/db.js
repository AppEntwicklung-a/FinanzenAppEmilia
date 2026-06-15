const DB_NAME = 'finanzen';
const DB_VERSION = 1;

let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const d = e.target.result;

      if (!d.objectStoreNames.contains('entries')) {
        const entries = d.createObjectStore('entries', { keyPath: 'id' });
        entries.createIndex('month', ['year', 'month'], { unique: false });
        entries.createIndex('category', 'category', { unique: false });
      }

      if (!d.objectStoreNames.contains('savings')) {
        const savings = d.createObjectStore('savings', { keyPath: 'id' });
        savings.createIndex('month', ['year', 'month'], { unique: false });
      }

      if (!d.objectStoreNames.contains('contracts')) {
        d.createObjectStore('contracts', { keyPath: 'id' });
      }

      if (!d.objectStoreNames.contains('fixtemplates')) {
        d.createObjectStore('fixtemplates', { keyPath: 'id' });
      }
    };

    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function tx(store, mode = 'readonly') {
  return db.transaction(store, mode).objectStore(store);
}

function dbGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = tx(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGet(store, id) {
  return new Promise((resolve, reject) => {
    const req = tx(store).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(store, item) {
  return new Promise((resolve, reject) => {
    if (!item.id) item.id = uuid();
    const req = tx(store, 'readwrite').put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(store, id) {
  return new Promise((resolve, reject) => {
    const req = tx(store, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getEntriesByMonth(year, month) {
  const all = await dbGetAll('entries');
  return all.filter(e => e.year === year && e.month === month);
}

async function getSavingsByMonth(year, month) {
  const all = await dbGetAll('savings');
  return all.filter(s => s.year === year && s.month === month);
}

async function exportData() {
  const [entries, savings, contracts, fixtemplates] = await Promise.all([
    dbGetAll('entries'),
    dbGetAll('savings'),
    dbGetAll('contracts'),
    dbGetAll('fixtemplates')
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), entries, savings, contracts, fixtemplates };
}

async function importData(data) {
  for (const entry of data.entries || []) await dbPut('entries', entry);
  for (const saving of data.savings || []) await dbPut('savings', saving);
  for (const contract of data.contracts || []) await dbPut('contracts', contract);
  for (const tpl of data.fixtemplates || []) await dbPut('fixtemplates', tpl);
}