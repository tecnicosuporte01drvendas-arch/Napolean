# Atualizar Tabela de Usuários no Supabase

Para que a página "Equipe" funcione corretamente, você precisa adicionar os campos `nome` e `tipo` na tabela `usuarios` do Supabase.

## Passo 1: Acessar o SQL Editor

1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz
2. Vá em **SQL Editor** no menu lateral
3. Clique em **New Query**

## Passo 2: Executar o SQL

Cole e execute o seguinte SQL:

```sql
-- Adicionar coluna 'nome' (opcional)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS nome TEXT;

-- Adicionar coluna 'tipo' (gestor ou colaborador)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('gestor', 'colaborador'));

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.usuarios.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN public.usuarios.tipo IS 'Tipo de usuário: gestor ou colaborador';
```

## Passo 3: Verificar

Após executar o SQL, verifique se as colunas foram criadas:

1. Vá em **Table Editor** no menu lateral
2. Selecione a tabela `usuarios`
3. Verifique se as colunas `nome` e `tipo` aparecem na lista

## Estrutura Final da Tabela

A tabela `usuarios` deve ter os seguintes campos:

- `id` (uuid, primary key) - Gerado automaticamente
- `email` (text, unique, not null) - Email do usuário
- `telefone` (text, nullable) - Telefone do usuário
- `nome` (text, nullable) - Nome completo do usuário (NOVO)
- `tipo` (text, nullable) - Tipo: 'gestor' ou 'colaborador' (NOVO)
- `criado_em` (timestamptz) - Data de criação (gerado automaticamente)

## Tipos de Usuário

### Gestor
- Pode cadastrar, editar e excluir usuários colaboradores
- Recebe cópia de todos os relatórios gerados pelos colaboradores
- Tem acesso ao painel de relatórios na interface web

### Colaborador
- Pode enviar áudios pelo WhatsApp ou transcrições (.PDF/.TXT) pela interface web
- Recebe apenas os seus próprios relatórios via WhatsApp

## Próximos Passos

Após atualizar a tabela, você pode:

1. Acessar a página "Equipe" no menu lateral
2. Cadastrar novos usuários
3. Editar usuários existentes
4. Excluir usuários
5. Definir o tipo de cada usuário (gestor ou colaborador)


