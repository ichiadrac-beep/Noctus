const WORKLET = `
class EvpProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.env = 0;
    this.gainSm = 1;
    this.amount = 0;
    this.enabled = false;
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;
    this.tuned = -1;
    this.port.onmessage = (event) => {
      const data = event.data || {};
      this.amount = typeof data.amount === "number" ? data.amount : 0;
      this.enabled = Boolean(data.enabled) && this.amount > 0.001;
    };
  }
  design(amount) {
    if (this.tuned === amount) return;
    this.tuned = amount;
    const gainDb = amount * (6 + amount * 10);
    const A = Math.pow(10, gainDb / 40);
    const w0 = (2 * Math.PI * 2500) / sampleRate;
    const alpha = Math.sin(w0) / (2 * 0.85);
    const cos = Math.cos(w0);
    const b0 = 1 + alpha * A;
    const b1 = -2 * cos;
    const b2 = 1 - alpha * A;
    const a0 = 1 + alpha / A;
    const a1 = -2 * cos;
    const a2 = 1 - alpha / A;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }
  process(inputs, outputs) {
    const input = inputs[0] && inputs[0][0];
    const output = outputs[0] && outputs[0][0];
    if (!input || !output) return true;
    const enabled = this.enabled;
    if (enabled) this.design(this.amount);
    const amount = this.amount;
    const att = 1 - Math.exp(-1 / (sampleRate * 0.006));
    const rel = 1 - Math.exp(-1 / (sampleRate * (0.14 + amount * 0.4)));
    const gAtt = 1 - Math.exp(-1 / (sampleRate * 0.008));
    const gRel = 1 - Math.exp(-1 / (sampleRate * (0.2 + amount * 0.5)));
    const hot = amount * amount;
    const threshold = -36 + amount * 30;
    const maxBoost = 16 + amount * 40 + hot * 70;
    const knee = 0.45 + amount * 0.6;
    for (let i = 0; i < input.length; i++) {
      const x = input[i];
      let y = x;
      if (enabled) {
        const shaped = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
        this.x2 = this.x1;
        this.x1 = x;
        this.y2 = this.y1;
        this.y1 = shaped;
        const ax = Math.abs(shaped);
        const c = ax > this.env ? att : rel;
        this.env += c * (ax - this.env);
        const env = this.env < 1e-8 ? 1e-8 : this.env;
        const envDb = 20 * Math.log(env) / Math.LN10;
        let boost = 0;
        if (envDb < threshold) {
          boost = (threshold - envDb) * knee;
          if (boost > maxBoost) boost = maxBoost;
        }
        const g = Math.pow(10, boost / 20);
        const gc = g > this.gainSm ? gAtt : gRel;
        this.gainSm += gc * (g - this.gainSm);
        y = shaped * this.gainSm;
        const ay = y < 0 ? -y : y;
        if (ay > 0.5) {
          const over = ay - 0.5;
          const sign = y < 0 ? -1 : 1;
          y = sign * (0.5 + 0.46 * (over / (0.25 + over)));
        }
      }
      output[i] = y;
    }
    const copy = new Float32Array(output.length);
    copy.set(output);
    this.port.postMessage(copy, [copy.buffer]);
    return true;
  }
}
registerProcessor("evp-processor", EvpProcessor);
`;

export type EvpTake = {
  samples: Float32Array;
  sampleRate: number;
  duration: number;
  clipped: boolean;
};

export type FaintState = {
  env: number;
  gain: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
  amount: number;
  rate: number;
};

export function createFaintState(): FaintState {
  return {
    env: 0,
    gain: 1,
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0,
    b0: 1,
    b1: 0,
    b2: 0,
    a1: 0,
    a2: 0,
    amount: -1,
    rate: 0,
  };
}

function designPresence(state: FaintState, sampleRate: number, amount: number) {
  if (state.rate === sampleRate && state.amount === amount) return;
  state.rate = sampleRate;
  state.amount = amount;
  const gainDb = amount * (6 + amount * 10);
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * 2500) / sampleRate;
  const alpha = Math.sin(w0) / (2 * 0.85);
  const cos = Math.cos(w0);
  const b0 = 1 + alpha * A;
  const b1 = -2 * cos;
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * cos;
  const a2 = 1 - alpha / A;
  state.b0 = b0 / a0;
  state.b1 = b1 / a0;
  state.b2 = b2 / a0;
  state.a1 = a1 / a0;
  state.a2 = a2 / a0;
}

