"use client";

import { SessionProvider } from "next-auth/react";
import { Provider as ThemeProvider } from "@/components/providers/ThemeProvider";
import ProtectedPage from "@/components/ui/ProtectedPage";

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ProtectedPage>{children}</ProtectedPage>
      </SessionProvider>
    </ThemeProvider>
  );
}
