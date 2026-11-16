"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { listNoticesRequest } from "@/src/lib/api/endpoints";
import type { NoticeStatus } from "@/src/lib/api/types";

export function useNotices(status: NoticeStatus, pinned: boolean | null) {
  return useInfiniteQuery({ queryKey: ["notices", status, pinned], queryFn: ({ pageParam }) => listNoticesRequest(status, pinned, pageParam ?? undefined), initialPageParam: null as string | null, getNextPageParam: (page) => page.next_cursor ?? undefined });
}
