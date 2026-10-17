import { describe, it, expect } from 'vitest'
import axios from 'axios'
import { getApiErrorMessage } from '../errors'

function makeAxiosError(status: number, data: unknown = {}): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = new axios.AxiosError('request failed', 'ERR_BAD_RESPONSE', {} as any, {}, {
    data,
    status,
    statusText: String(status),
    headers: {} as any,
    config: {} as any,
  })
  return err
}

describe('getApiErrorMessage', () => {
  it('extrait et traduit le premier message de validation Laravel', () => {
    const err = makeAxiosError(422, {
      message: 'The given data was invalid.',
      errors: { name: ['The name field is required.'] },
    })
    // translateMessage convertit "The name field is required." → "Le champ « name » est obligatoire."
    const msg = getApiErrorMessage(err)
    expect(msg).toContain('obligatoire')
  })

  it('traduit un message de validation Laravel connu', () => {
    const err = makeAxiosError(422, {
      message: 'The image field must be an image.',
    })
    const msg = getApiErrorMessage(err)
    expect(msg).toContain('image valide')
  })

  it('traduit "has already been taken"', () => {
    const err = makeAxiosError(422, {
      message: 'The email has already been taken.',
    })
    expect(getApiErrorMessage(err)).toContain('déjà utilisé')
  })

  it('retourne le message FR générique pour 401 quand pas de message API', () => {
    // Sans data.message, la fonction tombe sur le switch HTTP status
    const err = makeAxiosError(401, {})
    expect(getApiErrorMessage(err)).toBe('Session expirée. Veuillez vous reconnecter.')
  })

  it('retourne le message FR générique pour 403', () => {
    expect(getApiErrorMessage(makeAxiosError(403))).toContain('non autorisée')
  })

  it('retourne le message FR générique pour 404', () => {
    expect(getApiErrorMessage(makeAxiosError(404))).toContain('introuvable')
  })

  it('retourne le message FR générique pour 500', () => {
    expect(getApiErrorMessage(makeAxiosError(500))).toContain('Erreur serveur')
  })

  it('retourne un message réseau quand pas de réponse', () => {
    const err = new axios.AxiosError('Network Error', 'ERR_NETWORK')
    expect(getApiErrorMessage(err)).toContain('connexion')
  })

  it('retourne le message d\'une Error JS ordinaire', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('retourne un fallback pour les valeurs inconnues', () => {
    expect(getApiErrorMessage('oops')).toBe('Une erreur inattendue est survenue.')
    expect(getApiErrorMessage(null)).toBe('Une erreur inattendue est survenue.')
  })
})
