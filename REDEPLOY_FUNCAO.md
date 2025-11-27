# 🔄 Redeploy da Função send-email

## Problema

O erro de CORS persiste porque a função no Supabase ainda tem o código antigo. Você precisa **atualizar/redeployar** a função com o código corrigido.

## ✅ Solução: Atualizar a Função no Supabase

### Passo 1: Copiar o Código Atualizado

O código completo da função está no arquivo: `supabase/functions/send-email/index.ts`

### Passo 2: Atualizar no Dashboard

1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/functions
2. Clique na função `send-email`
3. Vá na aba **"Code"** ou **"Editor"**
4. **Substitua TODO o código** pelo código do arquivo `supabase/functions/send-email/index.ts`
5. Clique em **"Deploy"** ou **"Save"**

### Passo 3: Verificar Secrets

Antes de testar, certifique-se de que os 4 secrets estão configurados:

1. Vá em **Project Settings** > **Edge Functions** > **Secrets**
2. Verifique se existem:
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   - `GMAIL_REFRESH_TOKEN`
   - `GMAIL_USER`

### Passo 4: Testar

Após atualizar:
1. Recarregue a página do app
2. Tente enviar um código novamente
3. O erro de CORS deve desaparecer

## 📋 Código Completo para Copiar

O código completo está em: `supabase/functions/send-email/index.ts`

Certifique-se de copiar **TUDO**, incluindo:
- Os imports
- Os headers CORS
- O tratamento de OPTIONS
- Toda a lógica de envio de email


