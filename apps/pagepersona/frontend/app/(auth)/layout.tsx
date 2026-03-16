export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="w-full p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-start gap-1">
            {/* Logo — replace with actual logo image when ready */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#1A56DB] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <span
                className="text-2xl font-bold tracking-tight text-gray-900"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                PagePersona
              </span>
            </div>
            <p className="text-sm text-gray-500 font-medium ml-0.5">
              Turn any sales page into a smart sales page
            </p>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-grow flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </div>
  )
}
