import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import EmailEditor, { type EditorRef } from 'react-email-editor'
import { Loader2 } from 'lucide-react'
import apiClient from '@/lib/axios'

// Template de démarrage chargé pour les nouvelles campagnes
const DEFAULT_DESIGN = {
  schemaVersion: 16,
  counters: { u_row: 5, u_column: 5, u_content_text: 4, u_content_button: 1, u_content_divider: 1 },
  body: {
    id: 'default-body',
    rows: [
      // ── En-tête ──────────────────────────────────────────────────────────
      {
        id: 'row-header',
        cells: [1],
        columns: [{
          id: 'col-header',
          contents: [{
            id: 'text-shopname',
            type: 'text',
            values: {
              containerPadding: '20px 30px',
              text: '<p style="text-align:center;font-size:22px;font-weight:700;color:#ffffff;margin:0;">{{shop_name}}</p>',
              textAlign: 'center',
              lineHeight: '140%',
              linkStyle: { inherit: true, linkColor: '#ffffff', linkHoverColor: '#dddddd', linkUnderline: true, linkHoverUnderline: true },
              hideDesktop: false,
              displayCondition: null,
              _meta: { htmlID: 'u_content_text_1', htmlClassNames: 'u_content_text' },
            },
          }],
          values: { backgroundColor: '#006948', padding: '0px', border: {}, _meta: { htmlID: 'u_column_1', htmlClassNames: 'u_column' } },
        }],
        values: {
          displayCondition: null, columns: false,
          backgroundColor: '#006948', columnsBackgroundColor: '',
          backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
          padding: '0px', anchor: '', hideDesktop: false,
          _meta: { htmlID: 'u_row_1', htmlClassNames: 'u_row' },
        },
      },
      // ── Corps principal ───────────────────────────────────────────────────
      {
        id: 'row-body',
        cells: [1],
        columns: [{
          id: 'col-body',
          contents: [
            {
              id: 'text-heading',
              type: 'text',
              values: {
                containerPadding: '40px 40px 10px',
                text: '<h1 style="text-align:center;font-size:28px;font-weight:700;color:#111827;margin:0;">Votre titre accrocheur ici</h1>',
                textAlign: 'center',
                lineHeight: '140%',
                linkStyle: { inherit: true, linkColor: '#006948', linkHoverColor: '#004d35', linkUnderline: true, linkHoverUnderline: true },
                hideDesktop: false,
                displayCondition: null,
                _meta: { htmlID: 'u_content_text_2', htmlClassNames: 'u_content_text' },
              },
            },
            {
              id: 'text-body',
              type: 'text',
              values: {
                containerPadding: '16px 40px 30px',
                text: '<p style="font-size:16px;color:#374151;line-height:1.6;margin:0;">Bonjour,</p><br><p style="font-size:16px;color:#374151;line-height:1.6;margin:0;">Rédigez votre message ici. Vous pouvez mettre en avant vos produits, vos promotions ou partager des actualités avec vos abonnés.</p>',
                textAlign: 'left',
                lineHeight: '160%',
                linkStyle: { inherit: true, linkColor: '#006948', linkHoverColor: '#004d35', linkUnderline: true, linkHoverUnderline: true },
                hideDesktop: false,
                displayCondition: null,
                _meta: { htmlID: 'u_content_text_3', htmlClassNames: 'u_content_text' },
              },
            },
          ],
          values: { backgroundColor: '#ffffff', padding: '0px', border: {}, _meta: { htmlID: 'u_column_2', htmlClassNames: 'u_column' } },
        }],
        values: {
          displayCondition: null, columns: false,
          backgroundColor: '#f4f4f4', columnsBackgroundColor: '#ffffff',
          backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
          padding: '20px 0px 0px', anchor: '', hideDesktop: false,
          _meta: { htmlID: 'u_row_2', htmlClassNames: 'u_row' },
        },
      },
      // ── Bouton CTA ────────────────────────────────────────────────────────
      {
        id: 'row-cta',
        cells: [1],
        columns: [{
          id: 'col-cta',
          contents: [{
            id: 'btn-cta',
            type: 'button',
            values: {
              containerPadding: '20px 40px 40px',
              text: 'Découvrir maintenant',
              href: { name: 'web', values: { href: '{{shop_url}}', target: '_blank' } },
              buttonColors: { color: '#ffffff', backgroundColor: '#006948', hoverColor: '#ffffff', hoverBackgroundColor: '#004d35' },
              size: { autoWidth: true },
              fontSize: '16px',
              textAlign: 'center',
              border: {},
              borderRadius: '6px',
              padding: '14px 32px',
              lineHeight: '120%',
              hideDesktop: false,
              displayCondition: null,
              _meta: { htmlID: 'u_content_button_1', htmlClassNames: 'u_content_button' },
            },
          }],
          values: { backgroundColor: '#ffffff', padding: '0px', border: {}, _meta: { htmlID: 'u_column_3', htmlClassNames: 'u_column' } },
        }],
        values: {
          displayCondition: null, columns: false,
          backgroundColor: '#f4f4f4', columnsBackgroundColor: '#ffffff',
          backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
          padding: '0px 0px 20px', anchor: '', hideDesktop: false,
          _meta: { htmlID: 'u_row_3', htmlClassNames: 'u_row' },
        },
      },
      // ── Séparateur ────────────────────────────────────────────────────────
      {
        id: 'row-divider',
        cells: [1],
        columns: [{
          id: 'col-divider',
          contents: [{
            id: 'divider-1',
            type: 'divider',
            values: {
              containerPadding: '0px 40px',
              border: { borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: '#e5e7eb' },
              textAlign: 'center',
              hideDesktop: false,
              displayCondition: null,
              _meta: { htmlID: 'u_content_divider_1', htmlClassNames: 'u_content_divider' },
            },
          }],
          values: { backgroundColor: '#f9fafb', padding: '0px', border: {}, _meta: { htmlID: 'u_column_4', htmlClassNames: 'u_column' } },
        }],
        values: {
          displayCondition: null, columns: false,
          backgroundColor: '#f9fafb', columnsBackgroundColor: '',
          backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
          padding: '20px 0px 0px', anchor: '', hideDesktop: false,
          _meta: { htmlID: 'u_row_4', htmlClassNames: 'u_row' },
        },
      },
      // ── Pied de page ─────────────────────────────────────────────────────
      {
        id: 'row-footer',
        cells: [1],
        columns: [{
          id: 'col-footer',
          contents: [{
            id: 'text-footer',
            type: 'text',
            values: {
              containerPadding: '20px 40px 30px',
              text: '<p style="text-align:center;font-size:12px;color:#9ca3af;margin:0;">Vous recevez cet email car vous êtes abonné(e) à la newsletter de <strong>{{shop_name}}</strong>.<br><a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Se désabonner</a></p>',
              textAlign: 'center',
              lineHeight: '160%',
              linkStyle: { inherit: false, linkColor: '#9ca3af', linkHoverColor: '#374151', linkUnderline: true, linkHoverUnderline: true },
              hideDesktop: false,
              displayCondition: null,
              _meta: { htmlID: 'u_content_text_4', htmlClassNames: 'u_content_text' },
            },
          }],
          values: { backgroundColor: '#f9fafb', padding: '0px', border: {}, _meta: { htmlID: 'u_column_5', htmlClassNames: 'u_column' } },
        }],
        values: {
          displayCondition: null, columns: false,
          backgroundColor: '#f9fafb', columnsBackgroundColor: '',
          backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
          padding: '0px', anchor: '', hideDesktop: false,
          _meta: { htmlID: 'u_row_5', htmlClassNames: 'u_row' },
        },
      },
    ],
    values: {
      popupPosition: 'center',
      popupWidth: '600px',
      popupHeight: 'auto',
      borderRadius: '0px',
      contentAlign: 'center',
      contentVerticalAlign: 'center',
      contentWidth: '600px',
      fontFamily: { label: 'Arial', value: 'arial,helvetica,sans-serif' },
      preheaderText: '',
      linkStyle: { body: true, linkColor: '#006948', linkHoverColor: '#004d35', linkUnderline: true, linkHoverUnderline: true },
      backgroundColor: '#f4f4f4',
      backgroundImage: { url: '', fullWidth: true, repeat: 'no-repeat', size: 'custom', position: 'center' },
      preheader: '',
      _meta: { htmlID: 'u_body', htmlClassNames: 'u_body' },
    },
  },
}

