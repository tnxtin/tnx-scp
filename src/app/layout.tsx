import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tnx · Social Chess Pairing · Sistema de Emparejamiento por Grupos Progresivos",
  description:
    "Generador de emparejamientos de ajedrez con Elo virtual por media exponencial y grupos progresivos. Software libre (GPL-3.0-or-later) para clubes, escuelas y centros sociales.",
  keywords: ["ajedrez", "emparejamiento", "suizo", "Elo virtual", "torneo"],
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-stone-100 to-background dark:from-stone-950">
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
          <footer className="mt-auto border-t bg-background">
            <div className="mx-auto w-full max-w-6xl px-4 py-3 text-center text-xs text-muted-foreground">
              Sistema de Emparejamiento por Grupos Progresivos · Los datos del torneo los gestiona
              el árbitro desde su panel
            </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
