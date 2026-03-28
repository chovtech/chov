import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach token to every request automatically
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle 401 — token expired, redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/signup')
      if (!isAuthEndpoint && typeof window !== 'undefined') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        document.cookie = 'access_token=; path=/; max-age=0'
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API calls
export const authApi = {
  signup: (data: { email: string; password: string; name: string; language?: string }) =>
    apiClient.post('/api/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/api/auth/login', data),

  me: () =>
    apiClient.get('/api/auth/me'),

  logout: () =>
    apiClient.post('/api/auth/logout'),
}

// User API calls
export const userApi = {
  updateProfile: (data: { name?: string; email?: string }) =>
    apiClient.put('/api/users/profile', data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    apiClient.put('/api/users/password', data),

  forgotPassword: (email: string) =>
    apiClient.post('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, new_password: string) =>
    apiClient.post('/api/auth/reset-password', { token, new_password }),
}

// Extended auth API
export const authApiExtended = {
  verifyEmail: (token: string) =>
    apiClient.post('/api/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    apiClient.post('/api/auth/resend-verification', { email }),

  requestMagicLink: (email: string) =>
    apiClient.post('/api/auth/magic-link', { email }),

  verifyMagicLink: (token: string) =>
    apiClient.post('/api/auth/magic-link/verify', { token }),
}

// Projects API
export const projectApi = {
  create: (data: { name: string; page_url: string; platform: string; workspace_id?: string }) =>
    apiClient.post('/api/projects', data),
  list: (workspaceId?: string) =>
    apiClient.get('/api/projects', { params: workspaceId ? { workspace_id: workspaceId } : {} }),
  get: (id: string) =>
    apiClient.get(`/api/projects/${id}`),
  update: (id: string, data: { name?: string; status?: string; script_verified?: boolean; page_url?: string; thumbnail_url?: string }) =>
    apiClient.put(`/api/projects/${id}`, data),
  delete: (id: string) =>
    apiClient.delete(`/api/projects/${id}`),
}

// Workspace API
export const workspaceApi = {
  list: () =>
    apiClient.get('/api/workspaces'),
  create: (data: {
    name: string
    type?: string
    parent_workspace_id?: string
    client_name?: string
    client_email?: string
    client_access_level?: string
  }) =>
    apiClient.post('/api/workspaces', data),
  get: (id: string) =>
    apiClient.get(`/api/workspaces/${id}`),
  update: (id: string, data: {
    name?: string
    white_label_brand_name?: string
    white_label_logo?: string
    white_label_primary_color?: string
    custom_domain?: string
    client_name?: string
    client_email?: string
    client_access_level?: string
  }) =>
    apiClient.patch(`/api/workspaces/${id}`, data),
  delete: (id: string) =>
    apiClient.delete(`/api/workspaces/${id}`),
  listClients: (id: string) =>
    apiClient.get(`/api/workspaces/${id}/clients`),
  verifyDomain: (id: string) =>
    apiClient.post(`/api/workspaces/${id}/verify-domain`),
}

// Team API
export const teamApi = {
  list: () =>
    apiClient.get('/api/team'),
  invite: (data: { email: string; role?: string }) =>
    apiClient.post('/api/team/invite', data),
  updateRole: (memberId: string, role: string) =>
    apiClient.patch(`/api/team/${memberId}/role`, { role }),
  remove: (memberId: string) =>
    apiClient.delete(`/api/team/${memberId}`),
}

// Clients API
export const clientsApi = {
  invite: (data: { client_email: string; workspace_id: string }) =>
    apiClient.post('/api/clients/invite', data),
  inviteInfo: (token: string) =>
    apiClient.get(`/api/clients/invite-info?token=${encodeURIComponent(token)}`),
  accept: (data: { token: string; name: string; password: string }) =>
    apiClient.post('/api/clients/accept', data),
  revoke: (workspaceId: string) =>
    apiClient.delete(`/api/clients/${workspaceId}/revoke`),
  sendReport: (data: { workspace_id: string; client_workspace_id: string; message?: string }) =>
    apiClient.post('/api/clients/report', data),
}

// Rules API
export const rulesApi = {
  create: (projectId: string, data: { name: string; conditions: any[]; condition_operator: string; actions: any[]; priority?: number }) =>
    apiClient.post(`/api/projects/${projectId}/rules`, data),
  list: (projectId: string) =>
    apiClient.get(`/api/projects/${projectId}/rules`),
  get: (projectId: string, ruleId: string) =>
    apiClient.get(`/api/projects/${projectId}/rules/${ruleId}`),
  update: (projectId: string, ruleId: string, data: any) =>
    apiClient.put(`/api/projects/${projectId}/rules/${ruleId}`, data),
  delete: (projectId: string, ruleId: string) =>
    apiClient.delete(`/api/projects/${projectId}/rules/${ruleId}`),
}
