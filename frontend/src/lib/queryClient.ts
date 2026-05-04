import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min — réduit les requêtes répétées
      retry: (failureCount, error) => {
        // Pas de retry sur les 4xx (erreurs client non-récupérables)
        if (axios.isAxiosError(error)) {
          const status = error.response?.status ?? 0
          if (status >= 400 && status < 500) return false
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
