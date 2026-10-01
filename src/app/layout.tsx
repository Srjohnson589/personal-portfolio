import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your Name — Portfolio",
  description:
    "Designer and developer portfolio showcasing project outlines, design process, and approach.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-black text-zinc-50">
        {children}
      </body>
    </html>
  );
}
