import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Revisando", template: "%s · Revisando" },
  description: "Área do aluno do Revisando OAB.",
  robots: { index: false },
};
export const viewport: Viewport = { themeColor: "#111111", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased min-h-dvh">{children}</body>
    </html>
  );
}
