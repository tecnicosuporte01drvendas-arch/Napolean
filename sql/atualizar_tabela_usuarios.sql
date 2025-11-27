-- ============================================
-- Script para atualizar a tabela usuarios
-- Adiciona campos: nome e tipo (role)
-- ============================================

-- 1. Adicionar coluna 'nome' (opcional, pode ser null)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS nome TEXT;

-- 2. Adicionar coluna 'tipo' para definir o papel do usuário (lado Cliente)
-- Valores permitidos: 'gestor' ou 'colaborador'
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('gestor', 'colaborador'));

-- 3. Adicionar coluna 'perfil_sistema' para definir o papel global no sistema
-- Valores sugeridos: 'master', 'dev', 'cs', 'gestor', 'colaborador'
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS perfil_sistema TEXT;

-- 4. Adicionar coluna 'gestor_id' para vincular colaboradores/gestores ao gestor criador
-- - Para o próprio gestor principal, este campo pode ser NULL
-- - Para usuários criados na aba Equipe, vamos preencher com o id do gestor logado
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES public.usuarios (id);

-- 5. Adicionar coluna 'cs_id' para vincular gestores/colaboradores ao CS responsável
-- - Para usuários Master/Dev/CS, este campo pode ser NULL
-- - Para gestores criados por um CS, cs_id = id do CS
-- - Para colaboradores, cs_id deve seguir o cs_id do gestor responsável
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS cs_id UUID REFERENCES public.usuarios (id);

-- 6. Adicionar comentários para documentação
COMMENT ON COLUMN public.usuarios.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN public.usuarios.tipo IS 'Tipo de usuário: gestor (pode gerenciar equipe) ou colaborador (vendedor)';
COMMENT ON COLUMN public.usuarios.perfil_sistema IS 'Perfil global no sistema: master, dev, cs, gestor (cliente), colaborador.';
COMMENT ON COLUMN public.usuarios.gestor_id IS 'ID do gestor responsável por este usuário (controle de equipe). Usuário raiz pode ter gestor_id = NULL.';
COMMENT ON COLUMN public.usuarios.cs_id IS 'ID do usuário CS responsável por esta conta (gestor ou colaborador).';

-- 7. (Opcional) Se você quiser definir um valor padrão para usuários existentes
-- Descomente a linha abaixo se quiser que todos os usuários existentes virem 'colaborador' por padrão
-- UPDATE public.usuarios SET tipo = 'colaborador' WHERE tipo IS NULL;

-- ============================================
-- Verificação: Listar estrutura da tabela
-- ============================================
-- Execute este comando para verificar se as colunas foram criadas:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'usuarios'
-- ORDER BY ordinal_position;


