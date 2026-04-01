'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/lib/context/WorkspaceContext'
import Icon from '@/components/ui/Icon'

export default function AccessRevokedPage() {
  const router = useRouter()
  const { isRevoked, revokedByAgency, loading } = useWorkspace()

  useEffect(() => {
    if (!loading && !isRevoked) {
      router.replace('/dashboard')
    }
  }, [loading, isRevoked, router])

  function handleLogout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('active_workspace_id')
    }
    router.push('/login')
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <Icon name="block" className="text-4xl text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">Access Revoked</h1>
        <p className="text-slate-500 mb-2 leading-relaxed">
          Your access to{' '}
          <span className="font-semibold text-slate-700">
            {revokedByAgency || 'your workspace'}
          </span>{' '}
          has been revoked.
        </p>
        <p className="text-slate-400 text-sm mb-8">
          Contact your agency if you believe this is a mistake.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors mx-auto"
        >
          <Icon name="logout" className="text-base" />
          Log Out
        </button>
      </div>
    </div>
  )
}
