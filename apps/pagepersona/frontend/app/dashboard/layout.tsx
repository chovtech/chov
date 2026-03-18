'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/layouts/Sidebar'
import { authApi, authApiExtended } from '@/lib/api/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [emailVerified, setEmailVerified] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [resent, setResent] = useState(false)

  useEffect(() => {
    authApi.me().then(res => {
      setEmailVerified(res.data.email_verified)
      setUserEmail(res.data.email)
    }).catch(() => null)
  }, [])

  async function handleResend() {
    await authApiExtended.resendVerification(userEmail)
    setResent(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar />
      <div className="ml-64">
        {/* Email verification banner */}
        {!emailVerified && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-lg">⚠️</span>
              <p className="text-sm text-amber-800 font-medium">
                Please verify your email address to unlock all features.
              </p>
            </div>
            {resent ? (
              <span className="text-xs text-green-600 font-semibold flex-shrink-0">
                ✓ Verification email sent
              </span>
            ) : (
              <button
                onClick={handleResend}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 underline flex-shrink-0"
              >
                Resend verification email
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
