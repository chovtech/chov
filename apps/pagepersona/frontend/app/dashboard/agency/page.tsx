'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { workspaceApi, clientsApi } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'
import NewClientModal from './NewClientModal'
import ManageAccessModal from './ManageAccessModal'

interface ClientWorkspace {
  id: string
  name: string
  client_name: string | null
  client_email: string | null
  client_access_level: string
  invite_status: string
  type: string
  created_at: string | null
  project_count: number
  active_rules_count: number
  sessions_this_month: number
  last_activity: string | null
}

type TabKey = 'all' | 'active' | 'inactive'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:  { label: 'Active',   cls: 'bg-green-100 text-green-700' },
    pending: { label: 'Pending',  cls: 'bg-amber-100 text-amber-700' },
    none:    { label: 'No Invite',cls: 'bg-slate-100 text-slate-500' },
    revoked: { label: 'Revoked',  cls: 'bg-red-100 text-red-600' },
  }
  const s = map[status] || map['none']
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>
      {s.label}
    </span>
  )
}

function relativeTime(ts: string | null) {
  if (!ts) return 'No activity yet'
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (hrs < 1)  return `${mins}m ago`
  if (days < 1) return `${hrs}h ago`
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

export default function AgencyPage() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { activeWorkspace, setActiveWorkspaceId } = useWorkspace()
  const [clients, setClients] = useState<ClientWorkspace[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('all')

  // Modals
  const [newOpen, setNewOpen] = useState(false)
  const [manageClient, setManageClient] = useState<ClientWorkspace | null>(null)

  // Send report modal
  const [reportClient, setReportClient] = useState<ClientWorkspace | null>(null)
  const [reportMsg, setReportMsg] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  // Per-card dropdown
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  async function fetchClients() {
    if (!activeWorkspace) return
    setLoading(true)
    try {
      const res = await workspaceApi.listClients(activeWorkspace.id)
      setClients(res.data)
    } catch {
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeWorkspace) fetchClients()
  }, [activeWorkspace?.id])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleCreated() {
    setNewOpen(false)
    fetchClients()
  }

  function handleUpdated() {
    setManageClient(null)
    fetchClients()
  }

  async function handleRevoke(clientId: string) {
    if (!window.confirm('Revoke this client\'s access? They will no longer be able to log in.')) return
    try {
      await clientsApi.revoke(clientId)
      fetchClients()
    } catch { /* ignore */ }
  }

  async function handleDelete(clientId: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This will permanently remove the workspace and all its projects. This cannot be undone.`)) return
    try {
      await workspaceApi.delete(clientId)
      fetchClients()
    } catch { /* ignore */ }
  }

  async function handleSendReport(e: React.FormEvent) {
    e.preventDefault()
    if (!reportClient || !activeWorkspace) return
    setReportSending(true)
    try {
      await clientsApi.sendReport({
        workspace_id: activeWorkspace.id,
        client_workspace_id: reportClient.id,
        message: reportMsg || undefined,
      })
      setReportSent(true)
      setTimeout(() => { setReportClient(null); setReportSent(false); setReportMsg('') }, 1500)
    } catch { /* ignore */ }
    finally { setReportSending(false) }
  }

  function openClientDashboard(clientId: string) {
    setActiveWorkspaceId(clientId)
    router.push('/dashboard')
  }

  function tabCount(key: TabKey) {
    if (key === 'all') return clients.length
    if (key === 'active') return clients.filter(c => c.invite_status === 'active').length
    return clients.filter(c => c.invite_status !== 'active').length
  }

  const filtered = tab === 'all' ? clients
    : tab === 'active' ? clients.filter(c => c.invite_status === 'active')
    : clients.filter(c => c.invite_status !== 'active')

  const inputClass = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] outline-none text-slate-900 text-sm transition-all'

  return (
    <>
      <Topbar workspaceName={activeWorkspace?.name || t('nav.workspace')} />
      <div className="p-8 max-w-7xl mx-auto w-full">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{t('agency.title')}</h1>
            <p className="text-slate-500 text-sm mt-1">{t('agency.subtitle')}</p>
          </div>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white rounded-xl font-bold shadow-lg shadow-[#1A56DB]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Icon name="person_add" className="text-lg" />
            {t('agency.add_client')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-8 overflow-x-auto">
          {(['all', 'active', 'inactive'] as TabKey[]).map(key => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-4 text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                tab === key ? 'font-bold border-[#1A56DB] text-[#1A56DB]' : 'font-medium text-slate-500 hover:text-slate-700 border-transparent'
              }`}
            >
              {t(`agency.tabs.${key}`)}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-[#1A56DB] text-white' : 'bg-slate-100 text-slate-500'}`}>
                {tabCount(key)}
              </span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-32">
            <Icon name="sync" className="animate-spin text-3xl text-slate-300 mr-3" />
          </div>
        )}

        {!loading && clients.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" ref={dropdownRef}>

            {filtered.map(client => {
              const displayName = client.client_name || client.client_email || client.name
              const initials = displayName.slice(0, 2).toUpperCase()
              const sessionsPercent = Math.min((client.sessions_this_month / 10000) * 100, 100)

              return (
                <div key={client.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Card header */}
                  <div className="p-5 pb-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-[#1A56DB]/10 flex items-center justify-center text-[#1A56DB] font-bold text-sm flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                          <p className="text-[11px] text-slate-400 truncate">{client.client_email || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={client.invite_status} />
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === client.id ? null : client.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Icon name="more_vert" className="text-[18px]" />
                          </button>
                          {openDropdown === client.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                              <button onClick={() => { setManageClient(client); setOpenDropdown(null) }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                                <Icon name="manage_accounts" className="text-[18px] text-slate-400" />
                                Edit Client Details
                              </button>
                              {client.invite_status === 'none' && (
                                <button onClick={() => { setManageClient(client); setOpenDropdown(null) }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                                  <Icon name="send" className="text-[18px] text-slate-400" />
                                  Invite Client
                                </button>
                              )}
                              {client.invite_status === 'pending' && (
                                <button onClick={() => { setManageClient(client); setOpenDropdown(null) }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                                  <Icon name="refresh" className="text-[18px] text-slate-400" />
                                  Resend Invite
                                </button>
                              )}
                              <button onClick={() => { setReportClient(client); setOpenDropdown(null) }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                                <Icon name="bar_chart" className="text-[18px] text-slate-400" />
                                {t('agency.send_report')}
                              </button>
                              {client.invite_status === 'active' && (
                                <button onClick={() => { handleRevoke(client.id); setOpenDropdown(null) }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                                  <Icon name="block" className="text-[18px]" />
                                  Revoke Access
                                </button>
                              )}
                              <div className="border-t border-slate-100 mt-1 pt-1">
                                <button onClick={() => { handleDelete(client.id, displayName); setOpenDropdown(null) }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                                  <Icon name="delete" className="text-[18px]" />
                                  Delete Workspace
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-4">
                      Last activity: {relativeTime(client.last_activity)}
                    </p>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{t('agency.pages_active')}</p>
                        <p className="text-lg font-black text-slate-800">{client.project_count}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{t('agency.rules_running')}</p>
                        <p className="text-lg font-black text-slate-800">{client.active_rules_count}</p>
                      </div>
                    </div>

                    {/* Sessions progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('agency.sessions_month')}</p>
                        <p className="text-xs font-bold text-slate-700">{client.sessions_this_month.toLocaleString()} / 10,000</p>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1A56DB] rounded-full transition-all"
                          style={{ width: `${sessionsPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <button
                      onClick={() => setManageClient(client)}
                      className="text-xs font-semibold text-slate-500 hover:text-[#1A56DB] transition-colors flex items-center gap-1"
                    >
                      <Icon name="manage_accounts" className="text-[16px]" />
                      {t('agency.manage_access')}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openClientDashboard(client.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1A56DB] bg-[#1A56DB]/10 rounded-lg hover:bg-[#1A56DB]/20 transition-colors"
                      >
                        <Icon name="folder_open" className="text-[14px]" />
                        {t('agency.open_projects')}
                      </button>
                      <button
                        onClick={() => { openClientDashboard(client.id); router.push('/dashboard/analytics') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <Icon name="bar_chart" className="text-[14px]" />
                        {t('agency.view_analytics')}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Add new client card */}
            <div
              onClick={() => setNewOpen(true)}
              className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-10 text-center hover:border-[#1A56DB]/40 hover:bg-[#1A56DB]/5 transition-all cursor-pointer group"
            >
              <div className="size-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon name="person_add" className="text-3xl text-slate-300 group-hover:text-[#1A56DB]" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">{t('agency.add_new_client')}</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">{t('agency.add_new_client_desc')}</p>
            </div>

          </div>
        )}

        {!loading && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Icon name="groups" className="text-3xl text-slate-300" />
            </div>
            <p className="text-slate-700 font-bold mb-1">{t('agency.no_clients')}</p>
            <p className="text-sm text-slate-400 max-w-sm mb-6">{t('agency.no_clients_sub')}</p>
            <button
              onClick={() => setNewOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white rounded-xl font-bold shadow shadow-[#1A56DB]/20 hover:bg-[#1547b3] transition-colors"
            >
              <Icon name="person_add" className="text-lg" />
              {t('agency.add_first_client')}
            </button>
          </div>
        )}
      </div>

      {/* New Client Modal */}
      {newOpen && (
        <NewClientModal onClose={() => setNewOpen(false)} onCreated={handleCreated} />
      )}

      {/* Manage Access Modal */}
      {manageClient && activeWorkspace && (
        <ManageAccessModal
          client={manageClient}
          agencyWorkspaceId={activeWorkspace.id}
          onClose={() => setManageClient(null)}
          onUpdated={handleUpdated}
        />
      )}

      {/* Send Report Modal */}
      {reportClient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{t('agency.send_report_title')}</h2>
              <button onClick={() => setReportClient(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            <form onSubmit={handleSendReport} className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                {t('agency.send_report_to')} <span className="font-semibold text-slate-700">{reportClient.client_email || reportClient.client_name}</span>
              </p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('agency.report_message_label')}</label>
                <textarea
                  value={reportMsg}
                  onChange={e => setReportMsg(e.target.value)}
                  placeholder={t('agency.report_message_placeholder')}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] outline-none text-slate-900 text-sm transition-all resize-none"
                />
              </div>
              {reportSent && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <Icon name="check_circle" className="text-[18px]" />
                  {t('agency.report_sent')}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setReportClient(null)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={reportSending || reportSent} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#1A56DB] rounded-xl hover:bg-[#1547b3] disabled:opacity-60 transition-colors">
                  <Icon name="send" className="text-[16px]" />
                  {reportSending ? t('agency.sending') : t('agency.send_report')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
