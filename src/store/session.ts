"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { loginRequest } from "@/src/lib/api/endpoints";
import type { Profile } from "@/src/lib/api/types";

interface SessionState {
  token: string | null;
  profile: Profile | null;
  expiresAt: number | null;
  hydrated: boolean;
  login: (email: string, otp: string) => Promise<void>;
  setProfile: (profile: Profile) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      profile: null,
      expiresAt: null,
      hydrated: false,
      login: async (email, otp) => {
        const result = await loginRequest(email, otp);
        set({
          token: result.access_token,
          profile: result.profile,
          expiresAt: Date.now() + result.expires_in * 1000,
        });
      },
      setProfile: (profile) => set({ profile }),
      logout: () => set({ token: null, profile: null, expiresAt: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "gechhub-session",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        token: state.token,
        profile: state.profile,
        expiresAt: state.expiresAt,
      }),
    },
  ),
);

export function hasValidSession(
  session: Pick<SessionState, "token" | "expiresAt">,
): boolean {
  return Boolean(
    session.token && session.expiresAt && session.expiresAt > Date.now(),
  );
}
