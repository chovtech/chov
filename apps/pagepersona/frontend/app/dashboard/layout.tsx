'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layouts/Sidebar'
import { authApi, authApiExtended } from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { WorkspaceProvider, useWorkspace } from '@/lib/context/WorkspaceContext'
import { WhiteLabelProvider } from '@/lib/context/WhiteLabelContext'

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { isRevoked, loading: wsLoading } = useWorkspace()
  const [emailVerified, setEmailVerified] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    authApi.me().then(res => {
      setEmailVerified(res.data.email_verified)
      setUserEmail(res.data.email)
    }).catch(() => null)
  }, [])

  useEffect(() => {
    if (!wsLoading && isRevoked) {
      router.replace('/access-revoked')
    }
  }, [wsLoading, isRevoked, router])

  async function handleResend() {
    setResending(true)
    try {
      await authApiExtended.resendVerification(userEmail)
      setResent(true)
    } finally {
      setResending(false)
    }
  }

  if (!wsLoading && isRevoked) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar />
      <div className="ml-64">
        {!emailVerified && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-lg">⚠️</span>
              <p className="text-sm text-amber-800 font-medium">{t('verification.banner')}</p>
            </div>
            {resent ? (
              <span className="text-xs text-green-600 font-semibold flex-shrink-0 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
                {t('verification.sent')}
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 underline flex-shrink-0 disabled:opacity-60"
              >
                {resending ? (
                  <>
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {t('verification.resending')}
                  </>
                ) : t('verification.resend')}
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
    <WhiteLabelProvider>
      <DashboardInner>{children}</DashboardInner>
    </WhiteLabelProvider>
    </WorkspaceProvider>
  )
}
