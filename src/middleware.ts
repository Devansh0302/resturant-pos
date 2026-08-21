import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/tenant-branding') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string;
  const restaurantId = (token as any).restaurantId as string;
  const isYangkiez = restaurantId === 'cmt1yrr3b0000l504jzjmwajb';
  
  // Default routing access (for all other restaurants - legacy mode)
  let roleAccess: Record<string, string[]> = {
    '/dashboard': ['ADMIN', 'CASHIER'],
    '/tables': ['ADMIN', 'CASHIER', 'WAITER'],
    '/menu': ['ADMIN', 'CASHIER', 'WAITER'],
    '/bills': ['ADMIN', 'CASHIER'],
    '/reports': ['ADMIN'],
    '/staff-performance': ['ADMIN'],
    '/staff': ['ADMIN'],
    '/support': ['ADMIN', 'CASHIER', 'WAITER'],
    '/settings': ['ADMIN'],
    '/delivery': ['ADMIN', 'CASHIER'],
    '/super-admin': ['SUPER_ADMIN'],
    '/kds': ['ADMIN', 'CHEF', 'KITCHEN']
  };

  // Yangkiez specific routing access
  if (isYangkiez) {
    roleAccess = {
      '/dashboard': ['ADMIN', 'MANAGER', 'CASHIER'],
      '/tables': ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'],
      '/menu': ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'],
      '/bills': ['ADMIN', 'MANAGER', 'CASHIER'],
      '/reports': ['ADMIN', 'MANAGER'],
      '/staff-performance': ['ADMIN', 'MANAGER'],
      '/staff': ['ADMIN'],
      '/support': ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'],
      '/settings': ['ADMIN'],
      '/delivery': ['ADMIN', 'MANAGER', 'CASHIER'],
      '/super-admin': ['SUPER_ADMIN'],
      '/kds': ['ADMIN', 'MANAGER', 'CHEF', 'KITCHEN']
    };
  }

  // Find if the current path is restricted
  for (const [route, allowedRoles] of Object.entries(roleAccess)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(role)) {
        // Redirect unauthorized user to a safe default page
        let defaultPage = '/tables';
        if (role === 'CHEF' || role === 'KITCHEN') defaultPage = '/kds';
        if (role === 'CASHIER' || role === 'ADMIN' || role === 'MANAGER') defaultPage = '/dashboard';
        if (role === 'SUPER_ADMIN') defaultPage = '/super-admin';
        
        return NextResponse.redirect(new URL(defaultPage, request.url));
      }
      break;
    }
  }

  // Handle root route '/'
  if (pathname === '/') {
    let defaultPage = '/tables'; 
    if (role === 'CHEF' || role === 'KITCHEN') defaultPage = '/kds';
    if (role === 'CASHIER' || role === 'ADMIN' || role === 'MANAGER') defaultPage = '/dashboard';
    if (role === 'SUPER_ADMIN') defaultPage = '/super-admin';
    return NextResponse.redirect(new URL(defaultPage, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
