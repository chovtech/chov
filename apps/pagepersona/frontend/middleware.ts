import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  // Protected routes
  const protectedRoutes = ['/dashboard']
  const isProtected = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Auth routes — redirect to dashboard if already logged in
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  )

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
