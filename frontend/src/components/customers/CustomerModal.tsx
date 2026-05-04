import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCustomer, updateCustomer } from '@/services/api/customers'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import type { Customer } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Au moins 2 caractères'),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  customer?: Customer | null
}

export default function CustomerModal({ isOpen, onClose, customer }: CustomerModalProps) {
  const qc = useQueryClient()
  const isEdit = !!customer

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (isOpen) {
      reset(
        customer
          ? {
              name: customer.name,
              phone: customer.phone ?? '',
              email: customer.email ?? '',
              address: customer.address ?? '',
              notes: customer.notes ?? '',
            }
          : { name: '', phone: '', email: '', address: '', notes: '' },
      )
    }
  }, [isOpen, customer, reset])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = {
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        notes: values.notes || null,
      }
      return isEdit ? updateCustomer(customer!.id, body) : createCustomer(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      if (isEdit) qc.invalidateQueries({ queryKey: ['customer', customer!.id] })
      onClose()
    },
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Modifier le client' : 'Nouveau client'}
      size="md"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="customer-form"
            loading={mutation.isPending}
          >
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form
        id="customer-form"
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4"
      >
        <Input
          label="Nom complet"
          placeholder="Mamadou Diallo"
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Téléphone"
            placeholder="+221 77 000 00 00"
            error={errors.phone?.message}
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
          {...register('notes')}
        />
        {mutation.isError && (
          <p className="text-sm text-red-600">Une erreur est survenue. Veuillez réessayer.</p>
        )}
      </form>
    </Modal>
  )
}
