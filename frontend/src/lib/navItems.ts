import type React from 'react'
import {
  HomeIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  TruckIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline'

export interface NavChild {
  label:      string
  path:       string
  permission: string
  feature?:   string   // clé dans PlanFeatures — absent = toujours visible
}

export interface NavItem {
  label:      string
  path:       string
  icon:       React.ComponentType<{ className?: string }>
  permission: string
  feature?:   string   // clé dans PlanFeatures — absent = toujours visible
  children?:  NavChild[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', path: '/dashboard',  icon: HomeIcon,                   permission: 'dashboard.view' },
  { label: 'Caisse POS',      path: '/pos',         icon: ShoppingCartIcon,           permission: 'pos.access',      feature: 'pos' },
  {
    label: 'Ventes',           path: '/sales',        icon: CurrencyDollarIcon,         permission: 'sales.view',
    children: [
      { label: 'Retours',  path: '/returns', permission: 'returns.view' },
    ],
  },
  { label: 'Factures',        path: '/invoices',     icon: DocumentTextIcon,           permission: 'invoices.view',   feature: 'invoicing' },
  {
    label: 'Produits',          path: '/products',     icon: ArchiveBoxIcon,             permission: 'products.view',
    children: [
      { label: 'Catalogue',  path: '/products',    permission: 'products.view' },
      { label: 'Catégories', path: '/categories',  permission: 'categories.view' },
      { label: 'Marques',    path: '/brands',      permission: 'products.view' },
    ],
  },
  { label: 'Fournisseurs',    path: '/suppliers',    icon: TruckIcon,                  permission: 'suppliers.view',  feature: 'purchases' },
  { label: 'Achats',          path: '/purchases',    icon: ShoppingBagIcon,            permission: 'purchases.view',  feature: 'purchases' },
  {
    label: 'Clients',          path: '/customers',    icon: UsersIcon,                  permission: 'customers.view',
    children: [
      { label: 'Créances', path: '/debts', permission: 'debts.view' },
    ],
  },
  { label: 'Stock',           path: '/stock',        icon: ClipboardDocumentListIcon,  permission: 'stock.view' },
  { label: 'Rapports',        path: '/reports',      icon: ChartBarIcon,               permission: 'reports.view',    feature: 'reports' },
  {
    label: 'Boutique',         path: '/shop-orders',  icon: BuildingStorefrontIcon,     permission: 'shop.view',       feature: 'shop',
    children: [
      { label: 'Commandes',            path: '/shop-orders',   permission: 'shop.orders',  feature: 'shop' },
      { label: 'Paramètres boutique',  path: '/shop-settings', permission: 'shop.manage',  feature: 'shop' },
    ],
  },
  { label: 'Paramètres',      path: '/settings',     icon: Cog6ToothIcon,              permission: 'users.view' },
]
