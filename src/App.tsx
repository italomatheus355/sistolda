import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/components/LoginPage";
import Chaves from "./pages/Chaves";
import Viaturas from "./pages/Viaturas";
import Visitantes from "./pages/Visitantes";
import MaterialPage from "./pages/MaterialPage";
import Escala from "./pages/Escala";
import Usuarios from "./pages/Usuarios";
import Pdv from "./pages/Pdv";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function Guard({ route, children }: { route: string; children: React.ReactNode }) {
  const { can } = useAuth();
  if (!can(route)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return null;
  // Primeira rota acessível para o perfil
  const order = ["chaves", "viaturas", "visitantes", "material", "pdv", "escala", "usuarios"];
  const map: Record<string, string> = {
    chaves: "/chaves", viaturas: "/viaturas", visitantes: "/visitantes",
    material: "/material", pdv: "/pdv", escala: "/escala", usuarios: "/usuarios",
  };
  const { can } = useAuth();
  for (const r of order) if (can(r)) return <Navigate to={map[r]} replace />;
  return <Navigate to="/pdv" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-muted-foreground">INICIALIZANDO SISTEMA...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/chaves"     element={<Guard route="chaves"><Chaves /></Guard>} />
        <Route path="/viaturas"   element={<Guard route="viaturas"><Viaturas /></Guard>} />
        <Route path="/visitantes" element={<Guard route="visitantes"><Visitantes /></Guard>} />
        <Route path="/material"   element={<Guard route="material"><MaterialPage /></Guard>} />
        <Route path="/pdv"        element={<Guard route="pdv"><Pdv /></Guard>} />
        <Route path="/dashboard"  element={<Guard route="dashboard"><Dashboard /></Guard>} />
        <Route path="/escala"     element={<Guard route="escala"><Escala /></Guard>} />
        <Route path="/usuarios"   element={<Guard route="usuarios"><Usuarios /></Guard>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
