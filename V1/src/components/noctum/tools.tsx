import { Mic, Radio, WholeWord } from "lucide-react";
import { usePhosphor, type Screen } from "@/lib/phosphor/store";

const TOOLS: { id: Screen; title: string; body: string; icon: typeof Mic }[] = [
  {
    id: "evp",
    title: "EVP",
    body: "Raw microphone. 24-bit WAV, marks, and a playback lift for faint sound.",
    icon: Mic,
  },
  {
    id: "box",
    title: "Spirit box",
    body: "Sweeps FM or AM one channel at a time. It does not speak words.",
    icon: Radio,
  },
  {
    id: "ovilus",
    title: "Ovilus",
    body: "Speaks a word from the location dictionary only when a sensor reading changes.",
    icon: WholeWord,
  },
];

export function ToolsScreen() {
  const setScreen = usePhosphor((s) => s.setScreen);
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <p className="eyebrow">Instruments</p>
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <button key={tool.id} type="button" className="panel flex items-start gap-3 p-4 text-left" onClick={() => setScreen(tool.id)}>
            <span className="round-btn">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm text-fg">{tool.title}</span>
              <span className="mt-1 block text-sm text-muted">{tool.body}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
