"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn, SignInResponse } from "next-auth/react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const [formData, setFormData] = useState<{ email: string; password: string }>(
    {
      email: "",
      password: "",
    }
  );
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
        setError("Invalid Credentials.");
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Login</CardTitle>
          <span className="text-center text-sm text-gray-800">
            Enter your details below to login
          </span>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mindfulmandy@gmail.com"
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
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
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
              {error && <span className="text-red-500 text-sm">{error}</span>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                onClick={async () => await handleSubmit()}
              >
                Login
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Separator className="my-2" />
          <span className="text-sm text-gray-600">
            Don&apos;t have an account yet?{" "}
            <Link href="/sign-up" className="font-bold underline">
              Sign up
            </Link>
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
