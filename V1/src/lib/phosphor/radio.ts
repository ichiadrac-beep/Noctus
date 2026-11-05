import type { Band } from "@/lib/phosphor/store";

export type RadioSnap = {
  freq: number;
  pos: number;
  band: Band;
  lock: boolean;
};

function voiceLang(lang: string): string {
  return lang.toLowerCase().replaceAll("_", "-");
}

function voiceMatches(voiceLangTag: string, bcp47: string): boolean {
  const tag = voiceLang(voiceLangTag);
  const want = bcp47.toLowerCase();
  const primary = want.split("-")[0] ?? "";
  if (tag === want || tag === primary || tag.startsWith(`${primary}-`)) return true;
  if (primary === "no" && (tag.startsWith("nb") || tag.startsWith("nn"))) return true;
  if ((primary === "tl" || primary === "fil") && (tag.startsWith("tl") || tag.startsWith("fil"))) {
    return true;
  }
  return false;
}

export function matchingVoice(bcp47: string): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  const exact = voices.find((voice) => voiceLang(voice.lang) === bcp47.toLowerCase());
  if (exact) return exact;
  return voices.find((voice) => voiceMatches(voice.lang, bcp47)) ?? null;
}

export function voiceStatus(bcp47: string): "ready" | "missing" | "unknown" {
  if (typeof speechSynthesis === "undefined") return "missing";
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return "unknown";
  return matchingVoice(bcp47) ? "ready" : "missing";
}

export class RadioEngine {
  band: Band = "FM";
  direction: 1 | -1 = 1;
  speed = 16;
  density = 0.65;
  chop = false;
  volume = 0.75;
  hold = false;
  words: string[] = [];
  bcp47 = "en-GB";
  onFrame: ((snap: RadioSnap) => void) | null = null;
  onWord: ((hit: { word: string; freq: number; band: Band }) => void) | null = null;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bp: BiquadFilterNode | null = null;
  private het: OscillatorNode | null = null;
  private noiseGain: GainNode | null = null;
  private hetGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private bins: Uint8Array<ArrayBuffer> | null = null;
  private running = false;
  private raf = 0;
  private last = 0;
  private stepAcc = 0;
  private hitAcc = 0;
  private pos = 0;
  private lockUntil = 0;
  private recent: string[] = [];
  private speakGen = 0;

  freq(): number {
    return this.band === "FM" ? 87.5 + this.pos * 20.5 : 530 + this.pos * 1180;
  }

  snap(): RadioSnap {
    return {
      freq: this.freq(),
      pos: this.pos,
      band: this.band,
      lock: performance.now() < this.lockUntil,
    };
  }

  private ensure() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 2.5;
    comp.attack.value = 0.005;
    comp.release.value = 0.12;
    const sum = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1200;
    bp.Q.value = 4;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.55;
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965;
      b2 = 0.57 * b2 + white * 1.052;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(sum);
    const het = ctx.createOscillator();
    het.type = "sine";
    het.frequency.value = 440;
    const hetGain = ctx.createGain();
    hetGain.gain.value = 0.03;
    het.connect(hetGain);
    hetGain.connect(sum);
    sum.connect(comp);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.65;
    comp.connect(analyser);
    analyser.connect(master);
    master.connect(ctx.destination);
    noise.start();
    het.start();
    this.ctx = ctx;
    this.master = master;
    this.bp = bp;
    this.het = het;
    this.noiseGain = noiseGain;
    this.hetGain = hetGain;
    this.analyser = analyser;
    this.bins = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  }

  async start() {
    this.ensure();
    if (!this.ctx || !this.master) return;
    await this.ctx.resume();
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.04);
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.stepAcc = 0;
    this.hitAcc = 0.8;
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!this.hold) {
        this.stepAcc += dt * this.speed;
        let guard = 0;
        while (this.stepAcc >= 1 && guard < 8) {
          this.stepAcc -= 1;
          this.advance();
          guard += 1;
        }
      }
      this.shape(now);
      this.onFrame?.(this.snap());
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.speakGen += 1;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    }
  }

  destroy() {
    this.stop();
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    if (ctx) void ctx.close().catch(() => {});
  }

  setVolume(value: number) {
    this.volume = value;
    if (this.ctx && this.master && this.running) {
      this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.03);
    }
  }

  private advance() {
    const span = this.band === "FM" ? 20.5 : 1180;
    const step = this.band === "FM" ? 0.1 : 10;
    this.pos += this.direction * (step / span);
    if (this.pos >= 1) this.pos -= 1;
    if (this.pos < 0) this.pos += 1;
  }

  private shape(now: number) {
    if (!this.bp || !this.het || !this.noiseGain || !this.hetGain) return;
    const lock = now < this.lockUntil;
    const pos = this.pos;
    if (this.band === "FM") {
      this.bp.frequency.value = 500 + pos * 4200 + (Math.random() * 80 - 40);
      this.bp.Q.value = lock ? 12 : 3.2 + Math.random() * 1.5;
      this.het.frequency.value = 220 + pos * 1400;
    } else {
      this.bp.frequency.value = 280 + pos * 1600 + (Math.random() * 40 - 20);
      this.bp.Q.value = lock ? 5 : 0.9 + Math.random() * 0.4;
      this.het.frequency.value = 140 + pos * 500;
    }
    const crackle = Math.random() < 0.08 ? 0.25 : 0;
    this.noiseGain.gain.value = (lock ? 0.38 : 0.62) + crackle;
    this.hetGain.gain.value = lock ? 0.055 : 0.02;
  }

  bars(): number[] {
    const analyser = this.analyser;
    const bins = this.bins;
    if (!analyser || !bins) return [];
    analyser.getByteFrequencyData(bins);
    const count = 28;
    const step = Math.max(1, Math.floor(bins.length / count));
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      let peak = 0;
      for (let k = 0; k < step; k++) peak = Math.max(peak, bins[i * step + k] ?? 0);
      out.push(peak / 255);
    }
    return out;
  }

  /** Step one real channel and stay there. FM is 100 kHz, AM is 10 kHz. */
  nudge(direction: 1 | -1) {
    this.direction = direction;
    this.hold = true;
    this.ensure();
    this.advance();
    this.shape(performance.now());
    if (this.ctx && this.master) {
      void this.ctx.resume();
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
    this.onFrame?.(this.snap());
  }
}
