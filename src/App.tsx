import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Chaves from "./pages/Chaves";
import Viaturas from "./pages/Viaturas";
import Visitantes from "./pages/Visitantes";
import MaterialPage from "./pages/MaterialPage";
import Escala from "./pages/Escala";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/chaves" replace />} />
            <Route path="/chaves" element={<Chaves />} />
            <Route path="/viaturas" element={<Viaturas />} />
            <Route path="/visitantes" element={<Visitantes />} />
            <Route path="/material" element={<MaterialPage />} />
            <Route path="/escala" element={<Escala />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
