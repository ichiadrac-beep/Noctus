import { useEffect, useRef, useState } from "react";
import { Bookmark, Pause, Square } from "lucide-react";
import { allItems, putItem, type EvpClip, type EvpMark } from "@/lib/phosphor/db";
import { encodeWav, EvpDeck, formatDb, listMics, peakEnvelope } from "@/lib/phosphor/evp";
import { formatClock } from "@/lib/phosphor/format";
import { usePhosphor } from "@/lib/phosphor/store";
import { ScreenHead, Segmented } from "@/components/noctum/chrome";

type Pane = "live" | "recordings" | "analysis";
type Sense = "low" | "medium" | "high";

const SENSE: Record<Sense, { gain: number; faint: number; on: boolean }> = {
  low: { gain: 8, faint: 0.2, on: false },
  medium: { gain: 24, faint: 0.45, on: true },
  high: { gain: 48, faint: 0.85, on: true },
};

function clipStamp(date: Date) {
  const p = (n: number) => n.toString().padStart(2, "0");
  return `EVP_${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}`;
}

export function EvpScreen() {
  const setScreen = usePhosphor((s) => s.setScreen);
  const openClip = usePhosphor((s) => s.openClip);
  const setEvp = usePhosphor((s) => s.setEvp);
  const bumpLibrary = usePhosphor((s) => s.bumpLibrary);
  const libraryTick = usePhosphor((s) => s.libraryTick);
  const deckRef = useRef<EvpDeck | null>(null);
  const marksRef = useRef<EvpMark[]>([]);
  const [pane, setPane] = useState<Pane>("live");
  const [armed, setArmed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [meter, setMeter] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 48 }, () => 0.04));
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [sense, setSense] = useState<Sense>("medium");
  const [error, setError] = useState("");
  const [markNote, setMarkNote] = useState("");
  const [clips, setClips] = useState<EvpClip[]>([]);

  useEffect(() => {
    const deck = new EvpDeck();
    const preset = SENSE.medium;
    deck.gainDb = preset.gain;
    deck.faint = preset.on;
    deck.faintAmount = preset.faint;
    deck.hpfHz = 80;
    deck.lpfHz = 7000;
    deck.monitor = false;
    deck.onMeter = (peak) => {
      setMeter(peak);
      const next = deck.timeBars(48);
      if (next.length) setBars(next);
    };
    deckRef.current = deck;
    void listMics().then(setMics).catch(() => {});
    return () => {
      deck.release();
      deckRef.current = null;
      setEvp({ recording: false, armed: false });
    };
  }, [setEvp]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setElapsed(deckRef.current?.elapsed() ?? 0), 200);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(() => {
    let cancel = false;
    void allItems<EvpClip>("clips")
      .then((rows) => {
        if (!cancel) setClips(rows.sort((a, b) => b.created - a.created));
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [libraryTick]);

  async function arm(nextId = deviceId) {
    const deck = deckRef.current;
    if (!deck) return;
    setError("");
    try {
      await deck.arm(nextId);
      deck.apply();
      setArmed(true);
      setEvp({ armed: true });
    } catch {
      setArmed(false);
      setEvp({ armed: false });
      setError("Microphone permission is required to record.");
    }
  }

  function applySense(next: Sense) {
    setSense(next);
    const deck = deckRef.current;
    const preset = SENSE[next];
    if (!deck) return;
    deck.gainDb = preset.gain;
    deck.faint = preset.on;
    deck.faintAmount = preset.faint;
    deck.apply();
  }

  function begin() {
    const deck = deckRef.current;
    if (!deck || !armed) return;
    marksRef.current = [];
    deck.start();
    setRecording(true);
    setPaused(false);
    setElapsed(deck.elapsed());
    setEvp({ recording: true });
  }

  async function finish() {
    const deck = deckRef.current;
    if (!deck || !recording) return;
    setRecording(false);
    setPaused(false);
    setEvp({ recording: false });
    const take = deck.stop();
    setElapsed(0);
    if (!take) return;
    const stamp = new Date();
    const clip: EvpClip = {
      id: crypto.randomUUID(),
      name: clipStamp(stamp),
      created: stamp.getTime(),
      duration: take.duration,
      sampleRate: take.sampleRate,
      gainDb: deck.gainDb,
      hpf: deck.hpfHz,
      lpf: Math.max(deck.lpfHz, deck.hpfHz + 200),
      peaks: peakEnvelope(take.samples),
      blob: encodeWav(take.samples, take.sampleRate),
      marks: marksRef.current.map((mark) => ({ ...mark })),
      faint: deck.faint,
      faintAmount: deck.faint ? deck.faintAmount : 0,
      preroll: 2,
    };
    try {
      await putItem("clips", clip);
      bumpLibrary();
      setPane("recordings");
    } catch {
      setError("This take could not be saved on the phone.");
    }
  }

  function dropMark() {
    const deck = deckRef.current;
    if (!deck || !recording) return;
    const note = markNote.trim() || "Mark";
    marksRef.current = [...marksRef.current, { at: deck.elapsed(), note }];
    setMarkNote("");
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      <ScreenHead
        title="EVP"
        kicker="Electronic voice phenomena"
        onBack={() => setScreen("home")}
        onMenu={() => setScreen("settings")}
      />
      <Segmented
        label="EVP"
        value={pane}
        onChange={setPane}
        options={[
          { id: "live", label: "Live" },
          { id: "recordings", label: "Recordings" },
          { id: "analysis", label: "Analysis" },
        ]}
      />

      {pane === "live" ? (
        <>
          <div className="py-4 text-center">
            <p className="freq-readout text-fg">{formatClock(elapsed)}</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted">
              {recording ? <i className="live-dot" /> : null}
              {recording ? (paused ? "Paused" : "Recording") : armed ? "Mic armed" : "Mic idle"}
            </p>
          </div>
          <div className="bars h-24" aria-label={`Level ${formatDb(meter)} dB`}>
            {bars.map((level, index) => (
              <span key={index} style={{ height: `${Math.max(6, Math.round(Math.min(1, level) * 100))}%` }} />
            ))}
          </div>
          {recording ? (
            <div className="flex gap-2">
              <input
                className="field-lite"
                value={markNote}
                maxLength={48}
                placeholder="Mark"
                aria-label="Mark label"
                onChange={(event) => setMarkNote(event.target.value)}
              />
            </div>
          ) : null}
          <div className="flex items-center justify-center gap-6 py-2">
            <button type="button" className="flex flex-col items-center gap-2 text-xs text-muted" disabled={!recording} onClick={dropMark}>
              <span className="round-btn">
                <Bookmark className="size-4" aria-hidden="true" />
              </span>
              Mark
            </button>
            <button
              type="button"
              className="flex flex-col items-center gap-2 text-xs text-muted"
              disabled={!recording}
              onClick={() => {
                const deck = deckRef.current;
                if (!deck) return;
                if (paused) {
                  deck.resume();
                  setPaused(false);
                } else {
                  deck.pause();
                  setPaused(true);
                }
              }}
            >
              <span className="round-btn" data-lg="true" data-on={recording && !paused ? "true" : "false"}>
                <Pause className="size-6" />
              </span>
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              className="flex flex-col items-center gap-2 text-xs text-muted"
              onClick={() => {
                if (recording) void finish();
                else if (armed) begin();
                else void arm();
              }}
            >
              <span className="round-btn" data-on={recording ? "true" : "false"}>
                <Square className="size-4" aria-hidden="true" />
              </span>
              {recording ? "Stop" : armed ? "Rec" : "Arm"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="panel flex flex-col gap-2 p-3">
              <span className="eyebrow">Input source</span>
              <select
                className="select-lite"
                aria-label="Microphone"
                value={deviceId}
                disabled={recording}
                onChange={(event) => {
                  const next = event.target.value;
                  setDeviceId(next);
                  if (armed) void arm(next);
                }}
              >
                <option value="">Built-in mic</option>
                {mics.map((mic, index) => (
                  <option key={mic.deviceId || index} value={mic.deviceId}>
                    {mic.label || `Microphone ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="panel flex flex-col gap-2 p-3">
              <span className="eyebrow">Sensitivity</span>
              <select
                className="select-lite"
                aria-label="Sensitivity"
                value={sense}
                onChange={(event) => applySense(event.target.value as Sense)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <p className="text-center text-xs text-muted">
            24-bit WAV. Echo cancel, noise reduction, and auto-gain stay off on the raw take. Two seconds of pre-roll are kept. High sensitivity lifts faint sound.
          </p>
          {error ? <p className="text-center text-sm text-rec">{error}</p> : null}
        </>
      ) : null}

      {pane === "recordings" ? (
        <div className="flex flex-col gap-2">
          {clips.length === 0 ? (
            <p className="panel p-4 text-sm text-muted">No takes yet. Arm the mic, then stop a recording.</p>
          ) : (
            clips.map((clip) => (
              <button key={clip.id} type="button" className="panel px-4 py-3 text-left" onClick={() => openClip(clip.id)}>
                <p className="text-sm text-fg">{clip.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatClock(clip.duration)} · {clip.sampleRate} Hz · 24-bit
                </p>
              </button>
            ))
          )}
        </div>
      ) : null}

      {pane === "analysis" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Open a take to see the waveform, spectrogram, noise reduction, voice filter, and clarity boost. Clarity boost is the faint-sound lift on playback. The saved file stays the raw 24-bit take.
          </p>
          {clips[0] ? (
            <button type="button" className="glow-btn" onClick={() => openClip(clips[0].id)}>
              Open latest take
            </button>
          ) : (
            <p className="panel p-4 text-sm text-muted">Record something first.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
