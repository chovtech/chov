'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import { workspaceApi, clientsApi } from '@/lib/api/client'

interface ClientWorkspace {
  id: string
  name: string
  client_name: string | null
  client_email: string | null
  client_access_level: string
  invite_status: string
  type: string
  created_at: string | null
}

interface Props {
  client: ClientWorkspace
  agencyWorkspaceId: string
  onClose: () => void
  onUpdated: () => void
}

export default function ManageAccessModal({ client, agencyWorkspaceId, onClose, onUpdated }: Props) {
  const [details, setDetails] = useState({
    client_name: client.client_name || '',
    client_email: client.client_email || '',
  })
  const [accessLevel, setAccessLevel] = useState(client.client_access_level || 'full')
  const [savingDetails, setSavingDetails] = useState(false)
  const [savingAccess, setSavingAccess] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const inputClass = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] outline-none text-slate-900 text-sm transition-all'

  function flash(type: 'ok' | 'err', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault()
    setSavingDetails(true)
    try {
      await workspaceApi.update(client.id, {
        client_name: details.client_name || undefined,
        client_email: details.client_email || undefined,
      })
      flash('ok', 'Details saved.')
      onUpdated()
    } catch {
      flash('err', 'Failed to save details.')
    } finally {
      setSavingDetails(false)
    }
  }

  async function handleSaveAccess() {
    setSavingAccess(true)
    try {
      await workspaceApi.update(client.id, { client_access_level: accessLevel })
      flash('ok', 'Access level updated.')
      onUpdated()
    } catch {
      flash('err', 'Failed to update access level.')
    } finally {
      setSavingAccess(false)
    }
  }

  async function handleInvite() {
    if (!details.client_email) { flash('err', 'Client email is required to send an invite.'); return }
    setInviting(true)
    try {
      const res = await clientsApi.invite({ client_email: details.client_email, workspace_id: agencyWorkspaceId, client_workspace_id: client.id })
      if (res.data.email_sent === false) {
        flash('err', 'Invite saved but email failed to deliver. Check that your AWS SES credentials are set correctly on the server.')
        setTimeout(() => onUpdated(), 4000)
      } else {
        flash('ok', `Invite email sent to ${details.client_email}`)
        setTimeout(() => onUpdated(), 2500)
      }
    } catch (err: any) {
      flash('err', err?.response?.data?.detail || 'Failed to send invite. Check server logs.')
    } finally {
      setInviting(false)
    }
  }

  async function handleRevoke() {
    if (!window.confirm('Revoke this client\'s access? They will no longer be able to log in.')) return
    setRevoking(true)
    try {
      await clientsApi.revoke(client.id)
      flash('ok', 'Access revoked.')
      onUpdated()
    } catch {
      flash('err', 'Failed to revoke access.')
    } finally {
      setRevoking(false)
    }
  }

  const inviteStatusLabel: Record<string, { label: string; icon: string; color: string }> = {
    none: { label: 'No invite sent yet', icon: 'mail', color: 'text-slate-500' },
    pending: { label: 'Invite sent — awaiting acceptance', icon: 'schedule', color: 'text-amber-600' },
    active: { label: 'Accepted — client is active', icon: 'check_circle', color: 'text-green-600' },
    revoked: { label: 'Access revoked', icon: 'block', color: 'text-red-500' },
  }
  const statusInfo = inviteStatusLabel[client.invite_status] || inviteStatusLabel['none']

  const inviteDate = client.created_at ? new Date(client.created_at).toLocaleDateString() : '—'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Manage Access & Permissions</h2>
            <p className="text-xs text-slate-400 mt-0.5">{client.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {msg && (
          <div className={`mx-6 mt-4 px-4 py-2.5 rounded-xl text-sm font-medium ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.text}
          </div>
        )}

        <div className="p-6 space-y-6">

          {/* Client Details */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Icon name="person" className="text-[18px] text-slate-400" />
              Client Details
            </h3>
            <form onSubmit={handleSaveDetails} className="space-y-3">
              <input
                type="text"
                value={details.client_name}
                onChange={e => setDetails(p => ({ ...p, client_name: e.target.value }))}
                placeholder="Client name"
                className={inputClass}
              />
              <input
                type="email"
                value={details.client_email}
                onChange={e => setDetails(p => ({ ...p, client_email: e.target.value }))}
                placeholder="client@company.com"
                className={inputClass}
              />
              <button type="submit" disabled={savingDetails} className="px-4 py-2 text-sm font-bold text-white bg-[#1A56DB] rounded-xl hover:bg-[#1547b3] disabled:opacity-60 transition-colors">
                {savingDetails ? 'Saving...' : 'Save Details'}
              </button>
            </form>
          </section>

          <div className="border-t border-slate-100" />

          {/* Access Level */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Icon name="shield" className="text-[18px] text-slate-400" />
              Access Level
            </h3>
            <div className="space-y-2 mb-3">
              {[
                { value: 'full', label: 'Full Access', desc: 'Can manage projects, rules and elements' },
                { value: 'view_only', label: 'View Only', desc: 'Can only view dashboard and analytics' },
              ].map(opt => (
                <label key={opt.value} className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-[#1A56DB] has-[:checked]:bg-[#1A56DB]/5">
                  <input
                    type="radio" name="modal_access"
                    value={opt.value}
                    checked={accessLevel === opt.value}
                    onChange={() => setAccessLevel(opt.value)}
                    className="mt-0.5 accent-[#1A56DB]"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={handleSaveAccess} disabled={savingAccess} className="px-4 py-2 text-sm font-bold text-white bg-[#1A56DB] rounded-xl hover:bg-[#1547b3] disabled:opacity-60 transition-colors">
              {savingAccess ? 'Saving...' : 'Save Access Level'}
            </button>
          </section>

          <div className="border-t border-slate-100" />

          {/* Invite Status */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Icon name="send" className="text-[18px] text-slate-400" />
              Invite Status
            </h3>
            <div className={`flex items-center gap-2 mb-4 ${statusInfo.color}`}>
              <Icon name={statusInfo.icon} className="text-[18px]" />
              <span className="text-sm font-medium">{statusInfo.label}</span>
              {client.invite_status !== 'none' && (
                <span className="text-xs text-slate-400 ml-auto">{inviteDate}</span>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {(client.invite_status === 'none' || client.invite_status === 'revoked') && (
                <button
                  onClick={handleInvite} disabled={inviting}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#1A56DB] rounded-xl hover:bg-[#1547b3] disabled:opacity-60 transition-colors"
                >
                  <Icon name="send" className="text-[16px]" />
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              )}
              {client.invite_status === 'pending' && (
                <button
                  onClick={handleInvite} disabled={inviting}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-[#1A56DB] bg-[#1A56DB]/10 rounded-xl hover:bg-[#1A56DB]/20 disabled:opacity-60 transition-colors"
                >
                  <Icon name="refresh" className="text-[16px]" />
                  {inviting ? 'Sending...' : 'Resend Invitation'}
                </button>
              )}
              {client.invite_status === 'active' && (
                <button
                  onClick={handleRevoke} disabled={revoking}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 disabled:opacity-60 transition-colors"
                >
                  <Icon name="block" className="text-[16px]" />
                  {revoking ? 'Revoking...' : 'Revoke Access'}
                </button>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
