import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilSquareIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { getCustomer, getCustomerSales, updateCustomer } from '@/services/api/customers'
import { addPayment } from '@/services/api/sales'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/utils'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import CanDo from '@/components/ui/CanDo'
import CustomerForm from '@/components/customers/CustomerForm'
import type { CustomerFormValues } from '@/components/customers/CustomerForm'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Sale } from '@/types'

const FORM_ID = 'customer-detail-form'

// ── Date relative ─────────────────────────────────────────────────────────

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

function formatRelative(date: string | null): string {
  if (!date) return '—'
  const diffMs = new Date(date).getTime() - Date.now()
  const diffDays = Math.round(diffMs / 86_400_000)
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / 3_600_000)
    return rtf.format(diffHours || -1, 'hour')
  }
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day')
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month')
  return rtf.format(Math.round(diffDays / 365), 'year')
}

// ── Statuts ventes ────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<Sale['status'], 'success' | 'warning' | 'danger'> = {
  confirmed: 'success',
  draft: 'warning',
  cancelled: 'danger',
}
const STATUS_LABEL: Record<Sale['status'], string> = {
  confirmed: 'Confirmée',
  draft: 'Brouillon',
  cancelled: 'Annulée',
}

// ── KPI card ──────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="truncate text-lg font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [salesPage, setSalesPage] = useState(1)
  const [editOpen, setEditOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payingSale, setPayingSale] = useState<Sale | null>(null)
  const [payMethod, setPayMethod] = useState('cash')
  const [payAmount, setPayAmount] = useState('')

  // ── Données ───────────────────────────────────────────────────────────────
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', Number(id)],
    queryFn: () => getCustomer(Number(id)),
    enabled: !!id,
  })

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['customer-sales', Number(id), salesPage],
    queryFn: () => getCustomerSales(Number(id), { page: salesPage }),
    enabled: !!id,
    placeholderData: (prev) => prev,
  })

  // Toutes les ventes confirmées pour la section créances (sans pagination)
  const { data: allSalesData } = useQuery({
    queryKey: ['customer-sales-all', Number(id)],
    queryFn: () => getCustomerSales(Number(id), { page: 1, per_page: 200 }),
    enabled: !!id && (customer?.outstanding_balance ?? 0) > 0,
  })

  // ── Mutation encaissement rapide ──────────────────────────────────────────
  const payMutation = useMutation({
    mutationFn: () => addPayment(payingSale!.id, {
      method: payMethod,
      amount: parseFloat(payAmount) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', Number(id)] })
      qc.invalidateQueries({ queryKey: ['customer-sales', Number(id)] })
      qc.invalidateQueries({ queryKey: ['debts'] })
      setPayOpen(false)
      setPayAmount('')
      toast.success('Paiement enregistré.')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const openPayModal = (sale: Sale) => {
    const due = parseFloat(sale.total) - parseFloat(sale.paid_amount)
    setPayingSale(sale)
    setPayAmount(String(Math.round(due)))
    setPayMethod('cash')
    setPayOpen(true)
  }

  // ── Mutation édition ──────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (values: CustomerFormValues) =>
      updateCustomer(Number(id), {
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', Number(id)] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      setEditOpen(false)
    },
  })

  // ── Colonnes ventes ───────────────────────────────────────────────────────
  const saleColumns: Column<Sale>[] = [
    {
      key: 'reference',
      header: 'Référence',
      render: (s) => (
        <span className="font-mono text-sm font-semibold text-gray-900">{s.reference}</span>
      ),
    },
    {
      key: 'confirmed_at',
      header: 'Date',
      render: (s) => (
        <span className="text-sm text-gray-600">{formatDate(s.confirmed_at ?? s.created_at)}</span>
      ),
    },
    {
      key: 'total',
      header: 'Montant',
      align: 'right',
      render: (s) => (
        <span className="font-medium text-gray-900">{formatCurrency(s.total)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      align: 'center',
      render: (s) => (
        <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
      ),
    },
    {
      key: 'paid_amount',
      header: 'Payé',
      align: 'right',
      render: (s) => (
        <span className="text-sm text-gray-700">{formatCurrency(s.paid_amount)}</span>
      ),
    },
    {
      key: 'due',
      header: 'Reste dû',
      align: 'right',
      render: (s) => {
        const due = parseFloat(s.total) - parseFloat(s.paid_amount)
        return due > 0 ? (
          <span className="font-semibold text-red-600">{formatCurrency(due)}</span>
        ) : (
          <span className="text-sm text-gray-300">—</span>
        )
      },
    },
  ]

  // ── États de chargement / erreur ──────────────────────────────────────────
  if (customerLoading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="h-6 w-24 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-2 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Client introuvable.</p>
        <Button variant="ghost" onClick={() => navigate('/customers')} className="mt-3">
          Retour
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Barre de navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Clients
        </button>
        <CanDo permission="customers.edit">
          <Button
            variant="outline"
            icon={<PencilSquareIcon className="h-4 w-4" />}
            onClick={() => setEditOpen(true)}
          >
            Modifier
          </Button>
        </CanDo>
      </div>

      {/* Profil */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-wrap items-start gap-4">
          {/* Avatar initiales */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-2xl font-bold text-brand-primary select-none">
            {customer.name.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              <Badge variant={customer.is_active ? 'success' : 'default'}>
                {customer.is_active ? 'Actif' : 'Inactif'}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
              {customer.phone && (
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <PhoneIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <EnvelopeIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  {customer.email}
                </span>
              )}
              {customer.address && (
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPinIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  {customer.address}
                </span>
              )}
            </div>

            {customer.notes && (
              <p className="mt-3 rounded-lg bg-gray-50 px-4 py-2.5 text-sm text-gray-500 italic">
                {customer.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<BanknotesIcon className="h-5 w-5" />}
          label="Total achats"
          value={formatCurrency(customer.total_purchases)}
        />
        <KpiCard
          icon={<ShoppingBagIcon className="h-5 w-5" />}
          label="Nombre de ventes"
          value={String(customer.sales_count)}
          sub={customer.sales_count === 1 ? 'commande' : 'commandes'}
        />
        <KpiCard
          icon={<CalendarDaysIcon className="h-5 w-5" />}
          label="Dernière visite"
          value={formatRelative(customer.last_purchase_at)}
          sub={customer.last_purchase_at ? formatDate(customer.last_purchase_at) : undefined}
        />
        {customer.outstanding_balance > 0 ? (
          <div className="flex items-center gap-4 rounded-xl bg-red-50 p-5 shadow-sm ring-1 ring-red-100">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <ExclamationCircleIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-red-500">Solde dû</p>
              <p className="truncate text-lg font-bold text-red-700">{formatCurrency(customer.outstanding_balance)}</p>
              <p className="text-xs text-red-400">{customer.unpaid_sales_count} vente(s) impayée(s)</p>
            </div>
          </div>
        ) : (
          <KpiCard
            icon={<ExclamationCircleIcon className="h-5 w-5" />}
            label="Solde dû"
            value="Soldé"
            sub="Aucune créance"
          />
        )}
      </div>

      {/* Section Créances */}
      {customer.outstanding_balance > 0 && (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-red-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50">
            <div className="flex items-center gap-2">
              <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-semibold text-red-700">
                Créances — {formatCurrency(customer.outstanding_balance)} dû
              </h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Référence</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Payé</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Reste dû</th>
                  <th className="sr-only">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(allSalesData?.data ?? salesData?.data ?? [])
                  .filter((s) => s.status === 'confirmed' && parseFloat(s.total) > parseFloat(s.paid_amount))
                  .map((sale) => {
                    const due = parseFloat(sale.total) - parseFloat(sale.paid_amount)
                    return (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{sale.reference}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDateTime(sale.confirmed_at ?? sale.created_at)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(sale.total)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(sale.paid_amount)}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(due)}</td>
                        <td className="px-4 py-3 text-right">
                          <CanDo permission="sales.create">
                            <button
                              type="button"
                              onClick={() => openPayModal(sale)}
                              className="rounded-md bg-brand-primary px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 transition"
                            >
                              Encaisser
                            </button>
                          </CanDo>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historique des ventes */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Historique des ventes</h2>

        <Table<Sale>
          columns={saleColumns}
          data={salesData?.data ?? []}
          keyExtractor={(s) => s.id}
          loading={salesLoading}
          skeletonRows={5}
          emptyMessage="Aucune vente enregistrée pour ce client."
          onRowClick={(s) => navigate(`/sales/${s.id}`)}
        />

        {salesData && salesData.last_page > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={salesData.current_page}
              lastPage={salesData.last_page}
              total={salesData.total}
              perPage={salesData.per_page}
              onPageChange={setSalesPage}
            />
          </div>
        )}
      </div>

      {/* Modal encaissement rapide */}
      <Modal
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        title="Encaisser un paiement"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Annuler</Button>
            <Button
              loading={payMutation.isPending}
              disabled={!payAmount || parseFloat(payAmount) <= 0}
              onClick={() => payMutation.mutate()}
            >
              Confirmer
            </Button>
          </>
        }
      >
        {payingSale && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Vente <span className="font-mono font-semibold text-gray-900">{payingSale.reference}</span>
              {' — '}Reste dû :{' '}
              <span className="font-bold text-red-600">
                {formatCurrency(parseFloat(payingSale.total) - parseFloat(payingSale.paid_amount))}
              </span>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Mode de paiement</label>
              <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="cash">Espèces</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="card">Carte bancaire</option>
                <option value="bank_transfer">Virement bancaire</option>
              </Select>
            </div>
            <Input
              label="Montant (FCFA)"
              type="number"
              min={1}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
        )}
      </Modal>

      {/* Modal édition */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier le client"
        size="md"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button
              form={FORM_ID}
              type="submit"
              loading={updateMutation.isPending}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        {updateMutation.isError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Une erreur est survenue. Veuillez réessayer.
          </p>
        )}
        <CustomerForm
          formId={FORM_ID}
          customer={customer}
          onSubmit={(values) => updateMutation.mutate(values)}
        />
      </Modal>
    </div>
  )
}
