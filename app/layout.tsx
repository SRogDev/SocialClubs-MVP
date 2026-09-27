import type { Metadata } from "next"
import { Manrope } from "next/font/google"
import type React from "react"

import "./globals.css"
import { AppShell } from "@/components/shared/app-shell"
import { CookieBanner } from "@/components/shared/cookie-banner"
import { RootErrorBoundary } from "@/components/shared/error-boundary"
import { OneSignalProvider } from "@/components/shared/onesignal-provider"
import { VideocallFloatingButton } from "@/components/shared/videocall-float-button"
import { ThemeProvider } from "@/components/theme-provider"

import { ImageKitProvider } from "@imagekit/next"


const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-manrope"
})

export const metadata: Metadata = {
  title: "SocialClubs",
  description: "Todo el Poder para Crear",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={manrope.className}>
        {/* Skip to main content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white focus:font-semibold focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>
        <ImageKitProvider urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <RootErrorBoundary>
              <AppShell>
                <main id="main-content">
                  {children}
                </main>
              </AppShell>
            </RootErrorBoundary>
            <OneSignalProvider />
            <CookieBanner />
            <VideocallFloatingButton />
          </ThemeProvider>
        </ImageKitProvider>
      </body>
    </html>
  )
}
