import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Download, Pause, Play, Repeat, Square, Trash2 } from "lucide-react";
import { allItems, deleteItem, putItem, type EvpClip, type EvpMark } from "@/lib/phosphor/db";
import {
  EvpDeck,
  dbToGain,
  encodeWav,
  faintCeilingDb,
  formatDb,
  liftedWav,
  listMics,
  peakEnvelope,
  playWav,
  stopPlayback,
} from "@/lib/phosphor/evp";
import { downloadBlob, formatDay, formatDuration } from "@/lib/phosphor/format";
import { Waveform } from "@/components/phosphor/waveform";
import { usePhosphor } from "@/lib/phosphor/store";

function meterPercent(linear: number): number {
  if (!(linear > 1e-8)) return 0;
  const db = Math.max(-60, Math.min(0, 20 * Math.log10(linear)));
  return ((db + 60) / 60) * 100;
}

const MAX_SECONDS = 8 * 60;
const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const PRESETS: { id: string; label: string; hpf: number; lpf: number; faint?: number; gain?: number }[] = [
  { id: "full", label: "Full", hpf: 40, lpf: 14000 },
  { id: "speech", label: "Speech", hpf: 100, lpf: 3800 },
  { id: "whisper", label: "Whisper", hpf: 180, lpf: 7000, faint: 0.62 },
  { id: "knock", label: "Knock", hpf: 40, lpf: 450 },
  { id: "crack", label: "Crack", hpf: 160, lpf: 4800, faint: 1, gain: 54 },
];

