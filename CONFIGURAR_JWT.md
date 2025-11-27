# 🔧 Configurar Verificação JWT na Edge Function

## Problema

A Edge Function está configurada com "Verify JWT with legacy secret" = **ON**, o que exige autenticação. Como o envio de código de verificação acontece **antes** do usuário fazer login, precisamos desabilitar essa verificação.

## ✅ Solução: Desabilitar Verificação JWT

### Passo 1: Acessar Configuração da Função

1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/functions
2. Clique na função `send-email`
3. Vá na aba **"Settings"** ou **"Configuration"**

### Passo 2: Desabilitar JWT Verification

1. Encontre a opção **"Verify JWT with legacy secret"**
2. **Desligue o toggle** (mude de ON para OFF)
3. Clique em **"Save changes"**

## 🔒 Segurança

**Por que é seguro desabilitar?**
- A função só envia emails, não expõe dados sensíveis
- O código de verificação é gerado no backend e validado no banco
- A função ainda valida os dados de entrada
- Você pode adicionar rate limiting depois se necessário

## ✅ Alternativa: Manter JWT Ativado

Se preferir manter a verificação JWT ativada, você precisa:

1. Usar a **anon key** do Supabase no header Authorization
2. Atualizar o código para enviar o token explicitamente

Mas para envio de emails públicos (como código de verificação), é mais simples desabilitar o JWT.

## 📝 Após Configurar

Após desabilitar o JWT:
1. Teste novamente o envio de email
2. O erro de CORS deve desaparecer
3. O email deve ser enviado com sucesso


