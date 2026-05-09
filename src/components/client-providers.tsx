"use client"

import { TRPCProvider } from "@/components/trpc-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <TooltipProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </TooltipProvider>
    </TRPCProvider>
  )
}
