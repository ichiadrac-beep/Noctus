export type EmfReading = {
  t: number;
  x: number;
  y: number;
  z: number;
  ut: number;
  deltaMg: number;
  activityMg: number;
  heading: number | null;
};

export type EmfStatus = "idle" | "live" | "unsupported" | "denied" | "error";

type SensorLike = EventTarget & {
  x: number;
  y: number;
  z: number;
  start: () => void;
  stop: () => void;
};

type SensorCtor = new (options?: { frequency?: number }) => SensorLike;

function magnetometerCtor(): SensorCtor | null {
  const w = window as Window & { Magnetometer?: SensorCtor };
  return w.Magnetometer ?? null;
}

export class EmfMeter {
  status: EmfStatus = "idle";
  message = "";
  onReading: ((reading: EmfReading) => void) | null = null;
  onStatus: (() => void) | null = null;

  private sensor: SensorLike | null = null;
  private baseline: number | null = null;
  private lp = 0;
  private lpInit = false;
  private activity = 0;
  private heading: number | null = null;
  private orienting = false;
  private onOrient: ((event: DeviceOrientationEvent) => void) | null = null;

  zero(currentUt: number) {
    if (Number.isFinite(currentUt)) this.baseline = currentUt;
  }

  clearZero() {
    this.baseline = null;
  }

  isZeroed(): boolean {
    return this.baseline != null;
  }

  async start() {
    this.stop();
    const Ctor = magnetometerCtor();
    if (!Ctor) {
      this.status = "unsupported";
      this.message =
        "This browser does not expose the magnetometer. Chrome on Android does, after you install Noctum and allow sensors. iOS Safari cannot read magnetic field strength.";
      this.onStatus?.();
      return;
    }
    await this.attachCompass();
    const sensor = new Ctor({ frequency: 20 });
    sensor.addEventListener("reading", () => {
      const { x, y, z } = sensor;
      if (![x, y, z].every((n) => Number.isFinite(n))) return;
      const ut = Math.hypot(x, y, z);
      if (!this.lpInit) {
        this.lp = ut;
        this.lpInit = true;
      }
      const hp = ut - this.lp;
      this.lp += 0.08 * (ut - this.lp);
      this.activity = this.activity * 0.86 + Math.abs(hp) * 0.14;
      const deltaMg = this.baseline == null ? 0 : (ut - this.baseline) * 10;
      this.onReading?.({
        t: Date.now(),
        x,
        y,
        z,
        ut,
        deltaMg,
        activityMg: this.activity * 10,
        heading: this.heading,
      });
    });
    sensor.addEventListener("error", (event) => {
      const err = (event as Event & { error?: DOMException }).error;
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        this.status = "denied";
        this.message =
          "Magnetometer permission was denied. In Chrome site settings, allow motion and sensors, then arm again.";
      } else if (err?.name === "NotReadableError") {
        this.status = "error";
        this.message = "The magnetometer is missing or already in use on this phone.";
      } else {
        this.status = "error";
        this.message = err?.message || "The magnetometer could not start.";
      }
      this.onStatus?.();
    });
    try {
      sensor.start();
      this.sensor = sensor;
      this.status = "live";
      this.message = "";
      this.onStatus?.();
    } catch (err) {
      this.status = "error";
      this.message = err instanceof Error ? err.message : "The magnetometer could not start.";
      this.onStatus?.();
    }
  }

  stop() {
    try {
      this.sensor?.stop();
    } catch {
      /* already stopped */
    }
    this.sensor = null;
    if (this.onOrient) {
      window.removeEventListener("deviceorientationabsolute", this.onOrient);
      window.removeEventListener("deviceorientation", this.onOrient);
      this.onOrient = null;
    }
    this.orienting = false;
    if (this.status === "live") {
      this.status = "idle";
      this.onStatus?.();
    }
  }

  private async attachCompass() {
    if (this.orienting) return;
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof DOE.requestPermission === "function") {
      try {
        const result = await DOE.requestPermission();
        if (result !== "granted") return;
      } catch {
        return;
      }
    }
    const handler = (event: DeviceOrientationEvent) => {
      const webkit = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (typeof webkit.webkitCompassHeading === "number") {
        this.heading = webkit.webkitCompassHeading;
        return;
      }
      if (event.absolute && event.alpha != null) {
        this.heading = (360 - event.alpha) % 360;
      }
    };
    this.onOrient = handler;
    this.orienting = true;
    window.addEventListener("deviceorientationabsolute", handler);
    window.addEventListener("deviceorientation", handler);
  }
}

export const LAMP_THRESHOLDS = [2, 8, 25, 80, 200];

export function lampLevel(mg: number, sensitivity: number): number {
  const value = Math.abs(mg) * sensitivity;
  let level = 0;
  for (const threshold of LAMP_THRESHOLDS) {
    if (value >= threshold) level += 1;
  }
  return level;
}
