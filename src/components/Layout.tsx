import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isAdmin } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b border-border px-4 bg-card/50 gap-4">
            <SidebarTrigger />
            <div className="flex items-center gap-2 flex-1">
              <span className="status-dot-available animate-pulse-glow" />
              <span className="text-xs font-mono text-muted-foreground">SISTEMA OPERACIONAL</span>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                  <Shield className="w-3 h-3" /> ADMIN
                </span>
              )}
              <span className="text-xs font-mono text-muted-foreground hidden sm:block">{user?.username}</span>
              <Button variant="ghost" size="icon" onClick={signOut} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Sair">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

