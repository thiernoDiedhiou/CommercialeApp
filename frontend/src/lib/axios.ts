import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Injecte le Bearer token ET le X-Tenant-ID depuis le store (dynamique)
apiClient.interceptors.request.use((config) => {
  const { token, tenantApiKey } = useAuthStore.getState()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (tenantApiKey) config.headers['X-Tenant-ID'] = tenantApiKey
  return config
})

// Intercepteur de réponse — gestion globale des erreurs HTTP
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      toast.error(getApiErrorMessage(error))
      return Promise.reject(error)
    }

    const status = error.response?.status

    // 401 (hors login) → logout + redirect
    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // 422 → les formulaires affichent eux-mêmes les erreurs de validation
    if (status === 422) return Promise.reject(error)

    // Toutes les autres erreurs → toast global avec message précis
    toast.error(getApiErrorMessage(error))

    return Promise.reject(error)
  },
)

export default apiClient
