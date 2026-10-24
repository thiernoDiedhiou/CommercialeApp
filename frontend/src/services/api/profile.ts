import apiClient, { API } from '@/lib/axios'

export interface UpdateProfileData {
  name:                   string
  locale?:                string
  current_password?:      string
  password?:              string
  password_confirmation?: string
}

export interface ProfileResponse {
  id:     number
  name:   string
  email:  string
  locale: string | null
}

export async function updateProfile(data: UpdateProfileData): Promise<ProfileResponse> {
  const { data: res } = await apiClient.put<{ data: ProfileResponse }>(`${API}/auth/profile`, data)
  return res.data
}

export async function uploadAvatar(file: File): Promise<{ avatar: string }> {
  const form = new FormData()
  form.append('avatar', file)
  const { data } = await apiClient.post<{ avatar: string }>(`${API}/auth/avatar`, form, {
    headers: { 'Content-Type': undefined },
  })
  return data
}

export async function deleteAvatar(): Promise<void> {
  await apiClient.delete(`${API}/auth/avatar`)
}
