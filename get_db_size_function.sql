-- Run all of these in Supabase SQL Editor

-- 1. Total database size
create or replace function get_db_size()
returns bigint
language sql
security definer
as $$
  select pg_database_size(current_database());
$$;

-- 2. Total storage size (sum of all file metadata)
create or replace function get_storage_size()
returns bigint
language sql
security definer
as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)
  from storage.objects
  where (metadata->>'size') is not null;
$$;

-- 3. Top tables by size (for DB breakdown)
create or replace function get_table_sizes()
returns table(schema_name text, table_name text, total_bytes bigint, row_count bigint)
language sql
security definer
as $$
  select
    schemaname::text,
    tablename::text,
    pg_total_relation_size(schemaname || '.' || tablename)::bigint as total_bytes,
    (select reltuples::bigint from pg_class where relname = tablename) as row_count
  from pg_tables
  where schemaname = 'public'
  order by total_bytes desc
  limit 15;
$$;

-- 4. Storage breakdown by bucket
create or replace function get_storage_by_bucket()
returns table(bucket_id text, file_count bigint, total_bytes bigint)
language sql
security definer
as $$
  select
    bucket_id::text,
    count(*)::bigint as file_count,
    coalesce(sum((metadata->>'size')::bigint), 0)::bigint as total_bytes
  from storage.objects
  where (metadata->>'size') is not null
  group by bucket_id
  order by total_bytes desc;
$$;
