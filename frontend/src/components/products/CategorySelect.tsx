import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Select } from '@/components/ui/Input'
import { getCategories, createCategory } from '@/services/api/categories'
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

export default function CategorySelect({
  value,
  onChange,
  error,
  label = 'Catégorie',
}: CategorySelectProps) {
  const qc = useQueryClient()

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 10 * 60 * 1000,
  })

  const options = flattenTree(categories)

  // ── Création inline ────────────────────────────────────────────────────────
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  const createMutation = useMutation({
    mutationFn: (name: string) => createCategory({ name }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      onChange(created.id)   // sélectionne automatiquement la nouvelle catégorie
      setCreating(false)
      setNewName('')
    },
  })

  const handleConfirm = () => {
    const name = newName.trim()
    if (name.length >= 2) createMutation.mutate(name)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleConfirm() }
    if (e.key === 'Escape') { setCreating(false); setNewName('') }
  }

  return (
    <div>
      {/* Label + bouton "+" */}
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-0.5 text-xs text-brand-primary hover:underline"
            title="Créer une nouvelle catégorie"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Nouvelle
          </button>
        )}
      </div>

      {/* Champ de création inline */}
      {creating ? (
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nom de la catégorie…"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <button
            type="button"
            onClick={handleConfirm}
            disabled={newName.trim().length < 2 || createMutation.isPending}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white hover:opacity-90 disabled:opacity-40"
            aria-label="Confirmer"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setNewName('') }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50"
            aria-label="Annuler"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Select
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
      )}

      {createMutation.isError && (
        <p className="mt-1 text-xs text-red-500">Erreur lors de la création.</p>
      )}
    </div>
  )
}
