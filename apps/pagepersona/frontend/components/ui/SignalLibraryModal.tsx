'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'

export interface Signal {
  key: string
  label: string
  description: string
  icon: string
  group: string
  operators: string[]
  valueType: string
}

const ALL_COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"]


export const SIGNAL_GROUPS = [
  {
    key: "visitor_behaviour",
    labelKey: "signal_modal.group_visitor_behaviour",
    icon: "person_search",
    signals: [
      { key: "visit_count", labelKey: "signal_modal.signal_visit_count", descKey: "signal_modal.signal_visit_count_desc", icon: "analytics", operators: ["is greater than", "is less than", "equals"], valueType: "number" },
      { key: "time_on_page", labelKey: "signal_modal.signal_time_on_page", descKey: "signal_modal.signal_time_on_page_desc", icon: "timer", operators: ["is greater than", "is less than"], valueType: "number" },
      { key: "scroll_depth", labelKey: "signal_modal.signal_scroll_depth", descKey: "signal_modal.signal_scroll_depth_desc", icon: "swap_vert", operators: ["is greater than", "is less than"], valueType: "number" },
      { key: "exit_intent", labelKey: "signal_modal.signal_exit_intent", descKey: "signal_modal.signal_exit_intent_desc", icon: "exit_to_app", operators: ["is detected"], valueType: "none" },
      { key: "visitor_type", labelKey: "signal_modal.signal_visitor_type", descKey: "signal_modal.signal_visitor_type_desc", icon: "restart_alt", operators: ["is"], valueType: "select", options: ["new", "returning"] },
    ]
  },
  {
    key: "traffic_source",
    labelKey: "signal_modal.group_traffic_source",
    icon: "campaign",
    signals: [
      { key: "utm_source", labelKey: "signal_modal.signal_utm_source", descKey: "signal_modal.signal_utm_source_desc", icon: "link", operators: ["is", "is not", "contains"], valueType: "text" },
      { key: "utm_medium", labelKey: "signal_modal.signal_utm_medium", descKey: "signal_modal.signal_utm_medium_desc", icon: "link", operators: ["is", "is not", "contains"], valueType: "text" },
      { key: "utm_campaign", labelKey: "signal_modal.signal_utm_campaign", descKey: "signal_modal.signal_utm_campaign_desc", icon: "link", operators: ["is", "is not", "contains"], valueType: "text" },
      { key: "referrer_url", labelKey: "signal_modal.signal_referrer_url", descKey: "signal_modal.signal_referrer_url_desc", icon: "travel_explore", operators: ["contains", "is", "is not"], valueType: "text" },
      { key: "query_param", labelKey: "signal_modal.signal_query_param", descKey: "signal_modal.signal_query_param_desc", icon: "data_object", operators: ["contains", "equals"], valueType: "text" },
    ]
  },
  {
    key: "context",
    labelKey: "signal_modal.group_context",
    icon: "devices",
    signals: [
      { key: "device_type", labelKey: "signal_modal.signal_device_type", descKey: "signal_modal.signal_device_type_desc", icon: "devices", operators: ["is"], valueType: "select", options: ["mobile", "tablet", "desktop"] },
      { key: "operating_system", labelKey: "signal_modal.signal_operating_system", descKey: "signal_modal.signal_operating_system_desc", icon: "computer", operators: ["is"], valueType: "select", options: ["iOS", "Android", "Windows", "macOS", "Linux"] },
      { key: "browser", labelKey: "signal_modal.signal_browser", descKey: "signal_modal.signal_browser_desc", icon: "language", operators: ["is"], valueType: "select", options: ["Chrome", "Firefox", "Safari", "Edge"] },
      { key: "geo_country", labelKey: "signal_modal.signal_geo_country", descKey: "signal_modal.signal_geo_country_desc", icon: "public", operators: ["is", "is not"], valueType: "select", options: ALL_COUNTRIES },
      { key: "day_time", labelKey: "signal_modal.signal_day_time", descKey: "signal_modal.signal_day_time_desc", icon: "schedule", operators: ["is", "is between"], valueType: "text" },
    ]
  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (signal: any) => void
}

export default function SignalLibraryModal({ isOpen, onClose, onSelect }: Props) {
  const { t } = useTranslation()
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
      t(s.labelKey).toLowerCase().includes(search.toLowerCase()) ||
      t(s.descKey).toLowerCase().includes(search.toLowerCase())
    )
  })).filter(group => group.signals.length > 0)

  const handleConfirm = () => {
    if (selected) {
      onSelect({ ...selected, label: t(selected.labelKey) })
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
          <h2 className="text-xl font-bold text-slate-900">{t('signal_modal.title')}</h2>
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
              placeholder={t('signal_modal.search_placeholder')}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AE7E]/20 focus:border-[#00AE7E] transition-all"
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
                  <Icon name={group.icon} className="text-[#00AE7E]" />
                  <span className="font-semibold text-slate-900">{t(group.labelKey)}</span>
                  <span className="text-xs text-slate-400">{group.signals.length} {t('signal_modal.signals_count')}</span>
                </div>
                <Icon name={openGroups.includes(group.key) ? "expand_less" : "expand_more"} className="text-slate-400" />
              </button>
              {openGroups.includes(group.key) && (
                <div className="p-2 space-y-1">
                  {group.signals.map(signal => (
                    <button
                      key={signal.key}
                      onClick={() => setSelected(signal)}
                      className={"w-full flex items-center gap-4 p-3 rounded-lg transition-colors text-left " + (selected?.key === signal.key ? "border-2 border-[#00AE7E] bg-[#00AE7E]/5" : "hover:bg-slate-50 border-2 border-transparent")}
                    >
                      <div className={"p-2 rounded-lg " + (selected?.key === signal.key ? "bg-[#00AE7E] text-white" : "bg-[#00AE7E]/10 text-[#00AE7E]")}>
                        <Icon name={signal.icon} className="text-xl" />
                      </div>
                      <div className="flex-1">
                        <p className={"font-bold text-sm " + (selected?.key === signal.key ? "text-[#00AE7E]" : "text-slate-900")}>{t(signal.labelKey)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t(signal.descKey)}</p>
                      </div>
                      {selected?.key === signal.key && (
                        <Icon name="check_circle" className="text-[#00AE7E] text-xl shrink-0" />
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
            {selected ? `1 ${t('signal_modal.signal_selected')} ${t(selected.labelKey)}` : t('signal_modal.no_signal_selected')}
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              {t('signal_modal.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selected}
              className="px-6 py-2 bg-[#00AE7E] text-white text-sm font-bold rounded-xl shadow-md shadow-[#00AE7E]/20 hover:bg-[#00AE7E]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {t('signal_modal.confirm')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
