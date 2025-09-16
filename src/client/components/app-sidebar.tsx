import * as React from "react"
import {
  Activity,
  AudioWaveform,
  BookOpen,
  Bot,
  Building2,
  Command,
  FileText,
  Frame,
  GalleryVerticalEnd,
  Map,
  Package,
  PieChart,
  Puzzle,
  Settings2,
  Shield,
  SquareTerminal,
  Users,
} from "lucide-react"

import { NavMain } from "@client/components/nav-main"
import { NavProjects } from "@client/components/nav-projects"
import { NavUser } from "@client/components/nav-user"
import { TeamSwitcher } from "@client/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@client/components/ui/sidebar"
import { useAuth } from "@client/provider/AuthProvider"
import { permission } from "process"
import { role } from "../../server/lib/db/schema/system"

// This is sample data.
const data = {
  // teams: [
  //   {
  //     name: "Tenant One",
  //     logo: GalleryVerticalEnd,
  //     plan: "React Admin",
  //   },
  //   {
  //     name: "Tenant Two",
  //     logo: AudioWaveform,
  //     plan: "React Admin",
  //   },
  //   {
  //     name: "Tenant Three",
  //     logo: Command,
  //     plan: "React Admin",
  //   },
  // ],
  navMain: [
    {
      id: "dashboard",
      title: "Dashboard",
      url: "/console/dashboard",
      icon: SquareTerminal,
      isActive: true,
    },
    {
      id: "showcase",
      title: "Showcase",
      url: "/console/showcase",
      icon: BookOpen,
      items: [
        {
          id: "card",
          title: "Card",
          url: "/console/showcase/card",
        },
        {
          id: "tabs",
          title: "Tabs",
          url: "/console/showcase/tabs",
        },
        {
          id: "form",
          title: "Form",
          url: "/console/showcase/form",
        },
      ],
    },
    {
      id: "demo",
      title: "Demo",
      url: "/console/demo",
      icon: Puzzle,
      items: [
        {
          id: "department",
          title: "Department",
          url: "/console/demo/department",
        },
      ],
    },
    {
      id: "system",
      title: "System",
      url: "/console/system",
      icon: Settings2,
      roles: "SYSADMIN",
      permissions: ["system.tenant.view", "system.permission.view", "system.role.view", "system.user.view", "system.option.view"],
      items: [
        {
          id: "tenant",
          title: "Tenant",
          url: "/console/system/tenant",
          roles: "SYSADMIN",
          permissions: "system.tenant.view",
        },
        {
          id: "permission",
          title: "Permission",
          url: "/console/system/permission",
          roles: "SYSADMIN",
          permissions: "system.permission.view",
        },
        {
          id: "role",
          title: "Role",
          url: "/console/system/role",
          roles: "SYSADMIN",
          permissions: "system.role.view",
        },
        {
          id: "user",
          title: "User",
          url: "/console/system/user",
          roles: "SYSADMIN",
          permissions: "system.user.view",
        },
        {
          id: "option",
          title: "Option",
          url: "/console/system/option",
          roles: "SYSADMIN",
          permissions: "system.option.view",
        },
        {
          id: "master-data",
          title: "Master Data",
          url: "/console/system/master-data",
        },
      ],
    },
  ],
  superAdminNav: [
    {
      id: "super-admin-dashboard",
      title: "Dashboard", 
      url: "/super-admin/dashboard",
      icon: SquareTerminal,
    },
    {
      id: "super-admin-tenants",
      title: "Tenants",
      url: "/super-admin/tenants", 
      icon: Building2,
    },
    {
      id: "super-admin-modules",
      title: "Modules",
      url: "/super-admin/modules",
      icon: Package,
    },
    {
      id: "super-admin-system-status", 
      title: "System Status",
      url: "/super-admin/system-status",
      icon: Activity,
    },
    {
      id: "super-admin-audit-logs",
      title: "Audit Logs",
      url: "/super-admin/audit-logs",
      icon: FileText,
    },
    {
      id: "super-admin-users",
      title: "Users", 
      url: "/super-admin/users",
      icon: Users,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  // Temporary fix for isSuperAdmin property - will be updated when User type is enhanced
  const isSuperAdmin = (user as any)?.isSuperAdmin || false;

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <TeamSwitcher/>
      </SidebarHeader>
      <SidebarContent>
        {isSuperAdmin && (
          <>
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-500">Super Admin Portal</span>
              </div>
            </div>
            <NavMain items={data.superAdminNav} />
            <SidebarSeparator />
          </>
        )}
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser/>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
