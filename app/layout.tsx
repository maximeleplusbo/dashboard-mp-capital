// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MP Capital — Espace investisseur",
  description: "Tableau de bord MP Capital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0, background: '#0d0f14' }}>{children}</body>
    </html>
  );
}