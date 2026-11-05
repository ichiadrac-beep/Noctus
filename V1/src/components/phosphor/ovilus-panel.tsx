import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { putItem, type OvilusSession } from "@/lib/phosphor/db";
import { geoErrorMessage, locateGps, placeLabel } from "@/lib/phosphor/geo";
import {
  COUNTRY_HINTS,
  allLexicons,
  bcp47For,
  langForCountry,
  lexiconAnswers,
  lexiconByCode,
} from "@/lib/phosphor/lexicon";
import { OvilusEngine, phonemesFor, type OvilusFrame } from "@/lib/phosphor/ovilus";
import { voiceStatus } from "@/lib/phosphor/radio";
import { usePhosphor, type OvilusDrive, type OvilusMode } from "@/lib/phosphor/store";

const MODES: { id: OvilusMode; label: string }[] = [
  { id: "dictionary", label: "Dictionary" },
  { id: "phonetic", label: "Phonetic" },
  { id: "energy", label: "Yes / No" },
  { id: "touch", label: "Touch" },
];

const DRIVES: { id: OvilusDrive; label: string }[] = [
  { id: "field", label: "Field" },
  { id: "motion", label: "Motion" },
  { id: "sound", label: "Sound" },
  { id: "blend", label: "Blend" },
];

const emptyFrame: OvilusFrame = {
  score: 0,
  detail: "Standby",
  sensors: "none",
  warning: "",
  armed: false,
};

