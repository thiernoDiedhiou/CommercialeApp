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
  Megaphone,
} from 'lucide-react'

export interface NavChild {
  labelKey:   string
  path:       string
  permission: string
  feature?:   string
}

export interface NavItem {
  labelKey:   string
  path:       string
  icon:       React.ComponentType<{ className?: string }>
  permission: string
  feature?:   string
  children?:  NavChild[]
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.dashboard',     path: '/dashboard',     icon: LayoutDashboard, permission: 'dashboard.view' },
  { labelKey: 'nav.pos',           path: '/pos',            icon: ShoppingCart,    permission: 'pos.access',     feature: 'pos' },
  {
    labelKey: 'nav.sales',         path: '/sales',          icon: Receipt,         permission: 'sales.view',
    children: [
      { labelKey: 'nav.returns',   path: '/returns', permission: 'returns.view' },
    ],
  },
  { labelKey: 'nav.invoices',      path: '/invoices',       icon: FileText,        permission: 'invoices.view',  feature: 'invoicing' },
  {
    labelKey: 'nav.products',      path: '/products',       icon: Package,         permission: 'products.view',
    children: [
      { labelKey: 'nav.catalog',    path: '/products',   permission: 'products.view' },
      { labelKey: 'nav.categories', path: '/categories', permission: 'categories.view' },
      { labelKey: 'nav.brands',     path: '/brands',     permission: 'products.view' },
    ],
  },
  { labelKey: 'nav.suppliers',     path: '/suppliers',      icon: Truck,           permission: 'suppliers.view', feature: 'purchases' },
  { labelKey: 'nav.purchases',     path: '/purchases',      icon: ShoppingBag,     permission: 'purchases.view', feature: 'purchases' },
  {
    labelKey: 'nav.customers',     path: '/customers',      icon: Users,           permission: 'customers.view',
    children: [
      { labelKey: 'nav.debts',     path: '/debts', permission: 'debts.view' },
    ],
  },
  {
    labelKey: 'nav.stock',         path: '/stock',          icon: Warehouse,       permission: 'stock.view',
    children: [
      { labelKey: 'nav.stock',       path: '/stock',             permission: 'stock.view'     },
      { labelKey: 'nav.transfers',   path: '/stock/transfers',   permission: 'stock.view'     },
    ],
  },
  {
    labelKey: 'nav.reports',       path: '/reports',        icon: BarChart3,       permission: 'reports.view',   feature: 'reports',
    children: [
      { labelKey: 'nav.analytics',    path: '/reports',      permission: 'reports.view', feature: 'reports' },
      { labelKey: 'nav.pos_sessions', path: '/pos-sessions', permission: 'reports.view', feature: 'pos'     },
    ],
  },
  {
    labelKey: 'nav.shop',          path: '/shop-orders',    icon: Store,           permission: 'shop.view',      feature: 'shop',
    children: [
      { labelKey: 'nav.orders',        path: '/shop-orders',   permission: 'shop.orders',  feature: 'shop' },
      { labelKey: 'nav.shop_settings', path: '/shop-settings', permission: 'shop.manage',  feature: 'shop' },
    ],
  },
  { labelKey: 'nav.marketing',      path: '/marketing',       icon: Megaphone,       permission: 'marketing.view' },
  { labelKey: 'nav.activity_log',  path: '/activity-logs',  icon: ClipboardList,  permission: 'settings.view' },
  { labelKey: 'nav.settings',      path: '/settings',        icon: Settings,       permission: 'users.view' },
]
