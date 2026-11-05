import { useEffect, useState } from "react";
import { FolderOpen, Mic, Radio, WholeWord } from "lucide-react";
import { allItems, type EvpClip, type OvilusSession, type SpiritSession } from "@/lib/phosphor/db";
import { EmfMeter } from "@/lib/phosphor/emf";
import { geoErrorMessage, locateGps, placeLabel } from "@/lib/phosphor/geo";
import { usePhosphor, type Screen } from "@/lib/phosphor/store";

const TOOLS: { id: Screen; label: string; icon: typeof Mic }[] = [
  { id: "evp", label: "EVP", icon: Mic },
  { id: "box", label: "Spirit box", icon: Radio },
  { id: "ovilus", label: "Ovilus", icon: WholeWord },
];

function clockParts(ms: number) {
  const date = new Date(ms);
  const day = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
  const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
  return { day, time };
}

export function HomeScreen() {
  const setScreen = usePhosphor((s) => s.setScreen);
  const place = usePhosphor((s) => s.place);
  const setPlace = usePhosphor((s) => s.setPlace);
  const investigating = usePhosphor((s) => s.investigating);
  const started = usePhosphor((s) => s.investigationStarted);
  const setInvestigation = usePhosphor((s) => s.setInvestigation);
  const emfLive = usePhosphor((s) => s.emfLive);
  const emfDelta = usePhosphor((s) => s.emfDeltaMg);
  const setEmf = usePhosphor((s) => s.setEmf);
  const libraryTick = usePhosphor((s) => s.libraryTick);
  const [now, setNow] = useState(() => Date.now());
  const [counts, setCounts] = useState({ sessions: 0, clips: 0 });
  const [temp, setTemp] = useState<string>("—");
  const [note, setNote] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const [sessions, clips] = await Promise.all([
          allItems<SpiritSession | OvilusSession>("sessions"),
          allItems<EvpClip>("clips"),
        ]);
        if (!cancel) setCounts({ sessions: sessions.length, clips: clips.length });
      } catch {
        if (!cancel) setCounts({ sessions: 0, clips: 0 });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [libraryTick, investigating]);

  useEffect(() => {
    if (!investigating) {
      setEmf({ live: false });
      return;
    }
    const meter = new EmfMeter();
    meter.onReading = (reading) => {
      setEmf({ live: true, ut: reading.ut, deltaMg: reading.deltaMg });
    };
    meter.onStatus = () => {
      if (meter.status !== "live") setEmf({ live: false });
    };
    void meter.start();
    return () => {
      meter.stop();
      setEmf({ live: false });
    };
  }, [investigating, setEmf]);

  useEffect(() => {
    const w = window as Window & {
      AmbientTemperature?: new (options?: { frequency?: number }) => EventTarget & { temperature?: number; start: () => void; stop: () => void };
    };
    const Ctor = w.AmbientTemperature;
    if (!Ctor) return;
    let sensor: InstanceType<typeof Ctor> | null = null;
    try {
      sensor = new Ctor({ frequency: 1 });
      sensor.addEventListener("reading", () => {
        const value = sensor?.temperature;
        if (typeof value === "number" && Number.isFinite(value)) setTemp(`${value.toFixed(1)}°C`);
      });
      sensor.start();
    } catch {
      setTemp("—");
    }
    return () => sensor?.stop();
  }, []);

  const when = clockParts(investigating && started ? started : now);
  const where = placeLabel(place);

  async function toggleInvestigation() {
    if (investigating) {
      setInvestigation(false);
      setNote("");
      return;
    }
    setInvestigation(true);
    setNote("");
    try {
      const next = await locateGps();
      setPlace(next, "");
    } catch (err) {
      setNote(geoErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div className="grid grid-cols-3 gap-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button key={tool.id} type="button" className="tool-card" onClick={() => setScreen(tool.id)}>
              <Icon className="size-5" aria-hidden="true" />
              <span className="eyebrow text-fg">{tool.label}</span>
            </button>
          );
        })}
      </div>

      <section className="panel p-4">
        <p className="eyebrow">Session</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted">Location</p>
            <p className="mt-1 text-sm text-fg">{where}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Date & time</p>
            <p className="mt-1 text-sm text-fg">{when.day}</p>
            <p className="text-sm text-muted tabular-nums">{when.time}</p>
          </div>
        </div>
      </section>

      <button type="button" className="glow-btn" onClick={() => void toggleInvestigation()}>
        {investigating ? "End investigation" : "Start investigation"}
        <span aria-hidden="true">→</span>
      </button>
      {note ? <p className="text-sm text-amber">{note}</p> : null}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="panel p-4 text-left" onClick={() => setScreen("sessions")}>
          <span className="flex items-center justify-between text-sm text-fg">
            Session log <FolderOpen className="size-4 text-muted" aria-hidden="true" />
          </span>
          <p className="mt-2 text-sm text-muted">{counts.sessions} sessions</p>
        </button>
        <button type="button" className="panel p-4 text-left" onClick={() => setScreen("evp")}>
          <span className="flex items-center justify-between text-sm text-fg">
            Saved clips <Mic className="size-4 text-muted" aria-hidden="true" />
          </span>
          <p className="mt-2 text-sm text-muted">{counts.clips} recordings</p>
        </button>
      </div>

      <section className="panel p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-fg">Environmental readings</p>
          <span className="eyebrow inline-flex items-center gap-2">
            {emfLive ? <i className="live-dot" /> : null}
            {emfLive ? "Live" : "Standby"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted">EMF</p>
            <p className="mt-1 text-sm tabular-nums text-fg">{emfLive ? `${emfDelta.toFixed(1)} mG` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Temperature</p>
            <p className="mt-1 text-sm tabular-nums text-fg">{temp}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Humidity</p>
            <p className="mt-1 text-sm tabular-nums text-fg">—</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          EMF is the phone magnetometer, only while an investigation is running. Temperature appears if the phone exposes that sensor. Humidity is not available in the browser, so it stays blank.
        </p>
      </section>
    </div>
  );
}
