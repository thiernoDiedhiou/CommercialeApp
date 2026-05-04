import { useQuery } from '@tanstack/react-query'
import { Select } from '@/components/ui/Input'
import { getCategories } from '@/services/api/categories'
import type { Category } from '@/types'

interface FlatOption {
  id: number
  label: string
  depth: number
}

function flattenTree(nodes: Category[], depth = 0): FlatOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: node.name, depth },
    ...flattenTree(node.children ?? [], depth + 1),
  ])
}

interface CategorySelectProps {
  value: number | null | undefined
  onChange: (value: number | null) => void
  error?: string
  label?: string
}

export default function CategorySelect({ value, onChange, error, label = 'Catégorie' }: CategorySelectProps) {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 10 * 60 * 1000,
  })

  const options = flattenTree(categories)

  return (
    <Select
      label={label}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? null : Number(v))
      }}
      error={error}
      disabled={isLoading}
    >
      <option value="">— Aucune catégorie —</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.depth > 0 ? '    '.repeat(opt.depth) + opt.label : opt.label}
        </option>
      ))}
    </Select>
  )
}
