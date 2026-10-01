import type { Metadata } from "next";
import "./globals.css";
import { BASE } from "./products";

export const metadata: Metadata = {
  title: "USE MAVIÊ | Moda Feminina",
  description: "Divas usam Maviê. Vestidos, conjuntos e bodies com entrega em Brasília.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: `${BASE}/favicon.svg`,
    shortcut: `${BASE}/favicon.svg`,
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
