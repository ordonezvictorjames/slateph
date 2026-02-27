import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'slate_session'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours in seconds

// GET - Retrieve current session
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ session: null }, { status: 200 })
    }

    // Decode the session data (only userId, role, email)
    const sessionData = JSON.parse(sessionCookie.value)
    
    return NextResponse.json({ session: sessionData }, { status: 200 })
  } catch (error) {
    console.error('Session retrieval error:', error)
    return NextResponse.json({ session: null }, { status: 200 })
  }
}

// POST - Create or update session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, role, email } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      )
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
