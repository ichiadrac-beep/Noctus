import type { Band } from "@/lib/phosphor/store";

export type SpiritWord = {
  t: number;
  word: string;
  freq: number;
  band: Band;
};

export type SpiritSession = {
  id: string;
  started: number;
  updated: number;
  place: string;
  countryCode: string;
  lat: number | null;
  lon: number | null;
  lang: string;
  bcp47: string;
  question: string;
  words: SpiritWord[];
};

export type EmfSample = {
  t: number;
  x: number;
  y: number;
  z: number;
  ut: number;
  deltaMg: number;
};

export type EmfTrace = {
  id: string;
  started: number;
  place: string;
  durationMs: number;
  peakAbsMg: number;
  peakUt: number;
  samples: EmfSample[];
};

export type EvpMark = {
  at: number;
  note: string;
};

export type EvpClip = {
  id: string;
  name: string;
  created: number;
  duration: number;
  sampleRate: number;
  gainDb: number;
  hpf: number;
  lpf: number;
  peaks: number[];
  blob: Blob;
  marks?: EvpMark[];
  faint?: boolean;
  faintAmount?: number;
  preroll?: number;
};

export type OvilusHit = {
  t: number;
  word: string;
  mode: string;
  drive: string;
  energy: number;
};

export type OvilusSession = {
  kind: "ovilus";
  id: string;
  started: number;
  updated: number;
  place: string;
  countryCode: string;
  lat: number | null;
  lon: number | null;
  lang: string;
  bcp47: string;
  question: string;
  mode: string;
  drive: string;
  words: OvilusHit[];
};

type StoreName = "sessions" | "traces" | "clips";

const DB_NAME = "phosphor-field";
const DB_VERSION = 1;

let opening: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Storage is not available on this phone."));
  }
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
        if (!db.objectStoreNames.contains("traces")) db.createObjectStore("traces", { keyPath: "id" });
        if (!db.objectStoreNames.contains("clips")) db.createObjectStore("clips", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        opening = null;
        reject(req.error ?? new Error("Could not open the field notebook."));
      };
    });
  }
  return opening;
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function putItem<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(value);
  await txDone(tx);
}

export async function allItems<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(store, "readonly");
  const req = tx.objectStore(store).getAll();
  const rows = await new Promise<T[]>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  return rows;
}

export async function deleteItem(store: StoreName, id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(id);
  await txDone(tx);
}
