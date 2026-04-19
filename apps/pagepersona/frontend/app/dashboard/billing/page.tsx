'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BillingRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings_active_tab', 'billing')
    }
    router.replace('/dashboard/settings')
  }, [])
  return null
}
