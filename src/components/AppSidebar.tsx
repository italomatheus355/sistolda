import { Key, Car, Users, Package, Calendar, UserCog, Plane, LogOut, LayoutDashboard, Fingerprint, ShieldAlert } from "lucide-react";
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
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import logoHU41 from "@/assets/logo-hu41.png";

const allModules = [
  { title: "Chaves",     url: "/chaves",     icon: Key,     route: "chaves" },
  { title: "Viaturas",   url: "/viaturas",   icon: Car,     route: "viaturas" },
  { title: "Visitantes", url: "/visitantes", icon: Users,   route: "visitantes" },
  { title: "Material",   url: "/material",   icon: Package, route: "material" },
  { title: "PDV",        url: "/pdv",        icon: Plane,   route: "pdv" },
  { title: "Dashboard",  url: "/dashboard",  icon: LayoutDashboard, route: "dashboard" },
];

const adminModules = [
  { title: "Escala",    url: "/escala",    icon: Calendar,    route: "escala" },
  { title: "Biometria", url: "/biometria", icon: Fingerprint, route: "biometria" },
  { title: "Auditoria", url: "/auditoria", icon: ShieldAlert, route: "auditoria" },
  { title: "Usuários",  url: "/usuarios",  icon: UserCog,     route: "usuarios" },
];

export function AppSidebar() {
  const { isAdmin, user, signOut, can } = useAuth();
  const modules = allModules.filter((m) => can(m.route));

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
        {modules.length > 0 && (
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
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-mono tracking-widest text-muted-foreground px-4">
              ADMINISTRAÇÃO
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminModules.map((item) => (
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

      <SidebarFooter className="border-t border-border p-3">
        {user && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-mono text-foreground truncate">{user.username}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">{user.role}</p>
            </div>
            <button onClick={signOut} className="p-2 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
