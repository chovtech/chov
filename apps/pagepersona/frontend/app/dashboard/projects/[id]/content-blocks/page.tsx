'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi } from '@/lib/api/client'

interface ContentBlock {
  selector: string
  label?: string
  type?: string
  text?: string
  alt?: string
  preview?: string
  tag?: string
}

interface PageScan {
  headings: ContentBlock[]
  ctas: ContentBlock[]
  images: ContentBlock[]
  sections: ContentBlock[]
  custom_blocks: ContentBlock[]
  scanned_at: string | null
  error?: string
}

function BlockChip({ selector, label, onRemove }: { selector: string; label?: string; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg group">
      <code className="text-xs text-brand font-mono flex-1 truncate">{selector}</code>
      {label && <span className="text-xs text-slate-500 truncate max-w-[120px]">{label}</span>}
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-1"
        >
          <Icon name="close" className="text-sm" />
        </button>
      )}
    </div>
  )
}

function SectionGroup({ title, icon, blocks, emptyText, onRemove }: {
  title: string
  icon: string
  blocks: ContentBlock[]
  emptyText: string
  onRemove?: (selector: string) => void
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon name={icon} className="text-brand text-base" />
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <span className="ml-auto text-xs text-slate-400 font-medium">{blocks.length}</span>
      </div>
      {blocks.length === 0 ? (
        <p className="text-xs text-slate-400 italic">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {blocks.map((b, i) => (
            <BlockChip
              key={i}
              selector={b.selector}
              label={b.text || b.alt || b.preview || b.label}
              onRemove={onRemove ? () => onRemove(b.selector) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ContentBlocksPage() {
  const { t } = useTranslation('common')
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<any>(null)
  const [scan, setScan] = useState<PageScan | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [newSelector, setNewSelector] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    projectApi.get(projectId).then((res: any) => {
      setProject(res.data)
      if (res.data.page_scan) {
        setScan(res.data.page_scan)
      }
    }).finally(() => setLoading(false))
  }, [projectId])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await projectApi.triggerScan(projectId)
      // Poll after 3s — scan is async
      setTimeout(async () => {
        const res = await projectApi.get(projectId)
        if (res.data.page_scan) setScan(res.data.page_scan)
        setRefreshing(false)
      }, 3500)
    } catch {
      setRefreshing(false)
    }
  }

  const handleAddCustom = async () => {
    const sel = newSelector.trim()
    const lbl = newLabel.trim()
    if (!sel) { setAddError('Selector is required'); return }
    setAdding(true)
    setAddError('')
    try {
      const res = await projectApi.addCustomBlock(projectId, { selector: sel, label: lbl || sel })
      setScan(res.data.page_scan)
      setNewSelector('')
      setNewLabel('')
    } catch {
      setAddError('Could not add block')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveCustom = async (selector: string) => {
    try {
      const res = await projectApi.removeCustomBlock(projectId, selector)
      setScan(res.data.page_scan)
    } catch {}
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return t('project.content_blocks.never_scanned')
    return new Date(iso).toLocaleString()
  }

  const isEmpty = !scan || (
    scan.headings.length === 0 &&
    scan.ctas.length === 0 &&
    scan.images.length === 0 &&
    scan.sections.length === 0 &&
    scan.custom_blocks.length === 0
  )

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar workspaceName="" />

      <div className="p-8 max-w-4xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button onClick={() => router.push('/dashboard')} className="hover:text-brand transition-colors">Dashboard</button>
          <Icon name="chevron_right" className="text-base" />
          <button onClick={() => router.push(`/dashboard/projects/${projectId}`)} className="hover:text-brand transition-colors">
            {project?.name || 'Project'}
          </button>
          <Icon name="chevron_right" className="text-base" />
          <span className="text-slate-900 font-semibold">{t('project.content_blocks.heading')}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{t('project.content_blocks.heading')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('project.content_blocks.subheading')}</p>
            {scan && (
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                <Icon name="schedule" className="text-sm" />
                {scan.error
                  ? <span className="text-red-400">{t('project.content_blocks.scan_error')}: {scan.error}</span>
                  : <>{t('project.content_blocks.last_scanned')}: {formatDate(scan.scanned_at)}</>
                }
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-sm font-bold rounded-xl shadow-sm shadow-brand/20 hover:bg-brand/90 disabled:opacity-60 transition-all"
          >
            <Icon name="refresh" className={refreshing ? 'animate-spin text-base' : 'text-base'} />
            {refreshing ? t('project.content_blocks.refreshing') : t('project.content_blocks.refresh')}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-xl text-center">
            <Icon name="grid_view" className="text-4xl text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600 mb-1">{t('project.content_blocks.empty')}</p>
            <p className="text-sm text-slate-400 max-w-sm">{t('project.content_blocks.empty_desc')}</p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand/90 transition-all"
            >
              <Icon name="refresh" className={refreshing ? 'animate-spin text-base' : 'text-base'} />
              {refreshing ? t('project.content_blocks.refreshing') : t('project.content_blocks.refresh')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <SectionGroup
              title={t('project.content_blocks.headings')}
              icon="title"
              blocks={scan?.headings || []}
              emptyText="No headings detected"
            />
            <SectionGroup
              title={t('project.content_blocks.ctas')}
              icon="ads_click"
              blocks={scan?.ctas || []}
              emptyText="No buttons or CTAs detected"
            />
            <SectionGroup
              title={t('project.content_blocks.images')}
              icon="image"
              blocks={scan?.images || []}
              emptyText="No images with alt text detected"
            />
            <SectionGroup
              title={t('project.content_blocks.sections')}
              icon="view_agenda"
              blocks={scan?.sections || []}
              emptyText="No named sections detected"
            />

            {/* Custom blocks */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="add_box" className="text-brand text-base" />
                <h3 className="text-sm font-bold text-slate-900">{t('project.content_blocks.custom')}</h3>
                <span className="ml-auto text-xs text-slate-400 font-medium">{scan?.custom_blocks?.length || 0}</span>
              </div>

              {/* Existing custom blocks */}
              {(scan?.custom_blocks || []).length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {(scan?.custom_blocks || []).map((b, i) => (
                    <BlockChip
                      key={i}
                      selector={b.selector}
                      label={b.label}
                      onRemove={() => handleRemoveCustom(b.selector)}
                    />
                  ))}
                </div>
              )}

              {/* Add new custom block */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('project.content_blocks.add_custom')}</p>
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newSelector}
                      onChange={e => { setNewSelector(e.target.value); setAddError('') }}
                      placeholder={t('project.content_blocks.custom_selector')}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      placeholder={t('project.content_blocks.custom_label')}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                    />
                  </div>
                  <button
                    onClick={handleAddCustom}
                    disabled={adding || !newSelector.trim()}
                    className="px-4 py-2.5 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand/90 disabled:opacity-40 transition-all whitespace-nowrap"
                  >
                    {adding ? '...' : t('project.content_blocks.add')}
                  </button>
                </div>
                {addError && <p className="text-xs text-red-500 mt-1.5">{addError}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
