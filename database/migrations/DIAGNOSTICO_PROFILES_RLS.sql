-- DIAGNÓSTICO: ¿Por qué falla el query de profiles?
-- Query que está fallando:
-- GET /rest/v1/profiles?select=id,full_name,avatar_url,email,phone&id=in.(64c81334-9bc4-42ef-826d-8fbd44b8b414,b8a69087-bb5c-4c18-9de7-c296a29e12a5)

-- Test 1: ¿Existen los registros en chat_participants?
SELECT 
  cp.thread_id,
  cp.user_id,
  cp.contact_id,
  t.property_id
FROM chat_participants cp
JOIN chat_threads t ON t.id = cp.thread_id
WHERE cp.user_id IN ('64c81334-9bc4-42ef-826d-8fbd44b8b414', 'b8a69087-bb5c-4c18-9de7-c296a29e12a5')
   OR cp.contact_id IN ('64c81334-9bc4-42ef-826d-8fbd44b8b414', 'b8a69087-bb5c-4c18-9de7-c296a29e12a5');

-- Test 2: ¿El usuario autenticado puede ver estos perfiles con la política actual?
-- Simular como usuario: 64c81334-9bc4-42ef-826d-8fbd44b8b414
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims.sub TO '64c81334-9bc4-42ef-826d-8fbd44b8b414';

SELECT id, full_name 
FROM profiles 
WHERE id IN ('64c81334-9bc4-42ef-826d-8fbd44b8b414', 'b8a69087-bb5c-4c18-9de7-c296a29e12a5');

-- Test 3: ¿Funciona la subquery EXISTS de la política?
SELECT 
  p.id,
  p.full_name,
  EXISTS (
    SELECT 1 
    FROM public.chat_participants cp1
    JOIN public.chat_participants cp2 ON cp2.thread_id = cp1.thread_id
    WHERE cp1.user_id = '64c81334-9bc4-42ef-826d-8fbd44b8b414'
      AND cp2.user_id = p.id
  ) as puede_ver
FROM profiles p
WHERE p.id IN ('64c81334-9bc4-42ef-826d-8fbd44b8b414', 'b8a69087-bb5c-4c18-9de7-c296a29e12a5');

RESET role;
