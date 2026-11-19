"use client";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { createDoubtRequest, listDoubtsRequest } from "@/src/lib/api/endpoints";

export function useDoubts(noticeId: string, answered: boolean | null) {
  return useInfiniteQuery({ queryKey: ["doubts", noticeId, answered], queryFn: ({ pageParam }) => listDoubtsRequest(noticeId, answered, pageParam ?? undefined), initialPageParam: null as string | null, getNextPageParam: (page) => page.next_cursor ?? undefined });
}
export function useAskDoubt(noticeId: string) {
  return useMutation({ mutationFn: (question: string) => createDoubtRequest(noticeId, question) });
}
