'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Sidebar from '@/components/layouts/Sidebar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { apiClient } from '@/lib/api/client'

interface Popup {
  id: string
  name: string
  status: string
  config: any
  created_at: string
  updated_at: string
}

function getPopupPreviewImage(config: any): string | null {
  if (!config) return null
  const scan = (blocks: any[]): string | null => {
    for (const b of (blocks || [])) {
      if (b.image_url) return b.image_url
      if (b.col_left) { const r = scan(b.col_left); if (r) return r }
      if (b.col_right) { const r = scan(b.col_right); if (r) return r }
    }
    return null
  }
  return scan(config.blocks || [])
}

export default function ElementsPage() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [tab, setTab] = useState('popups')
  const [popups, setPopups] = useState<Popup[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    apiClient.get('/api/popups')
      .then(res => setPopups(res.data))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await apiClient.delete('/api/popups/' + deleteId)
      setPopups(prev => prev.filter(p => p.id !== deleteId))
      setDeleteId(null)
    } catch {
      alert(t('elements.popup_delete_failed'))
    } finally { setDeleting(false) }
  }

  const handleToggleStatus = async (popup: Popup) => {
    const newStatus = popup.status === 'published' ? 'draft' : 'published'
    try {
      await apiClient.put('/api/popups/' + popup.id, { status: newStatus })
      setPopups(prev => prev.map(p => p.id === popup.id ? { ...p, status: newStatus } : p))
    } catch { null }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-64">
        <Topbar />
        <main className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('elements.title')}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{t('elements.subtitle')}</p>
            </div>
            {tab === 'popups' && (
              <button
                onClick={() => router.push('/dashboard/elements/popups/new')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
              >
                <Icon name="add" className="text-base" />
                {t('elements.popup_new')}
              </button>
            )}
          </div>

          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-8">
            <button
              onClick={() => setTab('popups')}
              className={"px-5 py-2 rounded-lg text-sm font-semibold transition-all " + (tab === 'popups' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              {t('elements.tab_popups')}
            </button>
            <button
              onClick={() => setTab('countdown')}
              className={"px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 " + (tab === 'countdown' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              {t('elements.tab_countdown')}
              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[10px] font-bold rounded-md uppercase">{t('elements.coming_soon')}</span>
            </button>
          </div>

          {tab === 'popups' && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <Icon name="sync" className="animate-spin text-3xl text-slate-300" />
                </div>
              ) : popups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Icon name="web_asset" className="text-3xl text-slate-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{t('elements.popup_empty_title')}</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-sm">{t('elements.popup_empty_desc')}</p>
                  <button
                    onClick={() => router.push('/dashboard/elements/popups/new')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white text-sm font-bold rounded-xl transition-all"
                  >
                    <Icon name="add" className="text-base" />
                    {t('elements.popup_create_first')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {popups.map(popup => (
                    <div key={popup.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {(() => {
                        const previewImg = getPopupPreviewImage(popup.config)
                        return (
                          <div className="h-36 relative overflow-hidden" style={{ background: popup.config?.bg_color || '#1A56DB' }}>
                            {previewImg && (
                              <img src={previewImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            )}
                            {!previewImg && (
                              <div className="absolute inset-0 flex items-center justify-center px-4">
                                <p className="text-white font-bold text-sm text-center truncate">{popup.name}</p>
                              </div>
                            )}
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)' }} />
                            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: popup.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.15)', color: popup.status === 'published' ? '#10b981' : '#fff' }}>
                              {popup.status === 'published' ? t('elements.popup_published') : t('elements.popup_draft')}
                            </div>
                            <div className="absolute bottom-3 left-4">
                              <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">{popup.config?.position || 'center'}</span>
                            </div>
                          </div>
                        )
                      })()}
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{popup.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{popup.config?.position || 'center'}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleToggleStatus(popup)} className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                            <Icon name={popup.status === 'published' ? 'toggle_on' : 'toggle_off'} className={"text-xl " + (popup.status === 'published' ? 'text-emerald-500' : '')} />
                          </button>
                          <button onClick={() => router.push('/dashboard/elements/popups/' + popup.id + '/edit')} className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                            <Icon name="edit" className="text-base" />
                          </button>
                          <button onClick={() => setDeleteId(popup.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                            <Icon name="delete" className="text-base" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'countdown' && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Icon name="timer" className="text-3xl text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{t('elements.tab_countdown')}</h3>
              <p className="text-sm text-slate-500">{t('elements.coming_soon')}</p>
            </div>
          )}
        </main>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[400px] rounded-2xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Icon name="delete" className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{t('elements.popup_delete_confirm')}</h3>
                <p className="text-xs text-slate-500">{t('elements.popup_delete_confirm_desc')}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl transition-colors">
                {deleting ? '...' : t('elements.popup_delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
