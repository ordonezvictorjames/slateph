# Chat Tables Fix

## Issue
CourseChat component is failing with empty error objects when trying to send messages. This indicates the chat tables don't exist in the database.

## Error
```
Error sending message: {}
Error details: {}
```

## Solution

Run the SQL migration to create the chat tables:

```bash
# In Supabase SQL Editor
create_chat_tables.sql
```

## What This Creates

### 1. Tables

#### `course_chat_messages`
- Messages for specific courses
- Linked to course and sender
- Timestamps for sorting

#### `lounge_chat_messages`
- General chat for all users
- Not linked to specific course
- Timestamps for sorting

### 2. Row Level Security (RLS) Policies

#### Course Chat Policies:
- **View**: Users enrolled in course, instructors, or admins
- **Send**: Same as view
- **Update**: Own messages only
- **Delete**: Own messages or admins

#### Lounge Chat Policies:
- **View**: All authenticated users
- **Send**: All authenticated users
- **Update**: Own messages only
- **Delete**: Own messages or admins

### 3. Helper Functions

```sql
-- Get course chat messages
SELECT * FROM get_course_chat_messages('course-id', 50);

-- Get lounge chat messages
SELECT * FROM get_lounge_chat_messages(50);
```

## After Running Migration

1. Refresh your browser
2. Try sending a chat message
3. Error should be resolved

## Verification

Check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('course_chat_messages', 'lounge_chat_messages');
```

Check if policies exist:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('course_chat_messages', 'lounge_chat_messages');
```

## Testing

### Test Course Chat
```sql
-- Insert test message (replace with real IDs)
INSERT INTO course_chat_messages (course_id, sender_id, message)
VALUES ('your-course-id', 'your-user-id', 'Test message');

-- View messages
SELECT * FROM course_chat_messages;
```

### Test Lounge Chat
```sql
-- Insert test message
INSERT INTO lounge_chat_messages (sender_id, message)
VALUES ('your-user-id', 'Test lounge message');

-- View messages
SELECT * FROM lounge_chat_messages;
```

## Features

### Course Chat
- Private to course members
- Instructors can see all messages
- Admins have full access
- Students only see courses they're enrolled in

### Lounge Chat
- Public to all authenticated users
- General discussion area
- No course restrictions

### Message Management
- Users can edit their own messages
- Users can delete their own messages
- Admins can delete any message
- Messages are soft-deleted (can be recovered)

## Troubleshooting

### Still Getting Errors?

1. **Check authentication**:
```sql
SELECT auth.uid(); -- Should return your user ID
```

2. **Check enrollment** (for course chat):
```sql
SELECT * FROM enrollments WHERE user_id = auth.uid();
```

3. **Check RLS policies**:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'course_chat_messages';
```

4. **Test with admin account**:
   - Admins bypass most restrictions
   - If admin works, it's a permission issue

### Common Issues

1. **"relation does not exist"**
   - Tables not created
   - Run `create_chat_tables.sql`

2. **"violates row-level security policy"**
   - User not enrolled in course
   - Check enrollments table
   - Or use lounge chat instead

3. **Empty error object `{}`**
   - Network issue
   - Check Supabase connection
   - Verify .env.local has correct credentials

## Files Created

- `create_chat_tables.sql` - Database migration
- `CHAT_TABLES_FIX.md` - This guide
