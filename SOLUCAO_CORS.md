# 🔧 Solução para Erro de CORS

## Problema

O erro de CORS ocorre porque:
1. A Edge Function `send-email` **não está deployada** no Supabase, OU
2. Os headers CORS não estão configurados corretamente

## ✅ Solução

### Opção 1: Fazer Deploy da Edge Function (Recomendado)

A Edge Function precisa estar deployada no Supabase para funcionar:

1. **Via Dashboard (Mais Fácil):**
   - Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/functions
   - Clique em **"Create a new function"**
   - Nome: `send-email`
   - Cole TODO o código do arquivo `supabase/functions/send-email/index.ts`
   - Clique em **Deploy**

2. **Configurar Secrets (OBRIGATÓRIO antes de usar):**
   - Vá em **Project Settings** > **Edge Functions** > **Secrets**
   - Adicione os 4 secrets:
     - `GMAIL_CLIENT_ID`
     - `GMAIL_CLIENT_SECRET`
     - `GMAIL_REFRESH_TOKEN`
     - `GMAIL_USER`

### Opção 2: Desabilitar Temporariamente o Envio de Email

Se você não quiser fazer o deploy agora, o sistema já tem um fallback:
- O código será mostrado no console
- O usuário pode usar o código mesmo sem receber o email

## 🔍 Verificação

Após fazer o deploy:

1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/functions
2. Verifique se a função `send-email` aparece na lista
3. Teste novamente o login

## 📝 Nota

Os headers CORS já foram corrigidos no código. O problema principal é que a função precisa estar deployada no Supabase para funcionar.


