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
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-9 items-center gap-3 rounded-lg px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground max-md:w-9 max-md:justify-center max-md:px-0",
            active && "bg-muted font-medium text-foreground",
          )}
        >
          <Icon className="size-[18px] shrink-0" />
          <span className="truncate max-md:sr-only">{label}</span>
        </a>
      </TooltipTrigger>
      {/* labels are visible from md up; the tooltip is for the icon-only phone rail */}
      <TooltipContent side="right" className="md:hidden">
        {label}
      </TooltipContent>
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
      className="sticky top-0 flex h-dvh w-[60px] shrink-0 flex-col gap-1 border-r bg-background px-3 py-3.5 max-md:items-center md:w-[220px]"
    >
      <a
        href="/dashboard"
        aria-label="Marketing Agent home"
        className="mb-4 flex items-center gap-2.5 px-1"
      >
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <MailIcon className="size-4" strokeWidth={2.4} />
        </span>
        <span className="truncate font-heading text-sm font-semibold max-md:sr-only">
          Marketing Agent
        </span>
      </a>
      {MAIN.map((item) => (
        <RailLink
          key={item.href}
          {...item}
          active={isActive(item.href, item.exact)}
        />
      ))}
      <div className="flex-1" />
      <p className="px-2.5 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase max-md:hidden">
        Setup
      </p>
      {SETUP.map((item) => (
        <RailLink key={item.href} {...item} active={isActive(item.href)} />
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account"
            className="mt-2 flex items-center gap-2.5 rounded-lg border-t pt-3 text-left hover:text-foreground max-md:border-0 md:px-1"
          >
            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-medium text-foreground">
              {initials}
            </span>
            <span className="min-w-0 flex-1 max-md:sr-only">
              <span className="block truncate font-medium">{name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {session?.user.email}
              </span>
            </span>
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
