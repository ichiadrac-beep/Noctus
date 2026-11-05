import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { allItems, type EvpClip } from "@/lib/phosphor/db";
import { encodeWav, playWav, renderFaint, stopPlayback } from "@/lib/phosphor/evp";
import { formatClock, formatDay } from "@/lib/phosphor/format";
import { usePhosphor } from "@/lib/phosphor/store";
import { ScreenHead, Segmented } from "@/components/noctum/chrome";
import { loadPrefs } from "@/components/noctum/prefs";

type Pane = "spectrogram" | "filters" | "enhance";

function Toggle({ on, label, hint, onToggle }: { on: boolean; label: string; hint: string; onToggle: () => void }) {
  return (
    <button type="button" className="panel flex items-center justify-between gap-3 px-4 py-3 text-left" onClick={onToggle}>
      <span>
        <span className="block text-sm text-fg">{label}</span>
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      </span>
      <span className="switch" data-on={on ? "true" : "false"} aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

async function shapedBlob(blob: Blob, opts: { nr: boolean; voice: boolean; clarity: boolean }): Promise<Blob> {
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    const source = audio.getChannelData(0);
    const lifted = opts.clarity ? renderFaint(source, audio.sampleRate, 0.9) : source;
    const offline = new OfflineAudioContext(1, lifted.length, audio.sampleRate);
    const buffer = offline.createBuffer(1, lifted.length, audio.sampleRate);
    buffer.getChannelData(0).set(lifted);
    const src = offline.createBufferSource();
    src.buffer = buffer;
    let node: AudioNode = src;
    if (opts.nr) {
      const hp = offline.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 140;
      node.connect(hp);
      node = hp;
    }
    if (opts.voice) {
      const bp = offline.createBiquadFilter();
      bp.type = "peaking";
      bp.frequency.value = 2200;
      bp.Q.value = 0.9;
      bp.gain.value = 8;
      node.connect(bp);
      node = bp;
    }
    node.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return encodeWav(rendered.getChannelData(0), rendered.sampleRate);
  } finally {
    await ctx.close().catch(() => {});
  }
}

function drawSpec(canvas: HTMLCanvasElement, samples: Float32Array, sampleRate: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cols = 64;
  const rows = 28;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#07070c";
  ctx.fillRect(0, 0, width, height);
  const win = Math.max(128, Math.floor(samples.length / cols));
  let peak = 1e-6;
  const grid: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const start = Math.min(samples.length - 1, c * Math.floor(samples.length / cols));
    const column = new Array<number>(rows).fill(0);
    for (let r = 0; r < rows; r++) {
      const freq = 80 * Math.pow(40, r / (rows - 1));
      const omega = (2 * Math.PI * freq) / sampleRate;
      let re = 0;
      let im = 0;
      const step = Math.max(1, Math.floor(win / 180));
      for (let n = 0; n < win; n += step) {
        const s = samples[start + n] ?? 0;
        re += s * Math.cos(omega * n);
        im -= s * Math.sin(omega * n);
      }
      const mag = Math.hypot(re, im) / (win / step);
      column[r] = mag;
      if (mag > peak) peak = mag;
    }
    grid.push(column);
  }
  const cw = width / cols;
  const rh = height / rows;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const mag = (grid[c]?.[rows - 1 - r] ?? 0) / peak;
      const alpha = Math.min(1, Math.pow(mag, 0.45));
      ctx.fillStyle = `rgba(155, 123, 255, ${alpha})`;
      ctx.fillRect(c * cw, r * rh, cw + 0.5, rh + 0.5);
    }
  }
}

