import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "FinFlow — Household Finances",
  description:
    "Track your household's cash flow, set savings goals, and get AI-powered financial advice grounded in your real spending data.",
  appleWebApp: {
    capable: true,
    title: "FinFlow",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#030712",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-950 text-gray-100 font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
