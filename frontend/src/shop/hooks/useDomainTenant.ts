import { useState, useEffect } from 'react'
import apiClient from '@/lib/axios'

export type DomainMode =
  | 'path'       // Mode normal : /shop/:slug (app principale)
  | 'subdomain'  // Option 1 : diedhioubusiness.votreapp.sn
  | 'custom'     // Option 2 : shop.client.sn

export interface DomainTenant {
  slug   : string
  apiKey : string
  name   : string
}

interface State {
  mode    : DomainMode
  tenant  : DomainTenant | null
  loading : boolean
  error   : string | null
}

const MAIN_DOMAIN = import.meta.env.VITE_MAIN_DOMAIN ?? ''

export function detectMode(): { mode: DomainMode; slug: string | null } {
  const hostname = window.location.hostname

  // Développement local ou domaine principal → mode chemin /shop/:slug
  if (!MAIN_DOMAIN || hostname === MAIN_DOMAIN || hostname === 'localhost' || hostname === '127.0.0.1') {
    return { mode: 'path', slug: null }
  }

  // Sous-domaine de notre domaine principal → Option 1
  if (hostname.endsWith('.' + MAIN_DOMAIN)) {
    const slug = hostname.slice(0, -(MAIN_DOMAIN.length + 1))
    return { mode: 'subdomain', slug }
  }

  // Domaine totalement différent → Option 2 (domaine custom client)
  return { mode: 'custom', slug: null }
}

export function useDomainTenant(): State {
  const [state, setState] = useState<State>({
    mode   : 'path',
    tenant : null,
    loading: true,
    error  : null,
  })

  useEffect(() => {
    const { mode, slug } = detectMode()

    if (mode === 'path') {
      setState({ mode, tenant: null, loading: false, error: null })
      return
    }

    const domain = window.location.hostname

    // Sous-domaine : slug connu directement depuis le hostname
    // On appelle quand même resolve-domain pour récupérer l'api_key
    const resolveParam = mode === 'subdomain' && slug
      ? `domain=${domain}&slug=${slug}`
      : `domain=${domain}`

    apiClient
      .get<{ data: DomainTenant }>(`/api/v1/public/resolve-domain?${resolveParam}`)
      .then(({ data }) => {
        setState({ mode, tenant: data.data, loading: false, error: null })
      })
      .catch(() => {
        setState({
          mode,
          tenant : null,
          loading: false,
          error  : 'Boutique introuvable pour ce domaine.',
        })
      })
  }, [])

  return state
}
