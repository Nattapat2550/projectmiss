// frontend/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/help', '/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ข้ามการทำงานถ้าเป็นไฟล์ assets หรือ API ของระบบ
  if (pathname.includes('.') || pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // 2. ดึง token จาก cookie
  const token = request.cookies.get('token')?.value;

  // 3. เช็คว่าเป็น Public Path หรือไม่
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname === `${path}/`
  );

  // 4. ถ้าไม่มี Token และไม่ได้เข้าหน้า Public ให้เด้งไป Login (พร้อมจำหน้าล่าสุด)
  if (!token && !isPublicPath) {
    const url = new URL('/login', request.url);
    // แนบพารามิเตอร์ callbackUrl เพื่อให้ Login เสร็จแล้วกลับมาหน้าเดิมได้
    url.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // 5. ถ้ามี Token แล้ว แต่พยายามเข้าหน้า Login ให้เด้งไป Dashboard หรือหน้าเดิม
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};