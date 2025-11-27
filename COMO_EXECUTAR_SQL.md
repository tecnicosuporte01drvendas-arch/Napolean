# Como Executar o SQL no Supabase

## Método 1: Via Dashboard (Recomendado)

### Passo 1: Acessar o SQL Editor
1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz
2. Faça login se necessário
3. No menu lateral esquerdo, clique em **SQL Editor**

### Passo 2: Criar Nova Query
1. Clique no botão **New Query** (ou use o atalho `Ctrl+K`)
2. Uma nova aba será aberta

### Passo 3: Copiar e Colar o SQL
1. Abra o arquivo `sql/atualizar_tabela_usuarios.sql` neste projeto
2. Copie TODO o conteúdo do arquivo
3. Cole no editor SQL do Supabase

### Passo 4: Executar
1. Clique no botão **Run** (ou use `Ctrl+Enter`)
2. Aguarde a mensagem de sucesso: "Success. No rows returned"

### Passo 5: Verificar
1. No menu lateral, clique em **Table Editor**
2. Selecione a tabela `usuarios`
3. Verifique se as colunas `nome` e `tipo` aparecem na lista de colunas

---

## Método 2: Via Supabase CLI (Avançado)

Se você tem o Supabase CLI instalado:

```bash
# 1. Fazer login no Supabase CLI
supabase login

# 2. Linkar o projeto
supabase link --project-ref pvbibgtwrkjkynmtfjiz

# 3. Executar o SQL
supabase db execute -f sql/atualizar_tabela_usuarios.sql
```

---

## Estrutura Esperada da Tabela

Após executar o SQL, a tabela `usuarios` deve ter:

| Coluna      | Tipo   | Nullable | Descrição                          |
|-------------|--------|----------|------------------------------------|
| id          | uuid   | NO       | Chave primária (gerado automaticamente) |
| email       | text   | NO       | Email único do usuário             |
| telefone    | text   | YES      | Telefone do usuário (opcional)     |
| nome        | text   | YES      | Nome completo (NOVO)                |
| tipo        | text   | YES      | Tipo: 'gestor' ou 'colaborador' (NOVO) |
| criado_em   | timestamptz | NO    | Data de criação (gerado automaticamente) |

---

## Troubleshooting

### Erro: "column already exists"
- Isso significa que a coluna já existe. Isso é normal, o `IF NOT EXISTS` previne erros.

### Erro: "permission denied"
- Verifique se você está logado como administrador do projeto
- Certifique-se de estar no projeto correto

### Não consigo ver as colunas novas
- Atualize a página do Table Editor (F5)
- Tente executar o SQL novamente

---

## Próximos Passos

Após executar o SQL com sucesso:

1. ✅ A página "Equipe" estará totalmente funcional
2. ✅ Você poderá cadastrar usuários com nome e tipo
3. ✅ Você poderá editar e excluir usuários
4. ✅ Os usuários existentes continuarão funcionando (campos novos são opcionais)


