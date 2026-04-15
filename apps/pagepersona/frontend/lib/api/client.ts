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

// Handle 401 — try refresh first, only redirect to login if refresh fails
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url || ''
    const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/signup') || url.includes('/api/auth/refresh')

    if (error.response?.status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refresh_token')

      if (!refreshToken) {
        // No refresh token — clear and redirect
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        document.cookie = 'access_token=; path=/; max-age=0'
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Another refresh is in flight — queue this request
        return new Promise((resolve) => {
          refreshQueue.push((newToken: string) => {
            error.config.headers.Authorization = `Bearer ${newToken}`
            resolve(apiClient(error.config))
          })
        })
      }

      isRefreshing = true
      try {
        const res = await axios.post(`${API_URL}/api/auth/refresh`, { refresh_token: refreshToken })
        const newAccessToken = res.data.access_token
        localStorage.setItem('access_token', newAccessToken)
        document.cookie = `access_token=${newAccessToken}; path=/; max-age=${60 * 60 * 24 * 30}`
        // Flush queued requests
        refreshQueue.forEach((cb) => cb(newAccessToken))
        refreshQueue = []
        // Retry the original request
        error.config.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(error.config)
      } catch {
        // Refresh failed — clear everything and redirect
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        document.cookie = 'access_token=; path=/; max-age=0'
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
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
  downloadWordPressPlugin: async (id: string) => {
    const res = await apiClient.get(`/api/projects/${id}/wordpress-plugin`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    const disposition = res.headers['content-disposition'] || ''
    const match = disposition.match(/filename="?([^"]+)"?/)
    a.download = match ? match[1] : 'pagepersona-plugin.zip'
    a.click()
    window.URL.revokeObjectURL(url)
  },
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
    white_label_logo?: string | null
    white_label_icon?: string | null
    white_label_primary_color?: string
    hide_powered_by?: boolean
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
  list: (workspaceId?: string) =>
    apiClient.get(workspaceId ? `/api/team?workspace_id=${workspaceId}` : '/api/team'),
  invite: (data: { email: string; role?: string; workspace_id?: string }) =>
    apiClient.post('/api/team/invite', data),
  resend: (memberId: string) =>
    apiClient.post(`/api/team/${memberId}/resend`, {}),
  updateRole: (memberId: string, role: string) =>
    apiClient.patch(`/api/team/${memberId}/role`, { role }),
  remove: (memberId: string) =>
    apiClient.delete(`/api/team/${memberId}`),
  inviteInfo: (token: string) =>
    apiClient.get(`/api/team/invite-info?token=${token}`),
  accept: (data: { token: string; name?: string; password?: string }) =>
    apiClient.post('/api/team/accept', data),
}

// Clients API
export const clientsApi = {
  invite: (data: { client_email: string; workspace_id: string; client_workspace_id?: string }) =>
    apiClient.post('/api/clients/invite', data),
  inviteInfo: (token: string) =>
    apiClient.get(`/api/clients/invite-info?token=${encodeURIComponent(token)}`),
  accept: (data: { token: string; name?: string; password?: string }) =>
    apiClient.post('/api/clients/accept', data),
  revoke: (workspaceId: string) =>
    apiClient.delete(`/api/clients/${workspaceId}/revoke`),
  restore: (workspaceId: string) =>
    apiClient.post(`/api/clients/${workspaceId}/restore`),
  accessStatus: () =>
    apiClient.get('/api/clients/access-status'),
  joinInfo: (params: { slug?: string; domain?: string }) =>
    apiClient.get('/api/clients/join-info', { params }),
  selfSignup: (data: { slug: string; name: string; email: string; password: string }) =>
    apiClient.post('/api/clients/self-signup', data),
  sendReport: (data: { workspace_id: string; client_workspace_id: string; message?: string }) =>
    apiClient.post('/api/clients/report', data),
}

// Assets (Media Library) API
export const assetsApi = {
  upload: (file: File, workspaceId: string) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post(`/api/assets/upload?workspace_id=${workspaceId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: (workspaceId: string) =>
    apiClient.get(`/api/assets?workspace_id=${workspaceId}`),
  delete: (id: string) =>
    apiClient.delete(`/api/assets/${id}`),
}

// AI API
export const aiApi = {
  getCoins: (workspaceId?: string) =>
    apiClient.get('/api/ai/coins', { params: workspaceId ? { workspace_id: workspaceId } : {} }),
  getCoinHistory: (workspaceId?: string, limit = 20) =>
    apiClient.get('/api/ai/coins/history', { params: { ...(workspaceId ? { workspace_id: workspaceId } : {}), limit } }),
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
