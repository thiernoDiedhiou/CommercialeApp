import type { ShopCategory } from '@/shop/services/shop'
import { CategoryStrip } from '@/shop/components/home'

interface Props {
  categories : ShopCategory[]
  selectedId : number | null
  onSelect   : (id: number | null) => void
}

export default function ProductFilters({ categories, selectedId, onSelect }: Props) {
  return (
    <CategoryStrip
      categories={categories}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  )
}
