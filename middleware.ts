import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = new Set([
  'https://xylxf.xyz',
  'https://admin.xylxf.xyz',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
]);

function withCors(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get('origin');
  res.headers.append('Vary', 'Origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin); // 回显，不写死
  }
  res.headers.set('Access-control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-headers', 'Content-Type, Authorization, Idempotency-Key');
  res.headers.set('Access-Control-Max-Age', '600');
  return res;
}

export function middleware(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return withCors(req, new NextResponse(null, { status: 204 }));
  }
  return withCors(req, NextResponse.next());
}

export const config = { matcher: ['/api/:path*'] };
