import apiClient from '@/lib/axios'

export interface UpdateProfileData {
  name:                   string
  current_password?:      string
  password?:              string
  password_confirmation?: string
}

export interface ProfileResponse {
  id:    number
  name:  string
  email: string
}

export async function updateProfile(data: UpdateProfileData): Promise<ProfileResponse> {
  const { data: res } = await apiClient.put<{ data: ProfileResponse }>('/api/v1/auth/profile', data)
  return res.data
}
