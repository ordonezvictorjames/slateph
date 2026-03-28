import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) || 'missing'
    },
    build: {
      nextVersion: '15.5.12',
      nodeVersion: process.version
    }
  }, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' }
  })
}
