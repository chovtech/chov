import type { Metadata } from 'next'
import { Public_Sans, Outfit } from 'next/font/google'
import './globals.css'

const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans' })
const outfit = Outfit({ subsets: ['latin'], weight: ['400', '600', '700', '900'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'PagePersona',
  description: 'Turn any sales page into a smart sales page',
  icons: {
    icon: '/images/favicon.png',
  },
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
      <body className={`${publicSans.variable} ${outfit.variable} ${publicSans.className}`}>
        {children}
      </body>
    </html>
  )
}
