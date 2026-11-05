import { useEffect, useState } from "react";
import { Magnet, Mic, Radio, ScrollText, WholeWord } from "lucide-react";
import { EmfPanel } from "@/components/phosphor/emf-panel";
import { EvpPanel } from "@/components/phosphor/evp-panel";
import { LogPanel } from "@/components/phosphor/log-panel";
import { OvilusPanel } from "@/components/phosphor/ovilus-panel";
import { SpiritBox } from "@/components/phosphor/spirit-box";
import { placeFromLocale } from "@/lib/phosphor/geo";
import { LEXICONS, langForCountry, lexiconKeyFromTag } from "@/lib/phosphor/lexicon";
import { loadSettings, usePhosphor, type Tab } from "@/lib/phosphor/store";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const TABS: { id: Tab; label: string; icon: typeof Radio }[] = [
  { id: "box", label: "Box", icon: Radio },
  { id: "ovilus", label: "Ovilus", icon: WholeWord },
  { id: "emf", label: "EMF", icon: Magnet },
  { id: "evp", label: "EVP", icon: Mic },
  { id: "log", label: "Log", icon: ScrollText },
];

function InstallBar() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("phosphor-install-hide") === "1";
    } catch {
      dismissed = false;
    }
    const phone = window.matchMedia("(max-width: 800px)").matches;
    if (!phone || standalone || dismissed) return;
    setHidden(false);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden) return null;

  return (
    <section className="border-b border-line bg-surface px-4 py-3">
      <p className="kicker text-sm text-amber">Install on Android</p>
      <p className="mt-1 text-sm text-muted">
        Adds Phosphor to the home screen as a full-screen app, with the mic, magnetometer, motion, and location.
        In Chrome: menu, then Install app.
      </p>
      <div className="mt-2 flex gap-2">
        {prompt ? (
          <button
            type="button"
            className="key"
            data-on="true"
            onClick={() => {
              void prompt.prompt().then(() => setHidden(true));
            }}
          >
            Install
          </button>
        ) : null}
        <button
          type="button"
          className="key"
          onClick={() => {
            try {
              localStorage.setItem("phosphor-install-hide", "1");
            } catch {
              /* ignore */
            }
            setHidden(true);
          }}
        >
          Not now
        </button>
      </div>
    </section>
  );
}

export function PhosphorApp() {
  const tab = usePhosphor((s) => s.tab);
  const setTab = usePhosphor((s) => s.setTab);
  const boot = usePhosphor((s) => s.boot);
  const boxOn = usePhosphor((s) => s.boxOn);
  const emfLive = usePhosphor((s) => s.emfLive);
  const emfDelta = usePhosphor((s) => s.emfDeltaMg);
  const emfRecording = usePhosphor((s) => s.emfRecording);
  const evpRecording = usePhosphor((s) => s.evpRecording);
  const ovilusOn = usePhosphor((s) => s.ovilusOn);

  useEffect(() => {
    const saved = loadSettings();
    const place = placeFromLocale();
    const follow = saved?.followLocation ?? true;
    let langKey =
      saved?.langKey && LEXICONS[saved.langKey]
        ? saved.langKey
        : lexiconKeyFromTag(navigator.language || "en");
    if (follow && place.countryCode) {
      const mapped = langForCountry(place.countryCode);
      if (mapped) langKey = mapped;
    }
    boot(
      {
        langKey,
        followLocation: follow,
        band: saved?.band ?? "FM",
        direction: saved?.direction ?? 1,
        speed: saved?.speed ?? 16,
        density: saved?.density ?? 0.65,
        chop: saved?.chop ?? false,
        volume: saved?.volume ?? 0.75,
        question: saved?.question ?? "",
        ovilusMode: saved?.ovilusMode ?? "dictionary",
        ovilusDrive: saved?.ovilusDrive ?? "blend",
        ovilusSensitivity: saved?.ovilusSensitivity ?? 0.55,
        ovilusGap: saved?.ovilusGap ?? 1.1,
        ovilusVolume: saved?.ovilusVolume ?? 0.9,
      },
      place,
    );
  }, [boot]);

  const status = evpRecording
    ? "EVP recording"
    : emfRecording
      ? "EMF trace"
      : boxOn
        ? "Box live"
        : ovilusOn
          ? "Ovilus"
          : emfLive
            ? "Magnetometer"
            : "Standby";

  return (
    <div className="device min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col border-x border-line">
        <InstallBar />
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="brand text-lg text-fg">Phosphor</p>
            <p className="kicker mt-1 text-xs text-muted">Field kit</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span
              className="led"
              data-on={evpRecording || emfRecording ? "rec" : boxOn || emfLive || ovilusOn ? "amber" : "off"}
            />
            <span className="kicker">{status}</span>
            {emfLive ? <span className="tabular-nums text-fg">{emfDelta.toFixed(0)} mG</span> : null}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className={tab === "box" ? "block" : "hidden"}>
            <SpiritBox />
          </div>
          <div className={tab === "ovilus" ? "block" : "hidden"}>
            <OvilusPanel />
          </div>
          <div className={tab === "emf" ? "block" : "hidden"}>
            <EmfPanel />
          </div>
          <div className={tab === "evp" ? "block" : "hidden"}>
            <EvpPanel />
          </div>
          <div className={tab === "log" ? "block" : "hidden"}>
            <LogPanel />
          </div>
        </main>
        <nav className="safe-bottom grid shrink-0 grid-cols-5 border-t border-line bg-surface" aria-label="Decks">
          {TABS.map((item) => {
            const Icon = item.icon;
            const on = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`flex min-h-14 flex-col items-center justify-center gap-1 ${on ? "text-amber" : "text-muted"}`}
                aria-current={on ? "page" : undefined}
                onClick={() => setTab(item.id)}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="deck-tab">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
