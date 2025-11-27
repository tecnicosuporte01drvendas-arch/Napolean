# 🔧 Solução: Erro "violates row-level security policy"

Se você está vendo este erro:
```
StorageApiError: new row violates row-level security policy
```

Isso significa que o bucket existe, mas as **políticas RLS (Row Level Security)** estão bloqueando o upload.

## ✅ Solução Rápida (2 minutos)

### Método 1: Via SQL Editor (Recomendado)

1. **Acesse o SQL Editor no Supabase:**
   - Dashboard: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz
   - Menu lateral → **SQL Editor**
   - Clique em **New Query**

2. **Execute o SQL:**
   - Abra o arquivo `sql/configurar_politicas_storage.sql`
   - Copie TODO o conteúdo (até a linha que diz "Política de DELEÇÃO")
   - Cole no SQL Editor
   - Clique em **Run** (ou `Ctrl+Enter`)

3. **Verifique:**
   - Deve aparecer "Success. No rows returned"
   - Se der erro de "policy already exists", ignore (já existe)

4. **Teste novamente:**
   - Volte para a página "Nova Análise"
   - Tente fazer upload novamente

### Método 2: Via Interface (Alternativo)

1. **Acesse o Storage:**
   - Dashboard → **Storage** → Clique no bucket `relatorios`

2. **Vá em Policies:**
   - Clique no botão **Policies** (no topo, com ícone de escudo)

3. **Crie as políticas:**
   - Clique em **New Policy**
   - Selecione **For full customization**
   - Clique em **Use this template**

   **Política 1 - Upload:**
   - **Policy name:** `Permitir upload de arquivos`
   - **Allowed operation:** `INSERT`
   - **Target roles:** `authenticated`
   - **USING expression:** Deixe vazio
   - **WITH CHECK expression:** `bucket_id = 'relatorios'`
   - Clique em **Review** e depois **Save policy**

   **Política 2 - Leitura:**
   - **Policy name:** `Permitir leitura pública`
   - **Allowed operation:** `SELECT`
   - **Target roles:** `public`
   - **USING expression:** `bucket_id = 'relatorios'`
   - **WITH CHECK expression:** Deixe vazio
   - Clique em **Review** e depois **Save policy**

### Método 3: Desabilitar RLS Temporariamente (Apenas para Teste)

⚠️ **ATENÇÃO:** Use apenas para desenvolvimento/teste!

1. **SQL Editor:**
   ```sql
   ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
   ```

2. **Teste o upload**

3. **Reative depois:**
   ```sql
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
   ```

## 📋 Checklist

- [ ] Bucket `relatorios` criado e marcado como público
- [ ] Políticas RLS configuradas (método 1 ou 2)
- [ ] Testou o upload novamente
- [ ] Funcionou! ✅

## ❓ Ainda não funciona?

1. **Verifique se as políticas foram criadas:**
   - Storage → `relatorios` → Policies
   - Deve ter pelo menos 2 políticas (INSERT e SELECT)

2. **Tente desabilitar RLS temporariamente:**
   - Use o Método 3 acima
   - Se funcionar, o problema é nas políticas
   - Reative e ajuste as políticas

3. **Limpe o cache:**
   - Ctrl+Shift+Delete → Limpar cache
   - Recarregue a página (F5)

## 🔒 Políticas Recomendadas para Produção

Para produção, use políticas mais restritivas:

```sql
-- Upload apenas do próprio usuário
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'relatorios' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Leitura apenas dos próprios arquivos
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'relatorios' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

Mas para desenvolvimento/teste, as políticas do Método 1 são suficientes.


