import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Users, Send, FileText, Mail, TrendingUp, Trash2,
  Power, Download, PlusCircle, Eye, ChevronLeft, Loader2,
  Bold, Italic, Underline, List, ListOrdered, Link, AlignLeft,
} from 'lucide-react'
import {
  getMarketingStats, getSubscribers, toggleSubscriber, deleteSubscriber,
  getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign,
  sendCampaign, type NewsletterCampaign, type NewsletterSubscriber,
} from '@/services/api/marketing'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; cls: string }> = {
  draft   : { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600' },
  sending : { label: 'En cours…', cls: 'bg-blue-100 text-blue-700'   },
  sent    : { label: 'Envoyée',   cls: 'bg-emerald-100 text-emerald-700' },
}

function Badge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
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

// ── Éditeur WYSIWYG léger ─────────────────────────────────────────────────────

function WysiwygEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastHtml  = useRef(value)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
      lastHtml.current = value
    }
  }, []) // initialisation seulement

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
  }

  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? ''
    if (html !== lastHtml.current) {
      lastHtml.current = html
      onChange(html)
    }
  }, [onChange])

  const handleLink = () => {
    const url = prompt('URL du lien :')
    if (url) exec('createLink', url)
  }

  const ToolBtn = ({ title, onClick, children }: {
    title: string; onClick: () => void; children: React.ReactNode
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
    >
      {children}
    </button>
  )

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
        <ToolBtn title="Gras (Ctrl+B)"       onClick={() => exec('bold')}>          <Bold         className="h-4 w-4" /></ToolBtn>
        <ToolBtn title="Italique (Ctrl+I)"    onClick={() => exec('italic')}>        <Italic       className="h-4 w-4" /></ToolBtn>
        <ToolBtn title="Souligné (Ctrl+U)"    onClick={() => exec('underline')}>     <Underline    className="h-4 w-4" /></ToolBtn>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        <ToolBtn title="Liste à puces"        onClick={() => exec('insertUnorderedList')}><List     className="h-4 w-4" /></ToolBtn>
        <ToolBtn title="Liste numérotée"      onClick={() => exec('insertOrderedList')}> <ListOrdered className="h-4 w-4" /></ToolBtn>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        <ToolBtn title="Lien"                 onClick={handleLink}>                  <Link         className="h-4 w-4" /></ToolBtn>
        <ToolBtn title="Paragraphe normal"    onClick={() => exec('formatBlock', 'p')}><AlignLeft   className="h-4 w-4" /></ToolBtn>
        <button
          type="button"
          onClick={() => exec('formatBlock', 'h2')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold transition-colors"
          title="Titre"
        >H2</button>
        <button
          type="button"
          onClick={() => exec('formatBlock', 'h3')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold transition-colors"
          title="Sous-titre"
        >H3</button>
      </div>
      {/* Zone d'édition */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        className="min-h-[280px] p-4 outline-none text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 prose prose-sm max-w-none dark:prose-invert"
        style={{ lineHeight: '1.7' }}
      />
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
  const queryClient = useQueryClient()
  const [subject,     setSubject]     = useState(initial?.subject ?? '')
  const [previewText, setPreviewText] = useState(initial?.preview_text ?? '')
  const [body,        setBody]        = useState(initial?.body ?? '')

  const create = useMutation({
    mutationFn: () => createCampaign({ subject, preview_text: previewText || undefined, body }),
    onSuccess: (r) => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); onSaved(r.data) },
    onError:   (e) => toast.error(getApiErrorMessage(e)),
  })

  const update = useMutation({
    mutationFn: () => updateCampaign(initial!.uid, { subject, preview_text: previewText, body }),
    onSuccess: (r) => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); onSaved(r.data) },
    onError:   (e) => toast.error(getApiErrorMessage(e)),
  })

  const isPending = create.isPending || update.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    initial ? update.mutate() : create.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sujet <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex : Nos offres de la semaine 🎉"
          required
          className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Texte de prévisualisation{' '}
          <span className="text-gray-400 font-normal">(affiché dans la boîte de réception)</span>
        </label>
        <input
          type="text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Découvrez nos nouveautés et promotions exclusives…"
          maxLength={200}
          className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Contenu <span className="text-red-500">*</span>
        </label>
        <WysiwygEditor value={body} onChange={setBody} />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || !subject.trim() || !body.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? 'Mettre à jour' : 'Enregistrer le brouillon'}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          Annuler
        </button>
      </div>
    </form>
  )
}

// ── Onglet Abonnés ────────────────────────────────────────────────────────────

function SubscribersTab() {
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
      toast.success('Abonné supprimé.')
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
      toast.error('Erreur lors de l\'export.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Rechercher un email…"
          className="flex-1 h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : !data?.data.length ? (
        <div className="text-center py-16 text-gray-400">
          <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aucun abonné pour le moment.</p>
          <p className="text-xs mt-1">Les visiteurs de votre boutique peuvent s'inscrire depuis le footer.</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3">Statut</th>
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
                        {s.is_active ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => toggleMut.mutate(s.id)}
                          title={s.is_active ? 'Désactiver' : 'Réactiver'}
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
                              Confirmer
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDel(null)}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                              Annuler
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
              <span>{data.total} abonné(s)</span>
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
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campagne supprimée.') },
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
          Retour aux campagnes
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {view === 'create' ? 'Nouvelle campagne' : 'Modifier la campagne'}
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
          Retour aux campagnes
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{camp.subject}</h2>
            <div className="flex items-center gap-3 mt-1">
              <Badge status={camp.status} />
              {camp.status === 'sent' && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {camp.recipients_count} destinataire(s) · {new Date(camp.sent_at!).toLocaleDateString('fr-FR')}
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
                  Modifier
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
                  Envoyer à tous les abonnés
                </button>
              )}
            </div>
          )}
        </div>

        {/* Aperçu de l'email */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2.5 border-b border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
            Aperçu du contenu
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
            Nouvelle campagne
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : !data?.data.length ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aucune campagne pour le moment.</p>
          {canCreate && <p className="text-xs mt-1">Créez votre première campagne pour commencer.</p>}
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
                        {c.recipients_count} destinataire(s)
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
                    title="Voir"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {c.status === 'draft' && canCreate && (
                    <button
                      type="button"
                      onClick={() => deleteMut.mutate(c.uid)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                      title="Supprimer"
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
              <span>{data.total} campagne(s)</span>
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
  const [tab, setTab] = useState<'subscribers' | 'campaigns'>('campaigns')

  const { data: stats } = useQuery({
    queryKey: ['marketing-stats'],
    queryFn : getMarketingStats,
    select  : (r) => r.data,
  })

  const TABS = [
    { key: 'campaigns',   label: 'Campagnes',  icon: Send  },
    { key: 'subscribers', label: 'Abonnés',    icon: Users },
  ] as const

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gérez vos abonnés et envoyez des campagnes email à votre audience.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Users}     label="Abonnés actifs"   value={stats?.subscribers_active ?? '—'} color="bg-blue-500"    />
        <StatCard icon={Mail}      label="Total abonnés"    value={stats?.subscribers_total  ?? '—'} color="bg-indigo-500"  />
        <StatCard icon={FileText}  label="Campagnes"        value={stats?.campaigns_sent     ?? '—'} color="bg-amber-500"   />
        <StatCard icon={TrendingUp} label="Emails envoyés"  value={stats?.emails_sent        ?? '—'} color="bg-emerald-500" />
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
