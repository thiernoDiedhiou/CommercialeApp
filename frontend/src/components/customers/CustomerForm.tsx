import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import type { Customer } from '@/types'

export const customerSchema = z.object({
  name: z.string().min(2, 'Au moins 2 caractères'),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^(\+221\s?)?[0-9\s]{7,15}$/.test(v),
      'Format : +221 77 000 00 00',
    ),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>

interface CustomerFormProps {
  /** id HTML du <form> — lié au bouton submit externe via form="…" */
  formId: string
  customer?: Customer | null
  onSubmit: (values: CustomerFormValues) => void
}

export default function CustomerForm({ formId, customer, onSubmit }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    },
  })

  // Préremplissage quand le client change (mode édition ou réouverture du modal)
  useEffect(() => {
    reset({
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
      address: customer?.address ?? '',
      notes: customer?.notes ?? '',
    })
  }, [customer, reset])

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nom complet"
        placeholder="Mamadou Diallo"
        error={errors.name?.message}
        autoFocus
        {...register('name')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Téléphone"
          placeholder="+221 77 000 00 00"
          error={errors.phone?.message}
          hint="Format Sénégal recommandé"
          {...register('phone')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="contact@example.sn"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <Input
        label="Adresse"
        placeholder="Dakar, Médina…"
        {...register('address')}
      />

      <Textarea
        label="Notes"
        placeholder="Informations complémentaires…"
        rows={3}
        {...register('notes')}
      />
    </form>
  )
}
