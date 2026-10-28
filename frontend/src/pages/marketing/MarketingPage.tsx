import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Users, Send, FileText, Mail, TrendingUp, Trash2,
  Power, Download, PlusCircle, Eye, ChevronLeft, Loader2,
} from 'lucide-react'
import {
  getMarketingStats, getSubscribers, toggleSubscriber, deleteSubscriber,
  getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign,
  sendCampaign, type NewsletterCampaign, type NewsletterSubscriber,
} from '@/services/api/marketing'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'
import { EmailEditorWrapper, type EmailEditorHandle } from '@/components/marketing/EmailEditorWrapper'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  draft   : 'bg-slate-100 text-slate-600',
  sending : 'bg-blue-100 text-blue-700',
  sent    : 'bg-emerald-100 text-emerald-700',
}

function Badge({ status }: { status: string }) {
  const { t } = useTranslation()
  const labelMap: Record<string, string> = {
    draft   : t('marketing.status_draft'),
    sending : t('marketing.status_sending'),
    sent    : t('marketing.status_sent'),
  }
  const cls = STATUS_CLS[status] ?? STATUS_CLS.draft
  const label = labelMap[status] ?? labelMap.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}


function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>
  label: string; value: number | string; color: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      </div>
    </div>
  )
}

// ── Formulaire campagne ───────────────────────────────────────────────────────

function CampaignForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: NewsletterCampaign | null
  onSaved: (c: NewsletterCampaign) => void
  onCancel: () => void
}) {
  const { t }          = useTranslation()
  const tenant         = useAuthStore((s) => s.tenant)
  const queryClient    = useQueryClient()
  const emailRef       = useRef<EmailEditorHandle>(null)
  const [subject,      setSubject]     = useState(initial?.subject ?? '')
  const [previewText,  setPreviewText] = useState(initial?.preview_text ?? '')
  const [isSaving,     setIsSaving]    = useState(false)

  const primaryColor = tenant?.primary_color ?? '#16a34a'

  const initialDesign = (() => {
    if (!initial?.design) return null
    try { return JSON.parse(initial.design) as object } catch { return null }
  })()

  const create = useMutation({
    mutationFn: (payload: { subject: string; preview_text?: string; body: string; design: string }) =>
      createCampaign(payload),
    onSuccess: (r) => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); onSaved(r.data) },
    onError:   (e) => toast.error(getApiErrorMessage(e)),
  })

  const update = useMutation({
    mutationFn: (payload: { subject: string; preview_text?: string; body: string; design: string }) =>
      updateCampaign(initial!.uid, payload),
    onSuccess: (r) => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); onSaved(r.data) },
    onError:   (e) => toast.error(getApiErrorMessage(e)),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) return
    setIsSaving(true)
    try {
      const { design, html } = await emailRef.current!.exportHtml()
      const payload = {
        subject,
        preview_text: previewText || undefined,
        body  : html,
        design: JSON.stringify(design),
      }
      initial ? update.mutate(payload) : create.mutate(payload)
    } finally {
      setIsSaving(false)
    }
  }

  const isPending = isSaving || create.isPending || update.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('marketing.form_subject')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('marketing.form_subject_placeholder')}
          required
          className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('marketing.form_preview_text')}{' '}
          <span className="text-gray-400 font-normal">{t('marketing.form_preview_hint')}</span>
        </label>
        <input
          type="text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder={t('marketing.form_preview_placeholder')}
          maxLength={200}
          className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('marketing.form_body')} <span className="text-red-500">*</span>
        </label>
        <EmailEditorWrapper ref={emailRef} initialDesign={initialDesign} primaryColor={primaryColor} />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || !subject.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? t('marketing.btn_update') : t('marketing.btn_save_draft')}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

// ── Onglet Abonnés ────────────────────────────────────────────────────────────

function SubscribersTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)
  const [confirmDel, setConfirmDel] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey : ['subscribers', search, page],
    queryFn  : () => getSubscribers({ search: search || undefined, page }),
  })

  const toggleMut = useMutation({
    mutationFn: toggleSubscriber,
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['subscribers'] }),
    onError:    (e) => toast.error(getApiErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: deleteSubscriber,
    onSuccess:  () => {
      setConfirmDel(null)
      queryClient.invalidateQueries({ queryKey: ['subscribers'] })
      toast.success(t('marketing.deleted_subscriber'))
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  const handleExport = async () => {
    try {
      const { default: apiClient } = await import('@/lib/axios')
      const res = await apiClient.get('/api/v1/marketing/subscribers/export', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `abonnes-newsletter-${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch {
      toast.error(t('marketing.export_error'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder={t('marketing.search_email')}
          className="flex-1 h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <Download className="h-4 w-4" />
          {t('marketing.btn_export')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : !data?.data.length ? (
        <div className="text-center py-16 text-gray-400">
          <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t('marketing.empty_subscribers')}</p>
          <p className="text-xs mt-1">{t('marketing.empty_subscribers_hint')}</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">{t('marketing.col_email')}</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">{t('marketing.col_date')}</th>
                  <th className="text-left px-4 py-3">{t('marketing.col_status')}</th>
                  <th className="sr-only px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.data.map((s: NewsletterSubscriber) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.email}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {new Date(s.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {s.is_active ? t('marketing.sub_active') : t('marketing.sub_inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => toggleMut.mutate(s.id)}
                          title={s.is_active ? t('marketing.btn_disable') : t('marketing.btn_enable')}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        {confirmDel === s.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => deleteMut.mutate(s.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              {t('marketing.btn_confirm')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDel(null)}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDel(s.id)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {data.last_page > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{data.total} {t('marketing.subscribers_count')}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
                  ←
                </button>
                <span className="px-3 py-1">{page} / {data.last_page}</span>
                <button type="button" onClick={() => setPage(p => p + 1)} disabled={page === data.last_page}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Onglet Campagnes ──────────────────────────────────────────────────────────

function CampaignsTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((s) => s.permissions)
  const canCreate   = permissions.includes('marketing.create')
  const canSend     = permissions.includes('marketing.send')

  const [view, setView] = useState<'list' | 'create' | 'edit' | 'preview'>('list')
  const [selected, setSelected] = useState<NewsletterCampaign | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey : ['campaigns', page],
    queryFn  : () => getCampaigns(page),
    enabled  : view === 'list',
  })

  const { data: detail } = useQuery({
    queryKey : ['campaign', selected?.uid],
    queryFn  : () => getCampaign(selected!.uid),
    enabled  : !!selected && view === 'preview',
    select   : (r) => r.data,
  })

  const deleteMut = useMutation({
    mutationFn: deleteCampaign,
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); toast.success(t('marketing.deleted_campaign')) },
    onError:    (e) => toast.error(getApiErrorMessage(e)),
  })

  const sendMut = useMutation({
    mutationFn: sendCampaign,
    onSuccess:  (r) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success(r.message)
      setView('list')
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => { setView('list'); setSelected(null) }}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('marketing.btn_back')}
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {view === 'create' ? t('marketing.new_campaign_title') : t('marketing.edit_campaign_title')}
        </h2>
        <CampaignForm
          initial={view === 'edit' ? selected : null}
          onSaved={(c) => { setSelected(c); setView('preview') }}
          onCancel={() => { setView('list'); setSelected(null) }}
        />
      </div>
    )
  }

  if (view === 'preview' && selected) {
    const camp = detail ?? selected
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setView('list')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('marketing.btn_back')}
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{camp.subject}</h2>
            <div className="flex items-center gap-3 mt-1">
              <Badge status={camp.status} />
              {camp.status === 'sent' && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {camp.recipients_count} {t('marketing.recipients_count')} · {new Date(camp.sent_at!).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          {camp.status === 'draft' && (
            <div className="flex gap-2">
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setView('edit')}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('marketing.btn_edit')}
                </button>
              )}
              {canSend && (
                <button
                  type="button"
                  disabled={sendMut.isPending}
                  onClick={() => sendMut.mutate(camp.uid)}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t('marketing.btn_send')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Aperçu de l'email */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2.5 border-b border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
            {t('marketing.preview_title')}
          </div>
          <div
            className="p-6 prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: camp.body }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setSelected(null); setView('create') }}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <PlusCircle className="h-4 w-4" />
            {t('marketing.btn_new')}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : !data?.data.length ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t('marketing.empty_campaigns')}</p>
          {canCreate && <p className="text-xs mt-1">{t('marketing.empty_campaigns_hint')}</p>}
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {data.data.map((c: NewsletterCampaign) => (
              <div key={c.uid} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{c.subject}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge status={c.status} />
                    {c.status === 'sent' && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {c.recipients_count} {t('marketing.recipients_count')}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setSelected(c); setView('preview') }}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title={t('common.edit')}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {c.status === 'draft' && canCreate && (
                    <button
                      type="button"
                      onClick={() => deleteMut.mutate(c.uid)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {data.last_page > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{data.total} {t('marketing.campaigns_count')}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40">←</button>
                <span className="px-3 py-1">{page} / {data.last_page}</span>
                <button type="button" onClick={() => setPage(p => p + 1)} disabled={page === data.last_page}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40">→</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function MarketingPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'subscribers' | 'campaigns'>('campaigns')

  const { data: stats } = useQuery({
    queryKey: ['marketing-stats'],
    queryFn : getMarketingStats,
    select  : (r) => r.data,
  })

  const TABS = [
    { key: 'campaigns',   label: t('marketing.tab_campaigns'),   icon: Send  },
    { key: 'subscribers', label: t('marketing.tab_subscribers'), icon: Users },
  ] as const

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('marketing.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('marketing.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Users}     label={t('marketing.stat_active')}    value={stats?.subscribers_active ?? '—'} color="bg-blue-500"    />
        <StatCard icon={Mail}      label={t('marketing.stat_total')}     value={stats?.subscribers_total  ?? '—'} color="bg-indigo-500"  />
        <StatCard icon={FileText}  label={t('marketing.stat_campaigns')} value={stats?.campaigns_sent     ?? '—'} color="bg-amber-500"   />
        <StatCard icon={TrendingUp} label={t('marketing.stat_sent')}     value={stats?.emails_sent        ?? '—'} color="bg-emerald-500" />
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 -mb-px">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {key === 'subscribers' && stats && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {stats.subscribers_active}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu de l'onglet actif */}
      <div>
        {tab === 'subscribers' ? <SubscribersTab /> : <CampaignsTab />}
      </div>
    </div>
  )
}
