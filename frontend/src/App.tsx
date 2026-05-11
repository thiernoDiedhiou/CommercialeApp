import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useSuperAdminStore } from '@/store/superAdminStore'
import { useHomePath } from '@/hooks/useHomePath'
import LoginPage from '@/pages/auth/LoginPage'
import Layout from '@/components/layout/Layout'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminTenantsPage from '@/pages/admin/AdminTenantsPage'
import AdminTenantDetailPage from '@/pages/admin/AdminTenantDetailPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ProductsPage from '@/pages/products/ProductsPage'
import ProductFormPage from '@/pages/products/ProductFormPage'
import ProductDetailPage from '@/pages/products/ProductDetailPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import CustomerDetailPage from '@/pages/customers/CustomerDetailPage'
import SalesPage from '@/pages/sales/SalesPage'
import SaleDetailPage from '@/pages/sales/SaleDetailPage'
import ReturnsPage from '@/pages/sales/ReturnsPage'
import DebtsPage from '@/pages/customers/DebtsPage'
import PosPage from '@/pages/pos/POSPage'
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

function SmartRedirect() {
  const token    = useAuthStore((s) => s.token)
  const homePath = useHomePath()
  return <Navigate to={token ? homePath : '/login'} replace />
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useSuperAdminStore((s) => s.token)
  if (!token) return <Navigate to="/admin/login" replace />
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
          <Route index element={<SmartRedirect />} />
          <Route path="dashboard"        element={<DashboardPage />} />
          <Route path="sales"            element={<SalesPage />} />
          <Route path="sales/new"        element={<Navigate to="/pos" replace />} />
          <Route path="sales/:id"        element={<SaleDetailPage />} />
          <Route path="returns"          element={<ReturnsPage />} />
          <Route path="products"           element={<ProductsPage />} />
          <Route path="products/new"       element={<ProductFormPage />} />
          <Route path="products/:id"       element={<ProductDetailPage />} />
          <Route path="products/:id/edit"  element={<ProductFormPage />} />
          <Route path="customers"         element={<CustomersPage />} />
          <Route path="customers/:id"    element={<CustomerDetailPage />} />
          <Route path="debts"            element={<DebtsPage />} />
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

        <Route path="*" element={<SmartRedirect />} />

        {/* ── Super Admin ── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"     element={<AdminDashboardPage />} />
          <Route path="tenants"       element={<AdminTenantsPage />} />
          <Route path="tenants/:id"   element={<AdminTenantDetailPage />} />
        </Route>
      </Routes>

      {/* Notifications toast — visibles sur toutes les pages */}
      <ToastContainer />
    </BrowserRouter>
  )
}
