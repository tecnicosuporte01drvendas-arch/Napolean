# 🔧 Corrigir Erro RLS - Políticas não funcionam

Se você criou as políticas mas ainda vê o erro `violates row-level security policy`, o problema é que o sistema usa **autenticação customizada** (não Supabase Auth).

## ✅ Solução: Executar SQL de Correção

### Passo 1: Acessar SQL Editor
👉 https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz
- Menu lateral → **SQL Editor**
- Clique em **New Query**

### Passo 2: Executar SQL de Correção
1. Abra o arquivo `sql/corrigir_politicas_storage.sql`
2. Copie **TODO** o conteúdo
3. Cole no SQL Editor
4. Clique em **Run** (ou `Ctrl+Enter`)

### Passo 3: Verificar
- Deve aparecer "Success. No rows returned"
- As políticas antigas serão removidas e novas serão criadas

### Passo 4: Testar
- Volte para "Nova Análise"
- Tente fazer upload novamente

## 🔍 Por que isso acontece?

O sistema Napolean usa autenticação customizada (email + código OTP), não o sistema de autenticação nativo do Supabase. Por isso:

- ❌ Políticas com `TO authenticated` não funcionam
- ✅ Precisamos usar `TO public` para permitir uploads

## ⚠️ Segurança

**Para desenvolvimento/teste:** As políticas `TO public` são aceitáveis.

**Para produção:** Considere:
1. Implementar autenticação Supabase Auth
2. Ou criar políticas mais restritivas baseadas em tokens customizados
3. Ou usar service_role key no backend

## 📋 Checklist

- [ ] Executei o SQL de correção
- [ ] Políticas antigas foram removidas
- [ ] Novas políticas foram criadas (4 políticas)
- [ ] Testei o upload novamente
- [ ] Funcionou! ✅

## ❓ Ainda não funciona?

1. **Verifique se as políticas foram criadas:**
   - Storage → `relatorios` → Policies
   - Deve ter 4 políticas (INSERT, SELECT, UPDATE, DELETE)
   - Todas devem ter "public" em "APPLIED TO"

2. **Tente desabilitar RLS temporariamente:**
   ```sql
   ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
   ```
   - Se funcionar, o problema é nas políticas
   - Reative depois: `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`

3. **Limpe o cache:**
   - Ctrl+Shift+Delete → Limpar cache
   - Recarregue a página (F5)


