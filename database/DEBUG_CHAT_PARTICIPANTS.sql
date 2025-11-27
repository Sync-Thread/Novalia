-- Query para verificar el problema de nombres de contactos
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar datos en chat_participants con joins
SELECT 
  cp.thread_id,
  cp.user_id,
  cp.contact_id,
  p.full_name as profile_name,
  p.email as profile_email,
  lc.full_name as contact_name,
  lc.email as contact_email
FROM chat_participants cp
LEFT JOIN profiles p ON cp.user_id = p.id
LEFT JOIN lead_contacts lc ON cp.contact_id = lc.id
ORDER BY cp.thread_id
LIMIT 20;

-- 2. Verificar si hay participantes sin datos
SELECT 
  COUNT(*) as total_participants,
  COUNT(cp.user_id) as with_user_id,
  COUNT(cp.contact_id) as with_contact_id,
  COUNT(p.id) as profiles_found,
  COUNT(lc.id) as contacts_found
FROM chat_participants cp
LEFT JOIN profiles p ON cp.user_id = p.id
LEFT JOIN lead_contacts lc ON cp.contact_id = lc.id;

-- 3. Verificar threads completos con participantes
SELECT 
  ct.id as thread_id,
  ct.property_id,
  ct.created_at,
  jsonb_agg(
    jsonb_build_object(
      'user_id', cp.user_id,
      'contact_id', cp.contact_id,
      'profile_name', p.full_name,
      'contact_name', lc.full_name
    )
  ) as participants
FROM chat_threads ct
LEFT JOIN chat_participants cp ON ct.id = cp.thread_id
LEFT JOIN profiles p ON cp.user_id = p.id
LEFT JOIN lead_contacts lc ON cp.contact_id = lc.id
GROUP BY ct.id
ORDER BY ct.created_at DESC
LIMIT 10;

-- 4. Verificar RLS policies de profiles
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
WHERE tablename IN ('profiles', 'lead_contacts', 'chat_participants')
ORDER BY tablename, policyname;
