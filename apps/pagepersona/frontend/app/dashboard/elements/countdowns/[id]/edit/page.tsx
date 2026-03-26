'use client'

import { useParams } from 'next/navigation'
import CountdownBuilder from '../../CountdownBuilder'

export default function EditCountdownPage() {
  const params = useParams()
  return <CountdownBuilder countdownId={params.id as string} />
}
