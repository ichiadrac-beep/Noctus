import { useEffect } from "react";
import { Folder, Home, Settings, Wrench } from "lucide-react";
import { placeFromLocale } from "@/lib/phosphor/geo";
import { LEXICONS, langForCountry, lexiconKeyFromTag } from "@/lib/phosphor/lexicon";
import { loadSettings, usePhosphor, type Screen } from "@/lib/phosphor/store";
import { EvpScreen } from "@/components/noctum/evp";
import { HomeScreen } from "@/components/noctum/home";
import { OvilusScreen } from "@/components/noctum/ovilus";
import { PlayerScreen } from "@/components/noctum/player";
import { SessionsScreen } from "@/components/noctum/sessions";
import { SettingsScreen } from "@/components/noctum/settings";
import { SpiritScreen } from "@/components/noctum/spirit";
import { ToolsScreen } from "@/components/noctum/tools";

const NAV: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "sessions", label: "Sessions", icon: Folder },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "settings", label: "Settings", icon: Settings },
];

const ROOT: Screen[] = ["home", "sessions", "tools", "settings"];

export function NoctumApp() {
  const screen = usePhosphor((s) => s.screen);
  const setScreen = usePhosphor((s) => s.setScreen);
  const boot = usePhosphor((s) => s.boot);

  useEffect(() => {
    const saved = loadSettings();
    const place = placeFromLocale();
    const follow = saved?.followLocation ?? true;
    let langKey =
      saved?.langKey && LEXICONS[saved.langKey] ? saved.langKey : lexiconKeyFromTag(navigator.language || "en");
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
        speed: saved?.speed ?? 14,
        density: saved?.density ?? 0,
        chop: false,
        volume: saved?.volume ?? 0.75,
        question: "",
        ovilusMode: saved?.ovilusMode ?? "dictionary",
        ovilusDrive: saved?.ovilusDrive ?? "blend",
        ovilusSensitivity: saved?.ovilusSensitivity ?? 0.55,
        ovilusGap: saved?.ovilusGap && saved.ovilusGap >= 3 ? saved.ovilusGap : 6,
        ovilusVolume: saved?.ovilusVolume ?? 0.9,
      },
      place,
    );
  }, [boot]);

  const rooted = ROOT.includes(screen);

  return (
    <div className="phone mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {screen === "home" ? (
        <header className="flex items-start justify-between px-5 pt-7 pb-4">
          <div>
            <h1 className="display text-3xl text-fg">Noctum</h1>
            <p className="eyebrow mt-2">Investigation suite</p>
          </div>
          <button type="button" className="round-btn" aria-label="Settings" onClick={() => setScreen("settings")}>
            <Settings className="size-5" aria-hidden="true" />
          </button>
        </header>
      ) : null}
      <main className="min-h-0 flex-1 overflow-y-auto">
        {screen === "home" ? <HomeScreen /> : null}
        {screen === "sessions" ? <SessionsScreen /> : null}
        {screen === "tools" ? <ToolsScreen /> : null}
        {screen === "settings" ? <SettingsScreen /> : null}
        {screen === "evp" ? <EvpScreen /> : null}
        {screen === "box" ? <SpiritScreen /> : null}
        {screen === "ovilus" ? <OvilusScreen /> : null}
        {screen === "player" ? <PlayerScreen /> : null}
      </main>
      {rooted ? (
        <nav className="safe-bottom grid grid-cols-4 border-t border-line" aria-label="Sections">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = screen === item.id;
            return (
              <button key={item.id} type="button" className="nav-btn" data-on={on ? "true" : "false"} onClick={() => setScreen(item.id)}>
                <Icon className="size-5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
