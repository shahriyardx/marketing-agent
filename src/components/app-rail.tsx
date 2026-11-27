"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  FileTextIcon,
  KeyRoundIcon,
  LayoutGridIcon,
  ListIcon,
  LogOutIcon,
  MailIcon,
  SendIcon,
  Settings2Icon,
  UsersRoundIcon,
} from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const MAIN = [
  { href: "/dashboard", label: "Overview", icon: LayoutGridIcon, exact: true },
  { href: "/dashboard/contacts", label: "Contacts", icon: UsersRoundIcon },
  { href: "/dashboard/lists", label: "Lists", icon: ListIcon },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: SendIcon },
  { href: "/dashboard/templates", label: "Templates", icon: FileTextIcon },
]

const SETUP = [
  { href: "/dashboard/mailgun", label: "Sending domains", icon: MailIcon },
  { href: "/dashboard/api-keys", label: "API & WordPress", icon: KeyRoundIcon },
  { href: "/dashboard/settings", label: "Settings", icon: Settings2Icon },
]

function RailLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={href}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex size-9.5 items-center justify-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            active && "bg-muted text-foreground ring-1 ring-border",
          )}
        >
          <Icon className="size-[18px]" />
        </a>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export function AppRail() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const name = session?.user.name ?? ""
  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 flex h-dvh w-[60px] shrink-0 flex-col items-center gap-1.5 border-r bg-background py-3.5"
    >
      <a
        href="/dashboard"
        aria-label="Marketing Agent home"
        className="mb-3.5 flex size-[30px] items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <MailIcon className="size-4" strokeWidth={2.4} />
      </a>
      {MAIN.map((item) => (
        <RailLink
          key={item.href}
          {...item}
          active={isActive(item.href, item.exact)}
        />
      ))}
      <div className="flex-1" />
      {SETUP.map((item) => (
        <RailLink key={item.href} {...item} active={isActive(item.href)} />
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account"
            className="mt-2 flex size-[30px] items-center justify-center rounded-full bg-accent text-[11px] font-medium text-foreground ring-offset-2 ring-offset-background hover:ring-1 hover:ring-border"
          >
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="min-w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="text-[13px] font-medium text-foreground">
              {name}
            </div>
            <div className="text-xs text-muted-foreground">
              {session?.user.email}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              authClient.signOut()
              router.push("/")
            }}
          >
            <LogOutIcon />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
