import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { putItem, type SpiritSession } from "@/lib/phosphor/db";
import { formatFreq } from "@/lib/phosphor/format";
import { geoErrorMessage, locateGps, placeLabel } from "@/lib/phosphor/geo";
import {
  COUNTRY_HINTS,
  allLexicons,
  bcp47For,
  langForCountry,
  lexiconByCode,
} from "@/lib/phosphor/lexicon";
import { RadioEngine, voiceStatus } from "@/lib/phosphor/radio";
import { usePhosphor } from "@/lib/phosphor/store";

export function SpiritBox() {
  const langKey = usePhosphor((s) => s.langKey);
  const followLocation = usePhosphor((s) => s.followLocation);
  const band = usePhosphor((s) => s.band);
  const direction = usePhosphor((s) => s.direction);
  const speed = usePhosphor((s) => s.speed);
  const density = usePhosphor((s) => s.density);
  const chop = usePhosphor((s) => s.chop);
  const volume = usePhosphor((s) => s.volume);
  const question = usePhosphor((s) => s.question);
  const place = usePhosphor((s) => s.place);
  const geoNote = usePhosphor((s) => s.geoNote);
  const boxOn = usePhosphor((s) => s.boxOn);
  const hold = usePhosphor((s) => s.hold);
  const fragments = usePhosphor((s) => s.fragments);
  const patch = usePhosphor((s) => s.patch);
  const setPlace = usePhosphor((s) => s.setPlace);
  const pushFragment = usePhosphor((s) => s.pushFragment);
  const resetFragments = usePhosphor((s) => s.resetFragments);
  const bumpLibrary = usePhosphor((s) => s.bumpLibrary);

  const engineRef = useRef<RadioEngine | null>(null);
  const sessionRef = useRef<SpiritSession | null>(null);
  const saveTimer = useRef(0);
  const [snap, setSnap] = useState({ freq: band === "FM" ? 87.5 : 530, pos: 0, lock: false });
  const [lastWord, setLastWord] = useState("");
  const [flash, setFlash] = useState(false);
  const [locating, setLocating] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [voice, setVoice] = useState<"ready" | "missing" | "unknown">("unknown");
  const uiTick = useRef(0);

  const lex = lexiconByCode(langKey);
  const bcp47 = bcp47For(langKey, place.countryCode);
  const shown = formatFreq(band, boxOn ? snap.freq : band === "FM" ? 87.5 : 530);
  const recent = fragments.slice(-6).reverse();
  const hint = COUNTRY_HINTS[place.countryCode];

  function applyEngine(engine: RadioEngine) {
    const state = usePhosphor.getState();
    engine.band = state.band;
    engine.direction = state.direction;
    engine.speed = state.speed;
    engine.density = state.density;
    engine.chop = state.chop;
    engine.hold = state.hold;
    engine.words = lexiconByCode(state.langKey).words;
    engine.bcp47 = bcp47For(state.langKey, state.place.countryCode);
    engine.setVolume(state.volume);
  }

  useEffect(() => {
    const engine = new RadioEngine();
    engine.onFrame = (frame) => {
      const now = performance.now();
      if (now - uiTick.current < 80) return;
      uiTick.current = now;
      setSnap({ freq: frame.freq, pos: frame.pos, lock: frame.lock });
    };
    engine.onWord = (hit) => {
      const fragment = {
        id: crypto.randomUUID(),
        t: Date.now(),
        word: hit.word,
        freq: hit.freq,
        band: hit.band,
      };
      pushFragment(fragment);
      setLastWord(hit.word);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 240);
      const session = sessionRef.current;
      if (!session) return;
      const state = usePhosphor.getState();
      session.words.push({
        t: fragment.t,
        word: fragment.word,
        freq: fragment.freq,
        band: fragment.band,
      });
      session.updated = Date.now();
      session.question = state.question;
      session.place = placeLabel(state.place);
      session.countryCode = state.place.countryCode;
      session.lat = state.place.lat;
      session.lon = state.place.lon;
      session.lang = lexiconByCode(state.langKey).name;
      session.bcp47 = bcp47For(state.langKey, state.place.countryCode);
      const snapshot: SpiritSession = {
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
    };
  }, [bumpLibrary, pushFragment]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    applyEngine(engine);
  }, [langKey, band, direction, speed, density, chop, volume, hold, place.countryCode]);

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
    if (boxOn) {
      engine.stop();
      patch({ boxOn: false });
      const session = sessionRef.current;
      if (session && session.words.length) {
        await putItem("sessions", {
          ...session,
          words: session.words.map((word) => ({ ...word })),
        }).catch(() => {});
        bumpLibrary();
      }
      return;
    }
    applyEngine(engine);
    try {
      await engine.start();
    } catch {
      setAudioError("Sound could not start. Tap power again.");
      return;
    }
    const state = usePhosphor.getState();
    const current = lexiconByCode(state.langKey);
    const id = crypto.randomUUID();
    sessionRef.current = {
      id,
      started: Date.now(),
      updated: Date.now(),
      place: placeLabel(state.place),
      countryCode: state.place.countryCode,
      lat: state.place.lat,
      lon: state.place.lon,
      lang: current.name,
      bcp47: bcp47For(state.langKey, state.place.countryCode),
      question: state.question,
      words: [],
    };
    resetFragments(id);
    setLastWord("");
    setAudioError("");
    patch({ boxOn: true });
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
        setPlace(next, "Place updated. Turn on Match where I am to switch the lexicon.");
      } else {
        setPlace(
          next,
          `No built-in lexicon for ${next.country || "this country"}. Choose a language.`,
        );
      }
    } catch (err) {
      setPlace(usePhosphor.getState().place, geoErrorMessage(err));
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <section className="crt px-4 py-4" aria-label="Spirit box display">
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between text-muted">
            <span className="kicker text-sm">{boxOn ? (snap.lock ? "Carrier" : "Sweep") : "Standby"}</span>
            <span className="kicker text-sm">
              {band} · {hold ? "Hold" : direction === 1 ? "Up" : "Down"}
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <p className="freq tabular-nums">{shown.value}</p>
            <p className="kicker pb-1 text-amber">{shown.unit}</p>
          </div>
          <div className="scale" aria-hidden="true">
            <div className="needle" style={{ left: `${(boxOn ? snap.pos : 0) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted tabular-nums">
            <span>{band === "FM" ? "87.5" : "530"}</span>
            <span>{band === "FM" ? "108.0" : "1710"}</span>
          </div>
          <p className="hit-word min-h-14 text-fg" data-flash={flash ? "true" : "false"} lang={bcp47}>
            {lastWord || (boxOn ? "Listening" : "Standby")}
          </p>
          <div className="flex min-h-8 flex-wrap gap-2">
            {recent.length === 0 ? (
              <span className="text-sm text-muted">Words from the {lex.nativeName} lexicon land here.</span>
            ) : (
              recent.map((fragment) => (
                <span key={fragment.id} className="chip" lang={bcp47}>
                  {fragment.word}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button type="button" className="power shrink-0" data-on={boxOn ? "true" : "false"} onClick={() => void togglePower()}>
          {boxOn ? "On" : "Off"}
        </button>
        <label className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center justify-between text-sm text-muted">
            <span className="kicker">Level</span>
            <span className="tabular-nums text-fg">{Math.round(volume * 100)}</span>
          </span>
          <input
            className="pot"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label="Volume"
            onChange={(event) => patch({ volume: Number(event.target.value) })}
          />
        </label>
      </div>
      {audioError ? <p className="text-sm text-rec">{audioError}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="key" data-on={band === "FM" ? "true" : "false"} onClick={() => patch({ band: "FM" })}>
          FM
        </button>
        <button type="button" className="key" data-on={band === "AM" ? "true" : "false"} onClick={() => patch({ band: "AM" })}>
          AM
        </button>
        <button
          type="button"
          className="key"
          data-on={direction === 1 ? "true" : "false"}
          onClick={() => patch({ direction: direction === 1 ? -1 : 1 })}
        >
          {direction === 1 ? "Sweep up" : "Sweep down"}
        </button>
        <button type="button" className="key" data-on={hold ? "true" : "false"} onClick={() => patch({ hold: !hold })}>
          {hold ? "Dial held" : "Hold dial"}
        </button>
        <button type="button" className="key col-span-2" data-on={chop ? "true" : "false"} onClick={() => patch({ chop: !chop })}>
          {chop ? "Chopped speech" : "Whole words"}
        </button>
      </div>

      <label className="flex flex-col">
        <span className="flex items-center justify-between text-sm text-muted">
          <span className="kicker">Sweep rate</span>
          <span className="tabular-nums text-fg">{speed.toFixed(0)} steps/s</span>
        </span>
        <input
          className="pot"
          type="range"
          min={4}
          max={40}
          step={1}
          value={speed}
          aria-label="Sweep rate"
          onChange={(event) => patch({ speed: Number(event.target.value) })}
        />
      </label>
      <label className="flex flex-col">
        <span className="flex items-center justify-between text-sm text-muted">
          <span className="kicker">Fragment rate</span>
          <span className="tabular-nums text-fg">{density.toFixed(2)} /s</span>
        </span>
        <input
          className="pot"
          type="range"
          min={0.2}
          max={5}
          step={0.05}
          value={density}
          aria-label="Fragment rate"
          onChange={(event) => patch({ density: Number(event.target.value) })}
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
        <label className="flex flex-col gap-2">
          <span className="kicker text-sm text-muted">Lexicon · {lex.words.length} words</span>
          <select
            className="select"
            value={langKey}
            aria-label="Lexicon language"
            onChange={(event) => patch({ langKey: event.target.value, followLocation: false })}
          >
            {allLexicons().map((item) => (
              <option key={item.code} value={item.code}>
                {item.name} · {item.nativeName} · {item.words.length.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm text-fg">
          <input
            type="checkbox"
            checked={followLocation}
            onChange={(event) => {
              const follow = event.target.checked;
              if (!follow) {
                patch({ followLocation: false });
                return;
              }
              const mapped = langForCountry(place.countryCode);
              patch(mapped ? { followLocation: true, langKey: mapped } : { followLocation: true });
            }}
          />
          Match where I am
        </label>
        <button type="button" className="key inline-flex items-center justify-center gap-2" onClick={() => void onLocate()} disabled={locating}>
          <LocateFixed className="size-4" aria-hidden="true" />
          {locating ? "Locating" : "Use my location"}
        </button>
        <p className="text-sm text-muted">
          Country sets the word bank, shared with the Ovilus. English in the UK, Spanish in Spain, Hindi in India, Sinhala in Sri Lanka.
          The phone speaks each hit in that language.
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
        <summary className="kicker cursor-pointer text-fg">How the sweep works</summary>
        <p className="mt-2 leading-relaxed">
          Phones do not hand apps the hardware FM or AM tuner, so Phosphor does not pretend to demodulate
          broadcast towers. It sweeps the real FM dial (87.5–108 MHz) or AM dial (530–1710 kHz) through a
          live static carrier, and gates a real lexicon for where you are. Chopped mode cuts each word the
          way a fast scan cuts a station. Sessions stay on this phone. Locating the country sends coordinates
          once to a geocoder and nothing else.
        </p>
      </details>
    </div>
  );
}