export function applyFaint(
  input: Float32Array,
  output: Float32Array,
  sampleRate: number,
  amount: number,
  enabled: boolean,
  state: FaintState,
) {
  const n = Math.min(input.length, output.length);
  if (!enabled || amount <= 0.001) {
    for (let i = 0; i < n; i++) output[i] = input[i] ?? 0;
    return;
  }
  designPresence(state, sampleRate, amount);
  const att = 1 - Math.exp(-1 / (sampleRate * 0.006));
  const rel = 1 - Math.exp(-1 / (sampleRate * (0.14 + amount * 0.4)));
  const gAtt = 1 - Math.exp(-1 / (sampleRate * 0.008));
  const gRel = 1 - Math.exp(-1 / (sampleRate * (0.2 + amount * 0.5)));
  const hot = amount * amount;
  const threshold = -36 + amount * 30;
  const maxBoost = 16 + amount * 40 + hot * 70;
  const knee = 0.45 + amount * 0.6;
  for (let i = 0; i < n; i++) {
    const x = input[i] ?? 0;
    const shaped = state.b0 * x + state.b1 * state.x1 + state.b2 * state.x2 - state.a1 * state.y1 - state.a2 * state.y2;
    state.x2 = state.x1;
    state.x1 = x;
    state.y2 = state.y1;
    state.y1 = shaped;
    const ax = Math.abs(shaped);
    const coeff = ax > state.env ? att : rel;
    state.env += coeff * (ax - state.env);
    const env = Math.max(state.env, 1e-8);
    const envDb = 20 * Math.log10(env);
    let boost = 0;
    if (envDb < threshold) {
      boost = (threshold - envDb) * knee;
      if (boost > maxBoost) boost = maxBoost;
    }
    const g = Math.pow(10, boost / 20);
    const gc = g > state.gain ? gAtt : gRel;
    state.gain += gc * (g - state.gain);
    let y = shaped * state.gain;
    const ay = Math.abs(y);
    if (ay > 0.5) {
      const over = ay - 0.5;
      const sign = y < 0 ? -1 : 1;
      y = sign * (0.5 + 0.46 * (over / (0.25 + over)));
    }
    output[i] = y;
  }
}

export function renderFaint(samples: Float32Array, sampleRate: number, amount: number): Float32Array {
  const out = new Float32Array(samples.length);
  applyFaint(samples, out, sampleRate, amount, amount > 0.001, createFaintState());
  return out;
}

