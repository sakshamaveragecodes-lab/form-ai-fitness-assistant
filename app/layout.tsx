import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORM — AI Gym & Fitness Assistant",
  description:
    "Your training, nutrition, and recovery in one private fitness workspace.",
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
