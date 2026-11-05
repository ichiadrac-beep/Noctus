import { useEffect, useState } from "react";
import { allItems, type EmfTrace, type EvpClip, type OvilusSession, type SpiritSession } from "@/lib/phosphor/db";
import { formatClock, formatDay } from "@/lib/phosphor/format";
import { usePhosphor } from "@/lib/phosphor/store";

type Row = { id: string; title: string; meta: string; kind: "clip" | "session" | "trace" };

function isOvilus(row: SpiritSession | OvilusSession): row is OvilusSession {
  return (row as OvilusSession).kind === "ovilus";
}

export function SessionsScreen() {
  const openClip = usePhosphor((s) => s.openClip);
  const libraryTick = usePhosphor((s) => s.libraryTick);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const [sessions, clips, traces] = await Promise.all([
          allItems<SpiritSession | OvilusSession>("sessions"),
          allItems<EvpClip>("clips"),
          allItems<EmfTrace>("traces"),
        ]);
        const next: Row[] = [
          ...clips.map((clip) => ({
            id: clip.id,
            title: clip.name,
            meta: `${formatDay(clip.created)} · ${formatClock(clip.duration)}`,
            kind: "clip" as const,
          })),
          ...sessions.map((session) => ({
            id: session.id,
            title: isOvilus(session) ? `Ovilus · ${session.lang}` : `Sweep · ${session.lang}`,
            meta: `${formatDay(session.started)} · ${session.place || "No place"} · ${session.words.length} hits`,
            kind: "session" as const,
          })),
          ...traces.map((trace) => ({
            id: trace.id,
            title: "EMF trace",
            meta: `${formatDay(trace.started)} · peak ${trace.peakAbsMg.toFixed(0)} mG`,
            kind: "trace" as const,
          })),
        ];
        if (!cancel) setRows(next);
      } catch {
        if (!cancel) setRows([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [libraryTick]);

  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <p className="eyebrow">On this phone</p>
      {rows.length === 0 ? (
        <p className="panel p-4 text-sm text-muted">No sessions yet. Start an investigation, then use a tool.</p>
      ) : (
        rows.map((row) => (
          <button
            key={`${row.kind}-${row.id}`}
            type="button"
            className="panel px-4 py-3 text-left"
            onClick={() => {
              if (row.kind === "clip") openClip(row.id);
            }}
          >
            <p className="text-sm text-fg">{row.title}</p>
            <p className="mt-1 text-xs text-muted">{row.meta}</p>
          </button>
        ))
      )}
    </div>
  );
}
