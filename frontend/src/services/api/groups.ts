import apiClient, { API } from '@/lib/axios'
import type { Group, Permission, CreateGroupData } from '@/types'

export async function getGroups(): Promise<Group[]> {
  const { data } = await apiClient.get<{ data: Group[] }>(`${API}/groups`)
  return data.data
}

export async function getAvailablePermissions(): Promise<Record<string, Permission[]>> {
  const { data } = await apiClient.get<{ data: Record<string, Permission[]> }>(
    `${API}/groups/permissions/available`,
  )
  return data.data
}

export async function createGroup(body: CreateGroupData): Promise<Group> {
  const { data } = await apiClient.post<Group>(`${API}/groups`, body)
  return data
}

export async function updateGroup(uid: string, body: Partial<CreateGroupData>): Promise<Group> {
  const { data } = await apiClient.put<Group>(`${API}/groups/${uid}`, body)
  return data
}

export async function deleteGroup(uid: string): Promise<void> {
  await apiClient.delete(`${API}/groups/${uid}`)
}

export async function syncGroupPermissions(groupUid: string, permissionIds: number[]): Promise<Group> {
  const { data } = await apiClient.post<Group>(`${API}/groups/${groupUid}/permissions`, {
    permission_ids: permissionIds,
  })
  return data
}
