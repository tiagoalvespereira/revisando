import type { Metadata, Viewport } from "next";
// Fontes servidas pelo próprio site (sem esperar o Google Fonts)
import "@fontsource/archivo-black/latin-400.css";
import "@fontsource-variable/inter/index.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Revisando", template: "%s · Revisando" },
  description: "Área do aluno do Revisando OAB.",
  robots: { index: false },
  icons: { icon: "/marca/revisando-icone-laranja.svg", apple: "/marca/revisando-icone-laranja.png" },
};
export const viewport: Viewport = { themeColor: "#111111", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased min-h-dvh">{children}</body>
    </html>
  );
}
