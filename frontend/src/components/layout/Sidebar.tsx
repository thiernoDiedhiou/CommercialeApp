import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useHomePath } from '@/hooks/useHomePath'
import { NAV_ITEMS } from '@/lib/navItems'
import { cn } from '@/lib/utils'

interface SidebarContentProps {
  onClose: () => void
}

// Retourne l'id de l'item parent dont un enfant correspond à la route courante
function findParentId(pathname: string): string | null {
  for (const item of NAV_ITEMS) {
    if (item.children?.some(
      (c) => pathname === c.path || pathname.startsWith(c.path + '/'),
    )) {
      return item.id
    }
  }
  return null
}

function SidebarContent({ onClose }: SidebarContentProps) {
  const { t }        = useTranslation()
  const permissions  = useAuthStore((s) => s.permissions)
  const tenant       = useAuthStore((s) => s.tenant)
  const planFeatures = useAuthStore((s) => s.planFeatures)
  const location     = useLocation()
  const homePath     = useHomePath()

  const hasFeature = (feature?: string): boolean => {
    if (!feature || !planFeatures) return true
    const key = feature as keyof typeof planFeatures
    return planFeatures[key] === true
  }

  const visibleItems = NAV_ITEMS.filter((item) =>
    permissions.includes(item.permission),
  )

  // Identifiant (item.id) du groupe actuellement ouvert
  const [expandedId, setExpandedId] = useState<string | null>(
    () => findParentId(location.pathname),
  )

  // Auto-expand quand on navigue directement vers un sous-chemin (lien externe, F5…)
  useEffect(() => {
    const parentId = findParentId(location.pathname)
    if (parentId) setExpandedId(parentId)
  }, [location.pathname])

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-colors duration-200">
      {/* En-tête tenant */}
      <NavLink
        to={homePath}
        className="flex h-16 shrink-0 items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={onClose}
      >
        {tenant?.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant.name}
            className="h-12 w-12 shrink-0 rounded-lg object-contain"
          />
        ) : null}
        <span className="truncate text-lg font-bold text-brand-primary">
          {tenant?.name ?? 'Gestion Commerciale'}
        </span>
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const featureAllowed  = hasFeature(item.feature)
          const visibleChildren = item.children?.filter((c) =>
            permissions.includes(c.permission),
          ) ?? []
          const hasChildren = visibleChildren.length > 0
          const isExpanded  = hasChildren && expandedId === item.id

          // Un enfant correspond à la route courante → parent "actif"
          const isChildActive = hasChildren && visibleChildren.some(
            (c) => location.pathname === c.path || location.pathname.startsWith(c.path + '/'),
          )

          // Feature absente du plan — item grisé, non cliquable
          if (!featureAllowed) {
            return (
              <div
                key={item.id}
                title={t('nav.not_in_plan')}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 dark:text-gray-600 cursor-not-allowed select-none"
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="flex-1">{t(item.labelKey)}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                  {t('common.plan_plus')}
                </span>
              </div>
            )
          }

          return (
            <div key={item.id}>
              {hasChildren ? (
                // ── En-tête de groupe : bouton toggle uniquement ──────────────
                // Sur mobile, le clic ouvre/ferme le sous-menu SANS fermer la sidebar.
                // Seul le clic sur un enfant ferme la sidebar (via onClose dans le NavLink enfant).
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((prev) => (prev === item.id ? null : item.id))
                  }
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isExpanded || isChildActive
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                  )}
                  aria-expanded={isExpanded}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-left">{t(item.labelKey)}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform duration-200',
                      isExpanded && 'rotate-180',
                    )}
                  />
                </button>
              ) : (
                // ── Lien direct ───────────────────────────────────────────────
                <NavLink
                  to={item.path!}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{t(item.labelKey)}</span>
                </NavLink>
              )}

              {/* Sous-menu déroulant */}
              {hasChildren && isExpanded && (
                <div className="mt-0.5 ml-4 space-y-0.5 border-l-2 border-brand-primary/20 pl-3">
                  {visibleChildren.map((child) => {
                    if (!hasFeature(child.feature)) {
                      return (
                        <div
                          key={child.path}
                          title={t('nav.not_in_plan')}
                          className="flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 dark:text-gray-600 cursor-not-allowed select-none"
                        >
                          {t(child.labelKey)}
                        </div>
                      )
                    }
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        end
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                          )
                        }
                      >
                        {t(child.labelKey)}
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop : sidebar fixe toujours visible */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:z-10">
        <SidebarContent onClose={() => {}} />
      </div>

      {/* Mobile : slide-over avec backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      >
        <div className="absolute inset-0 bg-gray-900/60" onClick={onClose} />

        <div
          className={cn(
            'absolute inset-y-0 left-0 flex w-64 flex-col',
            'transition-transform duration-200 ease-in-out',
            isOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="absolute right-[-44px] top-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-gray-700 shadow text-gray-600 dark:text-gray-300"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <SidebarContent onClose={onClose} />
        </div>
      </div>
    </>
  )
}
