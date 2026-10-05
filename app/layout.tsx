import type { Metadata } from "next";
import "./globals.css";
import { BASE } from "./products";

export const metadata: Metadata = {
  title: "USE MAVIÊ | Moda Feminina",
  description: "Divas usam Maviê. Vestidos, conjuntos e bodies com entrega em Brasília.",
  other: {
    "codex-preview": "development",
  },
  // "M" do logo original sobre o degradê da marca. Gerados por scripts/make-icons.py.
  icons: {
    icon: [
      { url: `${BASE}/favicon.ico`, sizes: "48x48" },
      { url: `${BASE}/icon-64.png`, sizes: "64x64", type: "image/png" },
      { url: `${BASE}/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    shortcut: `${BASE}/favicon.ico`,
    apple: { url: `${BASE}/apple-touch-icon.png`, sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
