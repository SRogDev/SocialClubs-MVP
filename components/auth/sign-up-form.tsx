"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from 'posthog-js';
import { useState } from "react";

import { GuestButton } from "@/components/auth/guest-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";




interface SignUpFormProps extends React.ComponentPropsWithoutRef<"div"> {
  /** club_link code when coming from an invite link */
  inviteCode?: string
  /** Human-readable club name to show context */
  clubName?: string
}

export function SignUpForm({
  className,
  inviteCode,
  clubName,
  ...props
}: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // After email confirmation, redirect directly to the join page so the
      // auto-join logic runs while the user is now authenticated.
      const redirectAfterConfirm = inviteCode
        ? `${window.location.origin}/clubs/join/${inviteCode}`
        : `${window.location.origin}/auth/confirm?next=/clubs`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectAfterConfirm,
        },
      });
      if (error) throw error;

      // Capture PostHog event on success (client-side only)
      posthog.capture('user_registered', {
        email,
        timestamp: new Date().toISOString(),
        invite_code: inviteCode ?? null,
      });

      const successParams = new URLSearchParams();
      if (inviteCode) successParams.set("invite", inviteCode);
      if (clubName) successParams.set("club", clubName);
      const qs = successParams.toString();
      router.push(`/auth/sign-up-success${qs ? `?${  qs}` : ''}`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {clubName ? `Únete a ${clubName}` : "Crear cuenta"}
          </CardTitle>
          <CardDescription>
            {clubName
              ? "Crea tu cuenta para unirte al club automáticamente"
              : "Crea una nueva cuenta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> Creando cuenta...</>
                ) : "Crear cuenta"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or
          </span>
        </div>
      </div>
      <GuestButton />
    </div>
  );
}
