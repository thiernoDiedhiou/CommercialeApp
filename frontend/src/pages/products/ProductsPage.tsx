import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilSquareIcon, TrashIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, CubeIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { getProducts, deleteProduct } from '@/services/api/products'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'
import { getCategories } from '@/services/api/categories'
import { importProducts, downloadImportTemplate } from '@/services/api/import'
import { Table } from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
import type { Column } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import CanDo from '@/components/ui/CanDo'
import { formatCurrency } from '@/lib/utils'
import type { Product, Category, ImportResult } from '@/types'

function flatCategories(nodes: Category[]): Category[] {
  return nodes.flatMap((n) => [n, ...flatCategories(n.children ?? [])])
}

export default function ProductsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // ── Filtres ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [isActive, setIsActive] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['products', { search: debouncedSearch, categoryId, isActive, page }],
    queryFn: () =>
      getProducts({
        search: debouncedSearch || undefined,
        category_id: categoryId || undefined,
        is_active: isActive === '' ? undefined : isActive === 'true',
        page,
      }),
    placeholderData: (prev) => prev,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 10 * 60 * 1000,
  })
  const flatCats = flatCategories(categories)

  // ── Import CSV ────────────────────────────────────────────────────────────
  const [showImport, setShowImport]           = useState(false)
  const [importFile, setImportFile]           = useState<File | null>(null)
  const [updateExisting, setUpdateExisting]   = useState(false)
  const [importResult, setImportResult]       = useState<ImportResult | null>(null)
  const [dlLoading, setDlLoading]             = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const importMutation = useMutation({
    mutationFn: () => {
      if (!importFile) throw new Error('Sélectionnez un fichier CSV.')
      return importProducts(importFile, updateExisting)
    },
    onSuccess: (result) => {
      setImportResult(result)
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success(`Import terminé : ${result.created} créés, ${result.updated} mis à jour.`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const handleImportClose = () => {
    setShowImport(false)
    setImportFile(null)
    setUpdateExisting(false)
    setImportResult(null)
    importMutation.reset()
  }

  const handleDownloadTemplate = async () => {
    setDlLoading(true)
    try { await downloadImportTemplate() } finally { setDlLoading(false) }
  }

  // ── Suppression ───────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const deleteMutation = useMutation({
    mutationFn: (uid: string) => deleteProduct(uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setDeleteTarget(null)
      toast.success(t('products.deleted_ok'))
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: t('common.name'),
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs overflow-hidden">
            {p.image_url
              ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
              : <span>{p.name.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div>
            <p className="font-medium text-gray-900">{p.name}</p>
            {p.brand && (
              <p className="text-xs text-gray-400 leading-none mt-0.5">{p.brand.name}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-0.5">
              {p.has_variants && <Badge variant="info" dot>{t('products.has_variants')}</Badge>}
              {p.is_weight_based && <Badge variant="default">{t('products.weight')}</Badge>}
              {p.has_expiry && <Badge variant="warning">{t('products.expiry')}</Badge>}
              {!p.is_active && <Badge variant="danger">{t('common.inactive')}</Badge>}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (p) => (
        <span className="font-mono text-xs text-gray-500">{p.sku ?? '—'}</span>
      ),
    },
    {
      key: 'category',
      header: t('common.category'),
      render: (p) => (
        <span className="text-sm text-gray-600">
          {flatCats.find((c) => c.id === p.category_id)?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'price',
      header: t('common.price'),
      align: 'right',
      render: (p) => (
        <span className="font-medium text-gray-900">{formatCurrency(p.price)}</span>
      ),
    },
    {
      key: 'stock_quantity',
      header: t('stock.title'),
      align: 'right',
      render: (p) => {
        if (p.has_variants) {
          return <span className="text-xs text-gray-400 italic">{t('products.has_variants')}</span>
        }
        const low = p.alert_threshold !== null && p.stock_quantity <= p.alert_threshold
        return (
          <span className={`font-semibold ${low ? 'text-red-600' : 'text-emerald-600'}`}>
            {p.stock_quantity}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'sr-only',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <CanDo permission="products.edit">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/products/${p.uid}/edit`) }}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title={t('common.edit')}
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          </CanDo>
          <CanDo permission="products.delete">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title={t('common.delete')}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </CanDo>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">{t('products.title')}</h1>
        <div className="flex gap-2">
          <CanDo permission="products.import">
            <Button
              variant="outline"
              icon={<ArrowUpTrayIcon className="h-4 w-4" />}
              onClick={() => setShowImport(true)}
            >
              {t('products.import_title')}
            </Button>
          </CanDo>
          <CanDo permission="products.create">
            <Button
              icon={<PlusIcon className="h-4 w-4" />}
              onClick={() => navigate('/products/new')}
            >
              {t('products.new')}
            </Button>
          </CanDo>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <Input
            placeholder={t('products.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          >
            <option value="">{t('products.filter_category')}</option>
            {flatCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="w-36">
          <Select
            value={isActive}
            onChange={(e) => { setIsActive(e.target.value as '' | 'true' | 'false'); setPage(1) }}
          >
            <option value="">{t('common.status')}</option>
            <option value="true">{t('common.active')}</option>
            <option value="false">{t('common.inactive')}</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Table<Product>
        columns={columns}
        data={data?.data ?? []}
        keyExtractor={(p) => p.id}
        loading={isLoading}
        skeletonRows={8}
        emptyMessage={<EmptyState icon={<CubeIcon className="h-7 w-7" />} title={t('products.empty_title')} description={t('products.empty_desc')} />}
        onRowClick={(p) => navigate(`/products/${p.uid}`)}
        mobileCard={(p) => {
          const cat = flatCats.find((c) => c.id === p.category_id)
          const low = !p.has_variants && p.alert_threshold !== null && p.stock_quantity <= p.alert_threshold
          return (
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  : <span className="text-xs font-semibold text-gray-400">{p.name.charAt(0).toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.name}</p>
                    {p.sku && <p className="text-xs font-mono text-gray-400">{p.sku}</p>}
                    {cat && <p className="text-xs text-gray-400">{cat.name}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-medium text-gray-900">{formatCurrency(p.price)}</span>
                    {!p.has_variants && (
                      <span className={`text-xs font-semibold ${low ? 'text-red-600' : 'text-emerald-600'}`}>
                        {t('stock.title')} : {p.stock_quantity}
                      </span>
                    )}
                    {p.has_variants && (
                      <span className="text-xs text-gray-400 italic">{t('products.has_variants')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }}
      />

      {/* Pagination */}
      {data && data.last_page > 1 && (
        <Pagination
          currentPage={data.current_page}
          lastPage={data.last_page}
          total={data.total}
          perPage={data.per_page}
          onPageChange={setPage}
        />
      )}

      {/* Modal import CSV */}
      <Modal
        isOpen={showImport}
        onClose={handleImportClose}
        title={t('products.import_title')}
        size="md"
        footer={
          importResult ? (
            <Button onClick={handleImportClose}>{t('common.close')}</Button>
          ) : (
            <>
              <Button variant="outline" type="button" onClick={handleImportClose}>
                {t('common.cancel')}
              </Button>
              <Button
                loading={importMutation.isPending}
                disabled={!importFile}
                onClick={() => importMutation.mutate()}
              >
                {t('products.import_action')}
              </Button>
            </>
          )
        }
      >
        {/* ── Résultats après import ── */}
        {importResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-2xl font-bold text-emerald-700">{importResult.created}</p>
                <p className="text-xs text-emerald-600">{t('products.import_created')}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-2xl font-bold text-blue-700">{importResult.updated}</p>
                <p className="text-xs text-blue-600">{t('products.import_updated')}</p>
              </div>
              <div className="rounded-lg bg-gray-100 p-3">
                <p className="text-2xl font-bold text-gray-600">{importResult.skipped}</p>
                <p className="text-xs text-gray-500">{t('products.import_skipped')}</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="rounded-lg bg-red-50 p-3">
                <p className="mb-2 text-sm font-semibold text-red-700">
                  {importResult.errors.length} {t('products.import_errors')}
                </p>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-600">
                      {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* ── Formulaire d'upload ── */
          <div className="space-y-4">
            {/* Zone de sélection fichier */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                aria-label="Fichier CSV à importer"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                  importFile
                    ? 'border-brand-primary bg-brand-primary/5 text-brand-primary'
                    : 'border-gray-300 text-gray-400 hover:border-brand-primary hover:text-brand-primary'
                }`}
              >
                <ArrowUpTrayIcon className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
                {importFile ? (
                  <p className="text-sm font-medium">{importFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">{t('products.import_click')}</p>
                    <p className="mt-1 text-xs">{t('products.import_format')}</p>
                  </>
                )}
              </button>
            </div>

            {/* Option mise à jour */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-sm text-gray-700">
                {t('products.update_existing')}
              </span>
            </label>

            {/* Télécharger le modèle */}
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
              <ArrowDownTrayIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="text-xs text-gray-500">{t('products.import_need_format')}</span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={dlLoading}
                className="text-xs font-medium text-brand-primary hover:underline disabled:opacity-50"
              >
                {dlLoading ? t('common.loading') : t('products.download_template')}
              </button>
            </div>

            {importMutation.isError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {importMutation.error instanceof Error
                  ? importMutation.error.message
                  : 'Une erreur est survenue. Veuillez réessayer.'}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Modal confirmation suppression */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('products.delete_title')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.uid)}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          {t('common.confirm_delete')}{' '}
          <span className="font-semibold text-gray-900">«{deleteTarget?.name}»</span> ?{' '}
          {t('products.delete_warning')}
        </p>
      </Modal>
    </div>
  )
}
