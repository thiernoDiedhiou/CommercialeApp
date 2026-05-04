import apiClient from '@/lib/axios'
import type { Group, Permission, CreateGroupData } from '@/types'

export async function getGroups(): Promise<Group[]> {
  const { data } = await apiClient.get<{ data: Group[] }>('/api/v1/groups')
  return data.data
}

export async function getAvailablePermissions(): Promise<Record<string, Permission[]>> {
  const { data } = await apiClient.get<{ data: Record<string, Permission[]> }>(
    '/api/v1/groups/permissions/available',
  )
  return data.data
}

export async function createGroup(body: CreateGroupData): Promise<Group> {
  const { data } = await apiClient.post<Group>('/api/v1/groups', body)
  return data
}

export async function updateGroup(id: number, body: Partial<CreateGroupData>): Promise<Group> {
  const { data } = await apiClient.put<Group>(`/api/v1/groups/${id}`, body)
  return data
}

export async function deleteGroup(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/groups/${id}`)
}

export async function syncGroupPermissions(groupId: number, permissionIds: number[]): Promise<Group> {
  const { data } = await apiClient.post<Group>(`/api/v1/groups/${groupId}/permissions`, {
    permission_ids: permissionIds,
  })
  return data
}
