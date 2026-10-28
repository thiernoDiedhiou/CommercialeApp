import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import EmailEditor, { type EditorRef } from 'react-email-editor'
import { Loader2 } from 'lucide-react'
import apiClient from '@/lib/axios'

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
