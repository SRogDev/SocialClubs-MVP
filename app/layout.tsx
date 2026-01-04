import type React from "react"
import type { Metadata } from "next"
import { Manrope } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { CookieBanner } from "@/components/shared/cookie-banner"
import { VideocallFloatingButton } from "@/components/shared/videocall-float-button"

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
      <body className={manrope.className}  >
        <div className=" dark:bg-gradient-to-br  from-amber-600 to-orange-500">
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            {children}
            <CookieBanner />
            <VideocallFloatingButton />
          </ThemeProvider>
        </div>
      </body>
    </html>
  )
}
