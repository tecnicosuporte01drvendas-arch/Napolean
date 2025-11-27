# Configuração do Supabase

## Passo 1: Criar arquivo .env

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
VITE_SUPABASE_URL=https://pvbibgtwrkjkynmtfjiz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YmliZ3R3cmtqa3lubXRmaml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwODM4NTksImV4cCI6MjA3OTY1OTg1OX0.OskDi2dHLBmgopHmmXM3zmtX76gYw4gGZtiVD7idTh0
```

> **Nota:** As credenciais do Gmail (Client ID, Client Secret, Refresh Token) devem ser configuradas como **Secrets** no Supabase Dashboard, não no arquivo `.env`. Veja `GMAIL_OAUTH_SETUP.md` para mais detalhes.

## Passo 2: Estrutura do Banco de Dados

O projeto está configurado para trabalhar com as seguintes tabelas:

### Tabela: `usuarios`
- `id` (uuid, primary key)
- `email` (text, unique)
- `telefone` (text, nullable)
- `nome` (text, nullable) - **NOVO**: Nome completo do usuário
- `tipo` (text, nullable) - **NOVO**: Tipo de usuário ('gestor' ou 'colaborador')
- `criado_em` (timestamptz)

> **⚠️ IMPORTANTE:** Para usar a página "Equipe", você precisa executar o SQL em `sql/atualizar_tabela_usuarios.sql`. Veja `COMO_EXECUTAR_SQL.md` para instruções detalhadas.

### Tabela: `codigos_verificacao`
- `id` (uuid, primary key)
- `email_usuario` (text, foreign key -> usuarios.email)
- `codigo` (text)
- `foi_usado` (boolean)
- `expira_em` (timestamptz)
- `criado_em` (timestamptz)

### Tabela: `relatorios`
- `id` (uuid, primary key)
- `id_usuario` (uuid, foreign key -> usuarios.id)
- `nome_arquivo` (text, nullable)
- `url_arquivo` (text, nullable)
- `nota_boas_vindas` (numeric, nullable) - Etapa 1
- `nota_identificacao` (numeric, nullable) - Etapa 2
- `nota_historia` (numeric, nullable) - Etapa 3
- `nota_pilares` (numeric, nullable) - Etapa 4
- `nota_objecoes` (numeric, nullable) - Etapa 5
- `nota_impacto` (numeric, nullable) - Etapa 6
- `nota_proposta` (numeric, nullable) - Etapa 7
- `nota_media` (numeric, nullable)
- `resumo_pontos_fortes` (text, nullable)
- `resumo_melhorias` (text, nullable)
- `texto_relatorio_completo` (text, nullable)
- `criado_em` (timestamptz)

## Passo 3: Políticas de Segurança (RLS)

Certifique-se de configurar as Row Level Security (RLS) no Supabase:

1. Acesse o Dashboard do Supabase
2. Vá em Authentication > Policies
3. Configure as políticas conforme necessário

**Recomendação para desenvolvimento:**
- Você pode desabilitar temporariamente o RLS para testar
- Ou criar políticas que permitam todas as operações para usuários autenticados

## Arquivos Criados

- `src/lib/supabase.ts` - Cliente Supabase
- `src/lib/database.types.ts` - Tipos TypeScript
- `src/lib/supabaseServices.ts` - Serviços para interagir com o banco
- `src/hooks/useSupabase.ts` - Hooks React Query
- `src/contexts/AuthContext.tsx` - Contexto de autenticação

## Funcionalidades Implementadas

✅ Login com código de verificação
✅ Criação automática de usuários
✅ Gerenciamento de sessão
✅ Serviços para CRUD de relatórios
✅ Hooks React Query para dados

## Próximos Passos

1. ✅ Implementar envio real de emails para códigos OTP (veja `GMAIL_OAUTH_SETUP.md`)
2. Atualizar Dashboard para mostrar relatórios reais
3. Implementar upload de arquivos (Storage)
4. Criar interface para adicionar novos relatórios

## Configuração de Email

Para configurar o envio de emails via Gmail OAuth2, siga as instruções em `GMAIL_OAUTH_SETUP.md`.

