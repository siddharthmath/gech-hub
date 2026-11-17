"use client";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { downloadNoticeRequest, getNoticeRequest, listNoticesRequest } from "@/src/lib/api/endpoints";
import type { NoticeStatus } from "@/src/lib/api/types";

export function useNotices(status: NoticeStatus, pinned: boolean | null) {
  return useInfiniteQuery({ queryKey: ["notices", status, pinned], queryFn: ({ pageParam }) => listNoticesRequest(status, pinned, pageParam ?? undefined), initialPageParam: null as string | null, getNextPageParam: (page) => page.next_cursor ?? undefined });
}

export function useNotice(id: string) {
  return useQuery({ queryKey: ["notice", id], queryFn: () => getNoticeRequest(id), enabled: Boolean(id) });
}

export function useNoticeAttachment() {
  return useMutation({ mutationFn: (id: string) => downloadNoticeRequest(id) });
}
