import type { Metadata } from 'next'
import { Public_Sans, Syne } from 'next/font/google'
import './globals.css'

const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans' })
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-syne' })

export const metadata: Metadata = {
  title: 'PagePersona',
  description: 'Turn any sales page into a smart sales page',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className={`${publicSans.variable} ${syne.variable} ${publicSans.className}`}>
        {children}
      </body>
    </html>
  )
}