export function faintCeilingDb(amount: number): number {
  const a = Math.max(0, Math.min(1, amount));
  const hot = a * a;
  return Math.round(16 + a * 40 + hot * 70);
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPer = 3;
  const dataSize = samples.length * bytesPer;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPer, true);
  view.setUint16(32, bytesPer, true);
  view.setUint16(34, 24, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    let v = s < 0 ? Math.round(s * 0x800000) : Math.round(s * 0x7fffff);
    if (v < -0x800000) v = -0x800000;
    if (v > 0x7fffff) v = 0x7fffff;
    view.setUint8(offset, v & 0xff);
    view.setUint8(offset + 1, (v >> 8) & 0xff);
    view.setUint8(offset + 2, (v >> 16) & 0xff);
    offset += 3;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function peakEnvelope(samples: Float32Array, bars = 96): number[] {
  const out: number[] = [];
  if (!samples.length) return out;
  const size = Math.max(1, Math.floor(samples.length / bars));
  const count = Math.min(bars, Math.ceil(samples.length / size));
  for (let i = 0; i < count; i++) {
    let max = 0;
    const start = i * size;
    const end = Math.min(samples.length, start + size);
    for (let j = start; j < end; j++) max = Math.max(max, Math.abs(samples[j] ?? 0));
    out.push(max);
  }
  return out;
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function formatDb(linear: number): string {
  if (!(linear > 1e-8)) return "−∞";
  const db = 20 * Math.log10(linear);
  const text = Math.abs(db).toFixed(1);
  return db >= 0 ? `+${text}` : `−${text}`;
}

type MeterHandler = (peak: number, clip: boolean) => void;

export class EvpDeck {
  gainDb = 18;
  hpfHz = 80;
  lpfHz = 7000;
  monitor = false;
  monitorLevel = 0.8;
  faint = false;
  faintAmount = 0.65;
  onMeter: MeterHandler | null = null;

  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private hp: BiquadFilterNode | null = null;
  private lp: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private monitorGain: GainNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private pre: Float32Array[] = [];
  private preSamples = 0;
  private recording = false;
  private paused = false;
  private started = 0;
  private pauseBegan = 0;
  private pausedAccum = 0;
  private clipped = false;
  private raf = 0;
  private meterBuf: Float32Array | null = null;
  private faintState = createFaintState();

  get isRecording(): boolean {
    return this.recording;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 48000;
  }

  preRollSeconds(): number {
    if (!this.sampleRate) return 0;
    return Math.min(2, this.preSamples / this.sampleRate);
  }

  elapsed(): number {
    if (!this.recording) return 0;
    const end = this.paused ? this.pauseBegan : performance.now();
    return Math.max(0, (end - this.started - this.pausedAccum) / 1000);
  }

  async arm(deviceId?: string) {
    this.release();
    const audio: MediaTrackConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    };
    if (deviceId) audio.deviceId = { exact: deviceId };
    const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = this.hpfHz;
    hp.Q.value = 0.7;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = this.lpfHz;
    lp.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = dbToGain(this.gainDb);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    const monitorGain = ctx.createGain();
    monitorGain.gain.value = this.monitor ? this.monitorLevel : 0;
    source.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    this.ctx = ctx;
    this.stream = stream;
    this.source = source;
    this.hp = hp;
    this.lp = lp;
    this.gain = gain;
    this.analyser = analyser;
    this.monitorGain = monitorGain;
    this.meterBuf = new Float32Array(analyser.fftSize);
    this.faintState = createFaintState();
    const capture = await this.attachCapture(ctx, gain);
    capture.connect(analyser);
    analyser.connect(monitorGain);
    monitorGain.connect(ctx.destination);
    this.apply();
    await ctx.resume();
    this.loopMeter();
  }

  private async attachCapture(ctx: AudioContext, gain: GainNode): Promise<AudioNode> {
    try {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(ctx, "evp-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      node.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (event.data instanceof Float32Array) this.pushChunk(event.data);
      };
      node.port.postMessage({ enabled: this.faint, amount: this.faintAmount });
      gain.connect(node);
      this.worklet = node;
      return node;
    } catch {
      /* ScriptProcessor fallback */
    }
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const output = event.outputBuffer.getChannelData(0);
      applyFaint(input, output, ctx.sampleRate, this.faintAmount, this.faint, this.faintState);
      this.pushChunk(new Float32Array(output));
    };
    gain.connect(processor);
    this.processor = processor;
    return processor;
  }

  private pushChunk(chunk: Float32Array) {
    if (!chunk.length) return;
    this.pre.push(chunk);
    this.preSamples += chunk.length;
    const max = Math.floor(this.sampleRate * 2);
    while (this.preSamples > max && this.pre.length > 1) {
      const drop = this.pre.shift();
      if (drop) this.preSamples -= drop.length;
    }
    if (this.recording && !this.paused) this.chunks.push(chunk);
  }

  private loopMeter = () => {
    if (!this.analyser || !this.meterBuf) return;
    this.analyser.getFloatTimeDomainData(this.meterBuf as Float32Array<ArrayBuffer>);
    let peak = 0;
    for (let i = 0; i < this.meterBuf.length; i++) {
      peak = Math.max(peak, Math.abs(this.meterBuf[i] ?? 0));
    }
    const clip = peak >= 0.98;
    if (clip && this.recording && !this.paused) this.clipped = true;
    this.onMeter?.(peak, clip);
    this.raf = requestAnimationFrame(this.loopMeter);
  };

  timeBars(count = 48): number[] {
    const buf = this.meterBuf;
    if (!buf || count < 1) return [];
    const step = Math.max(1, Math.floor(buf.length / count));
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      let local = 0;
      for (let k = 0; k < step; k++) local = Math.max(local, Math.abs(buf[i * step + k] ?? 0));
      out.push(local);
    }
    return out;
  }

  apply() {
    if (!this.ctx || !this.hp || !this.lp || !this.gain || !this.monitorGain) return;
    const now = this.ctx.currentTime;
    const lpf = Math.max(this.lpfHz, this.hpfHz + 200);
    this.hp.frequency.setTargetAtTime(this.hpfHz, now, 0.02);
    this.lp.frequency.setTargetAtTime(lpf, now, 0.02);
    this.gain.gain.setTargetAtTime(dbToGain(this.gainDb), now, 0.02);
    this.monitorGain.gain.setTargetAtTime(this.monitor ? Math.max(0, Math.min(1, this.monitorLevel)) : 0, now, 0.02);
    this.worklet?.port.postMessage({ enabled: this.faint, amount: this.faintAmount });
  }

  start() {
    const seeded = this.pre.map((chunk) => new Float32Array(chunk));
    let preCount = 0;
    for (const chunk of seeded) preCount += chunk.length;
    this.chunks = seeded;
    this.clipped = false;
    this.paused = false;
    this.pausedAccum = 0;
    this.pauseBegan = 0;
    const preSec = this.sampleRate ? preCount / this.sampleRate : 0;
    this.started = performance.now() - preSec * 1000;
    this.recording = true;
  }

  pause() {
    if (!this.recording || this.paused) return;
    this.paused = true;
    this.pauseBegan = performance.now();
  }

  resume() {
    if (!this.recording || !this.paused) return;
    this.pausedAccum += performance.now() - this.pauseBegan;
    this.paused = false;
  }

  stop(): EvpTake | null {
    if (!this.recording) return null;
    if (this.paused) this.resume();
    this.recording = false;
    let length = 0;
    for (const chunk of this.chunks) length += chunk.length;
    const samples = new Float32Array(length);
    let offset = 0;
    for (const chunk of this.chunks) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }
    this.chunks = [];
    if (!samples.length) return null;
    return {
      samples,
      sampleRate: this.sampleRate,
      duration: samples.length / this.sampleRate,
      clipped: this.clipped,
    };
  }

  release() {
    this.recording = false;
    this.paused = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    try {
      this.worklet?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this.processor?.disconnect();
    } catch {
      /* ignore */
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    const ctx = this.ctx;
    this.ctx = null;
    this.stream = null;
    this.source = null;
    this.hp = null;
    this.lp = null;
    this.gain = null;
    this.analyser = null;
    this.monitorGain = null;
    this.worklet = null;
    this.processor = null;
    this.meterBuf = null;
    this.chunks = [];
    this.pre = [];
    this.preSamples = 0;
    if (ctx) void ctx.close().catch(() => {});
  }
}

