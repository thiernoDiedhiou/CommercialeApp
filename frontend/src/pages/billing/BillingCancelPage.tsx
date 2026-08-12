import { useNavigate } from 'react-router-dom'
import { XCircleIcon } from '@heroicons/react/24/outline'

export default function BillingCancelPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-8 text-center">
        <XCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Paiement annulé
        </h1>
        <p className="text-gray-500 mb-6">
          Votre paiement a été annulé. Votre abonnement n'a pas été modifié.
          Vous pouvez réessayer à tout moment.
        </p>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="w-full rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Retour aux paramètres
        </button>
      </div>
    </div>
  )
}
