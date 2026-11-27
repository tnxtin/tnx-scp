import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SiteHeader } from "@/components/site-header";
import { Container } from "@/components/site/section";

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
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-stone-100 to-background">
          <SiteHeader />
          {/* cada página lleva su contenedor: la portada usa bandas a todo el ancho */}
          <main className="flex-1">{children}</main>
          <footer className="mt-auto border-t bg-background">
            <Container className="flex flex-col items-center gap-3 py-5 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
              <p>
                Sistema de Emparejamiento por Grupos Progresivos · Los datos del
                torneo los gestiona el árbitro desde su panel
              </p>
              <nav aria-label="Web pública" className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                <Link href="/torneos" className="underline-offset-4 hover:text-foreground hover:underline">
                  Torneos
                </Link>
                <Link href="/jugadores" className="underline-offset-4 hover:text-foreground hover:underline">
                  Jugadores
                </Link>
                <Link href="/#como-funciona" className="underline-offset-4 hover:text-foreground hover:underline">
                  Cómo funciona
                </Link>
                <Link href="/#faq" className="underline-offset-4 hover:text-foreground hover:underline">
                  FAQ
                </Link>
                <Link href="/wiki" className="underline-offset-4 hover:text-foreground hover:underline">
                  Wiki
                </Link>
                <Link href="/changelog" className="underline-offset-4 hover:text-foreground hover:underline">
                  ChangeLog
                </Link>
              </nav>
            </Container>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
