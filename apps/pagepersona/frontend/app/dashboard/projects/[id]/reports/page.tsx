'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { reportsApi } from '@/lib/api/client'

interface Report {
  id: string
  recipient_email: string
  recipient_name: string | null
  message: string | null
  period: number
  report_url: string
  created_at: string
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ReportsListPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // send report modal
  const [showSend, setShowSend] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [period, setPeriod] = useState(30)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')

  // resend
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resendEmail, setResendEmail] = useState('')
  const [resendDone, setResendDone] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    reportsApi.list(projectId)
      .then(r => setReports(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [projectId])

  async function handleSend() {
    if (!email.trim()) return
    setSending(true)
    setSendError('')
    try {
      const res = await reportsApi.create(projectId, { recipient_email: email, recipient_name: name || undefined, message: message || undefined, period })
      setReports(prev => [{ id: res.data.id, recipient_email: email, recipient_name: name || null, message: message || null, period, report_url: res.data.report_url, created_at: res.data.created_at }, ...prev])
      setSent(true)
      setTimeout(() => { setSent(false); setShowSend(false); setEmail(''); setName(''); setMessage(''); setPeriod(30) }, 2000)
    } catch {
      setSendError('Failed to send. Try again.')
    } finally {
      setSending(false)
    }
  }

  async function handleResend(report: Report) {
    const to = resendEmail.trim() || report.recipient_email
    setResendingId(report.id)
    try {
      await reportsApi.resend(projectId, report.id, resendEmail.trim() || undefined)
      setResendDone(report.id)
      setTimeout(() => { setResendingId(null); setResendDone(null); setResendEmail('') }, 2000)
    } catch {
      setResendingId(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar />
      <div className="max-w-3xl mx-auto w-full px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
              <Icon name="arrow_back" className="text-slate-600 text-lg" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Reports Sent</h1>
              <p className="text-sm text-slate-500">Analytics reports shared from this project</p>
            </div>
          </div>
          <button
            onClick={() => setShowSend(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand/90 transition-colors shadow-sm shadow-brand/20">
            <Icon name="send" className="text-base" />
            Send Report
          </button>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Icon name="sync" className="animate-spin text-2xl mr-3" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Icon name="error_outline" className="text-2xl mr-2 text-red-400" />
            <span className="text-sm">Failed to load. Refresh to try again.</span>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
              <Icon name="send" className="text-2xl text-brand" />
            </div>
            <p className="font-semibold text-slate-800 mb-1">No reports sent yet</p>
            <p className="text-sm text-slate-400 max-w-xs">Send your first analytics report and it will appear here.</p>
            <button
              onClick={() => setShowSend(true)}
              className="mt-5 px-5 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand/90 transition-colors">
              Send Report
            </button>
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="space-y-4">
            {reports.map(r => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="person" className="text-slate-400 text-base shrink-0" />
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {r.recipient_name ? `${r.recipient_name} (${r.recipient_email})` : r.recipient_email}
                      </span>
                    </div>
                    {r.message && (
                      <p className="text-xs text-slate-500 ml-6 line-clamp-2">{r.message}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 ml-6">
                      <span className="text-xs text-slate-400">Last {r.period} days · {timeAgo(r.created_at)}</span>
                      <a href={r.report_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-brand font-semibold hover:underline flex items-center gap-0.5">
                        View <Icon name="open_in_new" className="text-xs" />
                      </a>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {resendingId === r.id ? (
                      resendDone === r.id ? (
                        <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                          <Icon name="check_circle" className="text-sm" /> Sent
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={resendEmail}
                            onChange={e => setResendEmail(e.target.value)}
                            placeholder={r.recipient_email}
                            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 w-44"
                          />
                          <button
                            onClick={() => handleResend(r)}
                            className="text-xs px-3 py-1.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand/90">
                            Send
                          </button>
                          <button onClick={() => { setResendingId(null); setResendEmail('') }}
                            className="text-xs text-slate-400 hover:text-slate-600">
                            <Icon name="close" className="text-sm" />
                          </button>
                        </div>
                      )
                    ) : (
                      <button
                        onClick={() => setResendingId(r.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand border border-slate-200 hover:border-brand/30 px-3 py-1.5 rounded-lg transition-colors">
                        <Icon name="forward_to_inbox" className="text-sm" />
                        Resend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Report Modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Send Analytics Report</h2>
              <button onClick={() => setShowSend(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="close" />
              </button>
            </div>

            {sent ? (
              <div className="py-8 text-center">
                <Icon name="check_circle" className="text-4xl text-green-500 mb-3" />
                <p className="font-semibold text-slate-800">Report sent!</p>
                <p className="text-sm text-slate-500 mt-1">The recipient will receive an email with a link to view the full report.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recipient Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recipient Name (optional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Period</label>
                  <select
                    value={period}
                    onChange={e => setPeriod(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white">
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Note (optional)</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Here's a summary of how your page performed this month…"
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                  />
                </div>
                {sendError && <p className="text-xs text-red-500">{sendError}</p>}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowSend(false)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !email.trim()}
                    className="flex-1 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {sending ? <><Icon name="sync" className="animate-spin text-base" />Sending…</> : <><Icon name="send" className="text-base" />Send Report</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
