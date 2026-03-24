'use client'

import { useParams } from 'next/navigation'
import PopupBuilder from '../../PopupBuilder'

export default function EditPopupPage() {
  const { id } = useParams()
  return <PopupBuilder popupId={id as string} />
}
