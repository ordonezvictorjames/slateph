import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Called daily by Vercel Cron or any external scheduler.
// Vercel cron config lives in vercel.json — add:
//   { "path": "/api/cron/cleanup-inactive-users", "schedule": "0 2 * * *" }

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Simple secret check so only the scheduler can trigger this
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Step 1: Flag users inactive for 3+ days (gives them a 2-day window)
  const { data: flagResult, error: flagError } = await supabase
    .rpc('flag_inactive_users_for_deletion')

  if (flagError) {
    console.error('[cron] flag_inactive_users_for_deletion error:', flagError)
    return NextResponse.json({ error: flagError.message }, { status: 500 })
  }

  // Step 2: Delete accounts whose 2-day window has expired
  const { data: deleteResult, error: deleteError } = await supabase
    .rpc('delete_scheduled_accounts')

  if (deleteError) {
    console.error('[cron] delete_scheduled_accounts error:', deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  console.log('[cron] cleanup-inactive-users:', { flagResult, deleteResult })

  return NextResponse.json({
    success: true,
    flagged: flagResult,
    deleted: deleteResult,
    timestamp: new Date().toISOString()
  })
}
