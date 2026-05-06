import axios from 'axios'
import { useSuperAdminStore } from '@/store/superAdminStore'
import { toast } from '@/store/toastStore'
import { getApiErrorMessage } from '@/lib/errors'

const adminAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    // Pas de X-Tenant-ID — les routes admin n'appartiennent à aucun tenant
  },
})

adminAxios.interceptors.request.use((config) => {
  const token = useSuperAdminStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

adminAxios.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      toast.error(getApiErrorMessage(error))
      return Promise.reject(error)
    }

    const status = error.response?.status

    if (status === 401 && !error.config?.url?.includes('/admin/auth/login')) {
      useSuperAdminStore.getState().logout()
      window.location.href = '/admin/login'
      return Promise.reject(error)
    }

    if (status === 422) return Promise.reject(error)

    toast.error(getApiErrorMessage(error))
    return Promise.reject(error)
  },
)

export default adminAxios
