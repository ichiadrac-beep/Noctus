import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import {
  allItems,
  deleteItem,
  type EmfTrace,
  type OvilusSession,
  type SpiritSession,
} from "@/lib/phosphor/db";
import { csvCell, downloadText, formatDay, formatDuration } from "@/lib/phosphor/format";
import { usePhosphor } from "@/lib/phosphor/store";

export function LogPanel() {
  const libraryTick = usePhosphor((s) => s.libraryTick);
  const bumpLibrary = usePhosphor((s) => s.bumpLibrary);
  const [sessions, setSessions] = useState<SpiritSession[]>([]);
  const [ovilus, setOvilus] = useState<OvilusSession[]>([]);
  const [traces, setTraces] = useState<EmfTrace[]>([]);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([allItems<SpiritSession | OvilusSession>("sessions"), allItems<EmfTrace>("traces")])
      .then(([sessionRows, traceRows]) => {
        if (cancelled) return;
        const spirit = sessionRows.filter((row): row is SpiritSession => !("kind" in row) || row.kind !== "ovilus");
        const spoken = sessionRows.filter((row): row is OvilusSession => "kind" in row && row.kind === "ovilus");
        setSessions([...spirit].sort((a, b) => b.started - a.started));
        setOvilus([...spoken].sort((a, b) => b.started - a.started));
        setTraces([...traceRows].sort((a, b) => b.started - a.started));
        setNote("");
      })
      .catch(() => {
        if (!cancelled) setNote("The field notebook could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [libraryTick]);

  function exportSession(session: SpiritSession) {
    const lines = [
      "PHOSPHOR SESSION",
      `When: ${new Date(session.started).toISOString()}`,
      `Place: ${session.place || "Unknown"}`,
      session.lat != null && session.lon != null ? `Coordinates: ${session.lat.toFixed(3)}, ${session.lon.toFixed(3)}` : "",
      `Lexicon: ${session.lang} (${session.bcp47})`,
      `Question: ${session.question || "—"}`,
      "",
      ...session.words.map((word) => {
        const freq = word.band === "FM" ? `${word.freq.toFixed(1)} MHz` : `${Math.round(word.freq)} kHz`;
        return `${new Date(word.t).toISOString()}  ${word.band} ${freq}  ${word.word}`;
      }),
    ].filter((line) => line !== undefined);
    downloadText(`phosphor-session-${session.started}.txt`, lines.join("\n"));
  }

  function exportOvilus(session: OvilusSession) {
    const lines = [
      "PHOSPHOR OVILUS",
      `When: ${new Date(session.started).toISOString()}`,
      `Place: ${session.place || "Unknown"}`,
      session.lat != null && session.lon != null ? `Coordinates: ${session.lat.toFixed(3)}, ${session.lon.toFixed(3)}` : "",
      `Lexicon: ${session.lang} (${session.bcp47})`,
      `Mode: ${session.mode}`,
      `Drive: ${session.drive}`,
      `Question: ${session.question || "—"}`,
      "",
      ...session.words.map((word) => `${new Date(word.t).toISOString()}  ${word.mode}  ${word.drive}  ${word.word}`),
    ].filter((line) => line !== undefined);
    downloadText(`phosphor-ovilus-${session.started}.txt`, lines.join("\n"));
  }

  function exportTrace(trace: EmfTrace) {
    const header = "time_iso,x_uT,y_uT,z_uT,total_uT,delta_mG";
    const rows = trace.samples.map((sample) =>
      [
        csvCell(new Date(sample.t).toISOString()),
        sample.x.toFixed(3),
        sample.y.toFixed(3),
        sample.z.toFixed(3),
        sample.ut.toFixed(3),
        sample.deltaMg.toFixed(3),
      ].join(","),
    );
    downloadText(`phosphor-emf-${trace.started}.csv`, [header, ...rows].join("\n"), "text/csv;charset=utf-8");
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <p className="text-sm text-muted">
        Spirit sessions, Ovilus passes, and EMF traces stay on this phone. EVP takes are on the EVP deck.
      </p>
      {note ? <p className="text-sm text-amber">{note}</p> : null}

      <section className="flex flex-col gap-3">
        <h2 className="kicker text-fg">Spirit sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet. Power the box and let a few words through.</p>
        ) : (
          sessions.map((session) => (
            <article key={session.id} className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm text-fg">{session.place || "Unplaced session"}</h3>
                  <p className="text-xs text-muted">
                    {formatDay(session.started)} · {session.lang} · {session.words.length} words
                  </p>
                </div>
              </div>
              {session.question ? <p className="text-sm text-fg">“{session.question}”</p> : null}
              <div className="flex flex-wrap gap-2">
                {session.words.slice(-24).map((word, index) => (
                  <span key={`${word.t}-${index}`} className="chip" lang={session.bcp47}>
                    {word.word}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="key inline-flex items-center justify-center gap-2" onClick={() => exportSession(session)}>
                  <Download className="size-4" aria-hidden="true" />
                  Text
                </button>
                <button
                  type="button"
                  className="key inline-flex items-center justify-center gap-2"
                  data-hot={pending === session.id ? "true" : "false"}
                  onClick={() => {
                    if (pending !== session.id) {
                      setPending(session.id);
                      return;
                    }
                    void deleteItem("sessions", session.id)
                      .then(() => {
                        setPending(null);
                        bumpLibrary();
                      })
                      .catch(() => setNote("Could not delete that session."));
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  {pending === session.id ? "Confirm" : "Delete"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="kicker text-fg">Ovilus</h2>
        {ovilus.length === 0 ? (
          <p className="text-sm text-muted">No Ovilus passes yet. Power it and let the field move a word.</p>
        ) : (
          ovilus.map((session) => (
            <article key={session.id} className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3">
              <div className="min-w-0">
                <h3 className="text-sm text-fg">{session.place || "Unplaced pass"}</h3>
                <p className="text-xs text-muted">
                  {formatDay(session.started)} · {session.lang} · {session.mode} · {session.drive} · {session.words.length} words
                </p>
              </div>
              {session.question ? <p className="text-sm text-fg">“{session.question}”</p> : null}
              <div className="flex flex-wrap gap-2">
                {session.words.slice(-24).map((word, index) => (
                  <span key={`${word.t}-${index}`} className="chip" lang={session.bcp47}>
                    {word.word}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="key inline-flex items-center justify-center gap-2" onClick={() => exportOvilus(session)}>
                  <Download className="size-4" aria-hidden="true" />
                  Text
                </button>
                <button
                  type="button"
                  className="key inline-flex items-center justify-center gap-2"
                  data-hot={pending === session.id ? "true" : "false"}
                  onClick={() => {
                    if (pending !== session.id) {
                      setPending(session.id);
                      return;
                    }
                    void deleteItem("sessions", session.id)
                      .then(() => {
                        setPending(null);
                        bumpLibrary();
                      })
                      .catch(() => setNote("Could not delete that pass."));
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  {pending === session.id ? "Confirm" : "Delete"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="kicker text-fg">EMF traces</h2>
        {traces.length === 0 ? (
          <p className="text-sm text-muted">No magnetic traces yet. Arm the sensor on the EMF deck and record.</p>
        ) : (
          traces.map((trace) => (
            <article key={trace.id} className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3">
              <h3 className="text-sm text-fg">{trace.place || "Unplaced trace"}</h3>
              <p className="text-xs text-muted">
                {formatDay(trace.started)} · {formatDuration(trace.durationMs / 1000)} · peak {trace.peakUt.toFixed(1)} µT · Δ{" "}
                {trace.peakAbsMg.toFixed(1)} mG · {trace.samples.length} samples
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="key inline-flex items-center justify-center gap-2" onClick={() => exportTrace(trace)}>
                  <Download className="size-4" aria-hidden="true" />
                  CSV
                </button>
                <button
                  type="button"
                  className="key inline-flex items-center justify-center gap-2"
                  data-hot={pending === trace.id ? "true" : "false"}
                  onClick={() => {
                    if (pending !== trace.id) {
                      setPending(trace.id);
                      return;
                    }
                    void deleteItem("traces", trace.id)
                      .then(() => {
                        setPending(null);
                        bumpLibrary();
                      })
                      .catch(() => setNote("Could not delete that trace."));
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  {pending === trace.id ? "Confirm" : "Delete"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
