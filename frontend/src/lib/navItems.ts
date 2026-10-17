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
  label:      string
  path:       string
  permission: string
  feature?:   string
}

export interface NavItem {
  label:      string
  path:       string
  icon:       React.ComponentType<{ className?: string }>
  permission: string
  feature?:   string
  children?:  NavChild[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', path: '/dashboard',  icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'Caisse POS',      path: '/pos',         icon: ShoppingCart,    permission: 'pos.access',     feature: 'pos' },
  {
    label: 'Ventes',          path: '/sales',        icon: Receipt,         permission: 'sales.view',
    children: [
      { label: 'Retours',  path: '/returns', permission: 'returns.view' },
    ],
  },
  { label: 'Factures',        path: '/invoices',     icon: FileText,        permission: 'invoices.view',  feature: 'invoicing' },
  {
    label: 'Produits',        path: '/products',     icon: Package,         permission: 'products.view',
    children: [
      { label: 'Catalogue',  path: '/products',   permission: 'products.view' },
      { label: 'Catégories', path: '/categories', permission: 'categories.view' },
      { label: 'Marques',    path: '/brands',     permission: 'products.view' },
    ],
  },
  { label: 'Fournisseurs',    path: '/suppliers',    icon: Truck,           permission: 'suppliers.view', feature: 'purchases' },
  { label: 'Achats',          path: '/purchases',    icon: ShoppingBag,     permission: 'purchases.view', feature: 'purchases' },
  {
    label: 'Clients',         path: '/customers',    icon: Users,           permission: 'customers.view',
    children: [
      { label: 'Créances', path: '/debts', permission: 'debts.view' },
    ],
  },
  { label: 'Stock',           path: '/stock',        icon: Warehouse,       permission: 'stock.view' },
  {
    label: 'Rapports',        path: '/reports',      icon: BarChart3,       permission: 'reports.view',   feature: 'reports',
    children: [
      { label: 'Analyses',        path: '/reports',       permission: 'reports.view',  feature: 'reports' },
      { label: 'Sessions caisse', path: '/pos-sessions',  permission: 'reports.view',  feature: 'pos'     },
    ],
  },
  {
    label: 'Boutique',        path: '/shop-orders',  icon: Store,           permission: 'shop.view',      feature: 'shop',
    children: [
      { label: 'Commandes',           path: '/shop-orders',   permission: 'shop.orders',  feature: 'shop' },
      { label: 'Paramètres boutique', path: '/shop-settings', permission: 'shop.manage',  feature: 'shop' },
    ],
  },
  { label: 'Journal d\'activité', path: '/activity-logs', icon: ClipboardList, permission: 'settings.view' },
  { label: 'Paramètres',      path: '/settings',     icon: Settings,        permission: 'users.view' },
]
