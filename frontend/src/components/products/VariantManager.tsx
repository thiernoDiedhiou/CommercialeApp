import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getAttributes, createAttribute, createAttributeValue } from '@/services/api/attributes'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { AttributeValue, CreateVariantData } from '@/types'

interface CombinationRow {
  key: string
  attribute_value_ids: number[]
  label: string
  sku: string
  price: string
}

interface VariantManagerProps {
  productPrice: number
  onChange: (variants: CreateVariantData[]) => void
}

function cartesian(groups: AttributeValue[][]): AttributeValue[][] {
  if (groups.length === 0) return []
  return groups.reduce<AttributeValue[][]>(
    (acc, group) => acc.flatMap((combo) => group.map((val) => [...combo, val])),
    [[]],
  )
}

export default function VariantManager({ productPrice, onChange }: VariantManagerProps) {
  const qc = useQueryClient()

  const { data: attributes = [] } = useQuery({
    queryKey: ['attributes'],
    queryFn: getAttributes,
    staleTime: 5 * 60 * 1000,
  })

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedAttrIds, setSelectedAttrIds] = useState<number[]>([])
  const [selectedValueIds, setSelectedValueIds] = useState<Record<number, number[]>>({})
  const [combinations, setCombinations] = useState<CombinationRow[]>([])

  // Inline création d'attribut
  const [newAttrName, setNewAttrName] = useState('')
  const createAttrMutation = useMutation({
    mutationFn: createAttribute,
    onSuccess: (attr) => {
      qc.invalidateQueries({ queryKey: ['attributes'] })
      setSelectedAttrIds((prev) => [...prev, attr.id])
      setNewAttrName('')
    },
  })

  // Inline création de valeur par attribut
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>({})
  const createValueMutation = useMutation({
    mutationFn: ({ attrId, body }: { attrId: number; body: { value: string } }) =>
      createAttributeValue(attrId, body),
    onSuccess: (val, { attrId }) => {
      qc.invalidateQueries({ queryKey: ['attributes'] })
      setSelectedValueIds((prev) => ({
        ...prev,
        [attrId]: [...(prev[attrId] ?? []), val.id],
      }))
      setNewValueInputs((prev) => ({ ...prev, [attrId]: '' }))
    },
  })

  const toggleAttr = (attrId: number) => {
    setSelectedAttrIds((prev) =>
      prev.includes(attrId) ? prev.filter((id) => id !== attrId) : [...prev, attrId],
    )
  }

  const toggleValue = (attrId: number, valueId: number) => {
    setSelectedValueIds((prev) => {
      const current = prev[attrId] ?? []
      return {
        ...prev,
        [attrId]: current.includes(valueId)
          ? current.filter((id) => id !== valueId)
          : [...current, valueId],
      }
    })
  }

  const generateCombinations = () => {
    const selectedAttrs = attributes.filter((a) => selectedAttrIds.includes(a.id))
    const valueGroups = selectedAttrs.map((attr) =>
      attr.values.filter((v) => (selectedValueIds[attr.id] ?? []).includes(v.id)),
    )
    const combos = cartesian(valueGroups)
    const rows: CombinationRow[] = combos.map((combo) => ({
      key: combo.map((v) => v.id).join('-'),
      attribute_value_ids: combo.map((v) => v.id),
      label: combo.map((v) => v.value).join(' / '),
      sku: '',
      price: '',
    }))
    setCombinations(rows)
    setStep(3)
    pushUp(rows)
  }

  const updateCombination = (key: string, field: 'sku' | 'price', value: string) => {
    setCombinations((prev) => {
      const updated = prev.map((c) => (c.key === key ? { ...c, [field]: value } : c))
      pushUp(updated)
      return updated
    })
  }

  const removeCombination = (key: string) => {
    setCombinations((prev) => {
      const updated = prev.filter((c) => c.key !== key)
      pushUp(updated)
      return updated
    })
  }

  const pushUp = (rows: CombinationRow[]) => {
    onChange(
      rows.map((r) => ({
        attribute_value_ids: r.attribute_value_ids,
        sku: r.sku || null,
        price: r.price ? Number(r.price) : null,
      })),
    )
  }

  // ── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      {/* Étapes */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        {([1, 2, 3] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => step > s && setStep(s)}
            className={step >= s ? 'text-brand-primary' : ''}
          >
            Étape {s}
          </button>
        ))}
      </div>

      {/* Étape 1 — Sélection des attributs */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Sélectionner les attributs</p>
          <div className="flex flex-wrap gap-2">
            {attributes.map((attr) => (
              <button
                key={attr.id}
                type="button"
                onClick={() => toggleAttr(attr.id)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selectedAttrIds.includes(attr.id)
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {attr.name}
              </button>
            ))}
          </div>

          {/* Créer attribut inline */}
          <div className="flex gap-2">
            <Input
              placeholder="Nouvel attribut…"
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={createAttrMutation.isPending}
              disabled={!newAttrName.trim()}
              onClick={() => createAttrMutation.mutate({ name: newAttrName.trim() })}
            >
              <PlusIcon className="h-4 w-4" />
              Créer
            </Button>
          </div>

          <Button
            type="button"
            disabled={selectedAttrIds.length === 0}
            onClick={() => setStep(2)}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Étape 2 — Sélection des valeurs par attribut */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">Sélectionner les valeurs</p>
          {attributes
            .filter((a) => selectedAttrIds.includes(a.id))
            .map((attr) => (
              <div key={attr.id}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {attr.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {attr.values.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleValue(attr.id, v.id)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                        (selectedValueIds[attr.id] ?? []).includes(v.id)
                          ? 'border-brand-primary bg-brand-primary text-white'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {v.value}
                    </button>
                  ))}

                  {/* Ajouter valeur inline */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Nouvelle valeur…"
                      value={newValueInputs[attr.id] ?? ''}
                      onChange={(e) =>
                        setNewValueInputs((prev) => ({ ...prev, [attr.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = newValueInputs[attr.id]?.trim()
                          if (val) createValueMutation.mutate({ attrId: attr.id, body: { value: val } })
                        }
                      }}
                      className="w-28 rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs placeholder:text-gray-400 focus:outline-none focus:border-brand-primary"
                    />
                    <button
                      type="button"
                      disabled={!newValueInputs[attr.id]?.trim() || createValueMutation.isPending}
                      onClick={() => {
                        const val = newValueInputs[attr.id]?.trim()
                        if (val) createValueMutation.mutate({ attrId: attr.id, body: { value: val } })
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white text-xs disabled:opacity-40 hover:opacity-90 transition"
                      aria-label="Ajouter la valeur"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}

          {selectedAttrIds.some((id) => (selectedValueIds[id] ?? []).length === 0) && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Sélectionnez ou ajoutez au moins une valeur pour chaque attribut, puis cliquez sur <strong>+</strong>.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Retour
            </Button>
            <Button
              type="button"
              disabled={
                selectedAttrIds.some((id) => (selectedValueIds[id] ?? []).length === 0)
              }
              onClick={generateCombinations}
            >
              Générer les combinaisons
            </Button>
          </div>
        </div>
      )}

      {/* Étape 3 — Tableau des combinaisons */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">
            {combinations.length} combinaison{combinations.length !== 1 ? 's' : ''} générée
            {combinations.length !== 1 ? 's' : ''}
          </p>

          {combinations.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                      Combinaison
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                      SKU
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                      Prix (FCFA)
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {combinations.map((row) => (
                    <tr key={row.key}>
                      <td className="px-3 py-2 text-gray-800">{row.label}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.sku}
                          onChange={(e) => updateCombination(row.key, 'sku', e.target.value)}
                          placeholder="SKU-001"
                          className="w-32 rounded border border-gray-200 px-2 py-1 text-xs focus:border-brand-primary focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.price}
                          onChange={(e) => updateCombination(row.key, 'price', e.target.value)}
                          placeholder={String(productPrice)}
                          min={0}
                          className="w-28 rounded border border-gray-200 px-2 py-1 text-xs focus:border-brand-primary focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeCombination(row.key)}
                          aria-label="Supprimer cette combinaison"
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Button type="button" variant="outline" size="sm" onClick={() => setStep(2)}>
            Modifier les valeurs
          </Button>
        </div>
      )}
    </div>
  )
}
