import "@fontsource-variable/jetbrains-mono/wght.css";
import "@fontsource/fira-code/400.css";
import "@fontsource/fira-code/500.css";

import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "CurXor OS · Flight Command",
  description: "Your sovereign digital employees — local, private, always on",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-void font-sans text-stark antialiased">{children}</body>
    </html>
  );
}
