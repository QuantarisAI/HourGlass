import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HourGlass",
  description: "Chat-driven deadline tracker with live countdowns and reminders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
