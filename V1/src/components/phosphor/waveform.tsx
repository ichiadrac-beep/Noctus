export function Waveform({
  peaks,
  progress = -1,
  label,
  marks = [],
  onSeek,
}: {
  peaks: number[];
  progress?: number;
  label: string;
  marks?: number[];
  onSeek?: (ratio: number) => void;
}) {
  const data = peaks.length ? peaks : [0.08];
  return (
    <div
      className={`relative flex h-16 items-end gap-0.5 ${onSeek ? "cursor-pointer" : ""}`}
      role={onSeek ? "slider" : "img"}
      aria-label={label}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek && progress >= 0 ? Math.round(progress * 100) : undefined}
      onClick={
        onSeek
          ? (event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
              onSeek(Math.max(0, Math.min(1, ratio)));
            }
          : undefined
      }
    >
      {data.map((peak, index) => {
        const played = progress >= 0 && index / data.length <= progress;
        const height = Math.max(8, Math.min(100, peak * 100));
        return (
          <span
            key={index}
            className={`block flex-1 rounded-sm ${played ? "bg-amber" : "bg-muted"}`}
            style={{ height: `${height}%` }}
          />
        );
      })}
      {marks.map((mark, index) => (
        <span
          key={`m-${index}`}
          className="absolute top-0 bottom-0 w-px bg-rec"
          style={{ left: `${Math.max(0, Math.min(100, mark * 100))}%` }}
        />
      ))}
    </div>
  );
}
