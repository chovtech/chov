'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'

export interface Signal {
  key: string
  label: string
  description: string
  icon: string
  group: string
  operators: string[]
  valueType: string
}

export const SIGNAL_GROUPS = [
  {
    key: "visitor_behaviour",
    label: "Visitor Behaviour",
    icon: "person_search",
    signals: [
      { key: "visit_count", label: "Visit count", description: "Number of times this visitor has visited the page", icon: "analytics", operators: ["is greater than", "is less than", "equals"], valueType: "number" },
      { key: "time_on_page", label: "Time on page", description: "Seconds the visitor has spent on the page", icon: "timer", operators: ["is greater than", "is less than"], valueType: "number" },
      { key: "scroll_depth", label: "Scroll depth", description: "Percentage of the page the visitor has scrolled", icon: "swap_vert", operators: ["is greater than", "is less than"], valueType: "number" },
      { key: "exit_intent", label: "Exit intent", description: "Triggers when the cursor moves toward leaving the page", icon: "exit_to_app", operators: ["is detected"], valueType: "none" },
      { key: "visitor_type", label: "New vs returning", description: "Whether this is the visitor first time or a return visit", icon: "restart_alt", operators: ["is"], valueType: "select", options: ["new", "returning"] },
    ]
  },
  {
    key: "traffic_source",
    label: "Traffic Source",
    icon: "campaign",
    signals: [
      { key: "utm_source", label: "UTM source", description: "The source parameter from the URL e.g. email, google, facebook", icon: "link", operators: ["is", "is not", "contains"], valueType: "text" },
      { key: "utm_medium", label: "UTM medium", description: "The medium parameter e.g. cpc, email, organic", icon: "link", operators: ["is", "is not", "contains"], valueType: "text" },
      { key: "utm_campaign", label: "UTM campaign", description: "The campaign name parameter from the URL", icon: "link", operators: ["is", "is not", "contains"], valueType: "text" },
      { key: "referrer_url", label: "Referrer URL", description: "The website the visitor came from", icon: "travel_explore", operators: ["contains", "is", "is not"], valueType: "text" },
      { key: "query_param", label: "Query parameter", description: "Any custom URL parameter e.g. ?ref=affiliate123", icon: "data_object", operators: ["contains", "equals"], valueType: "text" },
    ]
  },
  {
    key: "context",
    label: "Context",
    icon: "devices",
    signals: [
      { key: "device_type", label: "Device type", description: "The device the visitor is using", icon: "devices", operators: ["is"], valueType: "select", options: ["mobile", "tablet", "desktop"] },
      { key: "operating_system", label: "Operating system", description: "The OS the visitor is running", icon: "computer", operators: ["is"], valueType: "select", options: ["iOS", "Android", "Windows", "macOS", "Linux"] },
      { key: "browser", label: "Browser", description: "The browser the visitor is using", icon: "language", operators: ["is"], valueType: "select", options: ["Chrome", "Firefox", "Safari", "Edge"] },
      { key: "geo_country", label: "Geo country", description: "The country the visitor is located in", icon: "public", operators: ["is", "is not"], valueType: "text" },
      { key: "geo_city", label: "Geo city", description: "The city the visitor is located in", icon: "location_on", operators: ["is", "contains"], valueType: "text" },
      { key: "day_time", label: "Day / time of visit", description: "The day or time when the visitor arrives", icon: "schedule", operators: ["is", "is between"], valueType: "text" },
    ]
  },
  {
    key: "firmographics",
    label: "Firmographics",
    icon: "domain",
    signals: [
      { key: "company_name", label: "Company name", description: "Identify visitors by their company domain via IP registry", icon: "apartment", operators: ["is", "contains"], valueType: "text" },
      { key: "industry", label: "Industry", description: "The industry vertical of the visitor company", icon: "factory", operators: ["is"], valueType: "text" },
      { key: "company_size", label: "Company size", description: "Number of employees at the visitor company", icon: "groups", operators: ["is greater than", "is less than"], valueType: "number" },
    ]
  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (signal: any) => void
}

export default function SignalLibraryModal({ isOpen, onClose, onSelect }: Props) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<any>(null)
  const [openGroups, setOpenGroups] = useState<string[]>(["visitor_behaviour"])

  if (!isOpen) return null

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const filteredGroups = SIGNAL_GROUPS.map(group => ({
    ...group,
    signals: group.signals.filter(s =>
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(group => group.signals.length > 0)

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected)
      setSelected(null)
      setSearch("")
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">

        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Choose a Trigger Signal</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <Icon name="close" />
          </button>
        </header>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search signals (e.g. UTM source, device, country)..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
            />
          </div>
        </div>

        {/* Signal Groups */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {filteredGroups.map(group => (
            <div key={group.key} className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon name={group.icon} className="text-[#1A56DB]" />
                  <span className="font-semibold text-slate-900">{group.label}</span>
                  <span className="text-xs text-slate-400">{group.signals.length} signals</span>
                </div>
                <Icon name={openGroups.includes(group.key) ? "expand_less" : "expand_more"} className="text-slate-400" />
              </button>
              {openGroups.includes(group.key) && (
                <div className="p-2 space-y-1">
                  {group.signals.map(signal => (
                    <button
                      key={signal.key}
                      onClick={() => setSelected(signal)}
                      className={"w-full flex items-center gap-4 p-3 rounded-lg transition-colors text-left " + (selected?.key === signal.key ? "border-2 border-[#1A56DB] bg-[#1A56DB]/5" : "hover:bg-slate-50 border-2 border-transparent")}
                    >
                      <div className={"p-2 rounded-lg " + (selected?.key === signal.key ? "bg-[#1A56DB] text-white" : "bg-[#1A56DB]/10 text-[#1A56DB]")}>
                        <Icon name={signal.icon} className="text-xl" />
                      </div>
                      <div className="flex-1">
                        <p className={"font-bold text-sm " + (selected?.key === signal.key ? "text-[#1A56DB]" : "text-slate-900")}>{signal.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{signal.description}</p>
                      </div>
                      {selected?.key === signal.key && (
                        <Icon name="check_circle" className="text-[#1A56DB] text-xl shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <span className="text-sm text-slate-500">
            {selected ? "1 signal selected: " + selected.label : "No signal selected"}
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selected}
              className="px-6 py-2 bg-[#1A56DB] text-white text-sm font-bold rounded-xl shadow-md shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Confirm Selection
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}