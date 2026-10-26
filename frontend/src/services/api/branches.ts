import apiClient, { API } from '@/lib/axios'
import type { Branch } from '@/types'

export interface CreateBranchData {
  name: string
  type: 'sync' | 'warehouse'
  address?: string | null
  phone?: string | null
  display_order?: number
}

export interface UpdateBranchData {
  name?: string
  type?: 'principal' | 'sync' | 'warehouse'
  address?: string | null
  phone?: string | null
  is_active?: boolean
  display_order?: number
}

export async function getBranches(): Promise<Branch[]> {
  const res = await apiClient.get<{ data: Branch[] }>(`${API}/branches`)
  return res.data.data
}

export async function getBranch(uid: string): Promise<Branch> {
  const res = await apiClient.get<{ data: Branch }>(`${API}/branches/${uid}`)
  return res.data.data
}

export async function createBranch(data: CreateBranchData): Promise<Branch> {
  const res = await apiClient.post<{ data: Branch }>(`${API}/branches`, data)
  return res.data.data
}

export async function updateBranch(uid: string, data: UpdateBranchData): Promise<Branch> {
  const res = await apiClient.put<{ data: Branch }>(`${API}/branches/${uid}`, data)
  return res.data.data
}

export async function deleteBranch(uid: string): Promise<void> {
  await apiClient.delete(`${API}/branches/${uid}`)
}

export async function getUserBranches(userUid: string): Promise<Branch[]> {
  const res = await apiClient.get<{ data: Branch[] }>(`${API}/users/${userUid}/branches`)
  return res.data.data
}

export async function syncUserBranches(userUid: string, branchUids: string[]): Promise<void> {
  await apiClient.post(`${API}/users/${userUid}/branches`, { branch_uids: branchUids })
}
