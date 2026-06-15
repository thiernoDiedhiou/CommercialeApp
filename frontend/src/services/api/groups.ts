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

export async function updateGroup(uid: string, body: Partial<CreateGroupData>): Promise<Group> {
  const { data } = await apiClient.put<Group>(`/api/v1/groups/${uid}`, body)
  return data
}

export async function deleteGroup(uid: string): Promise<void> {
  await apiClient.delete(`/api/v1/groups/${uid}`)
}

export async function syncGroupPermissions(groupUid: string, permissionIds: number[]): Promise<Group> {
  const { data } = await apiClient.post<Group>(`/api/v1/groups/${groupUid}/permissions`, {
    permission_ids: permissionIds,
  })
  return data
}
