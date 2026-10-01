import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sarah Johnson — Software Engineer",
  description:
    "An experimental landing page introducing Sarah Johnson's backend, API, integration, data, and AI work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-black text-zinc-50">{children}</body>
    </html>
  );
}
