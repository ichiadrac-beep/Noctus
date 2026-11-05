import { create } from "zustand";

export type Tab = "box" | "ovilus" | "emf" | "evp" | "log";
export type Screen = "home" | "sessions" | "tools" | "settings" | "evp" | "box" | "ovilus" | "player";
export type Band = "FM" | "AM";
export type OvilusMode = "dictionary" | "phonetic" | "energy" | "touch";
export type OvilusDrive = "field" | "motion" | "sound" | "blend";

export type Place = {
  city: string;
  country: string;
  countryCode: string;
  source: "gps" | "locale" | "unknown";
  lat: number | null;
  lon: number | null;
};

export type Fragment = {
  id: string;
  t: number;
  word: string;
  freq: number;
  band: Band;
};

type Settings = {
  langKey: string;
  followLocation: boolean;
  band: Band;
  direction: 1 | -1;
  speed: number;
  density: number;
  chop: boolean;
  volume: number;
  question: string;
  ovilusMode: OvilusMode;
  ovilusDrive: OvilusDrive;
  ovilusSensitivity: number;
  ovilusGap: number;
  ovilusVolume: number;
};

const SETTINGS_KEY = "phosphor-settings-v1";

type State = Settings & {
  booted: boolean;
  tab: Tab;
  place: Place;
  geoNote: string;
  boxOn: boolean;
  hold: boolean;
  fragments: Fragment[];
  sessionId: string;
  emfLive: boolean;
  emfUt: number;
  emfDeltaMg: number;
  emfRecording: boolean;
  evpRecording: boolean;
  evpArmed: boolean;
  ovilusOn: boolean;
  libraryTick: number;
  screen: Screen;
  clipId: string | null;
  investigating: boolean;
  investigationStarted: number;
  setTab: (tab: Tab) => void;
  setScreen: (screen: Screen) => void;
  openClip: (id: string) => void;
  setInvestigation: (on: boolean) => void;
  boot: (settings: Settings, place: Place) => void;
  patch: (partial: Partial<Settings & { hold: boolean; boxOn: boolean }>) => void;
  setPlace: (place: Place, note?: string) => void;
  pushFragment: (fragment: Fragment) => void;
  resetFragments: (sessionId: string) => void;
  setEmf: (partial: {
    live?: boolean;
    ut?: number;
    deltaMg?: number;
    recording?: boolean;
  }) => void;
  setEvp: (partial: { recording?: boolean; armed?: boolean }) => void;
  setOvilus: (on: boolean) => void;
  bumpLibrary: () => void;
};

const emptyPlace: Place = {
  city: "",
  country: "",
  countryCode: "",
  source: "unknown",
  lat: null,
  lon: null,
};

function pickSettings(state: State): Settings {
  return {
    langKey: state.langKey,
    followLocation: state.followLocation,
    band: state.band,
    direction: state.direction,
    speed: state.speed,
    density: state.density,
    chop: state.chop,
    volume: state.volume,
    question: state.question,
    ovilusMode: state.ovilusMode,
    ovilusDrive: state.ovilusDrive,
    ovilusSensitivity: state.ovilusSensitivity,
    ovilusGap: state.ovilusGap,
    ovilusVolume: state.ovilusVolume,
  };
}

export const usePhosphor = create<State>((set, get) => ({
  langKey: "en",
  followLocation: true,
  band: "FM",
  direction: 1,
  speed: 16,
  density: 0.65,
  chop: false,
  volume: 0.75,
  question: "",
  ovilusMode: "dictionary",
  ovilusDrive: "blend",
  ovilusSensitivity: 0.55,
  ovilusGap: 6,
  ovilusVolume: 0.9,
  booted: false,
  tab: "box",
  place: emptyPlace,
  geoNote: "",
  boxOn: false,
  hold: false,
  fragments: [],
  sessionId: "",
  emfLive: false,
  emfUt: 0,
  emfDeltaMg: 0,
  emfRecording: false,
  evpRecording: false,
  evpArmed: false,
  ovilusOn: false,
  libraryTick: 0,
  screen: "home",
  clipId: null,
  investigating: false,
  investigationStarted: 0,
  setTab: (tab) => set({ tab }),
  setScreen: (screen) => set({ screen }),
  openClip: (id) => set({ clipId: id, screen: "player" }),
  setInvestigation: (on) =>
    set(on ? { investigating: true, investigationStarted: Date.now() } : { investigating: false }),
  boot: (settings, place) => set({ ...settings, place, booted: true }),
  patch: (partial) => {
    set(partial);
    if (get().booted) saveSettings(pickSettings(get()));
  },
  setPlace: (place, note) => set(note === undefined ? { place } : { place, geoNote: note }),
  pushFragment: (fragment) =>
    set((state) => ({ fragments: [...state.fragments, fragment].slice(-400) })),
  resetFragments: (sessionId) => set({ fragments: [], sessionId }),
  setEmf: (partial) =>
    set({
      ...(partial.live === undefined ? {} : { emfLive: partial.live }),
      ...(partial.ut === undefined ? {} : { emfUt: partial.ut }),
      ...(partial.deltaMg === undefined ? {} : { emfDeltaMg: partial.deltaMg }),
      ...(partial.recording === undefined ? {} : { emfRecording: partial.recording }),
    }),
  setEvp: (partial) =>
    set({
      ...(partial.recording === undefined ? {} : { evpRecording: partial.recording }),
      ...(partial.armed === undefined ? {} : { evpArmed: partial.armed }),
    }),
  setOvilus: (on) => set({ ovilusOn: on }),
  bumpLibrary: () => set((state) => ({ libraryTick: state.libraryTick + 1 })),
}));

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function modeOf(value: unknown): OvilusMode {
  if (value === "phonetic" || value === "energy" || value === "touch" || value === "dictionary") return value;
  return "dictionary";
}

function driveOf(value: unknown): OvilusDrive {
  if (value === "field" || value === "motion" || value === "sound" || value === "blend") return value;
  return "blend";
}

export function loadSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Settings>;
    return {
      langKey: typeof data.langKey === "string" ? data.langKey : "en",
      followLocation: data.followLocation !== false,
      band: data.band === "AM" ? "AM" : "FM",
      direction: data.direction === -1 ? -1 : 1,
      speed: clamp(data.speed, 4, 40, 16),
      density: clamp(data.density, 0.2, 5, 0.65),
      chop: Boolean(data.chop),
      volume: clamp(data.volume, 0, 1, 0.75),
      question: typeof data.question === "string" ? data.question.slice(0, 140) : "",
      ovilusMode: modeOf(data.ovilusMode),
      ovilusDrive: driveOf(data.ovilusDrive),
      ovilusSensitivity: clamp(data.ovilusSensitivity, 0, 1, 0.55),
      ovilusGap: clamp(data.ovilusGap, 3, 14, 6),
      ovilusVolume: clamp(data.ovilusVolume, 0, 1, 0.9),
    };
  } catch {
    return null;
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* private mode */
  }
}
