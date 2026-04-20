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
  onInsert: (url: string) => void
  onClose: () => void
  t: (key: string) => string
}

export default function AssetLibrary({ workspaceId, onInsert, onClose, t }: AssetLibraryProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    assetsApi.list(workspaceId)
      .then(res => setAssets(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId])

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const res = await assetsApi.upload(file, workspaceId)
      const newAsset: Asset = res.data
      // Prepend to grid and auto-select it
      setAssets(prev => [newAsset, ...prev])
      setSelectedUrl(newAsset.url)
    } catch {}
    setUploading(false)
  }

  const handleDelete = async (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation()
    setDeletingId(asset.id)
    if (selectedUrl === asset.url) setSelectedUrl(null)
    try {
      await assetsApi.delete(asset.id)
      setAssets(prev => prev.filter(a => a.id !== asset.id))
    } catch {}
    setDeletingId(null)
  }

  const handleInsert = () => {
    if (!selectedUrl) return
    onInsert(selectedUrl)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl"
        style={{ maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('library.title')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('library.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A56DB] text-white rounded-lg text-sm font-semibold hover:bg-[#1A56DB]/90 transition-colors disabled:opacity-60"
            >
              {uploading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                : <Icon name="cloud_upload" className="text-base" />
              }
              {uploading ? t('library.uploading') : t('library.upload_new')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Icon name="close" className="text-xl" />
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) uploadFile(f)
              e.target.value = ''
            }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-52">
              <div className="w-8 h-8 border-2 border-[#1A56DB] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : assets.length === 0 && !uploading ? (
            <div className="flex flex-col items-center justify-center h-52 gap-4 text-slate-400">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                <Icon name="photo_library" className="text-4xl text-slate-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600">{t('library.empty_heading')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('library.empty_sub')}</p>
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white rounded-lg text-sm font-semibold hover:bg-[#1A56DB]/90 transition-colors"
              >
                <Icon name="cloud_upload" className="text-base" />
                {t('library.upload_new')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {/* Uploading placeholder */}
              {uploading && (
                <div className="aspect-square rounded-xl border-2 border-dashed border-[#1A56DB]/40 bg-[#1A56DB]/5 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#1A56DB] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {assets.map(asset => {
                const isSelected = selectedUrl === asset.url
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedUrl(isSelected ? null : asset.url)}
                    title={asset.filename || ''}
                    className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all border-2 bg-slate-50 ${
                      isSelected
                        ? 'border-[#1A56DB] ring-2 ring-[#1A56DB]/30'
                        : 'border-slate-200 hover:border-[#1A56DB]/50'
                    }`}
                  >
                    <img
                      src={asset.url}
                      alt={asset.filename || ''}
                      className="w-full h-full object-cover"
                    />

                    {/* Selected overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#1A56DB]/10 flex items-center justify-center">
                        <div className="w-8 h-8 bg-[#1A56DB] rounded-full flex items-center justify-center shadow-lg">
                          <Icon name="check" className="text-white text-sm" />
                        </div>
                      </div>
                    )}

                    {/* Hover overlay (non-selected) */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={e => handleDelete(e, asset)}
                      disabled={deletingId === asset.id}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm disabled:opacity-60 z-10"
                    >
                      {deletingId === asset.id
                        ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        : <Icon name="close" className="text-xs" />
                      }
                    </button>

                    {/* Size badge */}
                    {asset.size && (
                      <div className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                        {(asset.size / 1024).toFixed(0)}KB
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer — Insert button */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <p className="text-xs text-slate-400">
            {selectedUrl ? t('library.image_selected') : t('library.click_to_select')}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="button"
              onClick={handleInsert}
              disabled={!selectedUrl}
              className="px-5 py-2 bg-[#1A56DB] text-white rounded-lg text-sm font-semibold hover:bg-[#1A56DB]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('library.insert')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
