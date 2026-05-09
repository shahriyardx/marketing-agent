"use client"

import { usePathname } from "next/navigation"
import {
  FileTextIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MailIcon,
  MegaphoneIcon,
  PlusIcon,
  Settings2Icon,
  UsersRoundIcon,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

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

        <Collapsible
          asChild
          defaultOpen={pathname.startsWith("/dashboard/templates")}
        >
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Templates"
              isActive={pathname.startsWith("/dashboard/templates")}
            >
              <a href="/dashboard/templates">
                <FileTextIcon />
                <span>Templates</span>
              </a>
            </SidebarMenuButton>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction className="data-[state=open]:rotate-90">
                <ChevronRightIcon />
                <span className="sr-only">Toggle</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname === "/dashboard/templates"}
                  >
                    <a href="/dashboard/templates">
                      <span>All Templates</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname === "/dashboard/templates/create"}
                  >
                    <a href="/dashboard/templates/create">
                      <PlusIcon className="size-3" />
                      <span>Create Template</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>

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
