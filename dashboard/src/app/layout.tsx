import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUNA Agent — Virtuals Protocol Dashboard",
  description: "Monitor LUNA agent activity, earnings, jobs, and ACP marketplace performance",
  other: {
    "virtual-protocol-site-verification": "7cb26b55472f7ed13f9bf0b15e48f56c",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
