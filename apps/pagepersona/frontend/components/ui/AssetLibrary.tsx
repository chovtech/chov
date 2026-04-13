'use client'

import { useState, useEffect, useRef } from 'react'
import { assetsApi } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

interface Asset {
  id: string
  url: string
  filename: string | null
  size: number | null
  mime_type: string | null
  created_at: string
}

interface AssetLibraryProps {
  workspaceId: string
  onSelect: (url: string) => void
  onClose: () => void
  t: (key: string) => string
}

export default function AssetLibrary({ workspaceId, onSelect, onClose, t }: AssetLibraryProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    assetsApi.list(workspaceId)
      .then(res => setAssets(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const res = await assetsApi.upload(file, workspaceId)
      setAssets(prev => [res.data, ...prev])
      onSelect(res.data.url)
      onClose()
    } catch {}
    setUploading(false)
  }

  const handleDelete = async (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation()
    setDeletingId(asset.id)
    try {
      await assetsApi.delete(asset.id)
      setAssets(prev => prev.filter(a => a.id !== asset.id))
    } catch {}
    setDeletingId(null)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t('library.title')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('library.select_or_upload')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A56DB] text-white rounded-lg text-sm font-medium hover:bg-[#1A56DB]/90 transition-colors disabled:opacity-60"
            >
              {uploading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Icon name="cloud_upload" className="text-base" />
              }
              {t('library.upload_new')}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <Icon name="close" className="text-xl" />
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-[#1A56DB] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
              <Icon name="photo_library" className="text-5xl" />
              <p className="text-sm">{t('library.empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {assets.map(asset => (
                <div
                  key={asset.id}
                  className="group relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 cursor-pointer hover:border-[#1A56DB] transition-colors bg-slate-50"
                  onClick={() => { onSelect(asset.url); onClose() }}
                  title={asset.filename || ''}
                >
                  <img src={asset.url} alt={asset.filename || ''} className="w-full h-full object-cover" />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-[#1A56DB]/0 group-hover:bg-[#1A56DB]/10 transition-colors" />

                  {/* Select check */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 bg-[#1A56DB] rounded-full flex items-center justify-center shadow-lg">
                      <Icon name="check" className="text-white text-sm" />
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={e => handleDelete(e, asset)}
                    disabled={deletingId === asset.id}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm disabled:opacity-60 z-10"
                  >
                    {deletingId === asset.id
                      ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      : <Icon name="close" className="text-xs" />
                    }
                  </button>

                  {/* File size badge */}
                  {asset.size && (
                    <div className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      {(asset.size / 1024).toFixed(0)}KB
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
