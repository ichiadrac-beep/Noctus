import { useState } from "react";
import { listMics } from "@/lib/phosphor/evp";
import { ScreenHead } from "@/components/noctum/chrome";
import { loadPrefs, savePrefs, type Prefs } from "@/components/noctum/prefs";
import { usePhosphor } from "@/lib/phosphor/store";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-sm text-fg">{label}</span>
      <span className="text-sm text-muted">{value}</span>
    </div>
  );
}

function SwitchRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={onToggle}>
      <span className="text-sm text-fg">{label}</span>
      <span className="switch" data-on={on ? "true" : "false"} aria-pressed={on}>
        <i />
      </span>
    </button>
  );
}

export function SettingsScreen() {
  const setScreen = usePhosphor((s) => s.setScreen);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [mics, setMics] = useState("Built-in mic");

  function patch(partial: Partial<Prefs>) {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    savePrefs(next);
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8">
      <ScreenHead title="Settings" kicker="App preferences" onBack={() => setScreen("home")} />
      <section>
        <p className="eyebrow">Audio</p>
        <div className="mt-2 divide-y divide-line">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 py-3 text-left"
            onClick={() => {
              void listMics().then((devices) => {
                setMics(devices[0]?.label || "Built-in mic");
              });
            }}
          >
            <span className="text-sm text-fg">Input source</span>
            <span className="text-sm text-muted">{mics}</span>
          </button>
          <Row label="Sample rate" value="48 kHz" />
          <Row label="Bit depth" value="24-bit PCM" />
          <SwitchRow label="Auto gain control" on={prefs.agc} onToggle={() => patch({ agc: !prefs.agc })} />
        </div>
        <p className="text-xs text-muted">
          The EVP take still asks the browser to leave echo cancel, noise reduction, and auto gain off, so a faint sound is not flattened before it is written.
        </p>
      </section>
      <section>
        <p className="eyebrow">Display</p>
        <div className="mt-2 divide-y divide-line">
          <Row label="Theme" value="Dark" />
          <Row label="Accent colour" value="Purple" />
          <SwitchRow label="Show waveform" on={prefs.wave} onToggle={() => patch({ wave: !prefs.wave })} />
          <SwitchRow label="Show spectrogram" on={prefs.spec} onToggle={() => patch({ spec: !prefs.spec })} />
        </div>
      </section>
      <section>
        <p className="eyebrow">Investigation</p>
        <div className="mt-2 divide-y divide-line">
          <Row label="Default session name" value="Location + date" />
          <SwitchRow label="Save location data" on={prefs.saveLocation} onToggle={() => patch({ saveLocation: !prefs.saveLocation })} />
          <SwitchRow label="Auto save recordings" on={prefs.autoSave} onToggle={() => patch({ autoSave: !prefs.autoSave })} />
          <SwitchRow label="Background monitoring" on={prefs.background} onToggle={() => patch({ background: !prefs.background })} />
        </div>
        <p className="text-xs text-muted">Background monitoring cannot keep the mic open after you leave the page. Keep Noctum open while you record.</p>
      </section>
      <section>
        <p className="eyebrow">Data</p>
        <div className="mt-2 divide-y divide-line">
          <Row label="Export format" value="WAV" />
          <Row label="Storage location" value="On device" />
        </div>
      </section>
    </div>
  );
}
