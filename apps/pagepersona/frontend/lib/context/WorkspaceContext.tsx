'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { workspaceApi } from '@/lib/api/client'

export interface Workspace {
  id: string
  name: string
  slug: string
  type: string
  owner_id: string
  parent_workspace_id: string | null
  white_label_logo: string | null
  white_label_brand_name: string | null
  white_label_primary_color: string
}

interface WorkspaceContextValue {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  setActiveWorkspaceId: (id: string) => void
  refreshWorkspaces: () => Promise<void>
  loading: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  activeWorkspace: null,
  setActiveWorkspaceId: () => {},
  refreshWorkspaces: async () => {},
  loading: true,
})

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshWorkspaces = useCallback(async () => {
    try {
      const res = await workspaceApi.list()
      const list: Workspace[] = res.data
      setWorkspaces(list)

      // Restore persisted active workspace or default to first
      const stored = typeof window !== 'undefined' ? localStorage.getItem('active_workspace_id') : null
      const found = stored ? list.find(w => w.id === stored) : null
      const active = found || list[0] || null
      if (active) {
        setActiveId(active.id)
        if (typeof window !== 'undefined') {
          localStorage.setItem('active_workspace_id', active.id)
        }
      }
    } catch {
      // Not logged in yet — ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (token) {
      refreshWorkspaces()
    } else {
      setLoading(false)
    }
  }, [refreshWorkspaces])

  function setActiveWorkspaceId(id: string) {
    setActiveId(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_workspace_id', id)
    }
  }

  const activeWorkspace = workspaces.find(w => w.id === activeId) || workspaces[0] || null

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setActiveWorkspaceId, refreshWorkspaces, loading }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
