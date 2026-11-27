"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn, SignInResponse } from "next-auth/react";
import Link from "next/link";
import { journalMutedClass, journalShellClass } from "@/components/journal/shell";

export default function LoginPage() {
  const [formData, setFormData] = useState<{ email: string; password: string }>(
    {
      email: "",
      password: "",
    }
  );
  const [emailOpen, setEmailOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: SignInResponse | undefined = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });
      if (res?.ok) {
        router.push("/");
      } else if (res?.status === 401) {
        setError("Invalid credentials.");
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${journalShellClass} flex items-center justify-center px-6`}>
      <Card className="w-full max-w-sm border-black/10 bg-white dark:border-white/10 dark:bg-[#1c1c1a]">
        <CardHeader>
          <CardTitle className="text-center font-journal text-4xl font-normal">
            Login
          </CardTitle>
          <p className={`${journalMutedClass} text-center text-sm`}>
            Sign in to your journal
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Button
            type="button"
            className="h-11 w-full bg-[#1c1916] text-[#f6f4f0] hover:bg-[#1c1916]/90 dark:bg-[#f3efe6] dark:text-[#1c1916] dark:hover:bg-[#f3efe6]/90"
            disabled={loading}
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            Continue with Google
          </Button>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            <span className={`${journalMutedClass} text-xs`}>or</span>
            <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>
          <div className="flex flex-col gap-4">
            <button
              type="button"
              className={`${journalMutedClass} text-sm underline-offset-4 hover:underline`}
              aria-expanded={emailOpen}
              onClick={() => setEmailOpen((open) => !open)}
            >
              {emailOpen ? "Hide email sign-in" : "Use email and password"}
            </button>
            {emailOpen && (
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoFocus
                    disabled={loading}
                    value={formData.email}
                    onChange={(e) => {
                      if (error) setError(null);
                      setFormData({ ...formData, email: e.target.value });
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    disabled={loading}
                    value={formData.password}
                    onChange={(e) => {
                      if (error) setError(null);
                      setFormData({ ...formData, password: e.target.value });
                    }}
                  />
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                  Login
                </Button>
              </form>
            )}
          </div>
          <div className="h-px bg-black/10 dark:bg-white/10" />
          <p className={`${journalMutedClass} text-center text-sm`}>
            Don&apos;t have an account yet?{" "}
            <Link href="/sign-up" className="font-medium text-[#1c1916] underline dark:text-[#f3efe6]">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
