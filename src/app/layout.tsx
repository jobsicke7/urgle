import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UR·GLE",
  description: "닮은 연예인을 찾아보세오!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}