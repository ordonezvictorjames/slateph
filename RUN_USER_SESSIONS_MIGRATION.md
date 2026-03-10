# Run User Sessions Migration

## Quick Setup Instructions

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire content from `create_user_sessions_tracking.sql`
4. Paste it into the SQL editor
5. Click **Run** to execute

### Option 2: Local Database
If you have PostgreSQL installed locally:
```bash
# Replace with your actual database connection details
psql -h localhost -U postgres -d slateph -f create_user_sessions_tracking.sql
```

### Option 3: Copy-Paste Method
1. Open your database client (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open `create_user_sessions_tracking.sql` file
4. Copy all content and execute in your database client

### What This Migration Creates:
- `user_sessions` table for tracking user devices and sessions
- Database functions for session management:
  - `record_user_session()` - Records/updates sessions
  - `get_user_sessions()` - Retrieves user sessions
  - `end_user_session()` - Ends specific session
  - `end_all_other_sessions()` - Security feature
- Proper indexes for performance
- RLS disabled (using custom auth)

### Verification
After running the migration, you should see:
```sql
-- Check if table was created
SELECT * FROM user_sessions LIMIT 1;

-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%session%';
```

### Expected Result
You should see the message:
```
User sessions tracking system created successfully!
```

**Once migration is complete, user sessions will be fully dynamic!** 🚀