export function OvilusPanel() {
  const tab = usePhosphor((s) => s.tab);
  const langKey = usePhosphor((s) => s.langKey);
  const followLocation = usePhosphor((s) => s.followLocation);
  const place = usePhosphor((s) => s.place);
  const geoNote = usePhosphor((s) => s.geoNote);
  const question = usePhosphor((s) => s.question);
  const mode = usePhosphor((s) => s.ovilusMode);
  const drive = usePhosphor((s) => s.ovilusDrive);
  const sensitivity = usePhosphor((s) => s.ovilusSensitivity);
  const gap = usePhosphor((s) => s.ovilusGap);
  const volume = usePhosphor((s) => s.ovilusVolume);
  const on = usePhosphor((s) => s.ovilusOn);
  const patch = usePhosphor((s) => s.patch);
  const setPlace = usePhosphor((s) => s.setPlace);
  const setOvilus = usePhosphor((s) => s.setOvilus);
  const bumpLibrary = usePhosphor((s) => s.bumpLibrary);

  const engineRef = useRef<OvilusEngine | null>(null);
  const sessionRef = useRef<OvilusSession | null>(null);
  const saveTimer = useRef(0);
  const [frame, setFrame] = useState<OvilusFrame>(emptyFrame);
  const [lastWord, setLastWord] = useState("");
  const [flash, setFlash] = useState(false);
  const [hits, setHits] = useState<{ id: string; word: string }[]>([]);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [voice, setVoice] = useState<"ready" | "missing" | "unknown">("unknown");
  const locatedOnce = useRef(false);

  const lex = lexiconByCode(langKey);
  const bcp47 = bcp47For(langKey, place.countryCode);
  const hint = COUNTRY_HINTS[place.countryCode];

  function applyEngine(engine: OvilusEngine) {
    const state = usePhosphor.getState();
    engine.mode = state.ovilusMode;
    engine.drive = state.ovilusDrive;
    engine.sensitivity = state.ovilusSensitivity;
    engine.minGap = state.ovilusGap;
    engine.volume = state.ovilusVolume;
    engine.words = lexiconByCode(state.langKey).words;
    engine.phonemes = phonemesFor(state.langKey);
    engine.answers = lexiconAnswers(state.langKey);
    engine.bcp47 = bcp47For(state.langKey, state.place.countryCode);
  }

  useEffect(() => {
    const engine = new OvilusEngine();
    engine.onFrame = (next) => setFrame(next);
    engine.onWord = (hit) => {
      const id = crypto.randomUUID();
      setLastWord(hit.word);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 240);
      setHits((prev) => [{ id, word: hit.word }, ...prev].slice(0, 8));
      const session = sessionRef.current;
      if (!session) return;
      const state = usePhosphor.getState();
      session.words.push({
        t: Date.now(),
        word: hit.word,
        mode: hit.mode,
        drive: hit.drive,
        energy: hit.energy,
      });
      session.updated = Date.now();
      session.question = state.question;
      session.place = placeLabel(state.place);
      session.countryCode = state.place.countryCode;
      session.lat = state.place.lat;
      session.lon = state.place.lon;
      session.lang = lexiconByCode(state.langKey).name;
      session.bcp47 = bcp47For(state.langKey, state.place.countryCode);
      session.mode = state.ovilusMode;
      session.drive = state.ovilusDrive;
      const snapshot: OvilusSession = {
        ...session,
        words: session.words.map((word) => ({ ...word })),
      };
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void putItem("sessions", snapshot)
          .then(() => usePhosphor.getState().bumpLibrary())
          .catch(() => {});
      }, 400);
    };
    engineRef.current = engine;
    return () => {
      window.clearTimeout(saveTimer.current);
      engine.destroy();
      engineRef.current = null;
      setOvilus(false);
    };
  }, [bumpLibrary, setOvilus]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    applyEngine(engine);
  }, [langKey, mode, drive, sensitivity, gap, volume, place.countryCode]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine?.isRunning) return;
    void engine.resync().catch((err: unknown) => {
      setOvilus(false);
      setError(err instanceof Error ? err.message : "The sensor feed stopped.");
    });
  }, [drive, setOvilus]);

  useEffect(() => {
    const refresh = () => setVoice(voiceStatus(bcp47));
    refresh();
    if (typeof speechSynthesis === "undefined") return;
    speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, [bcp47]);

  async function togglePower() {
    const engine = engineRef.current;
    if (!engine) return;
    if (on) {
      engine.stop();
      setOvilus(false);
      setFrame(emptyFrame);
      const session = sessionRef.current;
      if (session && session.words.length) {
        await putItem("sessions", { ...session, words: session.words.map((word) => ({ ...word })) }).catch(() => {});
        bumpLibrary();
      }
      return;
    }
    applyEngine(engine);
    setError("");
    try {
      await engine.start();
    } catch (err) {
      setOvilus(false);
      setError(err instanceof Error ? err.message : "The Ovilus could not start.");
      return;
    }
    const state = usePhosphor.getState();
    const current = lexiconByCode(state.langKey);
    sessionRef.current = {
      kind: "ovilus",
      id: crypto.randomUUID(),
      started: Date.now(),
      updated: Date.now(),
      place: placeLabel(state.place),
      countryCode: state.place.countryCode,
      lat: state.place.lat,
      lon: state.place.lon,
      lang: current.name,
      bcp47: bcp47For(state.langKey, state.place.countryCode),
      question: state.question,
      mode: state.ovilusMode,
      drive: state.ovilusDrive,
      words: [],
    };
    setLastWord("");
    setHits([]);
    setOvilus(true);
  }

  async function onLocate() {
    setLocating(true);
    try {
      const next = await locateGps();
      const mapped = langForCountry(next.countryCode);
      const follow = usePhosphor.getState().followLocation;
      if (mapped && follow) {
        setPlace(next, "");
        patch({ langKey: mapped });
      } else if (mapped) {
        setPlace(next, "Place updated. Turn on This place to switch the lexicon.");
      } else {
        setPlace(next, `No built-in lexicon for ${next.country || "this country"}. Choose a language.`);
      }
    } catch (err) {
      setPlace(usePhosphor.getState().place, geoErrorMessage(err));
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    if (tab !== "ovilus" || locatedOnce.current) return;
    if (!usePhosphor.getState().followLocation) return;
    locatedOnce.current = true;
    void onLocate();
    // Ask for the site once, the first time this deck is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const modeLabel = MODES.find((item) => item.id === mode)?.label ?? "Dictionary";
  const quiet = on && frame.score < 0.08;

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <section className="crt px-4 py-4" aria-label="Ovilus display">
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between text-muted">
            <span className="kicker text-sm">{on ? `${modeLabel} · ${lex.nativeName}` : lex.nativeName}</span>
            <span className="kicker text-sm">{on ? frame.sensors : drive}</span>
          </div>
          <p className="hit-word min-h-14 text-fg" data-flash={flash ? "true" : "false"} lang={bcp47}>
            {lastWord || (on ? (mode === "touch" ? "Touch" : quiet ? "Quiet" : "Listening") : "Standby")}
          </p>
          <div className="meter" aria-hidden="true">
            <div className="meter-fill" style={{ width: `${Math.min(100, frame.score * 100)}%` }} />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span className="tabular-nums">{on ? frame.detail : "Sensor idle"}</span>
            <span className="tabular-nums text-fg">{lex.words.length.toLocaleString()} words</span>
          </div>
          <div className="flex min-h-8 flex-wrap gap-2">
            {hits.length === 0 ? (
              <span className="text-sm text-muted">
                {lex.nativeName} device bank. Location picks the language. The same reading always selects the same word.
              </span>
            ) : (
              hits.map((hit) => (
                <span key={hit.id} className="chip" lang={bcp47}>
                  {hit.word}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button type="button" className="power shrink-0" data-on={on ? "true" : "false"} onClick={() => void togglePower()}>
          {on ? "On" : "Off"}
        </button>
        <label className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center justify-between text-sm text-muted">
            <span className="kicker">Voice</span>
            <span className="tabular-nums text-fg">{Math.round(volume * 100)}</span>
          </span>
          <input
            className="pot"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label="Ovilus voice level"
            onChange={(event) => patch({ ovilusVolume: Number(event.target.value) })}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-rec">{error}</p> : null}
      {on && frame.warning ? <p className="text-sm text-amber">{frame.warning}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="key"
            data-on={mode === item.id ? "true" : "false"}
            onClick={() => patch({ ovilusMode: item.id })}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === "touch" ? (
        <button
          type="button"
          className="touch-pad"
          data-on={pressed ? "true" : "false"}
          disabled={!on}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          onClick={() => engineRef.current?.tap()}
        >
          Touch the field
        </button>
      ) : null}

      <div className="grid grid-cols-4 gap-2">
        {DRIVES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="key"
            data-on={drive === item.id ? "true" : "false"}
            onClick={() => patch({ ovilusDrive: item.id })}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="flex flex-col">
        <span className="flex items-center justify-between text-sm text-muted">
          <span className="kicker">Sensitivity</span>
          <span className="tabular-nums text-fg">{Math.round(sensitivity * 100)}</span>
        </span>
        <input
          className="pot"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sensitivity}
          aria-label="Ovilus sensitivity"
          onChange={(event) => patch({ ovilusSensitivity: Number(event.target.value) })}
        />
      </label>
      <label className="flex flex-col">
        <span className="flex items-center justify-between text-sm text-muted">
          <span className="kicker">Minimum gap</span>
          <span className="tabular-nums text-fg">{gap.toFixed(2)} s</span>
        </span>
        <input
          className="pot"
          type="range"
          min={0.35}
          max={4}
          step={0.05}
          value={gap}
          aria-label="Minimum gap between words"
          onChange={(event) => patch({ ovilusGap: Number(event.target.value) })}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="kicker text-sm text-muted">Ask the field</span>
        <input
          className="field"
          value={question}
          maxLength={140}
          placeholder="Optional question for this session"
          onChange={(event) => patch({ question: event.target.value.slice(0, 140) })}
        />
      </label>

      <section className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm text-fg">{placeLabel(place)}</p>
            {place.source === "gps" && place.lat != null && place.lon != null ? (
              <p className="text-xs text-muted tabular-nums">
                {place.lat.toFixed(2)}°, {place.lon.toFixed(2)}°
              </p>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="key"
            data-on={followLocation ? "true" : "false"}
            onClick={() => {
              const mapped = langForCountry(place.countryCode);
              patch(mapped ? { followLocation: true, langKey: mapped } : { followLocation: true });
            }}
          >
            This place
          </button>
          <button
            type="button"
            className="key"
            data-on={!followLocation && langKey === "en" ? "true" : "false"}
            onClick={() => patch({ langKey: "en", followLocation: false })}
          >
            English
          </button>
        </div>
        <label className="flex flex-col gap-2">
          <span className="kicker text-sm text-muted">
            Lexicon · {lex.name} · {lex.words.length.toLocaleString()}
          </span>
          <select
            className="select"
            value={langKey}
            aria-label="Ovilus lexicon"
            onChange={(event) => patch({ langKey: event.target.value, followLocation: false })}
          >
            {allLexicons().map((item) => (
              <option key={item.code} value={item.code}>
                {item.name} · {item.nativeName} · {item.words.length.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="key inline-flex items-center justify-center gap-2" onClick={() => void onLocate()} disabled={locating}>
          <LocateFixed className="size-4" aria-hidden="true" />
          {locating ? "Locating" : "Use my location"}
        </button>
        <p className="text-sm text-muted">
          Location picks the language, the way a session on site would. English is a separate dictionary if you want the words in English. The phone speaks each word in that voice. The bank is fixed: a reading is an index, not a dice roll.
        </p>
        {hint ? <p className="text-sm text-fg">{hint}</p> : null}
        {geoNote ? <p className="text-sm text-amber">{geoNote}</p> : null}
        {voice === "missing" ? (
          <p className="text-sm text-amber">
            No {lex.name} voice is installed. Words still print. Add that language in the phone’s text-to-speech settings to hear it.
          </p>
        ) : null}
      </section>

      <details className="text-sm text-muted">
        <summary className="kicker cursor-pointer text-fg">How the Ovilus decides</summary>
        <p className="mt-2 leading-relaxed">
          It does not roll dice. Field mode quantizes the live magnetometer. Motion mode uses how the phone is tilted and moved. Sound mode uses the raw microphone, with noise reduction forced off, so a knock, a breath, or a change in the room picks the index. Blend uses every sensor that is actually live. A steady reading stays quiet. The same reading always lands on the same word in the lexicon. Phonetic mode builds syllables from that reading and speaks them in the selected language. Yes / No follows whether the energy rose or fell. Touch speaks once, from the reading at the moment you tap.
        </p>
      </details>
    </div>
  );
}
