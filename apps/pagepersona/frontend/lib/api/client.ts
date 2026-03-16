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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API calls
export const authApi = {
  signup: (data: { email: string; password: string; name: string }) =>
    apiClient.post('/api/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/api/auth/login', data),

  me: () =>
    apiClient.get('/api/auth/me'),

  logout: () =>
    apiClient.post('/api/auth/logout'),
}
