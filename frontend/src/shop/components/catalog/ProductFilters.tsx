import type { ShopCategory } from '@/shop/services/shop'
import SearchBar from './SearchBar'
import { CategoryStrip } from '@/shop/components/home'

interface Props {
  categories  : ShopCategory[]
  selectedId  : number | null
  onSelect    : (id: number | null) => void
  searchQuery : string
  onSearch    : (q: string) => void
}

export default function ProductFilters({
  categories,
  selectedId,
  onSelect,
  searchQuery,
  onSearch,
}: Props) {
  return (
    <div className="space-y-3">
      <SearchBar
        value={searchQuery}
        onChange={onSearch}
        placeholder="Rechercher un produit…"
      />
      <CategoryStrip
        categories={categories}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  )
}
