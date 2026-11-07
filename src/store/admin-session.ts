"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { adminLoginRequest } from "@/src/lib/api/endpoints";
import type { AdminProfile } from "@/src/lib/api/types";

interface AdminSessionState {
  token: string | null;
  profile: AdminProfile | null;
  expiresAt: number | null;
  hydrated: boolean;
  login: (email: string, otp: string) => Promise<void>;
  setProfile: (profile: AdminProfile) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAdminSessionStore = create<AdminSessionState>()(
  persist(
    (set) => ({
      token: null,
      profile: null,
      expiresAt: null,
      hydrated: false,
      login: async (email, otp) => {
        const result = await adminLoginRequest(email, otp);
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
      name: "gechhub-admin-session",
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

export function hasValidAdminSession(
  session: Pick<AdminSessionState, "token" | "expiresAt" | "profile">,
): boolean {
  return Boolean(
    session.token &&
      session.expiresAt &&
      session.expiresAt > Date.now() &&
      session.profile?.role === "admin",
  );
}
