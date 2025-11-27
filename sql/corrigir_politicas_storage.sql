-- ============================================
-- CORRIGIR Políticas RLS para funcionar sem Supabase Auth
-- Execute este SQL se as políticas atuais não estão funcionando
-- ============================================

-- 1. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Permitir upload de arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública de arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view files" ON storage.objects;

-- 2. Criar novas políticas que funcionam SEM autenticação Supabase
-- Como o sistema usa autenticação customizada (email + código), 
-- precisamos permitir para 'public' e 'anon'

-- Política de UPLOAD (INSERT) - Permite para todos
CREATE POLICY "Permitir upload de arquivos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'relatorios');

-- Política de LEITURA (SELECT) - Público
CREATE POLICY "Permitir leitura pública de arquivos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'relatorios');

-- Política de ATUALIZAÇÃO (UPDATE) - Opcional
CREATE POLICY "Permitir atualização de arquivos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'relatorios')
WITH CHECK (bucket_id = 'relatorios');

-- Política de DELEÇÃO (DELETE) - Opcional
CREATE POLICY "Permitir deleção de arquivos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'relatorios');

-- ============================================
-- Verificar políticas criadas
-- ============================================
-- SELECT policyname, cmd, roles 
-- FROM pg_policies 
-- WHERE tablename = 'objects' AND schemaname = 'storage';


