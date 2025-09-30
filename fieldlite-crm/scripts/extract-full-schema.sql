-- Complete Schema Extraction Script
-- Run this in Supabase SQL Editor to get full schema

-- 1. Get all tables with row counts
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.schemaname AND table_name = t.tablename) as column_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Get detailed table definitions with all columns
SELECT
    t.table_name,
    json_agg(
        json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'character_maximum_length', c.character_maximum_length,
            'is_nullable', c.is_nullable,
            'column_default', c.column_default,
            'is_identity', c.is_identity,
            'identity_generation', c.identity_generation
        ) ORDER BY c.ordinal_position
    ) as columns
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
GROUP BY t.table_name
ORDER BY t.table_name;

-- 3. Get all foreign key relationships
SELECT
    tc.table_name as source_table,
    kcu.column_name as source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 4. Get all indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. Get all views
SELECT
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 6. Get all functions/stored procedures
SELECT
    routine_name,
    routine_type,
    data_type as return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 7. Get RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. Get all triggers
SELECT
    trigger_schema,
    event_object_table as table_name,
    trigger_name,
    event_manipulation as trigger_event,
    action_timing as trigger_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 9. Get all sequences
SELECT
    sequence_schema,
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- 10. Get table comments
SELECT
    schemaname,
    tablename,
    obj_description(pgc.oid) AS comment
FROM pg_tables t
JOIN pg_class pgc ON t.tablename = pgc.relname
WHERE t.schemaname = 'public'
    AND obj_description(pgc.oid) IS NOT NULL
ORDER BY tablename;