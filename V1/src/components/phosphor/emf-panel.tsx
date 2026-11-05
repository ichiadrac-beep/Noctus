import { useEffect, useRef, useState } from "react";
import { putItem, type EmfTrace } from "@/lib/phosphor/db";
import { EmfMeter, lampLevel, type EmfReading } from "@/lib/phosphor/emf";
import { placeLabel } from "@/lib/phosphor/geo";
import { usePhosphor } from "@/lib/phosphor/store";

const MAX_SAMPLES = 20 * 60 * 8;

function FieldTrace({ values }: { values: number[] }) {
  const max = Math.max(20, ...values, 0);
  const points =
    values.length < 2
      ? ""
      : values
          .map((value, index) => {
            const x = (index / (values.length - 1)) * 100;
            const y = 38 - (value / max) * 34;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(" ");
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="h-28 w-full rounded-md border border-line bg-surface"
      role="img"
      aria-label="Magnetic field trace"
    >
      <line x1="0" y1="10" x2="100" y2="10" stroke="var(--color-line)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="20" x2="100" y2="20" stroke="var(--color-line)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="30" x2="100" y2="30" stroke="var(--color-line)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      {points ? (
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-amber)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}

export function EmfPanel() {
  const tab = usePhosphor((s) => s.tab);
  const recording = usePhosphor((s) => s.emfRecording);
  const setEmf = usePhosphor((s) => s.setEmf);
  const bumpLibrary = usePhosphor((s) => s.bumpLibrary);
  const meterRef = useRef<EmfMeter | null>(null);
  const traceRef = useRef<number[]>([]);
  const samplesRef = useRef<EmfReading[]>([]);
  const lastUt = useRef(0);
  const uiTick = useRef(0);
  const [trace, setTrace] = useState<number[]>([]);
  const [status, setStatus] = useState("Arm the magnetometer to read this phone’s magnetic field.");
  const [live, setLive] = useState(false);
  const [readout, setReadout] = useState({
    ut: 0,
    delta: 0,
    activity: 0,
    heading: null as number | null,
    x: 0,
    y: 0,
    z: 0,
  });
  const [zeroed, setZeroed] = useState(false);
  const [sensitivity, setSensitivity] = useState(1);
  const [peak, setPeak] = useState(0);
  const [error, setError] = useState("");

  function pushTrace(value: number) {
    const ring = traceRef.current;
    ring.push(value);
    if (ring.length > 180) ring.shift();
    setTrace(ring.slice());
  }

  async function finishTrace() {
    const samples = samplesRef.current;
    samplesRef.current = [];
    setEmf({ recording: false });
    if (samples.length < 2) return;
    const peakAbsMg = samples.reduce((max, sample) => Math.max(max, Math.abs(sample.deltaMg)), 0);
    const peakUt = samples.reduce((max, sample) => Math.max(max, sample.ut), 0);
    const place = usePhosphor.getState().place;
    const record: EmfTrace = {
      id: crypto.randomUUID(),
      started: samples[0]?.t ?? Date.now(),
      place: placeLabel(place),
      durationMs: (samples[samples.length - 1]?.t ?? 0) - (samples[0]?.t ?? 0),
      peakAbsMg,
      peakUt,
      samples: samples.map((sample) => ({
        t: sample.t,
        x: sample.x,
        y: sample.y,
        z: sample.z,
        ut: sample.ut,
        deltaMg: sample.deltaMg,
      })),
    };
    await putItem("traces", record).catch(() => {});
    bumpLibrary();
  }

  useEffect(() => {
    const meter = new EmfMeter();
    meter.onStatus = () => {
      setLive(meter.status === "live");
      setEmf({ live: meter.status === "live" });
      if (meter.message) setStatus(meter.message);
      else if (meter.status === "live") {
        setStatus("Reading the 3-axis magnetometer. Zero the room, then watch the deviation.");
      }
    };
    meter.onReading = (reading) => {
      lastUt.current = reading.ut;
      const drive = meter.isZeroed() ? Math.abs(reading.deltaMg) : reading.activityMg;
      pushTrace(drive);
      if (usePhosphor.getState().emfRecording) {
        samplesRef.current.push(reading);
        if (samplesRef.current.length >= MAX_SAMPLES) void finishTrace();
      }
      const now = performance.now();
      if (now - uiTick.current < 120) return;
      uiTick.current = now;
      setReadout({
        ut: reading.ut,
        delta: reading.deltaMg,
        activity: reading.activityMg,
        heading: reading.heading,
        x: reading.x,
        y: reading.y,
        z: reading.z,
      });
      setPeak((prev) => Math.max(prev, Math.abs(reading.deltaMg), reading.activityMg));
      setEmf({ live: true, ut: reading.ut, deltaMg: reading.deltaMg });
    };
    meterRef.current = meter;
    return () => {
      meter.stop();
      meterRef.current = null;
      setEmf({ live: false, recording: false });
    };
    // Meter callbacks close over the first finishTrace, which only touches refs and store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bumpLibrary, setEmf]);

  useEffect(() => {
    if (tab !== "emf" && !usePhosphor.getState().emfRecording) {
      meterRef.current?.stop();
      setLive(false);
      setEmf({ live: false });
    }
  }, [tab, setEmf]);

  const lights = lampLevel(zeroed ? readout.delta : readout.activity, sensitivity);
  const labels = ["2", "8", "25", "80", "200"];

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <section className="rounded-md border border-line bg-surface px-4 py-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="kicker text-sm text-muted">Field strength</p>
            <p className="font-mono text-5xl tabular-nums text-fg">{live ? readout.ut.toFixed(1) : "—"}</p>
          </div>
          <p className="kicker pb-2 text-amber">µT</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <p>
            <span className="kicker text-muted">Delta </span>
            <span className="tabular-nums text-fg">{zeroed ? `${readout.delta.toFixed(1)} mG` : "not zeroed"}</span>
          </p>
          <p>
            <span className="kicker text-muted">Activity </span>
            <span className="tabular-nums text-fg">{live ? `${readout.activity.toFixed(1)} mG` : "—"}</span>
          </p>
          <p>
            <span className="kicker text-muted">Peak </span>
            <span className="tabular-nums text-fg">{peak.toFixed(1)} mG</span>
          </p>
          <p>
            <span className="kicker text-muted">Bearing </span>
            <span className="tabular-nums text-fg">
              {readout.heading == null ? "—" : `${Math.round(readout.heading)}°`}
            </span>
          </p>
        </div>
        <p className="mt-3 text-xs text-muted tabular-nums">
          X {readout.x.toFixed(1)} · Y {readout.y.toFixed(1)} · Z {readout.z.toFixed(1)} µT
        </p>
      </section>

      <div className="grid grid-cols-5 gap-2" aria-label="Deviation lamps">
        {labels.map((label, index) => {
          const on = index < lights;
          const hot = on && index === 4;
          return (
            <div key={label} className="flex flex-col gap-1">
              <div className="lamp" data-on={on ? (hot ? "hot" : "mid") : "off"} />
              <span className="text-center text-xs text-muted tabular-nums">{label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">Lamp thresholds in milligauss, after sensitivity. 1 µT = 10 mG.</p>

      <FieldTrace values={trace} />

      <label className="flex flex-col">
        <span className="flex items-center justify-between text-sm text-muted">
          <span className="kicker">Sensitivity</span>
          <span className="tabular-nums text-fg">{sensitivity.toFixed(1)}×</span>
        </span>
        <input
          className="pot"
          type="range"
          min={0.5}
          max={6}
          step={0.1}
          value={sensitivity}
          aria-label="EMF sensitivity"
          onChange={(event) => setSensitivity(Number(event.target.value))}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="key"
          data-on={live ? "true" : "false"}
          onClick={() => {
            setError("");
            if (live) {
              if (recording) void finishTrace();
              meterRef.current?.stop();
              setLive(false);
              setEmf({ live: false });
              setStatus("Sensor stopped.");
              return;
            }
            void meterRef.current?.start();
          }}
        >
          {live ? "Stop sensor" : "Arm sensor"}
        </button>
        <button
          type="button"
          className="key"
          disabled={!live}
          onClick={() => {
            meterRef.current?.zero(lastUt.current);
            setZeroed(true);
            setPeak(0);
            setStatus("Room zeroed. Lamps now follow change from this field.");
          }}
        >
          Zero room
        </button>
        <button
          type="button"
          className="key"
          data-hot={recording ? "true" : "false"}
          disabled={!live && !recording}
          onClick={() => {
            if (recording) {
              void finishTrace();
              return;
            }
            samplesRef.current = [];
            setEmf({ recording: true });
          }}
        >
          {recording ? "Stop trace" : "Record trace"}
        </button>
        <button
          type="button"
          className="key"
          onClick={() => {
            setPeak(0);
            traceRef.current = [];
            setTrace([]);
          }}
        >
          Clear peak
        </button>
      </div>
      {error ? <p className="text-sm text-rec">{error}</p> : null}
      <p className="text-sm text-muted">{status}</p>
      <details className="text-sm text-muted">
        <summary className="kicker cursor-pointer text-fg">What this meter actually reads</summary>
        <p className="mt-2 leading-relaxed">
          This is the phone magnetometer, not a plug-in AC gaussmeter. It reports the magnetic field in
          microtesla. Earth’s field is usually about 25–65 µT and barely moves when you only turn the phone,
          because the number is the field strength, not the direction. Zero the room, then a magnet, a speaker,
          or steel changes the delta in milligauss. The trace saves raw X, Y, and Z so you can export it later.
          iPhone browsers do not expose field strength.
        </p>
      </details>
    </div>
  );
}
