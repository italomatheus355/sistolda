import { Key, Car, Users, Package, Calendar, Shield, UserCog } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const modules = [
  { title: "Chaves", url: "/chaves", icon: Key },
  { title: "Viaturas", url: "/viaturas", icon: Car },
  { title: "Visitantes", url: "/visitantes", icon: Users },
  { title: "Material", url: "/material", icon: Package },
];

const admin = [
  { title: "Escala", url: "/escala", icon: Calendar },
  { title: "Usuários", url: "/usuarios", icon: UserCog },
];

export function AppSidebar() {
  const { isAdmin } = useAuth();
  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={logoHU41} alt="HU-41" className="w-9 h-9 object-contain" />
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-wide">SISTOLDA</h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-widest">CPD v1.0</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-mono tracking-widest text-muted-foreground px-4">
            MÓDULOS
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-primary font-semibold"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-mono tracking-widest text-muted-foreground px-4">
              ADMINISTRAÇÃO
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {admin.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors"
                        activeClassName="bg-sidebar-accent text-primary font-semibold"
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
