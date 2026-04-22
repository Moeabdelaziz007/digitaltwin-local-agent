import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyDigitalTwin (Zero-Latency)",
  description: "A fast, local-first agent computing platform.",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FAF8F5',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Meticulous Recorder - Must be first script to instrument browser APIs */}
        {(process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") && (
          <script
            data-recording-token={process.env.NEXT_PUBLIC_METICULOUS_TOKEN || ""}
            data-is-production-environment="false"
            src="https://snippet.meticulous.ai/v1/meticulous.js"
          />
        )}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js'); }); }`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-svh safe-top safe-bottom`}>
        <ClerkProvider
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: 'hsl(20, 100%, 50%)', // Neon Orange/Warm Accent
              colorBackground: '#0a0a0a',
              colorText: '#f5f5f5',
              borderRadius: '0.75rem',
            },
            elements: {
              card: 'border border-white/10 glass-surface',
              navbar: 'hidden', // Minimalist
            }
          }}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ClerkProvider>
      </body>
    </html>
  );
}

