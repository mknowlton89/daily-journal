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
import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { journalMutedClass, journalShellClass } from "@/components/journal/shell";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [emailOpen, setEmailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/login");
      } else {
        const body = (await res.json()) as { message?: string };
        setError(body.message ?? "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${journalShellClass} flex items-center justify-center px-6`}>
      <Card className="w-full max-w-sm border-black/10 bg-white dark:border-white/10 dark:bg-[#1c1c1a]">
        <CardHeader>
          <CardTitle className="text-center font-journal text-4xl font-normal">
            Create your account
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Button
            type="button"
            className="h-11 w-full bg-[#1c1916] text-[#f6f4f0] hover:bg-[#1c1916]/90 dark:bg-[#f3efe6] dark:text-[#1c1916] dark:hover:bg-[#f3efe6]/90"
            disabled={loading}
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            Sign up with Google
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
              {emailOpen ? "Hide email sign-up" : "Use email and password"}
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
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    autoFocus
                    disabled={loading}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    disabled={loading}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    disabled={loading}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                  />
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                  Create account
                </Button>
              </form>
            )}
          </div>
          <div className="h-px bg-black/10 dark:bg-white/10" />
          <p className={`${journalMutedClass} text-center text-sm`}>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[#1c1916] underline dark:text-[#f3efe6]">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
