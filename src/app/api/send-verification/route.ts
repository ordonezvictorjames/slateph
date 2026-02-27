import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, code, firstName } = await request.json()

    console.log('Verification code generated for:', email)
    console.log('Code:', code)

    if (!email || !code || !firstName) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Return success with code (no email sending)
    return NextResponse.json({
      success: true,
      message: 'Verification code generated',
      code: code,
    })
  } catch (error) {
    console.error('Send verification error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
