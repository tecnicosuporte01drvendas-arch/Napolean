# 🔍 Verificar Secrets do Gmail

## Problema

O erro de CORS pode estar acontecendo porque os **Secrets do Gmail não estão configurados**. Se os secrets não existirem, a função pode falhar antes de responder corretamente ao CORS.

## ✅ Verificar Secrets

### Passo 1: Acessar Secrets

1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/settings/functions
2. Role até a seção **"Secrets"**

### Passo 2: Verificar se Existem os 4 Secrets

Você deve ter exatamente estes 4 secrets:

1. **GMAIL_CLIENT_ID**
   - Valor: `132960724256-271cect7jvkc5b4houn61h9gjtuvb48s.apps.googleusercontent.com`

2. **GMAIL_CLIENT_SECRET**
   - Valor: `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`

3. **GMAIL_REFRESH_TOKEN**
   - Valor: `1//04P9cz2Wy2_ASCgYIARAAGAQSNwF-L9IreCcPDmItg5t-FobQw562jIiJIfCR0DfOKFVHbrTZeSwv8tY5HPAl7_pT56XtDcnp4HM`

4. **GMAIL_USER**
   - Valor: `tecnicosuporte01.drvendas@gmail.com`

### Passo 3: Se Não Existirem, Adicionar

1. Clique em **"Add new secret"**
2. Adicione cada um dos 4 secrets acima
3. Certifique-se de que os **nomes estão EXATAMENTE** como mostrado (case-sensitive)

## 🔍 Verificar Logs da Função

Após verificar os secrets:

1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/functions
2. Clique na função `send-email`
3. Vá na aba **"Logs"**
4. Tente enviar um email novamente
5. Veja se há erros nos logs

## 📝 Importante

- Os nomes dos secrets são **case-sensitive** (maiúsculas/minúsculas importam)
- Todos os 4 secrets são **obrigatórios**
- Sem os secrets, a função retornará erro 500


