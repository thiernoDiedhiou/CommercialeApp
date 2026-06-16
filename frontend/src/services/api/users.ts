import apiClient from '@/lib/axios'
import type { PaginatedResponse, UserWithGroups, CreateUserData, UpdateUserData } from '@/types'

function clean(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

export async function getUsers(params: {
  search?: string
  is_active?: boolean
  page?: number
} = {}): Promise<PaginatedResponse<UserWithGroups>> {
  const { data } = await apiClient.get<PaginatedResponse<UserWithGroups>>('/api/v1/users', {
    params: clean(params as Record<string, unknown>),
  })
  return data
}

export async function createUser(body: CreateUserData): Promise<UserWithGroups> {
  const { data } = await apiClient.post<UserWithGroups>('/api/v1/users', body)
  return data
}

export async function updateUser(uid: string, body: UpdateUserData): Promise<UserWithGroups> {
  const { data } = await apiClient.put<UserWithGroups>(`/api/v1/users/${uid}`, body)
  return data
}

export async function deleteUser(uid: string): Promise<void> {
  await apiClient.delete(`/api/v1/users/${uid}`)
}

export async function syncUserGroups(userUid: string, groupIds: number[]): Promise<UserWithGroups> {
  const { data } = await apiClient.post<UserWithGroups>(`/api/v1/users/${userUid}/groups`, {
    group_ids: groupIds,
  })
  return data
}
