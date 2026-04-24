import { NextResponse, type NextRequest } from 'next/server'

// ─── In-memory stores (reset on cold start — use Redis/KV for persistence) ───
const ipRequestCounts = new Map<string, { count: number; windowStart: number; blocked: boolean; blockUntil: number }>()
const loginAttempts   = new Map<string, { count: number; windowStart: number }>()

// ─── Config ──────────────────────────────────────────────────────────────────
const RATE_LIMIT = {
  global:  { requests: 300, windowMs: 60_000 },       // 300 req/min per IP (DDoS)
  api:     { requests: 60,  windowMs: 60_000 },        // 60 API req/min per IP
  auth:    { requests: 10,  windowMs: 15 * 60_000 },   // 10 login attempts per 15 min
  blockMs: 30 * 60_000,                                // Block for 30 min after violation
}

// ─── SQL injection / attack patterns ─────────────────────────────────────────
const ATTACK_PATTERNS = [
  /(\bUNION\b.*\bSELECT\b|\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
  /(\bDROP\b|\bTRUNCATE\b|\bDELETE\b\s+\bFROM\b|\bINSERT\b\s+\bINTO\b)/i,
  /('|"|;|--|\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/i,
  /(\/\*[\s\S]*?\*\/|xp_cmdshell|exec\s*\(|EXECUTE\s*\()/i,
  /(<script[\s\S]*?>[\s\S]*?<\/script>|javascript:|on\w+\s*=)/i,  // XSS
  /(\.\.\/|\.\.\\|%2e%2e%2f|%252e%252e)/i,                        // Path traversal
  /(\beval\s*\(|\bexec\s*\(|base64_decode|system\s*\()/i,         // Code injection
]

function getIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function isAttackPattern(value: string): boolean {
  return ATTACK_PATTERNS.some(p => p.test(decodeURIComponent(value)))
}

function scanRequest(request: NextRequest): boolean {
  const url = request.nextUrl.toString()
  if (isAttackPattern(url)) return true

  // Scan query params
  request.nextUrl.searchParams.forEach(v => {
    if (isAttackPattern(v)) return true
  })

  return false
}

export async function middleware(request: NextRequest) {
  const ip   = getIP(request)
  const path = request.nextUrl.pathname
  const now  = Date.now()

  // ── 1. Check if IP is currently blocked ──────────────────────────────────
  const ipData = ipRequestCounts.get(ip)
  if (ipData?.blocked && now < ipData.blockUntil) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((ipData.blockUntil - now) / 1000)),
        'X-Block-Reason': 'Rate limit exceeded',
      },
    })
  }

  // ── 2. SQL injection / attack pattern detection ───────────────────────────
  if (scanRequest(request)) {
    // Block this IP for 30 minutes
    ipRequestCounts.set(ip, {
      count: 9999,
      windowStart: now,
      blocked: true,
      blockUntil: now + RATE_LIMIT.blockMs,
    })
    return new NextResponse('Forbidden', { status: 403 })
  }

  // ── 3. Global rate limiting (DDoS protection) ────────────────────────────
  const globalEntry = ipRequestCounts.get(ip) || { count: 0, windowStart: now, blocked: false, blockUntil: 0 }
  if (now - globalEntry.windowStart > RATE_LIMIT.global.windowMs) {
    globalEntry.count = 0
    globalEntry.windowStart = now
  }
  globalEntry.count++
  ipRequestCounts.set(ip, globalEntry)

  if (globalEntry.count > RATE_LIMIT.global.requests) {
    globalEntry.blocked  = true
    globalEntry.blockUntil = now + RATE_LIMIT.blockMs
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  // ── 4. Stricter rate limit on API routes ─────────────────────────────────
  if (path.startsWith('/api/')) {
    if (globalEntry.count > RATE_LIMIT.api.requests) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
  }

  // ── 5. Auth endpoint brute-force protection ───────────────────────────────
  if (path === '/api/auth/session' && request.method === 'POST') {
    const authEntry = loginAttempts.get(ip) || { count: 0, windowStart: now }
    if (now - authEntry.windowStart > RATE_LIMIT.auth.windowMs) {
      authEntry.count = 0
      authEntry.windowStart = now
    }
    authEntry.count++
    loginAttempts.set(ip, authEntry)

    if (authEntry.count > RATE_LIMIT.auth.requests) {
      // Block IP for 30 min after too many login attempts
      ipRequestCounts.set(ip, { ...globalEntry, blocked: true, blockUntil: now + RATE_LIMIT.blockMs })
      return new NextResponse('Too Many Requests — Try again later', { status: 429 })
    }
  }

  // ── 6. Add security headers to every response ────────────────────────────
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|lottie)$).*)',
  ],
}
