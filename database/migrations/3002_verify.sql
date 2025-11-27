-- Verificar el estado de las políticas RLS en profiles

-- 1. Ver todas las políticas actuales en profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 2. Verificar si existe la nueva política
SELECT EXISTS (
  SELECT 1 
  FROM pg_policies 
  WHERE tablename = 'profiles' 
    AND policyname = 'profiles_self_and_chat_select'
) as nueva_politica_existe;

-- 3. Verificar si existe la vieja política (debería ser false)
SELECT EXISTS (
  SELECT 1 
  FROM pg_policies 
  WHERE tablename = 'profiles' 
    AND policyname = 'profiles_self_select'
) as vieja_politica_existe;
