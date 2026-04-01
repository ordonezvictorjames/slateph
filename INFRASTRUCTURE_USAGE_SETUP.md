# Infrastructure Usage Cards Setup

The developer dashboard now shows live usage for Database, File Storage, and Egress (bandwidth).

## Setup Steps

### 1. Run SQL Functions (Required)

Open Supabase SQL Editor and run `get_db_size_function.sql`:

```sql
-- Creates two RPC functions:
-- get_db_size() → returns database size in bytes
-- get_storage_size() → returns total file storage size in bytes
```

### 2. Add Environment Variables

Add to `.env.local`:

```env
# Service role key (from Supabase → Settings → API)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Access token (from https://supabase.com/dashboard/account/tokens)
# Optional — only needed for egress/bandwidth data
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Restart Dev Server

```bash
npm run dev
```

## What Works Now

- **Database** — live size via `pg_database_size()`
- **File Storage** — live size by summing `storage.objects` metadata
- **Egress** — shows "—" until you add `SUPABASE_ACCESS_TOKEN`

## Getting the Access Token (Optional)

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name it "Usage API" with read-only scope
4. Copy the `sbp_...` token
5. Add to `.env.local` as `SUPABASE_ACCESS_TOKEN`
6. Restart dev server

Without the access token, egress will show "—" with a note to add it.

## Free Tier Limits

- Database: 500 MB
- File Storage: 1 GB
- Egress: 5 GB / month (resets monthly)

Progress bars turn amber at 70% and red at 90%.
