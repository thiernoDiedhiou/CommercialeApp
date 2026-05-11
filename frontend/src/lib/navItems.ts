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
} from '@heroicons/react/24/outline'

export interface NavChild {
  label: string
  path: string
  permission: string
}

export interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  permission: string
  children?: NavChild[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', path: '/dashboard',  icon: HomeIcon,                   permission: 'dashboard.view' },
  { label: 'Caisse POS',      path: '/pos',         icon: ShoppingCartIcon,           permission: 'pos.access' },
  {
    label: 'Ventes',           path: '/sales',        icon: CurrencyDollarIcon,         permission: 'sales.view',
    children: [
      { label: 'Retours',  path: '/returns', permission: 'returns.view' },
    ],
  },
  { label: 'Factures',        path: '/invoices',     icon: DocumentTextIcon,           permission: 'invoices.view' },
  { label: 'Produits',        path: '/products',     icon: ArchiveBoxIcon,             permission: 'products.view' },
  { label: 'Fournisseurs',    path: '/suppliers',    icon: TruckIcon,                  permission: 'suppliers.view' },
  { label: 'Achats',          path: '/purchases',    icon: ShoppingBagIcon,            permission: 'purchases.view' },
  {
    label: 'Clients',          path: '/customers',    icon: UsersIcon,                  permission: 'customers.view',
    children: [
      { label: 'Créances', path: '/debts',    permission: 'debts.view' },
    ],
  },
  { label: 'Stock',           path: '/stock',        icon: ClipboardDocumentListIcon,  permission: 'stock.view' },
  { label: 'Rapports',        path: '/reports',      icon: ChartBarIcon,               permission: 'reports.view' },
  { label: 'Paramètres',      path: '/settings',     icon: Cog6ToothIcon,              permission: 'users.view' },
]
