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
} from '@heroicons/react/24/outline'
import { getCustomer, getCustomerSales, updateCustomer } from '@/services/api/customers'
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      </div>

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
