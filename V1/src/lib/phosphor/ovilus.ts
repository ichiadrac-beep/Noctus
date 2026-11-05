import { EmfMeter, type EmfReading } from "@/lib/phosphor/emf";
import type { LexiconAnswers } from "@/lib/phosphor/lexicon";
import { matchingVoice } from "@/lib/phosphor/radio";
import type { OvilusDrive, OvilusMode } from "@/lib/phosphor/store";

export type OvilusFrame = {
  score: number;
  detail: string;
  sensors: string;
  warning: string;
  armed: boolean;
};

export type OvilusSpeak = {
  word: string;
  energy: number;
  mode: OvilusMode;
  drive: OvilusDrive;
  detail: string;
};

const PHONEMES: Record<string, string[]> = {
  en: ["ah", "ee", "oh", "oo", "ay", "ih", "eh", "uh", "buh", "kuh", "duh", "fuh", "guh", "huh", "luh", "muh", "nuh", "puh", "ruh", "suh", "tuh", "vuh", "wuh", "yuh", "zuh", "sh", "ch", "th", "ng", "rah"],
  es: ["a", "e", "i", "o", "u", "ba", "ca", "da", "fa", "ga", "ja", "la", "ma", "na", "pa", "ra", "sa", "ta", "va", "ya", "que", "chi", "rra", "ño", "lla"],
  fr: ["a", "é", "i", "o", "ou", "an", "on", "eu", "ba", "ca", "da", "fa", "ga", "la", "ma", "na", "pa", "ra", "sa", "ta", "va", "cha", "je", "oui", "leur"],
  de: ["a", "e", "i", "o", "u", "ä", "ö", "ü", "ba", "cha", "da", "fa", "ga", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "sch", "ich", "und", "ein"],
  it: ["a", "e", "i", "o", "u", "ba", "ca", "da", "fa", "ga", "la", "ma", "na", "pa", "ra", "sa", "ta", "va", "za", "chi", "gli", "gn", "che", "qui"],
  pt: ["a", "e", "i", "o", "u", "ão", "ba", "ca", "da", "fa", "ga", "la", "ma", "na", "pa", "ra", "sa", "ta", "va", "cha", "nha", "lha", "que", "não"],
  nl: ["a", "e", "i", "o", "u", "aa", "ee", "oo", "ui", "ba", "da", "ga", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "sch", "cht", "een", "het"],
  pl: ["a", "e", "i", "o", "u", "y", "ba", "ca", "da", "fa", "ga", "la", "ma", "na", "pa", "ra", "sa", "ta", "cza", "sza", "ża", "nie", "tak", "tu"],
  ru: ["а", "е", "и", "о", "у", "ы", "ба", "ва", "да", "жа", "ка", "ла", "ма", "на", "па", "ра", "са", "та", "ча", "ша", "я", "не", "да", "тут"],
  uk: ["а", "е", "и", "і", "о", "у", "ба", "ва", "да", "жа", "ка", "ла", "ма", "на", "па", "ра", "са", "та", "ча", "ша", "я", "ні", "так", "тут"],
  hi: ["अ", "आ", "इ", "उ", "क", "ख", "ग", "च", "ज", "त", "द", "न", "प", "ब", "म", "य", "र", "ल", "व", "स", "ह", "हाँ", "ना", "यहाँ"],
  ta: ["அ", "ஆ", "இ", "உ", "க", "ங", "ச", "த", "ந", "ப", "ம", "ய", "ர", "ல", "வ", "ழ", "ள", "ற", "ன", "ஆம்", "இல்", "இங்கே"],
  bn: ["অ", "আ", "ই", "উ", "ক", "খ", "গ", "চ", "জ", "ত", "দ", "ন", "প", "ব", "ম", "র", "ল", "শ", "স", "হ", "হ্যাঁ", "না", "এখানে"],
  ur: ["ا", "ب", "پ", "ت", "ج", "د", "ر", "س", "ش", "ک", "گ", "ل", "م", "ن", "و", "ہ", "ی", "ہاں", "نہ", "یہاں"],
  si: ["අ", "ආ", "ඉ", "උ", "ක", "ග", "ච", "ජ", "ට", "ඩ", "ත", "ද", "න", "ප", "බ", "ම", "ය", "ර", "ල", "ව", "ස", "හ", "ඔව්", "නැ"],
  ne: ["अ", "आ", "इ", "उ", "क", "ख", "ग", "च", "ज", "त", "द", "न", "प", "ब", "म", "य", "र", "ल", "व", "स", "ह", "हो", "होइन", "यहाँ"],
  ja: ["あ", "い", "う", "え", "お", "か", "き", "く", "さ", "し", "た", "ち", "な", "に", "は", "ひ", "ま", "み", "ら", "り", "や", "よ", "わ", "ん"],
  ko: ["아", "이", "우", "에", "오", "가", "나", "다", "라", "마", "바", "사", "자", "하", "카", "타", "파", "차", "너", "나", "여기", "아니"],
  zh: ["啊", "衣", "屋", "耶", "哦", "吧", "的", "呢", "了", "吗", "是", "不", "这", "那", "来", "去", "看", "听", "说", "谁", "什", "么"],
  ar: ["ا", "ب", "ت", "ث", "ج", "ح", "د", "ر", "س", "ش", "ع", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي", "نعم", "لا", "هنا"],
  tr: ["a", "e", "ı", "i", "o", "ö", "u", "ü", "ba", "ca", "da", "fa", "ga", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "şa", "ça", "evet"],
  id: ["a", "e", "i", "o", "u", "ba", "ca", "da", "ga", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "wa", "ya", "nya", "ya", "tidak", "sini"],
  ms: ["a", "e", "i", "o", "u", "ba", "ca", "da", "ga", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "wa", "ya", "nya", "ya", "tidak", "sini"],
  th: ["กะ", "ขะ", "จะ", "ดะ", "นะ", "บะ", "ปะ", "มะ", "ยะ", "ระ", "ละ", "วะ", "สะ", "หา", "อา", "อี", "อู", "เอ", "โอ", "ใช่", "ไม่", "ที่นี่"],
  vi: ["a", "ă", "â", "e", "ê", "i", "o", "ô", "ơ", "u", "ư", "ba", "ca", "da", "ga", "la", "ma", "na", "ra", "sa", "ta", "có", "không", "đây"],
  sv: ["a", "e", "i", "o", "u", "ä", "ö", "ba", "da", "ga", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "ska", "ja", "nej", "här"],
  no: ["a", "e", "i", "o", "u", "æ", "ø", "å", "ba", "da", "ga", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "sk", "ja", "nei", "her"],
  da: ["a", "e", "i", "o", "u", "æ", "ø", "å", "ba", "da", "ga", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "sk", "ja", "nej", "her"],
  fi: ["a", "e", "i", "o", "u", "ä", "ö", "y", "ba", "da", "ga", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "ksi", "kyllä", "ei", "täällä"],
  el: ["α", "ε", "ι", "ο", "ου", "μπα", "ντα", "γα", "κα", "λα", "μα", "να", "πα", "ρα", "σα", "τα", "χα", "ναι", "όχι", "εδώ"],
  he: ["א", "ב", "ג", "ד", "ה", "ו", "ח", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת", "כן", "לא", "כאן"],
  ro: ["a", "e", "i", "o", "u", "ă", "â", "î", "ba", "ca", "da", "fa", "ga", "la", "ma", "na", "pa", "ra", "sa", "ta", "șa", "da", "nu", "aici"],
  hu: ["a", "e", "i", "o", "u", "á", "é", "ö", "ü", "ba", "ca", "da", "fa", "ga", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "igen", "nem", "itt"],
  cs: ["a", "e", "i", "o", "u", "á", "é", "ba", "ca", "da", "fa", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "ža", "ano", "ne", "tady"],
  tl: ["a", "e", "i", "o", "u", "ba", "ka", "da", "ga", "ha", "la", "ma", "na", "pa", "ra", "sa", "ta", "wa", "ya", "nga", "oo", "hindi", "dito"],
  fa: ["ا", "ب", "پ", "ت", "ج", "د", "ر", "ز", "س", "ش", "ک", "گ", "ل", "م", "ن", "و", "ه", "ی", "بله", "نه", "اینجا"],
  sw: ["a", "e", "i", "o", "u", "ba", "da", "ga", "ha", "ka", "la", "ma", "na", "pa", "ra", "sa", "ta", "wa", "ya", "ndiyo", "hapana", "hapa"],
};

export function phonemesFor(code: string): string[] {
  return PHONEMES[code] ?? PHONEMES.en;
}

function mix32(n: number): number {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function quantCode(x: number, y: number, z: number, quantum: number): number {
  const q = Math.max(quantum, 1e-6);
  const qx = Math.round(x / q);
  const qy = Math.round(y / q);
  const qz = Math.round(z / q);
  return mix32(Math.imul(qx, 73856093) ^ Math.imul(qy, 19349663) ^ Math.imul(qz, 83492791));
}

function cluster(code: number, phonemes: string[]): string {
  const count = 2 + (code % 3);
  const parts: string[] = [];
  let x = code >>> 0;
  for (let i = 0; i < count; i++) {
    x = mix32(x + i * 97 + 1);
    parts.push(phonemes[x % phonemes.length] || "ah");
  }
  return parts.join(" ");
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function dbLabel(linear: number): string {
  if (!(linear > 1e-8)) return "−∞ dB";
  const db = 20 * Math.log10(linear);
  return `${db.toFixed(0)} dB`;
}

type MotionSample = {
  score: number;
  code: number;
  rising: boolean;
  label: string;
};

type SoundSample = {
  score: number;
  code: number;
  rising: boolean;
  label: string;
};

export class OvilusEngine {
  mode: OvilusMode = "dictionary";
  drive: OvilusDrive = "blend";
  sensitivity = 0.55;
  minGap = 1.1;
  volume = 0.9;
  words: string[] = [];
  phonemes: string[] = PHONEMES.en;
  answers: LexiconAnswers = { yes: "yes", no: "no", maybe: "maybe" };
  bcp47 = "en-GB";
  onFrame: ((frame: OvilusFrame) => void) | null = null;
  onWord: ((hit: OvilusSpeak) => void) | null = null;

  private emf = new EmfMeter();
  private field: EmfReading | null = null;
  private fieldOn = false;
  private motionOn = false;
  private motionSeen = false;
  private motionHandler: ((event: DeviceMotionEvent) => void) | null = null;
  private motion: MotionSample | null = null;
  private prevGrav = { x: 0, y: 0, z: 0, have: false };
  private micOn = false;
  private mic: {
    stream: MediaStream;
    ctx: AudioContext;
    analyser: AnalyserNode;
    bins: Uint8Array<ArrayBuffer>;
    time: Float32Array<ArrayBuffer>;
  } | null = null;
  private prevRms = 0;
  private sound: SoundSample | null = null;
  private running = false;
  private raf = 0;
  private lastFrame = 0;
  private lastSpeak = 0;
  private lastBucket = -1;
  private hot = false;
  private warning = "";
  private speakGen = 0;

  get isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    this.stopInputs();
    this.warning = "";
    const notes = await this.openInputs();
    if (!this.feedAlive()) {
      this.stopInputs();
      throw new Error(notes || "No sensor is available for this drive.");
    }
    this.warning = notes;
    this.running = true;
    this.hot = false;
    this.lastSpeak = 0;
    this.lastBucket = -1;
    this.loop();
  }

  async resync(): Promise<void> {
    if (!this.running) return;
    const notes = await this.openInputs();
    if (!this.feedAlive()) {
      this.running = false;
      this.stopInputs();
      cancelAnimationFrame(this.raf);
      this.warning = notes || "No sensor is available for this drive.";
      this.emitFrame(0, "No feed");
      throw new Error(this.warning);
    }
    this.warning = notes;
    this.hot = false;
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.speakGen += 1;
    if (typeof speechSynthesis !== "undefined") {
      try {
        speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    this.stopInputs();
    this.hot = false;
  }

  destroy() {
    this.stop();
  }

  tap() {
    if (!this.running) return;
    const sample = this.compose();
    if (!sample) return;
    this.emit(sample.code, sample.score, sample.rising, sample.detail, true);
  }

  private feedAlive(): boolean {
    if (this.drive === "field") return this.fieldOn;
    if (this.drive === "motion") return this.motionOn;
    if (this.drive === "sound") return this.micOn;
    return this.fieldOn || this.motionOn || this.micOn;
  }

  private async openInputs(): Promise<string> {
    const notes: string[] = [];
    const wantField = this.drive === "field" || this.drive === "blend";
    const wantMotion = this.drive === "motion" || this.drive === "blend";
    const wantMic = this.drive === "sound" || this.drive === "blend";

    if (!wantField && this.fieldOn) this.releaseField();
    if (!wantMotion && this.motionOn) this.releaseMotion();
    if (!wantMic && this.micOn) this.releaseMic();

    const jobs: Promise<void>[] = [];
    if (wantMotion && !this.motionOn) jobs.push(this.hookMotion());
    if (wantMic && !this.micOn) jobs.push(this.armMic());
    if (wantField && !this.fieldOn) jobs.push(this.armField());
    const results = await Promise.allSettled(jobs);
    for (const result of results) {
      if (result.status === "rejected") {
        const reason = result.reason;
        notes.push(reason instanceof Error ? reason.message : "A sensor was blocked.");
      }
    }
    if (this.drive === "field" && !this.fieldOn && !notes.some((n) => /magnet/i.test(n))) {
      notes.push(this.emf.message || "Magnetometer is not available on this phone.");
    }
    return notes.filter(Boolean).join(" ");
  }

  private armField(): Promise<void> {
    this.emf.onReading = (reading) => {
      this.field = reading;
    };
    return this.emf.start().then(() => {
      if (this.emf.status !== "live") {
        this.fieldOn = false;
        throw new Error(this.emf.message || "Magnetometer is not available.");
      }
      this.fieldOn = true;
    });
  }

  private hookMotion(): Promise<void> {
    const DME = DeviceMotionEvent as typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof DeviceMotionEvent === "undefined") {
      return Promise.reject(new Error("This device does not report motion."));
    }
    let gate: Promise<void> = Promise.resolve();
    if (typeof DME.requestPermission === "function") {
      gate = DME.requestPermission().then((result) => {
        if (result !== "granted") throw new Error("Motion permission was denied.");
      });
    }
    this.motionHandler = (event) => this.onMotion(event);
    window.addEventListener("devicemotion", this.motionHandler);
    this.motionOn = true;
    return gate.catch((err) => {
      this.releaseMotion();
      throw err;
    });
  }

  private onMotion(event: DeviceMotionEvent) {
    this.motionSeen = true;
    const lin = event.acceleration;
    const grav = event.accelerationIncludingGravity;
    const lx = lin?.x ?? 0;
    const ly = lin?.y ?? 0;
    const lz = lin?.z ?? 0;
    const linear = Math.hypot(lx, ly, lz);
    const gx = grav?.x ?? lx;
    const gy = grav?.y ?? ly;
    const gz = grav?.z ?? lz;
    let delta = linear;
    if (this.prevGrav.have) {
      delta = Math.max(delta, Math.hypot(gx - this.prevGrav.x, gy - this.prevGrav.y, gz - this.prevGrav.z));
    }
    const rising = delta >= (this.motion?.score ?? 0) * 0.45;
    this.prevGrav = { x: gx, y: gy, z: gz, have: true };
    this.motion = {
      score: clamp01(delta / 0.45),
      code: quantCode(gx, gy, gz, 0.08),
      rising,
      label: `${(Math.hypot(gx, gy, gz) / 9.81 || delta).toFixed(2)} g`,
    };
  }

  private async armMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser has no microphone.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
      video: false,
    });
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const bins = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    const time = new Float32Array(analyser.fftSize);
    this.mic = { stream, ctx, analyser, bins, time };
    this.micOn = true;
    this.prevRms = 0;
    await ctx.resume();
  }

  private sampleSound(): SoundSample | null {
    const mic = this.mic;
    if (!mic) return this.sound;
    mic.analyser.getFloatTimeDomainData(mic.time);
    mic.analyser.getByteFrequencyData(mic.bins);
    let sum = 0;
    for (let i = 0; i < mic.time.length; i++) {
      const s = mic.time[i] ?? 0;
      sum += s * s;
    }
    const rms = Math.sqrt(sum / mic.time.length);
    let peakBin = 2;
    let peakVal = 0;
    for (let i = 2; i < 80; i++) {
      const value = mic.bins[i] ?? 0;
      if (value > peakVal) {
        peakVal = value;
        peakBin = i;
      }
    }
    const delta = Math.abs(rms - this.prevRms);
    const rising = rms >= this.prevRms;
    this.prevRms = rms;
    const impulse = Math.max(0, delta - 0.008);
    this.sound = {
      score: clamp01(impulse / 0.02),
      code: mix32(Math.round(peakBin / 3) * 97 + (rising ? 1 : 0)),
      rising,
      label: dbLabel(rms),
    };
    return this.sound;
  }

  private compose(): { score: number; code: number; rising: boolean; detail: string; sensors: string } | null {
    if (this.micOn) this.sampleSound();
    const parts: { score: number; code: number; rising: boolean; label: string; name: string }[] = [];
    if ((this.drive === "field" || this.drive === "blend") && this.fieldOn && this.field) {
      const reading = this.field;
      parts.push({
        score: clamp01(reading.activityMg / 18),
        code: quantCode(reading.x, reading.y, reading.z, 0.45),
        rising: reading.deltaMg >= 0,
        label: `${reading.ut.toFixed(1)} µT`,
        name: "field",
      });
    }
    if ((this.drive === "motion" || this.drive === "blend") && this.motion) {
      parts.push({ ...this.motion, name: "motion" });
    }
    if ((this.drive === "sound" || this.drive === "blend") && this.sound) {
      parts.push({ ...this.sound, name: "sound" });
    }
    if (!parts.length) return null;
    let score = 0;
    let code = 0;
    let rising = false;
    let best = 0;
    for (const part of parts) {
      score = Math.max(score, part.score);
      code = mix32(code ^ part.code);
      if (part.score >= best) {
        best = part.score;
        rising = part.rising;
      }
    }
    return {
      score,
      code,
      rising,
      detail: parts.map((part) => part.label).join(" · "),
      sensors: parts.map((part) => part.name).join("+"),
    };
  }

  private loop = () => {
    if (!this.running) return;
    const sample = this.compose();
    const now = performance.now();
    if (sample && this.mode !== "touch") {
      const gate = 0.78 - this.sensitivity * 0.34;
      const bucket = sample.code >>> 0;
      if (sample.score >= gate && bucket !== this.lastBucket && now - this.lastSpeak >= this.minGap * 1000) {
        this.lastBucket = bucket;
        this.hot = true;
        this.emit(sample.code, sample.score, sample.rising, sample.detail, false);
      } else if (sample.score < gate * 0.45) {
        this.hot = false;
      }
    }
    if (now - this.lastFrame > 90) {
      this.lastFrame = now;
      this.emitFrame(sample?.score ?? 0, sample?.detail ?? "No feed");
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private emit(code: number, score: number, rising: boolean, detail: string, forced: boolean) {
    const word = this.pick(code, score, rising);
    if (!word) return;
    this.lastSpeak = performance.now();
    this.speak(word);
    this.onWord?.({
      word,
      energy: score,
      mode: this.mode,
      drive: this.drive,
      detail: forced ? `${detail} · touch` : detail,
    });
  }

  private pick(code: number, score: number, rising: boolean): string {
    if (this.mode === "energy") {
      const gate = 0.64 - this.sensitivity * 0.52;
      if (score < gate * 1.35) return this.answers.maybe;
      return rising ? this.answers.yes : this.answers.no;
    }
    if (this.mode === "phonetic") {
      return cluster(code, this.phonemes.length ? this.phonemes : PHONEMES.en);
    }
    if (!this.words.length) return "";
    return this.words[code % this.words.length] ?? "";
  }

  private emitFrame(score: number, detail: string) {
    const sensors = [
      this.fieldOn ? "field" : "",
      this.motionOn ? "motion" : "",
      this.micOn ? "sound" : "",
    ]
      .filter(Boolean)
      .join("+");
    this.onFrame?.({
      score,
      detail,
      sensors: sensors || "none",
      warning: this.warning,
      armed: this.running,
    });
  }

  private speak(word: string) {
    if (typeof speechSynthesis === "undefined" || this.volume <= 0) return;
    const gen = (this.speakGen += 1);
    try {
      speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      if (this.speakGen !== gen || typeof speechSynthesis === "undefined") return;
      try {
        speechSynthesis.resume();
        const utter = new SpeechSynthesisUtterance(word);
        utter.lang = this.bcp47;
        const voice = matchingVoice(this.bcp47);
        if (voice) utter.voice = voice;
        utter.rate = 0.92;
        utter.pitch = 0.9;
        utter.volume = Math.max(0, Math.min(1, this.volume));
        utter.onerror = () => {};
        speechSynthesis.speak(utter);
      } catch {
        /* speech is best-effort */
      }
    }, 30);
  }

  private releaseField() {
    this.emf.onReading = null;
    this.emf.stop();
    this.fieldOn = false;
    this.field = null;
  }

  private releaseMotion() {
    if (this.motionHandler) window.removeEventListener("devicemotion", this.motionHandler);
    this.motionHandler = null;
    this.motionOn = false;
    this.motion = null;
    this.motionSeen = false;
    this.prevGrav = { x: 0, y: 0, z: 0, have: false };
  }

  private releaseMic() {
    this.mic?.stream.getTracks().forEach((track) => track.stop());
    const ctx = this.mic?.ctx;
    this.mic = null;
    this.micOn = false;
    this.sound = null;
    if (ctx) void ctx.close().catch(() => {});
  }

  private stopInputs() {
    this.releaseField();
    this.releaseMotion();
    this.releaseMic();
  }
}
