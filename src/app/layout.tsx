"use client";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Provider as ThemeProvider } from "@/components/providers/ThemeProvider";
import ProtectedPage from "@/components/ui/ProtectedPage";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased`}
      >
        <ThemeProvider>
          <SessionProvider>
            <ProtectedPage>{children}</ProtectedPage>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
