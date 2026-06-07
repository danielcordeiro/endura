import type { Metadata, Viewport } from 'next';
import { Lexend, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Endura — Performance para Triatletas',
  description: 'Plano de treino com IA, nutrição prescritiva e envio direto para o relógio.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Endura',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // pinch-zoom preservado (acessibilidade) — não travar maximumScale
  themeColor: '#0d161d',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${lexend.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* display=block: oculta o ícone até a fonte carregar (evita flash do nome textual) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="font-[var(--font-heading)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
