import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "処方量計算アプリ",
  description: "インスリン・注射薬・血糖測定用品・CGM処方量計算アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
