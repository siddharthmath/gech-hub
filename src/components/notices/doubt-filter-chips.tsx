import type { DoubtFilter } from "@/src/components/notices/doubts-panel";

export function DoubtFilterChips({ value, onChange }: { value: DoubtFilter; onChange: (filter: DoubtFilter) => void }) {
  return <div aria-label="Filter doubts" className="flex gap-2">{([ ["all", "All"], ["unanswered", "Unanswered"], ["answered", "Answered"] ] as const).map(([filter, label]) => <button key={filter} type="button" aria-pressed={value === filter} onClick={() => onChange(filter)} className={`rounded-full px-3 py-1.5 text-sm ${value === filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{label}</button>)}</div>;
}
