import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenSpace",
  description:
    "Turn the drawings of a space into a space you can shape, stand inside and furnish.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
