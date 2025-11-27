-- ============================================
-- Configurar Políticas RLS para o bucket 'relatorios'
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- OPÇÃO 1: Políticas para permitir upload e leitura SEM autenticação Supabase
-- Como o sistema usa autenticação customizada, precisamos permitir para 'public' e 'anon'

-- Política de UPLOAD (INSERT) - Permite para todos (já que usamos autenticação customizada)
CREATE POLICY "Permitir upload de arquivos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'relatorios'
);

-- Política de LEITURA (SELECT) - Público
CREATE POLICY "Permitir leitura pública de arquivos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'relatorios');

-- Política de ATUALIZAÇÃO (UPDATE) - Opcional
CREATE POLICY "Permitir atualização de arquivos próprios"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'relatorios')
WITH CHECK (bucket_id = 'relatorios');

-- Política de DELEÇÃO (DELETE) - Opcional
CREATE POLICY "Permitir deleção de arquivos próprios"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'relatorios');

-- ============================================
-- OPÇÃO 2: Desabilitar RLS temporariamente (APENAS PARA DESENVOLVIMENTO)
-- ============================================
-- Se você quiser desabilitar RLS completamente para testar:
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Verificar políticas existentes
-- ============================================
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- ============================================
-- Remover políticas antigas (se necessário)
-- ============================================
-- DROP POLICY IF EXISTS "Permitir upload de arquivos" ON storage.objects;
-- DROP POLICY IF EXISTS "Permitir leitura pública de arquivos" ON storage.objects;
-- DROP POLICY IF EXISTS "Permitir atualização de arquivos próprios" ON storage.objects;
-- DROP POLICY IF EXISTS "Permitir deleção de arquivos próprios" ON storage.objects;

