import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'slate_session'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours in seconds

// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// GET - Retrieve current session
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ session: null }, { 
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      })
    }

    // Decode the session data (userId, role, email)
    const sessionData = JSON.parse(sessionCookie.value)
    
    // Return session with id field for compatibility with AuthContext
    return NextResponse.json({ 
      session: {
        id: sessionData.userId,
        role: sessionData.role,
        email: sessionData.email
      } 
    }, { 
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    })
  } catch (error) {
    console.error('Session retrieval error:', error)
    return NextResponse.json({ session: null }, { status: 200 })
  }
}

// POST - Create or update session
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { userId, role, email } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      )
    }

    // Validate userId is a UUID
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    // Validate role is one of the allowed values
    const VALID_ROLES = ['admin', 'developer', 'instructor', 'shs_student', 'jhs_student', 'college_student', 'scholar', 'guest']
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Validate email format if provided
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    // Store only minimal data in cookie to avoid size limits
    const sessionData = {
      userId,
      role,
      email
    }

    // Create response with session cookie
    const response = NextResponse.json({ success: true }, { status: 200 })
    
    // Set HTTP-only cookie with minimal session data
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: JSON.stringify(sessionData),
      httpOnly: true,
      secure: true, // always secure — Vercel always serves over HTTPS
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

// DELETE - Clear session
export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true }, { status: 200 })
    
    // Clear the session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Session deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}
