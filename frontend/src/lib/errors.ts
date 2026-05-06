import axios from 'axios'

/**
 * Extrait un message lisible depuis une erreur axios ou JS.
 * Priorité : message API → message HTTP générique → message JS brut.
 */
// Traduit les messages de validation Laravel courants en français.
const LARAVEL_TRANSLATIONS: Record<string, string> = {
  'The image field must be an image.': 'Le fichier sélectionné n\'est pas une image valide.',
  'The image field must be a file of type: jpeg, png, webp.': 'Format non supporté. Utilisez JPEG, PNG ou WebP.',
  'The image field must not be greater than 2048 kilobytes.': 'Image trop lourde. Maximum 2 Mo.',
  'The image may not be greater than 2048 kilobytes.': 'Image trop lourde. Maximum 2 Mo.',
  'The image field must be a file.': 'Le fichier n\'a pas pu être lu. Réessayez.',
  'The phone field is invalid.': 'Le numéro de téléphone est invalide pour le pays sélectionné.',
  'The phone is invalid.': 'Le numéro de téléphone est invalide pour le pays sélectionné.',
}

function translateMessage(msg: string): string {
  return LARAVEL_TRANSLATIONS[msg] ?? msg
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined

    // Validation Laravel (422) — premier message de validation
    if (data?.errors && typeof data.errors === 'object') {
      const firstField = Object.values(data.errors as Record<string, string[]>)[0]
      if (Array.isArray(firstField) && firstField.length > 0) return translateMessage(firstField[0])
    }

    // Message API explicite
    if (typeof data?.message === 'string' && data.message) return translateMessage(data.message)

    // Codes HTTP courants
    switch (error.response?.status) {
      case 400: return 'Requête invalide. Vérifiez les données envoyées.'
      case 401: return 'Session expirée. Veuillez vous reconnecter.'
      case 403: return 'Action non autorisée. Vérifiez vos permissions.'
      case 404: return 'Ressource introuvable.'
      case 422: return 'Les données saisies sont invalides.'
      case 429: return 'Trop de requêtes. Veuillez patienter.'
      case 500: return 'Erreur serveur interne. Contactez l\'administrateur.'
      case 503: return 'Service temporairement indisponible. Réessayez dans quelques instants.'
    }

    if (!error.response) return 'Impossible de joindre le serveur. Vérifiez votre connexion.'
  }

  if (error instanceof Error) return error.message

  return 'Une erreur inattendue est survenue.'
}
