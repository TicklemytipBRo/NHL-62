import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RINK 26 — NHL Hockey",
  description: "32 NHL teams, complete live rosters, a cinematic opening, customizable controls, and a dedicated goalie mode.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
