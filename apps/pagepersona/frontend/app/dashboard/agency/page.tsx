'use client'

import { useState, useEffect } from 'react'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { workspaceApi, clientsApi } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'

interface ClientWorkspace {
  id: string
  name: string
  client_email: string | null
  type: string
  invite_status: string | null
  created_at: string | null
}

export default function AgencyPage() {
  const { t } = useTranslation('common')
  const { activeWorkspace } = useWorkspace()
  const [clients, setClients] = useState<ClientWorkspace[]>([])
  const [loading, setLoading] = useState(true)

  // Add client modal
  const [addOpen, setAddOpen] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  // Send report modal
  const [reportOpen, setReportOpen] = useState(false)
  const [reportClient, setReportClient] = useState<ClientWorkspace | null>(null)
  const [reportMsg, setReportMsg] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportSent, setReportSent] = useState(false)

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

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspace) return
    setAddError('')
    setAddLoading(true)
    try {
      await clientsApi.invite({ client_email: addEmail, workspace_id: activeWorkspace.id })
      setAddEmail('')
      setAddOpen(false)
      await fetchClients()
    } catch (err: any) {
      setAddError(err?.response?.data?.detail || t('agency.invite_error'))
    } finally {
      setAddLoading(false)
    }
  }

  async function handleSendReport(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspace || !reportClient) return
    setReportLoading(true)
    try {
      await clientsApi.sendReport({
        workspace_id: activeWorkspace.id,
        client_workspace_id: reportClient.id,
        message: reportMsg || undefined,
      })
      setReportSent(true)
      setTimeout(() => { setReportOpen(false); setReportSent(false); setReportMsg('') }, 1500)
    } catch {
      /* ignore */
    } finally {
      setReportLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] outline-none text-slate-900 text-sm transition-all"

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar workspaceName={activeWorkspace?.name || t('nav.workspace')} />
      <div className="p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{t('agency.title')}</h1>
            <p className="text-slate-500 text-sm mt-1">{t('agency.subtitle')}</p>
          </div>
          <button
            onClick={() => { setAddError(''); setAddOpen(true) }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white rounded-xl font-bold shadow-lg shadow-[#1A56DB]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Icon name="person_add" className="text-lg" />
            {t('agency.add_client')}
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-32 text-slate-400">
            <Icon name="sync" className="animate-spin text-3xl mr-3" />
          </div>
        )}

        {!loading && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Icon name="groups" className="text-3xl text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold mb-1">{t('agency.no_clients')}</p>
            <p className="text-sm text-slate-400 max-w-sm">{t('agency.no_clients_sub')}</p>
            <button
              onClick={() => { setAddError(''); setAddOpen(true) }}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white rounded-xl font-bold shadow shadow-[#1A56DB]/20 hover:bg-[#1547b3] transition-colors"
            >
              <Icon name="person_add" className="text-lg" />
              {t('agency.add_first_client')}
            </button>
          </div>
        )}

        {!loading && clients.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('agency.col_client')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('agency.col_workspace')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('agency.col_status')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('agency.col_added')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('agency.col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[#1A56DB]/10 flex items-center justify-center text-[#1A56DB] font-bold text-xs flex-shrink-0">
                          {(c.client_email || c.name || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{c.client_email || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.name}</td>
                    <td className="px-6 py-4">
                      {c.invite_status === 'accepted' ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">{t('agency.status_active')}</span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">{t('agency.status_pending')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => { setReportClient(c); setReportMsg(''); setReportSent(false); setReportOpen(true) }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#1A56DB] hover:underline"
                      >
                        <Icon name="send" className="text-[16px]" />
                        {t('agency.send_report')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{t('agency.add_client_title')}</h2>
              <button onClick={() => setAddOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('agency.client_email_label')}</label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder={t('agency.client_email_placeholder')}
                  className={inputClass}
                />
              </div>
              {addError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>}
              <p className="text-xs text-slate-400">{t('agency.invite_desc')}</p>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={addLoading} className="px-5 py-2.5 text-sm font-bold text-white bg-[#1A56DB] rounded-xl hover:bg-[#1547b3] disabled:opacity-60 transition-colors">
                  {addLoading ? t('agency.sending_invite') : t('agency.send_invite')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Report Modal */}
      {reportOpen && reportClient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{t('agency.send_report_title')}</h2>
              <button onClick={() => setReportOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            <form onSubmit={handleSendReport} className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                {t('agency.send_report_to')} <span className="font-semibold text-slate-700">{reportClient.client_email}</span>
              </p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('agency.report_message_label')}</label>
                <textarea
                  value={reportMsg}
                  onChange={e => setReportMsg(e.target.value)}
                  placeholder={t('agency.report_message_placeholder')}
                  rows={3}
                  className={inputClass + ' resize-none'}
                />
              </div>
              {reportSent && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <Icon name="check_circle" className="text-[18px]" />
                  {t('agency.report_sent')}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setReportOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={reportLoading || reportSent} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#1A56DB] rounded-xl hover:bg-[#1547b3] disabled:opacity-60 transition-colors">
                  <Icon name="send" className="text-[16px]" />
                  {reportLoading ? t('agency.sending') : t('agency.send_report')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
