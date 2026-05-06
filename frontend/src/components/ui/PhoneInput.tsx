import type { SelectHTMLAttributes, InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'

export interface CountryOption {
  code:  string  // ISO 3166-1 alpha-2
  name:  string
  dial:  string  // ex: '+221'
  flag:  string  // emoji drapeau
}

export const PHONE_COUNTRIES: CountryOption[] = [
  { code: 'SN', name: 'Sénégal',        dial: '+221', flag: '🇸🇳' },
  { code: 'CI', name: "Côte d'Ivoire",  dial: '+225', flag: '🇨🇮' },
  { code: 'ML', name: 'Mali',           dial: '+223', flag: '🇲🇱' },
  { code: 'GN', name: 'Guinée',         dial: '+224', flag: '🇬🇳' },
  { code: 'BF', name: 'Burkina Faso',   dial: '+226', flag: '🇧🇫' },
  { code: 'TG', name: 'Togo',           dial: '+228', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin',          dial: '+229', flag: '🇧🇯' },
  { code: 'MR', name: 'Mauritanie',     dial: '+222', flag: '🇲🇷' },
  { code: 'GM', name: 'Gambie',         dial: '+220', flag: '🇬🇲' },
  { code: 'GW', name: 'Guinée-Bissau',  dial: '+245', flag: '🇬🇼' },
  { code: 'NE', name: 'Niger',          dial: '+227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigéria',        dial: '+234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana',          dial: '+233', flag: '🇬🇭' },
  { code: 'CM', name: 'Cameroun',       dial: '+237', flag: '🇨🇲' },
  { code: 'MA', name: 'Maroc',          dial: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie',        dial: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie',        dial: '+216', flag: '🇹🇳' },
  { code: 'FR', name: 'France',         dial: '+33',  flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique',       dial: '+32',  flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse',         dial: '+41',  flag: '🇨🇭' },
  { code: 'US', name: 'États-Unis',     dial: '+1',   flag: '🇺🇸' },
  { code: 'CA', name: 'Canada',         dial: '+1',   flag: '🇨🇦' },
  { code: 'GB', name: 'Royaume-Uni',    dial: '+44',  flag: '🇬🇧' },
]

interface PhoneInputProps {
  label?: string
  country: string
  onCountryChange: (code: string) => void
  phoneProps?: InputHTMLAttributes<HTMLInputElement>
  countrySelectProps?: SelectHTMLAttributes<HTMLSelectElement>
  error?: string
  hint?: string
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, country, onCountryChange, phoneProps, error, hint }, ref) => {
    const selected = PHONE_COUNTRIES.find((c) => c.code === country) ?? PHONE_COUNTRIES[0]

    // Quand l'utilisateur change de pays : remplace l'ancien indicatif par le nouveau
    const handleCountryChange = (newCode: string) => {
      const newCountry = PHONE_COUNTRIES.find((c) => c.code === newCode) ?? PHONE_COUNTRIES[0]
      const currentVal = String(phoneProps?.value ?? '')

      if (currentVal.startsWith(selected.dial)) {
        const localPart = currentVal.slice(selected.dial.length)
        const newVal = `${newCountry.dial}${localPart}`
        phoneProps?.onChange?.({
          target: { value: newVal, name: phoneProps.name ?? '' },
        } as React.ChangeEvent<HTMLInputElement>)
      }

      onCountryChange(newCode)
    }

    // Filtre les caractères non-téléphoniques ; préfixe automatique l'indicatif si le champ est vide
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleaned = e.target.value.replace(/[^\d\s+\-().]/g, '')
      e.target.value = cleaned
      phoneProps?.onChange?.(e)
    }

    // Au focus sur un champ vide : préfixe l'indicatif automatiquement
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!String(phoneProps?.value ?? '').trim()) {
        const prefixed = `${selected.dial} `
        phoneProps?.onChange?.({
          target: { value: prefixed, name: phoneProps?.name ?? '' },
        } as React.ChangeEvent<HTMLInputElement>)
      }
      phoneProps?.onFocus?.(e)
    }

    return (
      <div>
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
        )}
        <div className="flex gap-2">
          {/* Sélecteur de pays — affiche drapeau + indicatif */}
          <select
            value={country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-24 shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            aria-label="Pays du numéro de téléphone"
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.dial}
              </option>
            ))}
          </select>

          {/* Input téléphone — valeur en format international complet */}
          <input
            ref={ref}
            type="tel"
            placeholder={`${selected.dial} 77 000 00 00`}
            {...phoneProps}
            onChange={handlePhoneChange}
            onFocus={handleFocus}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              error
                ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                : 'border-gray-300 focus:border-brand-primary focus:ring-brand-primary'
            }`}
          />
        </div>

        {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)

PhoneInput.displayName = 'PhoneInput'

export default PhoneInput

/** Retourne null si la valeur est vide ou réduite à un simple indicatif (+221, +33…). */
export function normalizePhone(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null
  const isDialOnly = PHONE_COUNTRIES.some((c) => trimmed === c.dial)
  return isDialOnly ? null : trimmed
}
