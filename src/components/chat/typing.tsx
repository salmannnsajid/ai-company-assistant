// The one-line status while the agent is busy, e.g. "Crunching the numbers…".
export function Typing({ label }: { label: string }) {
  return <div className="shimmer w-fit text-sm">{label}…</div>;
}
