-- VERIFICAR: ¿Se están insertando correctamente los participantes?

-- Ver todos los threads recientes y sus participantes
SELECT 
  t.id as thread_id,
  t.property_id,
  t.org_id,
  t.created_at,
  json_agg(json_build_object(
    'user_id', cp.user_id,
    'contact_id', cp.contact_id
  )) as participants
FROM chat_threads t
LEFT JOIN chat_participants cp ON cp.thread_id = t.id
WHERE t.created_at > NOW() - INTERVAL '1 hour'
GROUP BY t.id
ORDER BY t.created_at DESC
LIMIT 5;

-- Ver el thread específico del error
SELECT 
  t.id,
  t.property_id,
  cp.user_id,
  cp.contact_id,
  p.full_name,
  p.email
FROM chat_threads t
JOIN chat_participants cp ON cp.thread_id = t.id
LEFT JOIN profiles p ON p.id = cp.user_id
WHERE t.id = 'e1467e51-8b78-4e7c-a224-db06eb43088c';
