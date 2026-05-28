const TEXT_KEY = "resume-promote:form-draft-v1";
const DB_NAME = "resume-promote";
const DB_VERSION = 1;
const FILE_STORE = "draft-files";
const RESUME_FILE_KEY = "resume_file";
const JD_FILE_KEY = "jd_file";

/**
 * @typedef {object} FormDraft
 * @property {string} resumeText
 * @property {string} jobDesc
 * @property {File | null} resumeFile
 * @property {File | null} jdFile
 */

/**
 * @typedef {object} FileRecord
 * @property {string} name
 * @property {string} type
 * @property {number} lastModified
 * @property {ArrayBuffer} buffer
 */

/** @type {Promise<IDBDatabase> | null} */
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/**
 * @param {string} key
 * @returns {Promise<unknown>}
 */
async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readonly");
    const req = tx.objectStore(FILE_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * @param {string} key
 * @param {unknown} value
 */
async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readwrite");
    tx.objectStore(FILE_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** @param {string} key */
async function idbDelete(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readwrite");
    tx.objectStore(FILE_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClearFiles() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readwrite");
    tx.objectStore(FILE_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * @param {string} key
 * @param {File} file
 */
async function storeFile(key, file) {
  const buffer = await file.arrayBuffer();
  /** @type {FileRecord} */
  const record = {
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    buffer,
  };
  await idbSet(key, record);
}

/**
 * @param {string} key
 * @returns {Promise<File | null>}
 */
async function loadFile(key) {
  const record = /** @type {FileRecord | null} */ (await idbGet(key));
  if (!record?.buffer) return null;
  return new File([record.buffer], record.name, {
    type: record.type,
    lastModified: record.lastModified,
  });
}

/**
 * @param {{ resumeText?: string, jobDesc?: string, resumeFile?: File | null, jdFile?: File | null }} payload
 */
export async function saveFormDraft(payload) {
  const meta = {
    v: 1,
    resumeText: String(payload.resumeText ?? ""),
    jobDesc: String(payload.jobDesc ?? ""),
    hasResumeFile: false,
    hasJdFile: false,
  };

  try {
    if (payload.resumeFile && payload.resumeFile.size > 0) {
      await storeFile(RESUME_FILE_KEY, payload.resumeFile);
      meta.hasResumeFile = true;
    } else {
      await idbDelete(RESUME_FILE_KEY);
    }

    if (payload.jdFile && payload.jdFile.size > 0) {
      await storeFile(JD_FILE_KEY, payload.jdFile);
      meta.hasJdFile = true;
    } else {
      await idbDelete(JD_FILE_KEY);
    }

    sessionStorage.setItem(TEXT_KEY, JSON.stringify(meta));
  } catch {
    /* 配额或隐私模式等：忽略 */
  }
}

/**
 * @returns {Promise<FormDraft | null>}
 */
export async function loadFormDraft() {
  try {
    const raw = sessionStorage.getItem(TEXT_KEY);
    if (!raw) {
      await idbClearFiles();
      return null;
    }
    const meta = JSON.parse(raw);
    if (!meta || meta.v !== 1) return null;

    const resumeFile = meta.hasResumeFile
      ? await loadFile(RESUME_FILE_KEY)
      : null;
    const jdFile = meta.hasJdFile ? await loadFile(JD_FILE_KEY) : null;

    return {
      resumeText: String(meta.resumeText || ""),
      jobDesc: String(meta.jobDesc || ""),
      resumeFile,
      jdFile,
    };
  } catch {
    return null;
  }
}

export async function clearFormDraft() {
  try {
    sessionStorage.removeItem(TEXT_KEY);
    await idbClearFiles();
  } catch {
    /* ignore */
  }
}