export function EvpPanel() {
  const tab = usePhosphor((s) => s.tab);
  const libraryTick = usePhosphor((s) => s.libraryTick);
  const setEvp = usePhosphor((s) => s.setEvp);
  const bumpLibrary = usePhosphor((s) => s.bumpLibrary);
  const deckRef = useRef<EvpDeck | null>(null);
  const recordingRef = useRef(false);
  const finishRef = useRef<() => void>(() => {});
  const [armed, setArmed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [meter, setMeter] = useState(0);
  const [peakHold, setPeakHold] = useState(0);
  const [clipping, setClipping] = useState(false);
  const meterRef = useRef(0);
  const holdRef = useRef(0);
  const holdAt = useRef(0);
  const [gainDb, setGainDb] = useState(18);
  const [hpf, setHpf] = useState(80);
  const [lpf, setLpf] = useState(7000);
  const [monitor, setMonitor] = useState(false);
  const [monitorLevel, setMonitorLevel] = useState(0.8);
  const [faint, setFaint] = useState(false);
  const [faintAmount, setFaintAmount] = useState(0.7);
  const [marks, setMarks] = useState<EvpMark[]>([]);
  const [markNote, setMarkNote] = useState("");
  const [autoNote, setAutoNote] = useState("");
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [error, setError] = useState("");
  const [clips, setClips] = useState<EvpClip[]>([]);
  const [storageNote, setStorageNote] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [rate, setRate] = useState(1);
  const [reverse, setReverse] = useState(false);
  const [normalize, setNormalize] = useState(true);
  const [loop, setLoop] = useState(false);
  const [playLift, setPlayLift] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    const deck = new EvpDeck();
    deck.gainDb = gainDb;
    deck.hpfHz = hpf;
    deck.lpfHz = lpf;
    deck.monitor = monitor;
    deck.monitorLevel = monitorLevel;
    deck.faint = faint;
    deck.faintAmount = faintAmount;
    deck.onMeter = (peak, clip) => {
      meterRef.current = peak;
      setMeter(peak);
      setClipping(clip);
      const now = performance.now();
      if (peak >= holdRef.current) {
        holdRef.current = peak;
        holdAt.current = now;
        setPeakHold(peak);
      } else if (now - holdAt.current > 1600) {
        holdRef.current = peak;
        holdAt.current = now;
        setPeakHold(peak);
      }
      if (recordingRef.current) {
        const seconds = deck.elapsed();
        setElapsed(seconds);
        if (seconds >= MAX_SECONDS) void finishRef.current();
      }
    };
    deckRef.current = deck;
    return () => {
      recordingRef.current = false;
      deck.release();
      stopPlayback();
      deckRef.current = null;
      setEvp({ armed: false, recording: false });
    };
    // The deck is created once; later controls push into it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEvp]);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    deck.gainDb = gainDb;
    deck.hpfHz = hpf;
    deck.lpfHz = Math.max(lpf, hpf + 200);
    deck.monitor = monitor;
    deck.monitorLevel = monitorLevel;
    deck.faint = faint;
    deck.faintAmount = faintAmount;
    deck.apply();
  }, [gainDb, hpf, lpf, monitor, monitorLevel, faint, faintAmount]);

  useEffect(() => {
    if (tab !== "evp" && !recordingRef.current) {
      deckRef.current?.release();
      setArmed(false);
      setEvp({ armed: false });
    }
  }, [tab, setEvp]);

  useEffect(() => {
    let cancelled = false;
    void allItems<EvpClip>("clips")
      .then((rows) => {
        if (cancelled) return;
        setClips([...rows].sort((a, b) => b.created - a.created));
        setStorageNote("");
      })
      .catch(() => {
        if (!cancelled) setStorageNote("Takes could not be read from this phone.");
      });
    return () => {
      cancelled = true;
    };
  }, [libraryTick]);

  async function arm(nextDevice = deviceId) {
    setError("");
    try {
      await deckRef.current?.arm(nextDevice || undefined);
      const inputs = await listMics();
      setMics(inputs);
      setArmed(true);
      setEvp({ armed: true });
    } catch {
      setArmed(false);
      setEvp({ armed: false });
      setError("Microphone permission was denied, or no input is available.");
    }
  }

  function begin() {
    const deck = deckRef.current;
    if (!deck) return;
    setMarks([]);
    setPaused(false);
    deck.start();
    recordingRef.current = true;
    setRecording(true);
    setElapsed(deck.elapsed());
    setEvp({ recording: true });
  }

  function togglePause() {
    const deck = deckRef.current;
    if (!deck || !recordingRef.current) return;
    if (deck.isPaused) {
      deck.resume();
      setPaused(false);
    } else {
      deck.pause();
      setPaused(true);
      setElapsed(deck.elapsed());
    }
  }

  function dropMark() {
    const deck = deckRef.current;
    if (!deck || !recordingRef.current) return;
    const note = markNote.trim().slice(0, 48) || "mark";
    setMarks((prev) => [...prev, { at: deck.elapsed(), note }]);
    setMarkNote("");
  }

  async function autoLevel() {
    const deck = deckRef.current;
    if (!deck || !armed) {
      setAutoNote("Arm the microphone first.");
      return;
    }
    setAutoNote("Listening to the room…");
    const peaks: number[] = [];
    const started = performance.now();
    await new Promise((resolve) => {
      const id = window.setInterval(() => {
        peaks.push(meterRef.current);
        if (performance.now() - started >= 800) {
          window.clearInterval(id);
          resolve(null);
        }
      }, 40);
    });
    const peak = Math.max(...peaks, 0);
    if (!(peak > 1e-6)) {
      const next = Math.min(84, gainDb + 12);
      setGainDb(next);
      setAutoNote("The room was near silence. Gain stepped up 12 dB. Run it again.");
      return;
    }
    const peakDb = 20 * Math.log10(peak);
    const next = Math.round(Math.min(84, Math.max(-6, gainDb + (-20 - peakDb))));
    setGainDb(next);
    setAutoNote(`Gain set to ${next > 0 ? "+" : ""}${next} dB so this room sits near −20 dB.`);
  }

  async function finish() {
    const deck = deckRef.current;
    if (!deck || !recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    setPaused(false);
    setEvp({ recording: false });
    const take = deck.stop();
    setElapsed(0);
    if (!take) return;
    const peaks = peakEnvelope(take.samples);
    const blob = encodeWav(take.samples, take.sampleRate);
    const stamp = new Date();
    const clip: EvpClip = {
      id: crypto.randomUUID(),
      name: `EVP ${stamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`,
      created: stamp.getTime(),
      duration: take.duration,
      sampleRate: take.sampleRate,
      gainDb: deck.gainDb,
      hpf: deck.hpfHz,
      lpf: Math.max(deck.lpfHz, deck.hpfHz + 200),
      peaks,
      blob,
      marks: marks.map((mark) => ({ ...mark })),
      faint: deck.faint,
      faintAmount: deck.faint ? deck.faintAmount : 0,
      preroll: 2,
    };
    try {
      await putItem("clips", clip);
      bumpLibrary();
    } catch {
      setStorageNote("This take could not be saved on the phone.");
    }
  }
  finishRef.current = () => {
    void finish();
  };

  async function play(clip: EvpClip, offsetSec = 0) {
    if (playing === clip.id && offsetSec <= 0) {
      stopPlayback();
      setPlaying(null);
      setProgress(0);
      return;
    }
    setPlaying(clip.id);
    try {
      await playWav(
        clip.blob,
        {
          rate,
          reverse,
          normalize,
          loop,
          faint: playLift,
          offset: reverse ? 0 : offsetSec,
        },
        (ratio) => setProgress(ratio),
        () => setPlaying((current) => (current === clip.id ? null : current)),
      );
    } catch {
      setPlaying(null);
      setError("This take could not be played.");
    }
  }

  async function saveLifted(clip: EvpClip) {
    if (playLift <= 0.001) return;
    try {
      const blob = await liftedWav(clip.blob, playLift);
      downloadBlob(`${clip.name.replaceAll(" ", "-").toLowerCase()}-lifted.wav`, blob);
    } catch {
      setError("The lifted copy could not be made.");
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <section className="rounded-md border border-line bg-surface px-4 py-4">
        <p className="kicker text-sm text-muted">
          {recording ? (paused ? "Paused" : "Recording") : armed ? "Mic armed" : "Mic idle"}
        </p>
        <p className="mt-2 font-mono text-4xl tabular-nums text-fg">{formatDuration(elapsed)}</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="font-mono text-2xl tabular-nums text-fg">{formatDb(meter)} dB</p>
          <p className="text-xs tabular-nums text-muted">peak {formatDb(peakHold)}</p>
        </div>
        <div className="meter mt-3" aria-hidden="true">
          <div className="meter-fill" style={{ width: `${meterPercent(meter)}%` }} data-clip={clipping ? "true" : "false"} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {clipping
            ? "Clipping. Back the gain off. Crack already limits the peaks."
            : armed
              ? `24-bit. Echo cancel, noise reduction, and auto-gain are off. Pre-roll ${deckRef.current?.preRollSeconds().toFixed(1) ?? "0.0"} s.`
              : "Arm the mic. The file keeps the two seconds before you hit Rec."}
        </p>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="rec-btn shrink-0"
          data-on={recording ? "true" : "false"}
          disabled={!armed && !recording}
          onClick={() => {
            if (recording) void finish();
            else begin();
          }}
        >
          {recording ? "Stop" : "Rec"}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button type="button" className="key" data-on={armed ? "true" : "false"} onClick={() => void arm()} disabled={recording}>
            {armed ? "Rearm mic" : "Arm microphone"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="key inline-flex items-center justify-center gap-1" disabled={!recording} onClick={togglePause}>
              <Pause className="size-4" aria-hidden="true" />
              {paused ? "Resume" : "Pause"}
            </button>
            <button type="button" className="key" disabled={!armed || recording} onClick={() => void autoLevel()}>
              Auto level
            </button>
          </div>
        </div>
      </div>
      {autoNote ? <p className="text-sm text-muted">{autoNote}</p> : null}
      {error ? <p className="text-sm text-rec">{error}</p> : null}

      {recording ? (
        <div className="flex gap-2">
          <input
            className="field"
            value={markNote}
            maxLength={48}
            placeholder="Mark: question, knock, name"
            aria-label="Mark label"
            onChange={(event) => setMarkNote(event.target.value)}
          />
          <button type="button" className="key shrink-0" onClick={dropMark}>
            Mark
          </button>
        </div>
      ) : null}
      {recording && marks.length > 0 ? (
        <p className="text-xs text-muted">
          {marks.map((mark) => `${formatDuration(mark.at)} ${mark.note}`).join(" · ")}
        </p>
      ) : null}

      {mics.length > 1 ? (
        <label className="flex flex-col gap-2">
          <span className="kicker text-sm text-muted">Input</span>
          <select
            className="select"
            value={deviceId}
            aria-label="Microphone"
            disabled={recording}
            onChange={(event) => {
              const next = event.target.value;
              setDeviceId(next);
              if (armed) void arm(next);
            }}
          >
            <option value="">Default microphone</option>
            {mics.map((mic, index) => (
              <option key={mic.deviceId || index} value={mic.deviceId}>
                {mic.label || `Microphone ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex flex-col">
        <span className="flex items-center justify-between text-sm text-muted">
          <span className="kicker">Gain</span>
          <span className="tabular-nums text-fg">
            {gainDb > 0 ? "+" : ""}
            {gainDb} dB
          </span>
        </span>
        <input
          className="pot"
          type="range"
          min={-6}
          max={84}
          step={1}
          value={gainDb}
          aria-label="Recording gain"
          onChange={(event) => setGainDb(Number(event.target.value))}
        />
        <p className="text-xs text-muted">
          {gainDb > 0 ? "+" : ""}
          {gainDb} dB is ×{dbToGain(gainDb).toFixed(1)} before the lift.
        </p>
      </label>
      <label className="flex flex-col">
        <span className="flex items-center justify-between text-sm text-muted">
          <span className="kicker">High-pass</span>
          <span className="tabular-nums text-fg">{hpf} Hz</span>
        </span>
        <input
          className="pot"
          type="range"
          min={40}
          max={400}
          step={10}
          value={hpf}
          aria-label="High-pass filter"
          onChange={(event) => setHpf(Number(event.target.value))}
        />
      </label>
      <label className="flex flex-col">
        <span className="flex items-center justify-between text-sm text-muted">
          <span className="kicker">Low-pass</span>
          <span className="tabular-nums text-fg">{Math.max(lpf, hpf + 200)} Hz</span>
        </span>
        <input
          className="pot"
          type="range"
          min={2000}
          max={14000}
          step={100}
          value={lpf}
          aria-label="Low-pass filter"
          onChange={(event) => setLpf(Number(event.target.value))}
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="key"
            data-on={preset.id === "crack" && faint && faintAmount >= 0.99 ? "true" : "false"}
            onClick={() => {
              setHpf(preset.hpf);
              setLpf(preset.lpf);
              if (preset.gain != null) setGainDb(preset.gain);
              if (preset.faint != null) {
                setFaint(true);
                setFaintAmount(preset.faint);
                if (preset.faint >= 0.99) setPlayLift(1);
              }
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <section className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="kicker text-sm text-fg">Disembodied lift</p>
            <p className="mt-1 text-xs text-muted">
              Upward compression on the live mic. Quiet air, breaths, and knocks come up. Loud hits stay limited.
            </p>
          </div>
          <button type="button" className="key shrink-0" data-on={faint ? "true" : "false"} onClick={() => setFaint((value) => !value)}>
            {faint ? "On" : "Off"}
          </button>
        </div>
        <label className="flex flex-col">
          <span className="flex items-center justify-between text-sm text-muted">
            <span className="kicker">Amount</span>
            <span className="tabular-nums text-fg">{faintAmount >= 0.99 ? "Crack" : Math.round(faintAmount * 100)}</span>
          </span>
          <input
            className="pot"
            type="range"
            min={0.15}
            max={1}
            step={0.01}
            value={faintAmount}
            aria-label="Disembodied lift amount"
            disabled={!faint}
            onChange={(event) => setFaintAmount(Number(event.target.value))}
          />
        </label>
        <p className="text-xs text-muted">
          {faint
            ? `Quiet sounds can rise about ${faintCeilingDb(faintAmount)} dB, with a speech lift around 2.5 kHz. Crack pins the noise floor to the limiter.`
            : "Off. The take is gain and filters only."}
        </p>
        {faint && (faintAmount >= 0.85 || gainDb >= 48) ? (
          <p className="text-xs text-amber">Very hot. Use headphones. Hiss comes up with anything hiding in it.</p>
        ) : null}
      </section>
      <label className="flex items-center gap-3 text-sm text-fg">
        <input type="checkbox" checked={monitor} onChange={(event) => setMonitor(event.target.checked)} />
        Monitor through headphones
      </label>
      {monitor ? (
        <label className="flex flex-col">
          <span className="flex items-center justify-between text-sm text-muted">
            <span className="kicker">Headphone level</span>
            <span className="tabular-nums text-fg">{Math.round(monitorLevel * 100)}</span>
          </span>
          <input
            className="pot"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={monitorLevel}
            aria-label="Headphone monitor level"
            onChange={(event) => setMonitorLevel(Number(event.target.value))}
          />
        </label>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {RATES.map((value) => (
            <button key={value} type="button" className="key" data-on={rate === value ? "true" : "false"} onClick={() => setRate(value)}>
              {value === 1 ? "1×" : `${value}×`}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="key inline-flex items-center justify-center gap-2" data-on={reverse ? "true" : "false"} onClick={() => setReverse((v) => !v)}>
            <ArrowLeftRight className="size-4" aria-hidden="true" />
            Reverse
          </button>
          <button type="button" className="key" data-on={normalize ? "true" : "false"} onClick={() => setNormalize((v) => !v)}>
            Normalize
          </button>
          <button type="button" className="key inline-flex items-center justify-center gap-2" data-on={loop ? "true" : "false"} onClick={() => setLoop((v) => !v)}>
            <Repeat className="size-4" aria-hidden="true" />
            Loop
          </button>
        </div>
        <p className="text-xs text-muted">
          Raw WAV is the recorded file. Playback lift and a lifted download are extra, on top of whatever was printed.
          {reverse ? " Seek is off while reversed." : " Tap a waveform to jump."}
        </p>
        <label className="flex flex-col">
          <span className="flex items-center justify-between text-sm text-muted">
            <span className="kicker">Playback lift</span>
            <span className="tabular-nums text-fg">
              {playLift <= 0.001 ? "Off" : playLift >= 0.99 ? `Crack · ${faintCeilingDb(playLift)} dB` : `${Math.round(playLift * 100)} · ${faintCeilingDb(playLift)} dB`}
            </span>
          </span>
          <input
            className="pot"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={playLift}
            aria-label="Playback faint lift"
            onChange={(event) => setPlayLift(Number(event.target.value))}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="kicker text-fg">Takes</h2>
        {storageNote ? <p className="text-sm text-amber">{storageNote}</p> : null}
        {clips.length === 0 ? (
          <p className="text-sm text-muted">No takes yet. Arm the mic, set the gain, then record.</p>
        ) : (
          clips.map((clip) => (
            <article key={clip.id} className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm text-fg">{clip.name}</h3>
                  <p className="text-xs text-muted">
                    {formatDay(clip.created)} · {formatDuration(clip.duration)} · {clip.gainDb > 0 ? "+" : ""}
                    {clip.gainDb} dB · {clip.hpf}–{clip.lpf} Hz
                    {clip.faint ? ` · lift ${Math.round((clip.faintAmount ?? 0) * 100)}` : ""}
                    {clip.marks?.length ? ` · ${clip.marks.length} marks` : ""}
                  </p>
                </div>
                <p className="text-sm tabular-nums text-amber">{clip.sampleRate} Hz</p>
              </div>
              <Waveform
                peaks={clip.peaks}
                progress={playing === clip.id ? progress : -1}
                marks={(clip.marks ?? []).map((mark) => (clip.duration > 0 ? mark.at / clip.duration : 0))}
                label={`Waveform of ${clip.name}`}
                onSeek={
                  reverse || recording
                    ? undefined
                    : (ratio) => {
                        void play(clip, ratio * clip.duration);
                      }
                }
              />
              {clip.marks && clip.marks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {clip.marks.map((mark, index) => (
                    <button
                      key={`${mark.at}-${index}`}
                      type="button"
                      className="chip"
                      onClick={() => {
                        if (!recording) void play(clip, mark.at);
                      }}
                    >
                      {formatDuration(mark.at)} {mark.note}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="key inline-flex items-center justify-center gap-1" onClick={() => void play(clip)} disabled={recording}>
                  {playing === clip.id ? <Square className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
                  {playing === clip.id ? "Stop" : "Play"}
                </button>
                <button
                  type="button"
                  className="key inline-flex items-center justify-center gap-1"
                  onClick={() => downloadBlob(`${clip.name.replaceAll(" ", "-").toLowerCase()}.wav`, clip.blob)}
                >
                  <Download className="size-4" aria-hidden="true" />
                  WAV
                </button>
                <button
                  type="button"
                  className="key inline-flex items-center justify-center gap-1"
                  disabled={playLift <= 0.001}
                  onClick={() => void saveLifted(clip)}
                >
                  <Download className="size-4" aria-hidden="true" />
                  Lifted
                </button>
                <button
                  type="button"
                  className="key inline-flex items-center justify-center gap-1"
                  data-hot={pendingDelete === clip.id ? "true" : "false"}
                  onClick={() => {
                    if (pendingDelete !== clip.id) {
                      setPendingDelete(clip.id);
                      return;
                    }
                    void deleteItem("clips", clip.id)
                      .then(() => {
                        setPendingDelete(null);
                        bumpLibrary();
                      })
                      .catch(() => setStorageNote("Could not delete that take."));
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  {pendingDelete === clip.id ? "Confirm" : "Delete"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
