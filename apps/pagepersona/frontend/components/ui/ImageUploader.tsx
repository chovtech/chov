'use client'

import { useState, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/useTranslation'
import AssetLibrary from '@/components/ui/AssetLibrary'
import ImageGenerator from '@/components/ui/ImageGenerator'

interface ImageUploaderProps {
  value: string
  onChange: (url: string) => void
  placeholder?: string
  /** Pass workspaceId to enable the library flow. Omit for user-level uploads (avatar). */
  workspaceId?: string
  /** Pass projectId when the uploader is inside a project context (rules, picker). Omit in popup/workspace context to show project selector inside the generator. */
  projectId?: string
}

export default function ImageUploader({ value, onChange, placeholder, workspaceId, projectId }: ImageUploaderProps) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Direct upload — only used when workspaceId is NOT set (avatar)
  const handleDirectUpload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiClient.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(res.data.url)
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
    if (!file) return
    // Library flow: drop opens library and triggers upload inside
    if (workspaceId) {
      setShowLibrary(true)
    } else {
      handleDirectUpload(file)
    }
  }

  const handleZoneClick = () => {
    if (workspaceId) {
      setShowLibrary(true)
    } else {
      inputRef.current?.click()
    }
  }

  return (
    <div className="space-y-2">

      {/* Preview with Change / Remove overlay */}
      {value && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
          <img src={value} alt="Preview" className="w-full h-36 object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={handleZoneClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-semibold shadow-sm hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">
                {workspaceId ? 'photo_library' : 'cloud_upload'}
              </span>
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-semibold shadow-sm hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Remove
            </button>
          </div>
          {/* Avatar-only: hidden file input for Change */}
          {!workspaceId && (
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleDirectUpload(f) }}
            />
          )}
        </div>
      )}

      {/* Upload zone — shown when no value */}
      {!value && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={handleZoneClick}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-[#00AE7E] bg-[#00AE7E]/5'
              : 'border-slate-200 hover:border-[#00AE7E]/50 hover:bg-slate-50'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#00AE7E] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400 text-xl">
                  {workspaceId ? 'photo_library' : 'cloud_upload'}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {workspaceId ? t('library.open') : 'Drop image here or click to upload'}
              </p>
              <p className="text-xs text-slate-400">
                {workspaceId
                  ? 'Pick from your library or upload a new image'
                  : 'JPEG, PNG, GIF, WebP — max 10MB'}
              </p>
            </div>
          )}

          {/* Direct file input — only when no workspaceId */}
          {!workspaceId && (
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleDirectUpload(f) }}
            />
          )}
        </div>
      )}

      {/* Paste URL */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">or paste URL</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <input
        type="url"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'https://your-image-url.com/image.jpg'}
        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00AE7E] transition-all"
      />

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </p>
      )}

      {showLibrary && workspaceId && (
        <AssetLibrary
          workspaceId={workspaceId}
          onInsert={onChange}
          onClose={() => setShowLibrary(false)}
          t={t}
        />
      )}

      {/* AI Image Generator — only available in workspace context */}
      {workspaceId && (
        <ImageGenerator
          workspaceId={workspaceId}
          projectId={projectId}
          existingImageUrl={value || undefined}
          onInsert={onChange}
        />
      )}
    </div>
  )
}