export function PlayerScreen() {
  const setScreen = usePhosphor((s) => s.setScreen);
  const clipId = usePhosphor((s) => s.clipId);
  const [clip, setClip] = useState<EvpClip | null>(null);
  const [pane, setPane] = useState<Pane>("spectrogram");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [nr, setNr] = useState(false);
  const [voice, setVoice] = useState(false);
  const [clarity, setClarity] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefs = loadPrefs();

  useEffect(() => {
    let cancel = false;
    void allItems<EvpClip>("clips").then((rows) => {
      if (cancel) return;
      setClip(rows.find((row) => row.id === clipId) ?? null);
    });
    return () => {
      cancel = true;
      stopPlayback();
    };
  }, [clipId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !clip || !prefs.spec) return;
    let cancel = false;
    void (async () => {
      const ctx = new AudioContext();
      try {
        const audio = await ctx.decodeAudioData(await clip.blob.arrayBuffer());
        if (cancel) return;
        drawSpec(canvas, audio.getChannelData(0), audio.sampleRate);
      } catch {
        /* unreadable take */
      } finally {
        await ctx.close().catch(() => {});
      }
    })();
    return () => {
      cancel = true;
    };
  }, [clip, prefs.spec]);

  async function togglePlay() {
    if (!clip) return;
    if (playing) {
      stopPlayback();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    try {
      const blob = nr || voice || clarity ? await shapedBlob(clip.blob, { nr, voice, clarity }) : clip.blob;
      await playWav(blob, { rate: 1, reverse: false, normalize: true, loop: false, faint: 0 }, setProgress, () =>
        setPlaying(false),
      );
    } catch {
      setPlaying(false);
    }
  }

  if (!clip) {
    return (
      <div className="px-4 pb-8">
        <ScreenHead title="Recording" kicker="Analyse & review" onBack={() => setScreen("evp")} />
        <p className="panel p-4 text-sm text-muted">That take is not on this phone.</p>
      </div>
    );
  }

  const peaks = clip.peaks.length ? clip.peaks : [0.2];

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      <ScreenHead title="Recording player" kicker="Analyse & review" onBack={() => setScreen("evp")} onMenu={() => setScreen("settings")} />
      <div>
        <p className="text-sm text-fg">{clip.name}</p>
        <p className="mt-1 text-xs text-muted">{formatDay(clip.created)} · {formatClock(clip.duration)}</p>
      </div>
      {prefs.wave ? (
        <div className="relative h-16" aria-hidden="true">
          <div className="flex h-full items-center gap-px">
            {peaks.map((peak, index) => {
              const played = index / peaks.length <= progress;
              return (
                <span
                  key={index}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${Math.max(8, peak * 100)}%`,
                    background: played ? "var(--color-accent-2)" : "var(--color-line)",
                  }}
                />
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-accent-2"
            style={{ left: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}
      <div className="flex justify-between text-xs tabular-nums text-muted">
        <span>{formatClock(progress * clip.duration)}</span>
        <span>{formatClock(clip.duration)}</span>
      </div>
      <div className="flex items-center justify-center gap-6">
        <button type="button" className="round-btn" aria-label="Back to start" onClick={() => setProgress(0)}>
          <SkipBack className="size-4" />
        </button>
        <button type="button" className="round-btn" data-lg="true" aria-label={playing ? "Pause" : "Play"} onClick={() => void togglePlay()}>
          {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
        </button>
        <button type="button" className="round-btn" aria-label="End" onClick={() => { stopPlayback(); setPlaying(false); setProgress(1); }}>
          <SkipForward className="size-4" />
        </button>
      </div>
      <Segmented
        label="Review"
        value={pane}
        onChange={setPane}
        options={[
          { id: "spectrogram", label: "Spectrogram" },
          { id: "filters", label: "Filters" },
          { id: "enhance", label: "Enhance" },
        ]}
      />
      {pane === "spectrogram" && prefs.spec ? (
        <canvas ref={canvasRef} width={640} height={280} className="panel h-40 w-full" aria-label="Spectrogram" />
      ) : null}
      {pane === "spectrogram" && !prefs.spec ? <p className="text-sm text-muted">Spectrogram is hidden in settings.</p> : null}
      {pane === "filters" ? (
        <div className="flex flex-col gap-2">
          <Toggle on={nr} label="Noise reduction" hint="High-pass on playback only. The file is unchanged." onToggle={() => setNr((v) => !v)} />
          <Toggle on={voice} label="Voice filter" hint="A peak around 2.2 kHz, playback only." onToggle={() => setVoice((v) => !v)} />
        </div>
      ) : null}
      {pane === "enhance" ? (
        <Toggle
          on={clarity}
          label="Clarity boost"
          hint="Lifts quiet breaths and knocks on playback. Loud hits stay limited."
          onToggle={() => setClarity((v) => !v)}
        />
      ) : null}
    </div>
  );
}
