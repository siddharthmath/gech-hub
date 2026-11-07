"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

type SessionExpiredEvent = CustomEvent<{ scope: "admin" | "user" }>;

export function SessionExpiryRedirect() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    function onSessionExpired(event: Event) {
      const { scope } = (event as SessionExpiredEvent).detail;
      if (scope === "admin") queryClient.removeQueries({ queryKey: ["admin"] });
      router.replace(scope === "admin" ? "/admin-login" : "/login");
    }
    window.addEventListener("gechhub:session-expired", onSessionExpired);
    return () => window.removeEventListener("gechhub:session-expired", onSessionExpired);
  }, [queryClient, router]);
  return null;
}
