const TEXT_KEY = "resume-promote:form-draft-v1";
const DB_NAME = "resume-promote";
const DB_VERSION = 1;
const FILE_STORE = "draft-files";
const RESUME_FILE_KEY = "resume_file";
const JD_FILE_KEY = "jd_file";

export type FormDraft = {
  resumeText: string;
  jobDesc: string;
  resumeFile: File | null;
  jdFile: File | null;
};

type FileRecord = {
  name: string;
  type: string;
  lastModified: number;
  buffer: ArrayBuffer;
};

let dbPromise: Promise<IDBDatabase> | null = null;

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

async function idbGet(key: string): Promise<unknown> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readonly");
    const req = tx.objectStore(FILE_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readwrite");
    tx.objectStore(FILE_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readwrite");
    tx.objectStore(FILE_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClearFiles() {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readwrite");
    tx.objectStore(FILE_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function storeFile(key: string, file: File) {
  const buffer = await file.arrayBuffer();
  const record: FileRecord = {
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    buffer,
  };
  await idbSet(key, record);
}

async function loadFile(key: string): Promise<File | null> {
  const record = (await idbGet(key)) as FileRecord | null;
  if (!record?.buffer) return null;
  return new File([record.buffer], record.name, {
    type: record.type,
    lastModified: record.lastModified,
  });
}

export async function saveFormDraft(payload: {
  resumeText?: string;
  jobDesc?: string;
  resumeFile?: File | null;
  jdFile?: File | null;
}) {
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
    /* quota / private mode */
  }
}

export async function loadFormDraft(): Promise<FormDraft | null> {
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
