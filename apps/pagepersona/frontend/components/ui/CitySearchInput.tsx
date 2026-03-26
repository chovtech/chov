'use client'

import { useState, useRef, useEffect } from 'react'
import { WORLD_CITIES } from '@/lib/data/world-cities'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function CitySearchInput({ value, onChange, placeholder = 'Search city...', className = '' }: Props) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const q = query.toLowerCase()
    const filtered = WORLD_CITIES.filter(c => c.toLowerCase().includes(q))
    setResults(filtered.slice(0, 50))
  }, [query])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function select(city: string) {
    setQuery(city)
    onChange(city)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => { if (query.trim()) setOpen(true) }}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {results.map(city => (
            <button
              key={city}
              type="button"
              onMouseDown={() => select(city)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${city === value ? 'font-semibold text-[#1A56DB]' : 'text-slate-700'}`}
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
