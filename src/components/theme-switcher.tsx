"use client"

import { useTheme } from "next-themes"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme()

  const themes = [
    { key: "system", icon: MonitorIcon, label: "System" },
    { key: "light", icon: SunIcon, label: "Light" },
    { key: "dark", icon: MoonIcon, label: "Dark" },
  ] as const

  return (
    <div className="flex items-center gap-0.5 border-b px-2 pb-2">
      {themes.map(({ key, icon: Icon, label }) => (
        <Button
          key={key}
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(key)}
          className={cn(
            "flex-1",
            theme === key && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
          title={label}
        >
          <Icon />
          <span className="sr-only">{label}</span>
        </Button>
      ))}
    </div>
  )
}
