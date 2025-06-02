
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import QuotesManagement from "./pages/QuotesManagement";
import ServicesManagement from "./pages/ServicesManagement";
import FleetManagement from "./pages/FleetManagement";
import DriversManagement from "./pages/DriversManagement";
import InvoiceGeneration from "./pages/InvoiceGeneration";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/quotes" element={<QuotesManagement />} />
            <Route path="/services" element={<ServicesManagement />} />
            <Route path="/fleet" element={<FleetManagement />} />
            <Route path="/drivers" element={<DriversManagement />} />
            <Route path="/invoices" element={<InvoiceGeneration />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
