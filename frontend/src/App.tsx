import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoginPage from '@/pages/auth/LoginPage'
import Layout from '@/components/layout/Layout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ProductsPage from '@/pages/products/ProductsPage'
import ProductFormPage from '@/pages/products/ProductFormPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import CustomerDetailPage from '@/pages/customers/CustomerDetailPage'
import SalesPage from '@/pages/sales/SalesPage'
import SaleDetailPage from '@/pages/sales/SaleDetailPage'
import PosPage from '@/pages/pos/PosPage'
import StockPage from '@/pages/stock/StockPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import ToastContainer from '@/components/ui/ToastContainer'
import InvoicesPage from '@/pages/invoices/InvoicesPage'
import InvoiceFormPage from '@/pages/invoices/InvoiceFormPage'
import InvoiceDetailPage from '@/pages/invoices/InvoiceDetailPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import SuppliersPage from '@/pages/purchases/SuppliersPage'
import PurchaseOrdersPage from '@/pages/purchases/PurchaseOrdersPage'
import PurchaseFormPage from '@/pages/purchases/PurchaseFormPage'
import PurchaseDetailPage from '@/pages/purchases/PurchaseDetailPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* POS — fullscreen, pas de Layout */}
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <PosPage />
            </ProtectedRoute>
          }
        />

        {/* Toutes les autres routes protégées partagent le Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"        element={<DashboardPage />} />
          <Route path="sales"            element={<SalesPage />} />
          <Route path="sales/new"        element={<Navigate to="/pos" replace />} />
          <Route path="sales/:id"        element={<SaleDetailPage />} />
          <Route path="products"         element={<ProductsPage />} />
          <Route path="products/new"     element={<ProductFormPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          <Route path="customers"         element={<CustomersPage />} />
          <Route path="customers/:id"    element={<CustomerDetailPage />} />
          <Route path="stock"               element={<StockPage />} />
          <Route path="reports"               element={<ReportsPage />} />
          <Route path="invoices"             element={<InvoicesPage />} />
          <Route path="invoices/new"         element={<InvoiceFormPage />} />
          <Route path="invoices/:id"         element={<InvoiceDetailPage />} />
          <Route path="invoices/:id/edit"    element={<InvoiceFormPage />} />
          <Route path="suppliers"         element={<SuppliersPage />} />
          <Route path="purchases"         element={<PurchaseOrdersPage />} />
          <Route path="purchases/new"     element={<PurchaseFormPage />} />
          <Route path="purchases/:id"     element={<PurchaseDetailPage />} />
          <Route path="purchases/:id/edit" element={<PurchaseFormPage />} />
          <Route path="settings"          element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Notifications toast — visibles sur toutes les pages */}
      <ToastContainer />
    </BrowserRouter>
  )
}
