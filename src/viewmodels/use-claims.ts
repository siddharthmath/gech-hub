"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClaimRequest, listClaimsRequest, myClaimsRequest, withdrawClaimRequest } from "@/src/lib/api/endpoints";

export function useClaims(postId: string, enabled = true) {
  return useQuery({
    queryKey: ["claims", postId],
    queryFn: () => listClaimsRequest(postId),
    enabled: Boolean(postId) && enabled,
  });
}

export function useMyClaims(enabled = true) {
  return useInfiniteQuery({
    queryKey: ["myClaims"],
    queryFn: ({ pageParam }) => myClaimsRequest(pageParam ?? undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled,
  });
}

export function useCreateClaim(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => createClaimRequest(postId, message),
    onSuccess: (claim) => {
      queryClient.setQueryData(["claims", postId], (current: Awaited<ReturnType<typeof listClaimsRequest>> | undefined) => {
        const existing = current ?? { items: [], count: 0, next_cursor: null };
        if (existing.items.some((item) => item.id === claim.id)) return existing;
        return { ...existing, items: [claim, ...existing.items], count: existing.count + 1 };
      });
      void queryClient.invalidateQueries({ queryKey: ["claims", postId] });
    },
  });
}

export function useWithdrawClaim(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (claimId: string) => withdrawClaimRequest(claimId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["claims", postId] }),
        queryClient.invalidateQueries({ queryKey: ["myClaims"] }),
      ]);
    },
  });
}
