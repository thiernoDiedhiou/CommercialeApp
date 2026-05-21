import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getShopCategories } from '@/shop/services/shop'
import { ProductFilters, ProductGrid } from '@/shop/components/catalog'

export default function ShopCatalogPage() {
  const { slug = '' }         = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  // Valeur affichée dans l'input
  const [searchInput, setSearchInput]       = useState(searchParams.get('search') ?? '')
  // Valeur transmise à ProductGrid (après debounce)
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput)

  const categoryParam = searchParams.get('category')
  const categoryId    = categoryParam ? parseInt(categoryParam, 10) : null

  // Debounce 300ms sur searchInput
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Sync URL → searchInput (ex: depuis la navbar)
  useEffect(() => {
    setSearchInput(searchParams.get('search') ?? '')
  }, [searchParams])

  const { data: categoriesResult } = useQuery({
    queryKey : ['shop-categories', slug],
    queryFn  : () => getShopCategories(slug),
    staleTime: 5 * 60 * 1000,
    enabled  : !!slug,
  })

  const categories = categoriesResult?.data ?? []

  const handleCategorySelect = (id: number | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set('category', id.toString())
        else next.delete('category')
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Catalogue</h1>

      {/* ── Filtres ───────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <ProductFilters
          categories={categories}
          selectedId={categoryId}
          onSelect={handleCategorySelect}
          searchQuery={searchInput}
          onSearch={setSearchInput}
        />
      </div>

      {/* ── Grille produits ───────────────────────────────────────────────── */}
      <ProductGrid
        slug={slug}
        categoryId={categoryId}
        searchQuery={debouncedSearch}
      />
    </div>
  )
}
