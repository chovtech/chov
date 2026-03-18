import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import Icon from '@/components/ui/Icon'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Auth header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 bg-[#1A56DB] rounded-lg flex items-center justify-center text-white shadow-md shadow-[#1A56DB]/30">
            <Icon name="layers" className="text-[18px]" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none text-slate-900">PagePersona</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Smart Sales Pages</p>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-slate-400">© 2026 PagePersona. All rights reserved.</p>
      </footer>
    </div>
  )
}
