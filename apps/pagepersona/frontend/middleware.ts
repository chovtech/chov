import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const APP_DOMAIN = 'app.usepagepersona.com'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  // Resolve custom domain white label (set by Nginx header, or fall back to host)
  const customDomainHeader = request.headers.get('x-custom-domain')
  const host = (request.headers.get('host') || '').split(':')[0]
  const customDomain = customDomainHeader || (
    host && host !== APP_DOMAIN && !host.includes('localhost') && !host.includes('127.0.0.1')
      ? host
      : null
  )

  const response = NextResponse.next()

  if (customDomain) {
    try {
      const res = await fetch(`${API_URL}/api/clients/resolve-domain?domain=${customDomain}`, {
        next: { revalidate: 300 }
      } as RequestInit)
      if (res.ok) {
        const data = await res.json()
        response.headers.set('x-workspace-id', data.workspace_id || '')
        response.headers.set('x-white-label-brand-name', data.white_label_brand_name || '')
        response.headers.set('x-white-label-logo', data.white_label_logo || '')
        response.headers.set('x-white-label-primary-color', data.white_label_primary_color || '#1A56DB')
      }
    } catch {
      // Domain not mapped — continue with default branding
    }
  }

  // Protected routes → redirect to login
  const protectedRoutes = ['/dashboard']
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))

  // Auth routes → redirect to dashboard if already logged in
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
