import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { getShopCategories } from '@/shop/services/shop'
import { useShopStore } from '@/shop/store/shopStore'
import { ProductFilters, ProductGrid } from '@/shop/components/catalog'
import { Breadcrumb } from '@/shop/components/shared'

export default function ShopCatalogPage() {
  const { slug = '' }                   = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawSearch  = searchParams.get('search') ?? ''
  const categoryParam = searchParams.get('category')
  const categoryId    = categoryParam ? parseInt(categoryParam, 10) : null

  const onSale    = searchParams.get('on_sale') === '1'

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

  const shopName = useShopStore((s) => s.shopConfig?.name ?? '')

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
    : onSale ? 'Offres du moment'
    : selectedCategory ? selectedCategory.name : 'Catalogue'

  // Pages de recherche/filtres → noindex pour éviter le contenu dupliqué
  const isFiltered = !!rawSearch || onSale

  const metaTitle = selectedCategory
    ? `${selectedCategory.name} — ${shopName}`
    : onSale
    ? `Offres du moment — ${shopName}`
    : `Catalogue — ${shopName}`

  const metaDesc = selectedCategory
    ? `Découvrez tous nos produits ${selectedCategory.name}${shopName ? ` chez ${shopName}` : ''}. Commandez en ligne.`
    : `Parcourez le catalogue complet${shopName ? ` de ${shopName}` : ''}. Livraison disponible.`

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        {isFiltered
          ? <meta name="robots" content="noindex, follow" />
          : <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        }
        {/* Canonical — inclut ?category= si filtre actif, strip les autres params */}
        {!isFiltered && (
          <link rel="canonical" href={
            categoryId
              ? `${window.location.origin}/shop/${slug}/catalog?category=${categoryId}`
              : `${window.location.origin}/shop/${slug}/catalog`
          } />
        )}
        <meta property="og:title"       content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type"        content="website" />
        <meta property="og:locale"      content="fr_SN" />
        <meta property="og:url"         content={
          categoryId
            ? `${window.location.origin}/shop/${slug}/catalog?category=${categoryId}`
            : `${window.location.origin}/shop/${slug}/catalog`
        } />
      </Helmet>

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
        onSale={onSale || undefined}
      />
    </div>
  )
}
