import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { MASTER_ADMIN_ROLES, PROJECT_READ_ROLES, PROJECT_WRITE_ROLES } from '@/lib/auth/roles';

const AUTH_EXEMPT_PATHS = ['/auth/signin', '/forbidden'];

function isWriteMethod(method: string) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (pathname === '/estimate' || pathname.startsWith('/estimate/')) {
    return NextResponse.redirect(new URL('/dupa-templates', request.url));
  }

  if (AUTH_EXEMPT_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  });
  const roles = (token?.roles as string[]) || [];
  const isApi = pathname.startsWith('/api');
  const method = request.method;

  if (pathname.startsWith('/api/admin') || pathname.startsWith('/admin')) {
    if (!token || !MASTER_ADMIN_ROLES.some(role => roles.includes(role))) {
      if (isApi) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  if (pathname.startsWith('/master') || pathname.startsWith('/catalog')) {
    if (!token || !MASTER_ADMIN_ROLES.some(role => roles.includes(role))) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  if (pathname.startsWith('/api/master') || pathname.startsWith('/api/catalog')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isWriteMethod(method) && !MASTER_ADMIN_ROLES.some(role => roles.includes(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (pathname.startsWith('/api/projects')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const requiredRoles = isWriteMethod(method) ? PROJECT_WRITE_ROLES : PROJECT_READ_ROLES;
    if (!requiredRoles.some(role => roles.includes(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (pathname.startsWith('/projects')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    if (!PROJECT_READ_ROLES.some(role => roles.includes(role))) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
