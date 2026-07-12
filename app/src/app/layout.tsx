import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "FinFlow — Household Finances",
  description:
    "Track your household's cash flow, set savings goals, and get AI-powered financial advice grounded in your real spending data.",
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
