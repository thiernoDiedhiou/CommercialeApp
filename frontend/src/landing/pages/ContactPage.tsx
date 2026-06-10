import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPublicSiteSettings } from '@/services/api/public'
import { EnvelopeIcon, MapPinIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })

  const { data: settings } = useQuery({
    queryKey: ['public-site-settings'],
    queryFn:  getPublicSiteSettings,
    staleTime: 10 * 60 * 1000,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const to   = settings?.contact_email ?? 'contact@didisphere.sn'
    const body = encodeURIComponent(`Nom: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(form.subject)}&body=${body}`
    setSent(true)
  }

  const contactItems = [
    settings?.contact_email && {
      icon: EnvelopeIcon,
      color: 'bg-ds-blue',
      label: 'Email',
      value: settings.contact_email,
      href: `mailto:${settings.contact_email}`,
      hoverColor: 'hover:text-ds-blue',
    },
    settings?.contact_whatsapp && {
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-ds-green',
      label: 'WhatsApp',
      value: settings.contact_whatsapp,
      href: `https://wa.me/${settings.contact_whatsapp.replace(/\D/g, '')}`,
      hoverColor: 'hover:text-ds-green',
    },
    settings?.contact_address && {
      icon: MapPinIcon,
      color: 'bg-ds-purple',
      label: 'Localisation',
      value: settings.contact_address,
      href: null,
      hoverColor: '',
    },
  ].filter(Boolean) as {
    icon: React.ElementType
    color: string
    label: string
    value: string
    href: string | null
    hoverColor: string
  }[]

  return (
    <div className="py-20">

      {/* Header */}
      <div className="mx-auto max-w-3xl px-4 text-center mb-16">
        <span className="inline-block rounded-full bg-ds-green-light px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ds-green mb-4">
          Contact
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
          Parlons de votre projet
        </h1>
        <p className="text-lg text-gray-500">
          Une question sur nos offres ? Un besoin spécifique pour votre secteur ?
          Notre équipe vous répond sous 24h.
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 grid grid-cols-1 lg:grid-cols-5 gap-12">

        {/* Infos contact */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-gray-950 p-8 text-white">
            <h2 className="text-lg font-bold mb-6">Nos coordonnées</h2>

            <div className="space-y-5">
              {contactItems.map(({ icon: Icon, color, label, value, href, hoverColor }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    {href ? (
                      <a href={href} className={`text-sm font-medium text-white transition-colors ${hoverColor}`}>
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-white">{value}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Fallback si aucune coordonnée configurée */}
              {contactItems.length === 0 && (
                <p className="text-sm text-gray-500">Coordonnées non encore configurées.</p>
              )}
            </div>

            {settings?.contact_hours && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <p className="text-xs text-gray-500">Délai de réponse</p>
                </div>
                <p className="text-sm text-white/80">Sous 24h en semaine · {settings.contact_hours}</p>
              </div>
            )}
          </div>

          {/* Réseaux sociaux */}
          {(settings?.facebook_url || settings?.twitter_url || settings?.linkedin_url || settings?.instagram_url) && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Suivez-nous</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { url: settings?.facebook_url,  label: 'Facebook' },
                  { url: settings?.twitter_url,   label: 'X / Twitter' },
                  { url: settings?.linkedin_url,  label: 'LinkedIn' },
                  { url: settings?.instagram_url, label: 'Instagram' },
                ].filter((s) => s.url).map(({ url, label }) => (
                  <a
                    key={label}
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-ds-blue hover:text-ds-blue transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-ds-blue-light dark:bg-ds-blue/10 border border-ds-blue/20 dark:border-ds-blue/30 p-6">
            <p className="text-sm font-semibold text-ds-blue mb-2">Démo personnalisée</p>
            <p className="text-sm text-gray-600">
              Vous souhaitez une démo de 30 minutes pour votre secteur spécifique ?
              Mentionnez-le dans votre message.
            </p>
          </div>
        </div>

        {/* Formulaire */}
        <div className="lg:col-span-3">
          {sent ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <CheckCircleIcon className="h-16 w-16 text-ds-green mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Message envoyé !</h3>
              <p className="text-gray-500">
                Votre client email va s'ouvrir. Nous vous répondons sous 24h.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Mamadou Diallo"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 outline-none transition"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="vous@exemple.com"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Sujet
                </label>
                <input
                  id="subject"
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Question sur les tarifs, demande de démo…"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 outline-none transition"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Décrivez votre activité, vos besoins, vos questions…"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-ds-blue focus:ring-2 focus:ring-ds-blue/20 outline-none transition resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-ds-blue py-3.5 text-sm font-bold text-white hover:bg-ds-blue-dark transition-all shadow-lg shadow-ds-blue/20"
              >
                Envoyer le message →
              </button>

              <p className="text-xs text-gray-400 text-center">
                Vos données ne sont utilisées que pour vous répondre. Aucun spam.
              </p>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}
