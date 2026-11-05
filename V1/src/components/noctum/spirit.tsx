import { useEffect, useRef, useState } from "react";
import { Pause, Radio, RotateCcw } from "lucide-react";
import { putItem, type SpiritSession } from "@/lib/phosphor/db";
import { formatFreq } from "@/lib/phosphor/format";
import { placeLabel } from "@/lib/phosphor/geo";
import { RadioEngine } from "@/lib/phosphor/radio";
import { usePhosphor, type Band } from "@/lib/phosphor/store";
import { ScreenHead, Segmented } from "@/components/noctum/chrome";

type Pace = "slow" | "medium" | "fast";
type Pane = "scan" | "band" | "history";

const PACES: { id: Pace; label: string; speed: number }[] = [
  { id: "slow", label: "Slow", speed: 4 },
  { id: "medium", label: "Medium", speed: 14 },
  { id: "fast", label: "Fast", speed: 28 },
];

type Pass = { id: string; t: number; freq: number; band: Band };

export function SpiritScreen() {
  const setScreen = usePhosphor((s) => s.setScreen);
  const band = usePhosphor((s) => s.band);
  const direction = usePhosphor((s) => s.direction);
  const speed = usePhosphor((s) => s.speed);
  const volume = usePhosphor((s) => s.volume);
  const boxOn = usePhosphor((s) => s.boxOn);
  const hold = usePhosphor((s) => s.hold);
  const patch = usePhosphor((s) => s.patch);
  const bumpLibrary = usePhosphor((s) => s.bumpLibrary);
  const engineRef = useRef<RadioEngine | null>(null);
  const sessionRef = useRef<SpiritSession | null>(null);
  const [pane, setPane] = useState<Pane>("scan");
  const [freq, setFreq] = useState(band === "FM" ? 87.5 : 530);
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 28 }, () => 0.08));
  const [passes, setPasses] = useState<Pass[]>([]);
  const [error, setError] = useState("");
  const lastLog = useRef(0);

  const pace = PACES.find((item) => item.speed === speed)?.id ?? "medium";
  const shown = formatFreq(band, freq);

  function apply(engine: RadioEngine) {
    const state = usePhosphor.getState();
    engine.band = state.band;
    engine.direction = state.direction;
    engine.speed = state.speed;
    engine.hold = state.hold || !state.boxOn;
    engine.words = [];
    engine.setVolume(state.volume);
  }

  useEffect(() => {
    const engine = new RadioEngine();
    engine.onFrame = (frame) => {
      setFreq(frame.freq);
      const next = engine.bars();
      if (next.length) setBars(next);
      const now = Date.now();
      if (!engine.hold && now - lastLog.current > 450) {
        lastLog.current = now;
        setPasses((list) =>
          [{ id: crypto.randomUUID(), t: now, freq: frame.freq, band: frame.band }, ...list].slice(0, 80),
        );
      }
    };
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (engine) apply(engine);
  });

  async function persist() {
    const session = sessionRef.current;
    if (!session) return;
    session.updated = Date.now();
    try {
      await putItem("sessions", session);
      bumpLibrary();
    } catch {
      /* the sweep still ran */
    }
  }

  async function toggleSweep() {
    const engine = engineRef.current;
    if (!engine) return;
    if (boxOn) {
      engine.stop();
      patch({ boxOn: false, hold: false });
      await persist();
      sessionRef.current = null;
      return;
    }
    setError("");
    apply(engine);
    engine.hold = false;
    try {
      await engine.start();
    } catch {
      setError("The sweep could not start. Tap the page and try again.");
      return;
    }
    const state = usePhosphor.getState();
    sessionRef.current = {
      id: crypto.randomUUID(),
      started: Date.now(),
      updated: Date.now(),
      place: placeLabel(state.place),
      countryCode: state.place.countryCode,
      lat: state.place.lat,
      lon: state.place.lon,
      lang: state.band,
      bcp47: state.band,
      question: `${state.band} channel sweep`,
      words: [],
    };
    patch({ boxOn: true, hold: false });
  }

  function step(dir: 1 | -1) {
    const engine = engineRef.current;
    if (!engine) return;
    apply(engine);
    engine.nudge(dir);
    patch({ direction: dir, hold: true });
    setFreq(engine.freq());
    setPasses((list) =>
      [{ id: crypto.randomUUID(), t: Date.now(), freq: engine.freq(), band: engine.band }, ...list].slice(0, 80),
    );
  }

  const min = band === "FM" ? 87.5 : 530;
  const span = band === "FM" ? 20.5 : 1180;
  const marks = band === "FM" ? [88, 96, 100, 104, 108] : [600, 800, 1000, 1400, 1600];

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      <ScreenHead title="Spirit box" kicker="Frequency scanner" onBack={() => setScreen("home")} onMenu={() => setScreen("settings")} />
      <Segmented
        label="Spirit box"
        value={pane}
        onChange={setPane}
        options={[
          { id: "scan", label: "Scan" },
          { id: "band", label: "Band" },
          { id: "history", label: "History" },
        ]}
      />

      {pane === "scan" ? (
        <>
          <div className="flex items-center justify-center gap-4 py-2">
            <button type="button" className="round-btn" aria-label="Previous channel" onClick={() => step(-1)}>
              <span className="text-lg" aria-hidden="true">‹</span>
            </button>
            <p className="freq-readout text-fg">
              {shown.value} <span className="text-xl text-muted">{shown.unit}</span>
            </p>
            <button type="button" className="round-btn" aria-label="Next channel" onClick={() => step(1)}>
              <span className="text-lg" aria-hidden="true">›</span>
            </button>
          </div>
          <div className="scale" aria-hidden="true">
            <div className="needle" style={{ left: `${Math.max(0, Math.min(1, (freq - min) / span)) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs tabular-nums text-muted">
            {marks.map((mark) => (
              <span key={mark}>{mark}</span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="panel flex flex-col gap-2 p-3">
              <span className="eyebrow">Sweep speed</span>
              <select
                className="select-lite"
                aria-label="Sweep speed"
                value={pace}
                onChange={(event) => {
                  const next = PACES.find((item) => item.id === event.target.value);
                  if (next) patch({ speed: next.speed });
                }}
              >
                {PACES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="panel flex flex-col gap-2 p-3">
              <span className="eyebrow">Scan range</span>
              <select
                className="select-lite"
                aria-label="Scan range"
                value={band}
                onChange={(event) => patch({ band: event.target.value === "AM" ? "AM" : "FM" })}
              >
                <option value="FM">FM (87.5–108)</option>
                <option value="AM">AM (530–1710)</option>
              </select>
            </label>
          </div>
          <div className="bars" aria-hidden="true">
            {bars.map((level, index) => (
              <span key={index} style={{ height: `${Math.max(8, Math.round(level * 100))}%` }} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-8 py-3">
            <button type="button" className="flex flex-col items-center gap-2 text-xs text-muted" onClick={() => void toggleSweep()}>
              <span className="round-btn" data-on={boxOn && !hold ? "true" : "false"}>
                <Radio className="size-4" aria-hidden="true" />
              </span>
              Auto sweep
            </button>
            <button
              type="button"
              className="flex flex-col items-center gap-2 text-xs text-muted"
              onClick={() => {
                if (!boxOn) {
                  void toggleSweep();
                  return;
                }
                patch({ hold: !hold });
              }}
            >
              <span className="round-btn" data-lg="true" data-on={boxOn && hold ? "true" : "false"}>
                <Pause className="size-6" />
              </span>
              Pause
            </button>
            <button
              type="button"
              className="flex flex-col items-center gap-2 text-xs text-muted"
              onClick={() => patch({ direction: direction === 1 ? -1 : 1 })}
            >
              <span className="round-btn" data-on={direction === -1 ? "true" : "false"}>
                <RotateCcw className="size-4" aria-hidden="true" />
              </span>
              Reverse
            </button>
          </div>
          <p className="text-center text-xs text-muted">
            {boxOn && !hold
              ? `Sweeping ${band} one channel at a time. No dictionary. What you hear is the tuner, not a spoken word.`
              : hold
                ? "Held on this channel. Arrows step one FM 0.1 MHz or AM 10 kHz channel."
                : "Auto sweep walks the real FM or AM channel spacing. It does not speak words."}
          </p>
          {error ? <p className="text-center text-sm text-rec">{error}</p> : null}
        </>
      ) : null}

      {pane === "band" ? (
        <section className="panel flex flex-col gap-4 p-4">
          <p className="text-sm text-muted">
            FM steps 100 kHz from 87.5 to 108.0 MHz. AM steps 10 kHz from 530 to 1710 kHz. A phone cannot open the hardware tuner, so the audio is the sweep itself: noise and a tone that move with the channel. It never reads the Ovilus dictionary.
          </p>
          <label className="flex flex-col gap-2">
            <span className="eyebrow">Level</span>
            <input
              className="pot"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              aria-label="Sweep level"
              onChange={(event) => patch({ volume: Number(event.target.value) })}
            />
          </label>
          <p className="text-sm text-fg">
            {band} · {shown.value} {shown.unit} · {direction === 1 ? "up the band" : "down the band"}
          </p>
        </section>
      ) : null}

      {pane === "history" ? (
        <section className="flex flex-col gap-2">
          {passes.length === 0 ? (
            <p className="panel p-4 text-sm text-muted">No channels yet. Start the sweep or step with the arrows.</p>
          ) : (
            passes.map((pass) => {
              const label = formatFreq(pass.band, pass.freq);
              const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(pass.t);
              return (
                <div key={pass.id} className="panel flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-fg">
                    {pass.band} {label.value} {label.unit}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{time}</span>
                </div>
              );
            })
          )}
        </section>
      ) : null}
    </div>
  );
}
