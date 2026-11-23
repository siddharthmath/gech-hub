"use client";
import { useMutation } from "@tanstack/react-query";
import { deleteNoticeRequest, updateNoticeRequest, type UpdateNoticeInput } from "@/src/lib/api/endpoints";

export function useNoticeMutations() {
  return { update: useMutation({ mutationFn: ({ id, input }: { id: string; input: UpdateNoticeInput }) => updateNoticeRequest(id, input) }), remove: useMutation({ mutationFn: (id: string) => deleteNoticeRequest(id) }) };
}
