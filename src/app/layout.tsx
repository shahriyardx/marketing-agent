import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { cn } from "@/lib/utils"
import { APP_NAME } from "@/lib/constants"
import { ClientProviders } from "@/components/client-providers"

const fontHeading = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-heading",
})

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s — ${APP_NAME}`,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontSans.variable,
        jetbrainsMono.variable,
        fontHeading.variable,
      )}
    >
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
