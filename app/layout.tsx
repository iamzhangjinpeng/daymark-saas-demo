import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daymark — Make room for what matters",
  description:
    "A thoughtful task workspace with secure sign-in and personal, persistent task storage.",
  applicationName: "Daymark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
