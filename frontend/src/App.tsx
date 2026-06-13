import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ShopApp from '@/shop/ShopApp'
import ShopDomainEntry from '@/shop/pages/ShopDomainEntry'
import { detectMode } from '@/shop/hooks/useDomainTenant'
import { useAuthStore } from '@/store/authStore'
import { useSuperAdminStore } from '@/store/superAdminStore'
import { useHomePath } from '@/hooks/useHomePath'
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import LandingLayout from '@/landing/LandingLayout'
import HomePage from '@/landing/pages/HomePage'
import FeaturesPage from '@/landing/pages/FeaturesPage'
import PricingPage from '@/landing/pages/PricingPage'
import ContactPage from '@/landing/pages/ContactPage'
import RegisterPage from '@/landing/pages/RegisterPage'
import CGUPage from '@/landing/pages/CGUPage'
import PrivacyPage from '@/landing/pages/PrivacyPage'
import Layout from '@/components/layout/Layout'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminTenantsPage from '@/pages/admin/AdminTenantsPage'
import AdminTenantDetailPage from '@/pages/admin/AdminTenantDetailPage'
import AdminPlansPage from '@/pages/admin/AdminPlansPage'
import AdminSubscriptionsPage from '@/pages/admin/AdminSubscriptionsPage'
import AdminSiteSettingsPage from '@/pages/admin/AdminSiteSettingsPage'
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
import ShopSettingsPage from '@/pages/shop/ShopSettingsPage'
import ShopOrdersPage from '@/pages/shop/ShopOrdersPage'
import CategoriesPage from '@/pages/products/CategoriesPage'
import BrandsPage from '@/pages/products/BrandsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Route index "/" : landing si non connecté, dashboard si connecté
function SmartLandingIndex() {
  const token    = useAuthStore((s) => s.token)
  const homePath = useHomePath()
  if (token) return <Navigate to={homePath} replace />
  return <HomePage />
}

// Wildcard catch-all : landing si non connecté, dashboard si connecté
function SmartRedirect() {
  const token    = useAuthStore((s) => s.token)
  const homePath = useHomePath()
  return <Navigate to={token ? homePath : '/'} replace />
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

        {/* ── Landing (public) — LandingLayout wraps "/" + sous-pages ── */}
        <Route element={<LandingLayout />}>
          <Route index element={<SmartLandingIndex />} />
          <Route path="fonctionnalites"  element={<FeaturesPage />} />
          <Route path="tarifs"           element={<PricingPage />} />
          <Route path="contact"          element={<ContactPage />} />
          <Route path="inscription"      element={<RegisterPage />} />
          <Route path="cgu"              element={<CGUPage />} />
          <Route path="confidentialite"  element={<PrivacyPage />} />
        </Route>

        <Route path="/login"                  element={<LoginPage />} />
        <Route path="/mot-de-passe-oublie"    element={<ForgotPasswordPage />} />
        <Route path="/reinitialisation"       element={<ResetPasswordPage />} />

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
          <Route path="dashboard"        element={<DashboardPage />} />
          <Route path="sales"            element={<SalesPage />} />
          <Route path="sales/new"        element={<Navigate to="/pos" replace />} />
          <Route path="sales/:id"        element={<SaleDetailPage />} />
          <Route path="returns"          element={<ReturnsPage />} />
          <Route path="products"           element={<ProductsPage />} />
          <Route path="products/new"       element={<ProductFormPage />} />
          <Route path="products/:id"       element={<ProductDetailPage />} />
          <Route path="products/:id/edit"  element={<ProductFormPage />} />
          <Route path="categories"         element={<CategoriesPage />} />
          <Route path="brands"             element={<BrandsPage />} />
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
          <Route path="shop-settings"     element={<ShopSettingsPage />} />
          <Route path="shop-orders"       element={<ShopOrdersPage />} />
        </Route>

        {/* ── Boutique publique — pas d'auth requise ── */}
        <Route path="/shop/:slug/*" element={<ShopApp />} />

        {/* ── Entrée boutique par domaine (sous-domaine ou domaine custom) ── */}
        {detectMode().mode !== 'path' && (
          <Route path="/*" element={<ShopDomainEntry />} />
        )}

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
          <Route path="plans"         element={<AdminPlansPage />} />
          <Route path="subscriptions"  element={<AdminSubscriptionsPage />} />
          <Route path="site-settings"  element={<AdminSiteSettingsPage />} />
        </Route>
      </Routes>

      {/* Notifications toast — visibles sur toutes les pages */}
      <ToastContainer />
    </BrowserRouter>
  )
}
