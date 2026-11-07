"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/src/lib/api/errors";
import { useSessionStore } from "@/src/store/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/src/components/providers/theme-provider";

export default function LoginPage() {
  const router = useRouter();
  const login = useSessionStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), otp.trim());
      router.replace("/findit");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-muted/50 px-5 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md gap-0 rounded-2xl p-7 shadow-sm sm:p-9">
        <Link href="/" className="text-sm font-semibold tracking-tight text-primary">
          GECHhub <span className="text-muted-foreground">/ FindIt</span>
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sign in with your campus email and one-time password.
        </p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Campus email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full px-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="otp">One-time password</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className="h-11 w-full px-3 text-sm"
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full px-4 text-sm font-semibold disabled:cursor-wait"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <Link
          href="/admin-login"
          className="mt-3 inline-flex min-h-11 items-center rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          Administrator? Sign in
        </Link>
      </Card>
    </main>
  );
}
