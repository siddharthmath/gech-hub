"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { useAskDoubt } from "@/src/viewmodels/use-doubts";

export function AskDoubtForm({ noticeId }: { noticeId: string }) {
  const [question, setQuestion] = useState("");
  const mutation = useAskDoubt(noticeId);
  const client = useQueryClient();
  const valid = question.trim().length >= 5 && question.trim().length <= 1000;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || mutation.isPending) return;
    try {
      await mutation.mutateAsync(question.trim());
      await client.invalidateQueries({ queryKey: ["doubts", noticeId] });
      setQuestion(""); toast.add({ title: "Doubt posted" });
    } catch (error) { toast.add({ title: "Doubt could not be posted", description: error instanceof Error ? error.message : "Please try again.", priority: "high" }); }
  }
  return <form onSubmit={submit} className="grid gap-2"><label htmlFor="doubt-question" className="text-sm font-medium">Ask a doubt</label><textarea id="doubt-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1000} rows={3} aria-invalid={question.length > 0 && !valid} className="w-full resize-y rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="What would you like to know?"/><div className="flex items-center justify-between text-xs text-muted-foreground"><span>5+ characters</span><span>{question.length}/1000</span></div><button type="submit" disabled={!valid || mutation.isPending} className="min-h-10 justify-self-start rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{mutation.isPending ? "Sending…" : "Send"}</button></form>;
}
