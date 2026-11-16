import type { Notice } from "@/src/lib/api/types";
import { NoticeCard } from "./notice-card";
export function PinnedStrip({ items }: { items: Notice[] }) { if (!items.length) return null; return <section className="grid gap-4"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pinned notices</h2>{items.map((item) => <NoticeCard key={item.id} item={item}/>)}</section>; }
