import type React from 'react'
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  FileText,
  Package,
  Truck,
  ShoppingBag,
  Users,
  Warehouse,
  BarChart3,
  Store,
  ClipboardList,
  Settings,
} from 'lucide-react'

export interface NavChild {
  labelKey:   string
  path:       string
  permission: string
  feature?:   string
}

export interface NavItem {
  id:          string
  labelKey:    string
  path?:       string   // absent si l'item est un en-tête de groupe (children présents)
  icon:        React.ComponentType<{ className?: string }>
  permission:  string
  feature?:    string
  children?:   NavChild[]
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard',   path: '/dashboard',    icon: LayoutDashboard, permission: 'dashboard.view' },
  { id: 'pos',       labelKey: 'nav.pos',          path: '/pos',          icon: ShoppingCart,    permission: 'pos.access',    feature: 'pos' },
  {
    // En-tête de groupe — clic = toggle uniquement, pas de navigation
    id: 'sales',     labelKey: 'nav.sales',        icon: Receipt,         permission: 'sales.view',
    children: [
      { labelKey: 'nav.sales_list', path: '/sales',   permission: 'sales.view' },
      { labelKey: 'nav.returns',    path: '/returns',  permission: 'returns.view' },
    ],
  },
  { id: 'invoices',  labelKey: 'nav.invoices',     path: '/invoices',     icon: FileText,        permission: 'invoices.view', feature: 'invoicing' },
  {
    id: 'products',  labelKey: 'nav.products',     icon: Package,         permission: 'products.view',
    children: [
      { labelKey: 'nav.catalog',    path: '/products',   permission: 'products.view' },
      { labelKey: 'nav.categories', path: '/categories', permission: 'categories.view' },
      { labelKey: 'nav.brands',     path: '/brands',     permission: 'products.view' },
    ],
  },
  { id: 'suppliers', labelKey: 'nav.suppliers',    path: '/suppliers',    icon: Truck,           permission: 'suppliers.view', feature: 'purchases' },
  { id: 'purchases', labelKey: 'nav.purchases',    path: '/purchases',    icon: ShoppingBag,     permission: 'purchases.view', feature: 'purchases' },
  {
    id: 'customers', labelKey: 'nav.customers',    icon: Users,           permission: 'customers.view',
    children: [
      { labelKey: 'nav.customers_list', path: '/customers', permission: 'customers.view' },
      { labelKey: 'nav.debts',          path: '/debts',     permission: 'debts.view' },
    ],
  },
  { id: 'stock',     labelKey: 'nav.stock',        path: '/stock',        icon: Warehouse,       permission: 'stock.view' },
  {
    id: 'reports',   labelKey: 'nav.reports',      icon: BarChart3,       permission: 'reports.view', feature: 'reports',
    children: [
      { labelKey: 'nav.analytics',    path: '/reports',      permission: 'reports.view', feature: 'reports' },
      { labelKey: 'nav.pos_sessions', path: '/pos-sessions', permission: 'reports.view', feature: 'pos'     },
    ],
  },
  {
    id: 'shop',      labelKey: 'nav.shop',         icon: Store,           permission: 'shop.view', feature: 'shop',
    children: [
      { labelKey: 'nav.orders',        path: '/shop-orders',   permission: 'shop.orders',  feature: 'shop' },
      { labelKey: 'nav.shop_settings', path: '/shop-settings', permission: 'shop.manage',  feature: 'shop' },
    ],
  },
  { id: 'activity',  labelKey: 'nav.activity_log', path: '/activity-logs', icon: ClipboardList, permission: 'settings.view' },
  { id: 'settings',  labelKey: 'nav.settings',     path: '/settings',     icon: Settings,        permission: 'users.view' },
]
