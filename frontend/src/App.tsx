import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import ViewSelector from "@/pages/ViewSelector";
import Dashboard from "@/pages/admin/Dashboard";
import ImportarExcel from "@/pages/admin/ImportarExcel";
import GenerarLote from "@/pages/admin/GenerarLote";
import Locales from "@/pages/admin/Locales";
import ImportarLocales from "@/pages/admin/ImportarLocales";
import DetalleLocal from "@/pages/admin/DetalleLocal";
import DetalleArrendatario from "@/pages/admin/DetalleArrendatario";
import Arrendatarios from "@/pages/admin/Arrendatarios";
import Facturas from "@/pages/admin/Facturas";
import Tarifas from "@/pages/admin/Tarifas";
import Conciliacion from "@/pages/admin/Conciliacion";
import TenantFactura from "@/pages/tenant/Factura";
import BoardDashboard from "@/pages/board/Dashboard";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* Selector de vista — pantalla de inicio */}
          <Route path="/" element={<ViewSelector />} />

          {/* Admin + Board con sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/importar" element={<ImportarExcel />} />
            <Route path="/admin/generar" element={<GenerarLote />} />
            <Route path="/admin/importar-locales" element={<ImportarLocales />} />
            <Route path="/admin/locales" element={<Locales />} />
            <Route path="/admin/locales/:id" element={<DetalleLocal />} />
            <Route path="/admin/arrendatarios" element={<Arrendatarios />} />
            <Route path="/admin/arrendatarios/:id" element={<DetalleArrendatario />} />
            <Route path="/admin/facturas" element={<Facturas />} />
            <Route path="/admin/tarifas" element={<Tarifas />} />
            <Route path="/admin/conciliacion" element={<Conciliacion />} />
            <Route path="/board" element={<BoardDashboard />} />
          </Route>

          {/* Tenant — sin sidebar */}
          <Route path="/tenant" element={<TenantFactura />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
