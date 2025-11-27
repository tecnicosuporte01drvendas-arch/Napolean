import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Equipe from "./pages/Equipe";
import NovaAnalise from "./pages/NovaAnalise";
import RelatorioDetalhado from "./pages/RelatorioDetalhado";
import SalespersonDetail from "./pages/SalespersonDetail";
import EquipeCSDetail from "./pages/EquipeCSDetail";
import EquipeGestorDetail from "./pages/EquipeGestorDetail";
import ColaboradorDetail from "./pages/ColaboradorDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/equipe" element={<Equipe />} />
              <Route path="/equipe/cs/:id" element={<EquipeCSDetail />} />
              <Route path="/equipe/gestor/:id" element={<EquipeGestorDetail />} />
              <Route path="/nova-analise" element={<NovaAnalise />} />
              <Route path="/relatorio/:id" element={<RelatorioDetalhado />} />
              <Route path="/colaborador/:id" element={<ColaboradorDetail />} />
              <Route path="/salesperson/:id" element={<SalespersonDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
