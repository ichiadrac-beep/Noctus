import { useEffect, useRef, useState } from "react";
import { putItem, type OvilusHit, type OvilusSession } from "@/lib/phosphor/db";
import { geoErrorMessage, locateGps, placeLabel } from "@/lib/phosphor/geo";
import { allLexicons, bcp47For, langForCountry, lexiconAnswers, lexiconByCode } from "@/lib/phosphor/lexicon";
import { OvilusEngine, phonemesFor, type OvilusFrame } from "@/lib/phosphor/ovilus";
import { voiceStatus } from "@/lib/phosphor/radio";
import { usePhosphor } from "@/lib/phosphor/store";
import { ScreenHead, Segmented } from "@/components/noctum/chrome";

type Pane = "live" | "history" | "categories";

const RATES = [
  { id: "slow", label: "Slow", gap: 12 },
  { id: "medium", label: "Medium", gap: 6 },
  { id: "fast", label: "Fast", gap: 3.5 },
] as const;

const empty: OvilusFrame = { score: 0, detail: "Sensor idle", sensors: "none", warning: "", armed: false };

function stamp(ms: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(ms);
}

export function OvilusScreen() {
  const setScreen = usePhosphor((s) => s.setScreen);
  const langKey = usePhosphor((s) => s.langKey);
  const followLocation = usePhosphor((s) => s.followLocation);
  const place = usePhosphor((s) => s.place);
  const mode = usePhosphor((s) => s.ovilusMode);
  const drive = usePhosphor((s) => s.ovilusDrive);
  const sensitivity = usePhosphor((s) => s.ovilusSensitivity);
  const gap = usePhosphor((s) => s.ovilusGap);
  const on = usePhosphor((s) => s.ovilusOn);
  const patch = usePhosphor((s) => s.patch);
  const setPlace = usePhosphor((s) => s.setPlace);
  const setOvilus = usePhosphor((s) => s.setOvilus);
  const bumpLibrary = usePhosphor((s) => s.bumpLibrary);
  const engineRef = useRef<OvilusEngine | null>(null);
  const sessionRef = useRef<OvilusSession | null>(null);
  const located = useRef(false);
  const [pane, setPane] = useState<Pane>("live");
  const [frame, setFrame] = useState<OvilusFrame>(empty);
  const [hits, setHits] = useState<OvilusHit[]>([]);
  const [error, setError] = useState("");
  const [voice, setVoice] = useState<"ready" | "missing" | "unknown">("unknown");

  const lex = lexiconByCode(langKey);
  const rate = RATES.find((item) => Math.abs(item.gap - gap) < 0.2)?.id ?? "medium";
  const bcp47 = bcp47For(langKey, place.countryCode);
  const last = hits[0];

  function apply(engine: OvilusEngine) {
    const state = usePhosphor.getState();
    const bank = lexiconByCode(state.langKey);
    engine.mode = state.ovilusMode;
    engine.drive = state.ovilusDrive;
    engine.sensitivity = state.ovilusSensitivity;
    engine.minGap = state.ovilusGap;
    engine.volume = state.ovilusVolume;
    engine.words = bank.words;
    engine.phonemes = phonemesFor(state.langKey);
    engine.answers = lexiconAnswers(state.langKey);
    engine.bcp47 = bcp47For(state.langKey, state.place.countryCode);
  }

  useEffect(() => {
    const engine = new OvilusEngine();
    engine.onFrame = (next) => setFrame(next);
    engine.onWord = (hit) => {
      const row: OvilusHit = {
        t: Date.now(),
        word: hit.word,
        mode: hit.mode,
        drive: hit.drive,
        energy: hit.energy,
      };
      setHits((list) => [row, ...list].slice(0, 40));
      const session = sessionRef.current;
      if (!session) return;
      session.words.push(row);
      session.updated = Date.now();
      void putItem("sessions", { ...session, words: session.words.map((word) => ({ ...word })) })
        .then(() => bumpLibrary())
        .catch(() => {});
    };
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [bumpLibrary]);

  useEffect(() => {
    const engine = engineRef.current;
    if (engine) apply(engine);
  });

  useEffect(() => {
    const sync = () => setVoice(voiceStatus(bcp47));
    sync();
    window.speechSynthesis?.addEventListener("voiceschanged", sync);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", sync);
  }, [bcp47]);

  useEffect(() => {
    if (located.current || !usePhosphor.getState().followLocation) return;
    located.current = true;
    void locateGps()
      .then((next) => {
        const mapped = langForCountry(next.countryCode);
        if (mapped && usePhosphor.getState().followLocation) {
          setPlace(next, "");
          patch({ langKey: mapped });
        } else {
          setPlace(next, "");
        }
      })
      .catch((err) => setError(geoErrorMessage(err)));
  }, [patch, setPlace]);

  async function toggle() {
    const engine = engineRef.current;
    if (!engine) return;
    if (on) {
      engine.stop();
      setOvilus(false);
      setFrame(empty);
      const session = sessionRef.current;
      if (session?.words.length) {
        await putItem("sessions", { ...session, words: session.words.map((word) => ({ ...word })) }).catch(() => {});
        bumpLibrary();
      }
      return;
    }
    apply(engine);
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
      question: "",
      mode: state.ovilusMode,
      drive: state.ovilusDrive,
      words: [],
    };
    setHits([]);
    setOvilus(true);
  }

  const quiet = on && frame.score < 0.2;
  const shown = last?.word || (on ? (quiet ? "Quiet" : "Listening") : "Standby");
  const dots = 12;
  const lit = Math.round(frame.score * dots);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      <ScreenHead title="Ovilus" kicker="Word generator" onBack={() => setScreen("home")} onMenu={() => setScreen("settings")} />
      <Segmented
        label="Ovilus"
        value={pane}
        onChange={setPane}
        options={[
          { id: "live", label: "Live" },
          { id: "history", label: "History" },
          { id: "categories", label: "Categories" },
        ]}
      />

      {pane === "live" ? (
        <>
          <section className="panel px-4 py-8">
            <p className="word-readout text-fg" lang={bcp47}>
              {shown}
            </p>
            <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
              {Array.from({ length: dots }, (_, index) => (
                <i key={index} className="live-dot" style={{ opacity: index < lit ? 1 : 0.2 }} />
              ))}
            </div>
          </section>
          <div className="flex items-center justify-between">
            <p className="text-sm text-fg">Recent words</p>
            <button type="button" className="text-sm text-accent-2" onClick={() => setHits([])}>
              Clear
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {hits.length === 0 ? (
              <p className="panel px-4 py-3 text-sm text-muted">
                Nothing yet. A word appears only when the reading changes, and never on a one-second clock.
              </p>
            ) : (
              hits.slice(0, 6).map((hit) => (
                <div key={`${hit.t}-${hit.word}`} className="panel flex items-center justify-between px-4 py-3">
                  <span className="text-sm tracking-widest text-fg uppercase">{hit.word}</span>
                  <span className="text-xs tabular-nums text-muted">{stamp(hit.t)}</span>
                </div>
              ))
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="panel flex flex-col gap-2 p-3">
              <span className="eyebrow">Dictionary</span>
              <select
                className="select-lite"
                aria-label="Dictionary mode"
                value={mode === "phonetic" ? "phonetic" : mode === "energy" ? "energy" : "dictionary"}
                onChange={(event) => {
                  const value = event.target.value;
                  patch({
                    ovilusMode: value === "phonetic" ? "phonetic" : value === "energy" ? "energy" : "dictionary",
                  });
                }}
              >
                <option value="dictionary">Standard</option>
                <option value="phonetic">Phonetic</option>
                <option value="energy">Yes / No</option>
              </select>
            </label>
            <label className="panel flex flex-col gap-2 p-3">
              <span className="eyebrow">Response rate</span>
              <select
                className="select-lite"
                aria-label="Response rate"
                value={rate}
                onChange={(event) => {
                  const next = RATES.find((item) => item.id === event.target.value);
                  if (next) patch({ ovilusGap: next.gap });
                }}
              >
                {RATES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="button" className="glow-btn" onClick={() => void toggle()}>
            <span aria-hidden="true">{on ? "■" : "▶"}</span>
            {on ? "Stop" : "Start"}
          </button>
          {error ? <p className="text-sm text-rec">{error}</p> : null}
          {voice === "missing" ? (
            <p className="text-sm text-amber">No {lex.name} voice is installed. Words still print.</p>
          ) : null}
        </>
      ) : null}

      {pane === "history" ? (
        <div className="flex flex-col gap-2">
          {hits.length === 0 ? (
            <p className="panel p-4 text-sm text-muted">History fills as the field changes.</p>
          ) : (
            hits.map((hit) => (
              <div key={`${hit.t}-${hit.word}`} className="panel flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm tracking-widest text-fg uppercase">{hit.word}</p>
                  <p className="text-xs text-muted">{hit.drive}</p>
                </div>
                <span className="text-xs tabular-nums text-muted">{stamp(hit.t)}</span>
              </div>
            ))
          )}
        </div>
      ) : null}

      {pane === "categories" ? (
        <div className="flex flex-col gap-3">
          <label className="panel flex flex-col gap-2 p-4">
            <span className="eyebrow">Language · {lex.words.length.toLocaleString()} words</span>
            <select
              className="select-lite"
              aria-label="Ovilus language"
              value={langKey}
              onChange={(event) => patch({ langKey: event.target.value, followLocation: false })}
            >
              {allLexicons().map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name} · {item.nativeName}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="tool-card"
              data-on={followLocation ? "true" : "false"}
              onClick={() => {
                const mapped = langForCountry(place.countryCode);
                patch(mapped ? { followLocation: true, langKey: mapped } : { followLocation: true });
              }}
            >
              <span className="eyebrow text-fg">This place</span>
            </button>
            <button
              type="button"
              className="tool-card"
              data-on={!followLocation && langKey === "en" ? "true" : "false"}
              onClick={() => patch({ langKey: "en", followLocation: false })}
            >
              <span className="eyebrow text-fg">English</span>
            </button>
          </div>
          <label className="panel flex flex-col gap-2 p-4">
            <span className="eyebrow">What it listens to</span>
            <select
              className="select-lite"
              aria-label="Ovilus sensor"
              value={drive}
              onChange={(event) =>
                patch({
                  ovilusDrive:
                    event.target.value === "field" || event.target.value === "motion" || event.target.value === "sound"
                      ? event.target.value
                      : "blend",
                })
              }
            >
              <option value="blend">Field, motion, and sound</option>
              <option value="field">Magnetometer</option>
              <option value="motion">Motion</option>
              <option value="sound">Microphone</option>
            </select>
          </label>
          <label className="panel flex flex-col gap-2 p-4">
            <span className="eyebrow">Sensitivity</span>
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
          <p className="text-sm text-muted">
            {lex.name} is a fixed bank. The same sensor reading always selects the same word. Fast still waits 3.5 seconds, and only after the reading itself changes. A steady room stays quiet.
          </p>
          {frame.warning ? <p className="text-sm text-amber">{frame.warning}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
