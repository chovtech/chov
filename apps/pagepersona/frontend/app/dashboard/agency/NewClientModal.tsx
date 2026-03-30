'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import { workspaceApi, clientsApi } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function NewClientModal({ onClose, onCreated }: Props) {
  const { activeWorkspace } = useWorkspace()
  const [form, setForm] = useState({
    name: '',
    client_name: '',
    client_email: '',
    client_access_level: 'full',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  const inputClass = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] outline-none text-slate-900 text-sm transition-all'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (!activeWorkspace) return
    setError('')
    setLoading(true)
    try {
      await workspaceApi.create({
        name: form.name.trim(),
        type: 'client',
        parent_workspace_id: activeWorkspace.id,
        client_name: form.client_name.trim() || undefined,
        client_email: form.client_email.trim() || undefined,
        client_access_level: form.client_access_level,
      })
      // Auto-send invite if email was provided
      if (form.client_email.trim()) {
        try {
          const invRes = await clientsApi.invite({
            client_email: form.client_email.trim(),
            workspace_id: activeWorkspace.id,
          })
          if (invRes.data.email_sent === false) {
            setInviteMsg('Workspace created but invite email failed to deliver — check backend logs.')
          }
        } catch {
          // Invite failure is non-fatal — workspace was created
        }
      }
      onCreated()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create workspace. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">New Client Workspace</h2>
            <p className="text-xs text-slate-400 mt-0.5">Create a workspace to manage a client's campaigns</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Workspace Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text" required autoFocus
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Acme Corp Campaigns"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text" required
              value={form.client_name}
              onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
              placeholder="e.g. John Smith"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Client Email <span className="text-slate-400 font-normal">(optional — required to send invite)</span>
            </label>
            <input
              type="email"
              value={form.client_email}
              onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))}
              placeholder="client@company.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Access Level</label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-[#1A56DB] has-[:checked]:bg-[#1A56DB]/5">
                <input
                  type="radio" name="access_level" value="full"
                  checked={form.client_access_level === 'full'}
                  onChange={() => setForm(p => ({ ...p, client_access_level: 'full' }))}
                  className="mt-0.5 accent-[#1A56DB]"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Full Access</p>
                  <p className="text-xs text-slate-500 mt-0.5">Client can manage projects, rules, and elements</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-[#1A56DB] has-[:checked]:bg-[#1A56DB]/5">
                <input
                  type="radio" name="access_level" value="view_only"
                  checked={form.client_access_level === 'view_only'}
                  onChange={() => setForm(p => ({ ...p, client_access_level: 'view_only' }))}
                  className="mt-0.5 accent-[#1A56DB]"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">View Only</p>
                  <p className="text-xs text-slate-500 mt-0.5">Client can only view their dashboard and analytics</p>
                </div>
              </label>
            </div>
          </div>

          {inviteMsg && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{inviteMsg}</p>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !form.name.trim() || !form.client_name.trim()} className="px-5 py-2.5 text-sm font-bold text-white bg-[#1A56DB] rounded-xl hover:bg-[#1547b3] disabled:opacity-60 transition-colors">
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
