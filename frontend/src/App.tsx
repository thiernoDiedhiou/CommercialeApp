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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Placeholder pour les pages à implémenter dans les prochaines priorités
function PlaceholderPage({ name }: { name: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400">
      <p className="text-lg font-medium">{name}</p>
      <p className="mt-1 text-sm">Page en cours de développement</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Toutes les routes protégées partagent le Layout */}
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
          <Route path="pos"              element={<PlaceholderPage name="Caisse POS" />} />
          <Route path="sales"            element={<SalesPage />} />
          <Route path="sales/new"        element={<PlaceholderPage name="Nouvelle vente (POS)" />} />
          <Route path="sales/:id"        element={<SaleDetailPage />} />
          <Route path="products"         element={<ProductsPage />} />
          <Route path="products/new"     element={<ProductFormPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          <Route path="customers"         element={<CustomersPage />} />
          <Route path="customers/:id"    element={<CustomerDetailPage />} />
          <Route path="stock"            element={<PlaceholderPage name="Stock" />} />
          <Route path="settings"         element={<PlaceholderPage name="Paramètres" />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
