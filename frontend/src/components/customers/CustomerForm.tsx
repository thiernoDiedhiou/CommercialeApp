import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import PhoneInput from '@/components/ui/PhoneInput'
import type { Customer } from '@/types'

export const customerSchema = z.object({
  name:    z.string().min(2, 'Au moins 2 caractères'),
  country: z.string().length(2).default('SN'),
  phone:   z.string().optional(),
  email:   z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().optional(),
  notes:   z.string().optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>

interface CustomerFormProps {
  formId: string
  customer?: Customer | null
  onSubmit: (values: CustomerFormValues) => void
}

export default function CustomerForm({ formId, customer, onSubmit }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: '', country: 'SN', phone: '', email: '', address: '', notes: '' },
  })

  useEffect(() => {
    reset({
      name:    customer?.name    ?? '',
      country: customer?.country ?? 'SN',
      phone:   customer?.phone   ?? '',
      email:   customer?.email   ?? '',
      address: customer?.address ?? '',
      notes:   customer?.notes   ?? '',
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

      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <Controller
            name="country"
            control={control}
            render={({ field: countryField }) => (
              <PhoneInput
                label="Téléphone"
                country={countryField.value}
                onCountryChange={countryField.onChange}
                phoneProps={{
                  value: field.value ?? '',
                  onChange: field.onChange,
                  onBlur: field.onBlur,
                  name: field.name,
                }}
                error={errors.phone?.message}
              />
            )}
          />
        )}
      />

      <Input
        label="Email"
        type="email"
        placeholder="contact@example.sn"
        error={errors.email?.message}
        {...register('email')}
      />

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
