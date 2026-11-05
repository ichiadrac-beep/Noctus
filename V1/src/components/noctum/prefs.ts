export type Prefs = {
  wave: boolean;
  spec: boolean;
  saveLocation: boolean;
  autoSave: boolean;
  background: boolean;
  agc: boolean;
};

const KEY = "noctum-prefs-v1";

const DEFAULTS: Prefs = {
  wave: true,
  spec: true,
  saveLocation: true,
  autoSave: true,
  background: false,
  agc: false,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const data = JSON.parse(raw) as Partial<Prefs>;
    return {
      wave: data.wave !== false,
      spec: data.spec !== false,
      saveLocation: data.saveLocation !== false,
      autoSave: data.autoSave !== false,
      background: Boolean(data.background),
      agc: Boolean(data.agc),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private mode */
  }
}