let playbackStop: (() => void) | null = null;
let playbackCtx: AudioContext | null = null;

export function stopPlayback() {
  playbackStop?.();
  playbackStop = null;
}

export async function playWav(
  blob: Blob,
  opts: { rate: number; reverse: boolean; normalize: boolean; loop: boolean; offset?: number; faint?: number },
  onProgress?: (ratio: number) => void,
  onEnded?: () => void,
): Promise<void> {
  stopPlayback();
  if (!playbackCtx || playbackCtx.state === "closed") playbackCtx = new AudioContext();
  const ctx = playbackCtx;
  await ctx.resume();
  const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
  const srcData = audio.getChannelData(0);
  const faint = opts.faint ?? 0;
  const processed = faint > 0.001 ? renderFaint(srcData, audio.sampleRate, faint) : srcData;
  const buffer = ctx.createBuffer(1, processed.length, audio.sampleRate);
  const dst = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < processed.length; i++) peak = Math.max(peak, Math.abs(processed[i] ?? 0));
  const gain = opts.normalize && peak > 0.001 ? 0.89 / peak : 1;
  for (let i = 0; i < processed.length; i++) {
    const sample = processed[opts.reverse ? processed.length - 1 - i : i] ?? 0;
    dst[i] = sample * gain;
  }
  const node = ctx.createBufferSource();
  node.buffer = buffer;
  node.playbackRate.value = opts.rate;
  node.loop = opts.loop;
  node.connect(ctx.destination);
  let raf = 0;
  const started = ctx.currentTime;
  const offset = Math.max(0, Math.min(Math.max(0, buffer.duration - 0.05), opts.offset ?? 0));
  const duration = Math.max(0.05, (buffer.duration - offset) / opts.rate);
  const tick = () => {
    if (!onProgress) return;
    const ratio = duration > 0 ? (ctx.currentTime - started) / duration : 0;
    onProgress(Math.max(0, Math.min(1, ratio)));
    raf = requestAnimationFrame(tick);
  };
  const cleanup = () => {
    cancelAnimationFrame(raf);
    try {
      node.stop();
    } catch {
      /* already stopped */
    }
    node.disconnect();
    onProgress?.(0);
    if (playbackStop === cleanup) playbackStop = null;
    onEnded?.();
  };
  node.onended = () => {
    if (!opts.loop) cleanup();
  };
  playbackStop = cleanup;
  node.start(0, offset);
  if (onProgress) raf = requestAnimationFrame(tick);
}

export async function listMics(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "audioinput");
}

export async function liftedWav(blob: Blob, amount: number): Promise<Blob> {
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    const lifted = renderFaint(audio.getChannelData(0), audio.sampleRate, amount);
    return encodeWav(lifted, audio.sampleRate);
  } finally {
    await ctx.close().catch(() => {});
  }
}
