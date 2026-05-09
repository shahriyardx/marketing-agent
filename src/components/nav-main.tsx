"use client"

import { usePathname } from "next/navigation"
import {
  FileTextIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MailIcon,
  MegaphoneIcon,
  Settings2Icon,
  UsersRoundIcon,
} from "lucide-react"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain() {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
            <a href="/dashboard">
              <LayoutDashboardIcon />
              <span>Dashboard</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith("/dashboard/campaigns")}
          >
            <a href="/dashboard/campaigns">
              <MegaphoneIcon />
              <span>Campaigns</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith("/dashboard/templates")}
          >
            <a href="/dashboard/templates">
              <FileTextIcon />
              <span>Templates</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith("/dashboard/mailgun")}
          >
            <a href="/dashboard/mailgun">
              <MailIcon />
              <span>Mailgun</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith("/dashboard/contacts")}
          >
            <a href="/dashboard/contacts">
              <UsersRoundIcon />
              <span>Contacts</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith("/dashboard/api-keys")}
          >
            <a href="/dashboard/api-keys">
              <KeyRoundIcon />
              <span>API Keys</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith("/dashboard/settings")}
          >
            <a href="/dashboard/settings">
              <Settings2Icon />
              <span>Settings</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
