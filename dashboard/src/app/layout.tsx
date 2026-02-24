import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUNA Agent — Virtuals Protocol Dashboard",
  description: "Monitor LUNA agent activity, earnings, jobs, and ACP marketplace performance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
