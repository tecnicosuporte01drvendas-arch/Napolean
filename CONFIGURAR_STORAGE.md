# ⚠️ CONFIGURAÇÃO OBRIGATÓRIA: Storage no Supabase

**ERRO COMUM:** Se você está vendo o erro `Bucket not found`, siga estes passos:

## Passo 1: Acessar o Storage

1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz
2. No menu lateral esquerdo, clique em **Storage** (ícone de pasta)

## Passo 2: Criar o Bucket

1. Clique no botão **New bucket** (canto superior direito)
2. Configure o bucket com **EXATAMENTE** estes valores:
   - **Name:** `relatorios` (⚠️ O nome deve ser EXATAMENTE "relatorios", sem espaços ou maiúsculas)
   - **Public bucket:** ✅ **MARQUE ESTA OPÇÃO** (muito importante para poder acessar os arquivos)
   - **File size limit:** 10 MB (ou mais, se necessário)
   - **Allowed MIME types:** Deixe **VAZIO** (para aceitar PDF e TXT)

3. Clique em **Create bucket**

4. ✅ **VERIFIQUE:** O bucket `relatorios` deve aparecer na lista de buckets

## ⚠️ Passo 3: Configurar Políticas RLS (OBRIGATÓRIO)

**ERRO COMUM:** Se você vê `violates row-level security policy`, precisa configurar as políticas!

### Método Rápido (Recomendado):

1. Acesse **SQL Editor** no Supabase
2. Abra o arquivo `sql/configurar_politicas_storage.sql`
3. Copie e execute o SQL (até a linha "Política de DELEÇÃO")
4. Clique em **Run**

**OU** veja instruções detalhadas em `SOLUCAO_RLS_STORAGE.md`

### Método Manual:

1. No bucket `relatorios`, vá em **Policies**
2. Clique em **New Policy**
3. Selecione **For full customization**, clique em **Use this template**
4. Configure a política:

### Política de Upload (INSERT)
```sql
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'relatorios' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Política de Leitura (SELECT)
```sql
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'relatorios' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**OU** se você quiser permitir acesso público (mais simples para desenvolvimento):

### Política Pública (SELECT)
```sql
CREATE POLICY "Public can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'relatorios');
```

## Passo 4: Verificar

Após configurar:

1. Acesse a página "Nova Análise" no menu lateral
2. Tente fazer upload de um PDF
3. Verifique se o upload foi bem-sucedido

## Estrutura de Pastas

Os arquivos serão organizados assim:
```
relatorios/
  └── {user_id}/
      └── {timestamp}-{random}.pdf
```

Cada usuário terá sua própria pasta, facilitando a organização e segurança.

## Troubleshooting

### Erro: "Bucket not found"
- Verifique se o bucket `relatorios` foi criado
- Verifique se o nome está exatamente como `relatorios` (sem espaços ou maiúsculas)

### Erro: "Permission denied"
- Verifique se as políticas RLS estão configuradas corretamente
- Para desenvolvimento, você pode temporariamente desabilitar RLS no bucket

### Erro: "File size too large"
- Verifique o limite de tamanho do bucket
- Aumente o limite se necessário (máximo recomendado: 50MB)