export interface EmailEditorHandle {
  exportHtml: () => Promise<{ design: object; html: string }>
  loadDesign: (design: object) => void
}

interface Props {
  initialDesign?: object | null
  primaryColor?: string
}

export const EmailEditorWrapper = forwardRef<EmailEditorHandle, Props>(
  ({ initialDesign, primaryColor = '#16a34a' }, ref) => {
    const editorRef = useRef<EditorRef>(null)
    const [ready, setReady]     = useState(false)

    useImperativeHandle(ref, () => ({
      exportHtml: () =>
        new Promise((resolve) => {
          editorRef.current?.exportHtml((data) => resolve(data as { design: object; html: string }))
        }),
      loadDesign: (design: object) => {
        editorRef.current?.loadDesign(design as Parameters<EditorRef['loadDesign']>[0])
      },
    }))

    const onReady = () => {
      setReady(true)
      if (initialDesign) {
        editorRef.current?.loadDesign(initialDesign as Parameters<EditorRef['loadDesign']>[0])
      } else {
        // Nouvelle campagne → template de démarrage avec couleur tenant
        const design = JSON.parse(JSON.stringify(DEFAULT_DESIGN))
        // Remplace la couleur verte par défaut par celle du tenant
        const headerCol = design.body.rows[0].columns[0].values
        const ctaCol    = design.body.rows[2].columns[0].values
        headerCol.backgroundColor = primaryColor
        design.body.rows[0].values.backgroundColor      = primaryColor
        design.body.rows[0].values.columnsBackgroundColor = primaryColor
        ctaCol.backgroundColor  = '#ffffff'
        const btnValues = design.body.rows[2].columns[0].contents[0].values
        btnValues.buttonColors.backgroundColor      = primaryColor
        btnValues.buttonColors.hoverBackgroundColor = primaryColor
        editorRef.current?.loadDesign(design as Parameters<EditorRef['loadDesign']>[0])
      }
      // Upload d'images vers le backend
      ;(editorRef.current as unknown as { editor?: { registerCallback: (name: string, cb: (d: unknown, done: (r: unknown) => void) => void) => void } })
        ?.editor?.registerCallback('image', async (data: unknown, done: (r: unknown) => void) => {
          const file = (data as { attachments?: File[] })?.attachments?.[0]
          if (!file) { done({ progress: 0 }); return }
          const form = new FormData()
          form.append('image', file)
          try {
            const res = await apiClient.post<{ url: string }>('/api/v1/marketing/media', form, {
              headers: { 'Content-Type': undefined },
            })
            done({ progress: 100, url: res.data.url })
          } catch {
            done({ progress: 0 })
          }
        })
    }

    return (
      <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-gray-800">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Chargement de l'éditeur…</span>
          </div>
        )}
        <EmailEditor
          ref={editorRef}
          onReady={onReady}
          minHeight="620px"
          options={{
            displayMode: 'email',
            locale: 'fr-FR',
            mergeTags: {
              shop_name       : { name: 'Nom de la boutique',   value: '{{shop_name}}',       sample: 'Ma Boutique' },
              shop_url        : { name: 'URL de la boutique',   value: '{{shop_url}}',         sample: 'https://...' },
              unsubscribe_url : { name: 'Lien désabonnement',   value: '{{unsubscribe_url}}',  sample: '#' },
            },
            appearance: {
              theme  : 'modern_light',
              panels : { tools: { dock: 'right' } },
            },
            features: {
              stockImages    : { enabled: false },
              smartMergeTags : false,
            },
            tools: {
              button: {
                properties: {
                  buttonColors: {
                    value: {
                      color                 : '#FFFFFF',
                      backgroundColor       : primaryColor,
                      hoverColor            : '#FFFFFF',
                      hoverBackgroundColor  : primaryColor,
                    },
                  },
                },
              },
            },
          } as Parameters<typeof EmailEditor>[0]['options']}
        />
      </div>
    )
  }
)
EmailEditorWrapper.displayName = 'EmailEditorWrapper'
