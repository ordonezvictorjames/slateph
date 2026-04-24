import { NextRequest, NextResponse } from 'next/server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const { email, code, firstName } = await request.json()

    if (!email || !code || !firstName) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate code is exactly 6 alphanumeric characters
    if (!/^[A-Z0-9]{6}$/i.test(String(code))) {
      return NextResponse.json(
        { success: false, message: 'Invalid code format' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code generated',
      code: code,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
