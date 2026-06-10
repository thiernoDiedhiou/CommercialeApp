import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getShopCategories } from '@/shop/services/shop'
import { ProductFilters, ProductGrid } from '@/shop/components/catalog'
import { Breadcrumb } from '@/shop/components/shared'

export default function ShopCatalogPage() {
  const { slug = '' }                   = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawSearch  = searchParams.get('search') ?? ''
  const categoryParam = searchParams.get('category')
  const categoryId    = categoryParam ? parseInt(categoryParam, 10) : null

  const sortParam = searchParams.get('sort')
  const sort      = (['newest', 'best_sellers'].includes(sortParam ?? '')
    ? sortParam
    : 'name') as 'name' | 'newest' | 'best_sellers'

  // Debounce léger — la navbar a déjà debounce l'URL, on lisse juste les navigations directes
  const [debouncedSearch, setDebouncedSearch] = useState(rawSearch)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(rawSearch), 50)
    return () => clearTimeout(timer)
  }, [rawSearch])

  const { data: categoriesResult } = useQuery({
    queryKey : ['shop-categories', slug],
    queryFn  : () => getShopCategories(slug),
    staleTime: 5 * 60 * 1000,
    enabled  : !!slug,
  })

  const categories       = categoriesResult?.data ?? []
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null

  const handleCategorySelect = (id: number | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id) next.set('category', id.toString())
      else next.delete('category')
      return next
    }, { replace: true })
  }

  const handleSortChange = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === 'name') next.delete('sort')
      else next.set('sort', value)
      return next
    }, { replace: true })
  }

  const breadcrumbItems = [
    { label: 'Accueil',   to: `/shop/${slug}` },
    selectedCategory
      ? { label: 'Catalogue', to: `/shop/${slug}/catalog` }
      : { label: 'Catalogue' },
    ...(selectedCategory ? [{ label: selectedCategory.name }] : []),
  ]

  // Titre de section dynamique
  const sectionTitle = rawSearch
    ? `Résultats pour « ${rawSearch} »`
    : selectedCategory ? selectedCategory.name : 'Catalogue'

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <Breadcrumb items={breadcrumbItems} />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        {sectionTitle}
      </h1>

      {/* ── Catégories ────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <ProductFilters
          categories={categories}
          selectedId={categoryId}
          onSelect={handleCategorySelect}
        />
      </div>

      {/* ── Tri ───────────────────────────────────────────────────────────── */}
      <div className="flex justify-end mb-4">
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          aria-label="Trier les produits"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="name">Nom (A–Z)</option>
          <option value="newest">Nouveaux arrivages</option>
          <option value="best_sellers">Meilleures ventes</option>
        </select>
      </div>

      {/* ── Grille produits ───────────────────────────────────────────────── */}
      <ProductGrid
        slug={slug}
        categoryId={categoryId}
        searchQuery={debouncedSearch}
        sort={sort}
      />
    </div>
  )
}
