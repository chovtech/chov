'use client'

import { useState } from 'react'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'

const tabs = ['All Projects', 'Active', 'Drafts', 'Archived']

// Sample projects — will come from API later
const sampleProjects = [
  {
    id: '1',
    name: 'landing-page-v1.com',
    url: 'app.pagepersona.com/p/8230',
    status: 'active',
    rules: 12,
    conversions: 45,
    edited: '2h ago',
  },
  {
    id: '2',
    name: 'docs-portal-alpha.io',
    url: 'app.pagepersona.com/p/9122',
    status: 'draft',
    rules: 0,
    conversions: 0,
    edited: '1d ago',
  },
]

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('All Projects')
  // Toggle this to test both states
  const hasProjects = sampleProjects.length > 0

  return (
    <>
      <Topbar workspaceName="Marketing Team Workspace" />
      <div className="p-8 max-w-7xl mx-auto w-full">

        {/* Page heading */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Your Projects
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage and optimize your landing pages performance.
            </p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white rounded-xl font-bold shadow-lg shadow-[#1A56DB]/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Icon name="add" className="text-lg" />
            <span>New Project</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'font-bold border-[#1A56DB] text-[#1A56DB]'
                  : 'font-medium text-slate-500 hover:text-slate-700 border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Project grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hasProjects && sampleProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
            >
              {/* Card thumbnail */}
              <div className="h-40 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                <div className={`absolute inset-0 ${
                  project.status === 'active'
                    ? 'bg-gradient-to-br from-[#1A56DB]/5 to-[#1A56DB]/20'
                    : 'bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800'
                }`} />
                <div className="absolute top-3 right-3">
                  {project.status === 'active' ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Draft
                    </span>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="p-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-[#1A56DB] transition-colors">
                  {project.name}
                </h3>
                <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                  <Icon name="link" className="text-sm" />
                  {project.url}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">
                      Rules
                    </p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {project.rules} Active
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">
                      Conversions
                    </p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {project.conversions} Today
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Edited {project.edited}</span>
                  <div className="flex gap-2">
                    <button className="hover:text-[#1A56DB] transition-colors">
                      <Icon name="edit" className="text-[18px]" />
                    </button>
                    <button className="hover:text-[#1A56DB] transition-colors">
                      <Icon name="more_vert" className="text-[18px]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state card — always shown as the last card */}
          <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-center hover:border-[#1A56DB]/40 transition-colors cursor-pointer group">
            <div className="size-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Icon name="post_add" className="text-3xl text-slate-300 group-hover:text-[#1A56DB]" />
            </div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {hasProjects ? 'New project' : 'No projects yet'}
            </h4>
            <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
              Add your first page and start personalizing your user journeys.
            </p>
            <button className="mt-4 text-xs font-bold text-[#1A56DB] flex items-center gap-1">
              <Icon name="add" className="text-sm" />
              Add First Page
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
