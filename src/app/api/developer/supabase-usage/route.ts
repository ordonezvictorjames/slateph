import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  const key = SERVICE_ROLE_KEY || ANON_KEY
  const supabase = createClient(SUPABASE_URL, key)

  const GB = 1073741824
  const MB = 1048576

  // --- Database size + breakdown ---
  let dbBytes = 0
  let tables: any[] = []
  try {
    const { data: sizeData } = await supabase.rpc('get_db_size')
    dbBytes = Number(sizeData) || 0
    const { data: tablesData } = await supabase.rpc('get_table_sizes')
    tables = (tablesData || []).map((t: any) => ({
      name: t.table_name,
      bytes: Number(t.total_bytes) || 0,
      rows: Number(t.row_count) || 0,
    }))
  } catch { /* RPCs not created yet */ }

  // --- Storage size + breakdown ---
  let storageBytes = 0
  let buckets: any[] = []
  try {
    const { data: sizeData } = await supabase.rpc('get_storage_size')
    storageBytes = Number(sizeData) || 0
    const { data: bucketsData } = await supabase.rpc('get_storage_by_bucket')
    buckets = (bucketsData || []).map((b: any) => ({
      name: b.bucket_id,
      bytes: Number(b.total_bytes) || 0,
      files: Number(b.file_count) || 0,
    }))
  } catch { /* RPCs not created yet */ }

  return NextResponse.json({
    db: { bytes: dbBytes, limitBytes: 500 * MB, tables },
    storage: { bytes: storageBytes, limitBytes: GB, buckets },
    egress: { bytes: null, limitBytes: 5 * GB },
  })
}
