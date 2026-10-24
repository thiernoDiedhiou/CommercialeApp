import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BillingSuccessPage from '@/pages/billing/BillingSuccessPage'
import BillingCancelPage  from '@/pages/billing/BillingCancelPage'
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
import AdminProfilePage from '@/pages/admin/AdminProfilePage'
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
import DebtDetailPage from '@/pages/customers/DebtDetailPage'
import PosPage from '@/pages/pos/PosPage'
import PosSessionsPage from '@/pages/pos/PosSessionsPage'
import StockPage from '@/pages/stock/StockPage'
import InventorySessionPage from '@/pages/stock/InventorySessionPage'
import StockTransfersPage from '@/pages/stock/StockTransfersPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import ToastContainer from '@/components/ui/ToastContainer'
import InvoicesPage from '@/pages/invoices/InvoicesPage'
import InvoiceFormPage from '@/pages/invoices/InvoiceFormPage'
import InvoiceDetailPage from '@/pages/invoices/InvoiceDetailPage'
import ActivityLogPage from '@/pages/settings/ActivityLogPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import SuppliersPage from '@/pages/purchases/SuppliersPage'
import SupplierDetailPage from '@/pages/purchases/SupplierDetailPage'
import PurchaseOrdersPage from '@/pages/purchases/PurchaseOrdersPage'
import PurchaseFormPage from '@/pages/purchases/PurchaseFormPage'
import PurchaseDetailPage from '@/pages/purchases/PurchaseDetailPage'
import ShopSettingsPage from '@/pages/shop/ShopSettingsPage'
import ShopOrdersPage from '@/pages/shop/ShopOrdersPage'
import CategoriesPage from '@/pages/products/CategoriesPage'
import BrandsPage from '@/pages/products/BrandsPage'
import ProfilePage from '@/pages/profile/ProfilePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Redirige vers la première page accessible si la permission est absente
function RequirePermission({ permission, children }: { permission: string; children: React.ReactNode }) {
  const permissions = useAuthStore((s) => s.permissions)
  const homePath    = useHomePath()
  if (!permissions.includes(permission)) return <Navigate to={homePath} replace />
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
          <Route path="dashboard"        element={<RequirePermission permission="dashboard.view"><DashboardPage /></RequirePermission>} />
          <Route path="pos-sessions"     element={<RequirePermission permission="pos.access"><PosSessionsPage /></RequirePermission>} />
          <Route path="sales"            element={<RequirePermission permission="sales.view"><SalesPage /></RequirePermission>} />
          <Route path="sales/new"        element={<Navigate to="/pos" replace />} />
          <Route path="sales/:uid"        element={<RequirePermission permission="sales.view"><SaleDetailPage /></RequirePermission>} />
          <Route path="returns"          element={<RequirePermission permission="returns.view"><ReturnsPage /></RequirePermission>} />
          <Route path="products"           element={<RequirePermission permission="products.view"><ProductsPage /></RequirePermission>} />
          <Route path="products/new"       element={<RequirePermission permission="products.create"><ProductFormPage /></RequirePermission>} />
          <Route path="products/:uid"       element={<RequirePermission permission="products.view"><ProductDetailPage /></RequirePermission>} />
          <Route path="products/:uid/edit"  element={<RequirePermission permission="products.edit"><ProductFormPage /></RequirePermission>} />
          <Route path="categories"         element={<RequirePermission permission="categories.view"><CategoriesPage /></RequirePermission>} />
          <Route path="brands"             element={<RequirePermission permission="products.view"><BrandsPage /></RequirePermission>} />
          <Route path="customers"         element={<RequirePermission permission="customers.view"><CustomersPage /></RequirePermission>} />
          <Route path="customers/:uid"    element={<RequirePermission permission="customers.view"><CustomerDetailPage /></RequirePermission>} />
          <Route path="debts"            element={<RequirePermission permission="debts.view"><DebtsPage /></RequirePermission>} />
          <Route path="debts/:uid"       element={<RequirePermission permission="debts.view"><DebtDetailPage /></RequirePermission>} />
          <Route path="stock"                        element={<RequirePermission permission="stock.view"><StockPage /></RequirePermission>} />
          <Route path="stock/transfers"              element={<RequirePermission permission="stock.view"><StockTransfersPage /></RequirePermission>} />
          <Route path="stock/inventory/:uid"         element={<RequirePermission permission="stock.view"><InventorySessionPage /></RequirePermission>} />
          <Route path="reports"               element={<RequirePermission permission="reports.view"><ReportsPage /></RequirePermission>} />
          <Route path="invoices"             element={<RequirePermission permission="invoices.view"><InvoicesPage /></RequirePermission>} />
          <Route path="invoices/new"         element={<RequirePermission permission="invoices.create"><InvoiceFormPage /></RequirePermission>} />
          <Route path="invoices/:uid"         element={<RequirePermission permission="invoices.view"><InvoiceDetailPage /></RequirePermission>} />
          <Route path="invoices/:uid/edit"    element={<RequirePermission permission="invoices.edit"><InvoiceFormPage /></RequirePermission>} />
          <Route path="suppliers"         element={<RequirePermission permission="suppliers.view"><SuppliersPage /></RequirePermission>} />
          <Route path="suppliers/:uid"    element={<RequirePermission permission="suppliers.view"><SupplierDetailPage /></RequirePermission>} />
          <Route path="purchases"         element={<RequirePermission permission="purchases.view"><PurchaseOrdersPage /></RequirePermission>} />
          <Route path="purchases/new"     element={<RequirePermission permission="purchases.create"><PurchaseFormPage /></RequirePermission>} />
          <Route path="purchases/:uid"     element={<RequirePermission permission="purchases.view"><PurchaseDetailPage /></RequirePermission>} />
          <Route path="purchases/:uid/edit" element={<RequirePermission permission="purchases.edit"><PurchaseFormPage /></RequirePermission>} />
          <Route path="profile"           element={<ProfilePage />} />
          <Route path="activity-logs"     element={<ActivityLogPage />} />
          <Route path="settings"          element={<SettingsPage />} />
          <Route path="shop-settings"     element={<ShopSettingsPage />} />
          <Route path="shop-orders"       element={<ShopOrdersPage />} />
        </Route>

        {/* ── Pages de retour paiement (hors Layout, hors auth obligatoire) ── */}
        <Route path="/billing/success" element={<BillingSuccessPage />} />
        <Route path="/billing/cancel"  element={<BillingCancelPage />} />

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
          <Route path="tenants/:uid"  element={<AdminTenantDetailPage />} />
          <Route path="plans"         element={<AdminPlansPage />} />
          <Route path="subscriptions"  element={<AdminSubscriptionsPage />} />
          <Route path="site-settings"  element={<AdminSiteSettingsPage />} />
          <Route path="profile"        element={<AdminProfilePage />} />
        </Route>
      </Routes>

      {/* Notifications toast — visibles sur toutes les pages */}
      <ToastContainer />
    </BrowserRouter>
  )
}
