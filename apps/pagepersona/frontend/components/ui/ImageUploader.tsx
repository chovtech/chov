'use client'

import { useState, useRef } from 'react'
import { apiClient, assetsApi } from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/useTranslation'
import AssetLibrary from '@/components/ui/AssetLibrary'

interface ImageUploaderProps {
  value: string
  onChange: (url: string) => void
  placeholder?: string
  workspaceId?: string
}

export default function ImageUploader({ value, onChange, placeholder, workspaceId }: ImageUploaderProps) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      let url: string
      if (workspaceId) {
        const res = await assetsApi.upload(file, workspaceId)
        url = res.data.url
      } else {
        const formData = new FormData()
        formData.append('file', file)
        const res = await apiClient.post('/api/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        url = res.data.url
      }
      onChange(url)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
          <img src={value} alt="Preview" className="w-full h-32 object-cover" />
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-6 h-6 bg-slate-900/70 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors text-xs"
          >✕</button>
        </div>
      )}
      {!value && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${dragOver ? 'border-[#1A56DB] bg-[#1A56DB]/5' : 'border-slate-200 hover:border-[#1A56DB]/50 hover:bg-slate-50'}`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-[#1A56DB] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-400 text-xl">cloud_upload</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Drop image here or click to upload</p>
                  <p className="text-xs text-slate-400 mt-0.5">JPEG, PNG, GIF, WebP — max 10MB</p>
                </div>
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>

          {workspaceId && (
            <button
              type="button"
              onClick={() => setShowLibrary(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-[#1A56DB]/50 transition-colors"
            >
              <span className="material-symbols-outlined text-base text-slate-400">photo_library</span>
              {t('library.pick')}
            </button>
          )}
        </>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">or paste URL</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <input type="url" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'https://your-image-url.com/image.jpg'}
        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1A56DB] transition-all" />
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">error</span>{error}
        </p>
      )}

      {showLibrary && workspaceId && (
        <AssetLibrary
          workspaceId={workspaceId}
          onSelect={onChange}
          onClose={() => setShowLibrary(false)}
          t={t}
        />
      )}
    </div>
  )
}
