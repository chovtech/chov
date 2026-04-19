'use client'

import { useState, useEffect } from 'react'
import { billingApi } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'

const UPGRADE_HREF = 'https://usepagepersona.com/upgrade'

const NEXT_PLAN_LABEL: Record<string, string> = {
  trial:        'Core',
  fe:           'Unlimited',
  unlimited:    'Professional',
  professional: 'Agency',
  agency:       'Self-Hosted',
}

interface UsageEntry { used: number; limit: number | null }

interface PlanUsage {
  projects: UsageEntry
  popups: UsageEntry
  countdowns: UsageEntry
  rules_per_project: { used: null; limit: number | null }
  client_accounts: UsageEntry
}

export function usePlanLimits() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { activeWorkspace } = useWorkspace()

  useEffect(() => {
    setLoading(true)
    billingApi.summary()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [activeWorkspace?.id])

  const plan: string = data?.plan ?? 'trial'
  const usage: PlanUsage | null = data?.usage ?? null

  function isAtLimit(resource: string): boolean {
    if (!usage) return false
    const u = (usage as any)[resource]
    if (!u || u.limit === null) return false
    return u.used >= u.limit
  }

  function limitOf(resource: string): number | null {
    if (!usage) return null
    return (usage as any)[resource]?.limit ?? null
  }

  function usedOf(resource: string): number {
    if (!usage) return 0
    return (usage as any)[resource]?.used ?? 0
  }

  // Returns the message and optional href to show when a resource is at limit.
  // Accounts for who the current user is (owner vs team vs client).
  function gateMessage(resource: string): { text: string; href?: string } | null {
    if (!isAtLimit(resource)) return null
    const role = activeWorkspace?.member_role

    if (role === 'owner') {
      const next = NEXT_PLAN_LABEL[plan]
      return next
        ? { text: `Upgrade to ${next} to get more`, href: UPGRADE_HREF }
        : null
    }
    if (role === 'client') {
      return { text: 'Contact your agency to increase this limit.' }
    }
    // team member or admin
    return { text: 'Ask the workspace owner to upgrade the plan.' }
  }

  return { plan, usage, isAtLimit, limitOf, usedOf, gateMessage, loading }
}
