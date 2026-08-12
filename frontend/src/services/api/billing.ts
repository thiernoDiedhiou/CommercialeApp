import apiClient from '@/lib/axios'

export interface BillingTransaction {
  id          : number
  provider    : string
  billing_cycle: 'monthly' | 'yearly'
  amount      : number
  currency    : string
  status      : 'pending' | 'completed' | 'failed' | 'cancelled'
  created_at  : string
  plan        : { id: number; name: string } | null
}

export async function initiateRenewal(
  planUid     : string,
  billingCycle: 'monthly' | 'yearly',
): Promise<{ checkout_url: string }> {
  const { data } = await apiClient.post<{ data: { checkout_url: string } }>(
    '/api/v1/billing/initiate',
    { plan_uid: planUid, billing_cycle: billingCycle },
  )
  return data.data
}

export async function getBillingTransactions(): Promise<{
  data        : BillingTransaction[]
  current_page: number
  last_page   : number
  total       : number
}> {
  const { data } = await apiClient.get('/api/v1/billing/transactions')
  return data
}
