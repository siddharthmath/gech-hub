"use client";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createDoubtRequest, deleteDoubtRequest, listDoubtsRequest, updateDoubtRequest } from "@/src/lib/api/endpoints";

export function useDoubts(noticeId: string, answered: boolean | null) {
  return useInfiniteQuery({ queryKey: ["doubts", noticeId, answered], queryFn: ({ pageParam }) => listDoubtsRequest(noticeId, answered, pageParam ?? undefined), initialPageParam: null as string | null, getNextPageParam: (page) => page.next_cursor ?? undefined });
}
export function useAskDoubt(noticeId: string) {
  return useMutation({ mutationFn: (question: string) => createDoubtRequest(noticeId, question) });
}
export function useDoubtMutations(noticeId: string) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ["doubts", noticeId] });
  return {
    update: useMutation({ mutationFn: ({ id, question }: { id: string; question: string }) => updateDoubtRequest(id, question), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => deleteDoubtRequest(id), onSuccess: refresh }),
  };
}
