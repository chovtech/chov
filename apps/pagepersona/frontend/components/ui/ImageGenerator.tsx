'use client'

import { useState, useEffect } from 'react'
import { aiApi } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

interface ImageGeneratorProps {
  workspaceId?: string
  /** URL of the existing image in this slot — used to auto-detect W/H */
  existingImageUrl?: string
  onInsert: (url: string) => void
  onCoinsUpdated?: (balance: number) => void
}

export default function ImageGenerator({
  workspaceId,
  existingImageUrl,
  onInsert,
  onCoinsUpdated,
}: ImageGeneratorProps) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(576)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Auto-detect dimensions from existing image
  useEffect(() => {
    if (!existingImageUrl) return
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setWidth(img.naturalWidth)
        setHeight(img.naturalHeight)
      }
    }
    img.src = existingImageUrl
  }, [existingImageUrl])

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await aiApi.generateImage({
        workspace_id: workspaceId,
        prompt: prompt.trim(),
        width,
        height,
      })
      setResult(res.data.url)
      if (res.data.balance != null) {
        if (onCoinsUpdated) onCoinsUpdated(res.data.balance)
        window.dispatchEvent(new CustomEvent('coinsUpdated', { detail: res.data.balance }))
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'object' && detail?.error === 'insufficient_coins') {
        setError(`Not enough coins. You need 10 coins but have ${detail.balance}.`)
      } else {
        setError(typeof detail === 'string' ? detail : 'Generation failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInsert = () => {
    if (!result) return
    onInsert(result)
    setOpen(false)
    setResult(null)
    setPrompt('')
  }

  if (!open) {
    return (
      <div className="flex justify-end mt-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand/80 transition-colors"
        >
          <Icon name="auto_awesome" className="text-sm" />
          Generate with AI
          <span className="text-[10px] font-medium text-slate-400 ml-0.5">10 coins</span>
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 p-3 bg-brand/5 border border-brand/20 rounded-xl space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon name="auto_awesome" className="text-sm text-brand" />
          <span className="text-xs font-bold text-brand">AI Image Generator</span>
          <span className="text-[10px] text-slate-400">· 10 coins</span>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); setResult(null); setError(''); setPrompt('') }}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Icon name="close" className="text-sm" />
        </button>
      </div>

      {/* Prompt */}
      <div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate() }}
          placeholder="Describe the image, e.g. 'Professional photo of a confident woman using a laptop in a modern office, warm light'"
          rows={2}
          className="w-full px-3 py-2 bg-white border border-brand/20 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Dimensions */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Width (px)</label>
          <input
            type="number"
            value={width}
            onChange={e => setWidth(Number(e.target.value))}
            min={256}
            max={2048}
            step={8}
            className="w-full px-3 py-2 bg-white border border-brand/20 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          />
        </div>
        <div className="flex items-center pt-4 text-slate-300 font-bold text-sm">×</div>
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Height (px)</label>
          <input
            type="number"
            value={height}
            onChange={e => setHeight(Number(e.target.value))}
            min={256}
            max={2048}
            step={8}
            className="w-full px-3 py-2 bg-white border border-brand/20 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          />
        </div>
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={generate}
        disabled={loading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 py-2 bg-brand hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all"
      >
        {loading ? (
          <>
            <Icon name="sync" className="text-sm animate-spin" />
            Generating... this may take 10–20s
          </>
        ) : (
          <>
            <Icon name="auto_awesome" className="text-sm" />
            Generate Image
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
          <Icon name="error" className="text-red-500 text-sm shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Generated Image</p>
          <div className="rounded-xl overflow-hidden border border-slate-200">
            <img src={result} alt="Generated" className="w-full object-cover" />
          </div>
          <button
            type="button"
            onClick={handleInsert}
            className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all"
          >
            <Icon name="check" className="text-sm" />
            Insert Image
          </button>
        </div>
      )}
    </div>
  )
}
