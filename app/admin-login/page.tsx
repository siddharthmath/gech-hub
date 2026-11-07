"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/src/lib/api/errors";
import { useAdminSessionStore } from "@/src/store/admin-session";

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAdminSessionStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), otp.trim());
      const profile = useAdminSessionStore.getState().profile;
      if (profile?.role !== "admin") {
        useAdminSessionStore.getState().logout();
        throw new Error("This account is not an administrator account.");
      }
      router.replace("/admin");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error
        ? cause.message
        : "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-5 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-semibold text-primary">GECHhub / Administration</p>
          <CardTitle className="text-2xl">Admin sign in</CardTitle>
          <CardDescription>Use the administrator email and one-time password provided by your organisers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="admin-email">Administrator email</FieldLabel>
                <Input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="admin-otp">One-time password</FieldLabel>
                <Input id="admin-otp" type="text" inputMode="numeric" autoComplete="one-time-code" required value={otp} onChange={(event) => setOtp(event.target.value)} />
              </Field>
            </FieldGroup>
            {error && <Alert variant="destructive" role="alert"><AlertTitle>Couldn’t sign in</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            <Button type="submit" disabled={submitting} className="min-h-11">
              {submitting ? "Signing in…" : "Sign in to admin"}
            </Button>
          </form>
          <Link
            href="/login"
            className="mt-3 inline-flex min-h-11 items-center rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Student or staff? Sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
