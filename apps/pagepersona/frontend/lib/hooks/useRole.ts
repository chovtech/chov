'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'

export type UserRole = 'owner' | 'member' | 'client' | null

export function useRole(): { role: UserRole; loading: boolean } {
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const activeId = typeof window !== 'undefined' ? localStorage.getItem('active_workspace_id') : null
    if (!activeId) { setLoading(false); return }

    apiClient.get('/api/workspaces').then(res => {
      const workspaces: any[] = res.data
      const ws = workspaces.find(w => w.id === activeId)
      if (!ws) { setRole(null); setLoading(false); return }
      if (ws.type === 'client') {
        setRole('client')
      } else {
        setRole('owner')
      }
    }).catch(() => {
      setRole(null)
    }).finally(() => setLoading(false))
  }, [])

  return { role, loading }
}
