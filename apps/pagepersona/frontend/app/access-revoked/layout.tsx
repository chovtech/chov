'use client'

import { WorkspaceProvider } from '@/lib/context/WorkspaceContext'

export default function AccessRevokedLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>
}
