# 🔧 Solução: CORS com JWT Ativado

## Problema

O erro de CORS persiste mesmo com JWT verification ativado. Isso acontece porque:

1. **Quando JWT está ON**: O Supabase valida o token ANTES de executar a função
2. **O preflight (OPTIONS)**: Pode estar sendo bloqueado pelo Supabase quando JWT está ativado
3. **O token**: O `supabase.functions.invoke()` já envia automaticamente, mas pode não estar chegando corretamente

## ✅ Soluções Possíveis

### Opção 1: Desabilitar JWT (Mais Simples) ⭐ RECOMENDADO

**Por quê?**
- Envio de código de verificação é uma ação pública
- Não expõe dados sensíveis
- Mais simples de configurar

**Como fazer:**
1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/functions
2. Clique na função `send-email`
3. Vá em **Settings/Configuration**
4. Desligue **"Verify JWT with legacy secret"**
5. Salve

### Opção 2: Manter JWT e Verificar Configuração

Se você quiser manter JWT ativado:

1. **Verifique se a função foi atualizada:**
   - O código da função foi atualizado com headers CORS melhorados
   - Você precisa fazer **redeploy** da função com o código atualizado

2. **Verifique os Secrets:**
   - Certifique-se de que os 4 secrets do Gmail estão configurados
   - Sem os secrets, a função pode falhar antes de responder ao CORS

3. **Teste o token:**
   - O `supabase.functions.invoke()` já envia o token automaticamente
   - Mas você pode verificar no Network tab do navegador se o header `Authorization` está sendo enviado

## 🔍 Debug

Para verificar o que está acontecendo:

1. Abra o **Network tab** do DevTools (F12)
2. Tente enviar o email
3. Veja a requisição `send-email`:
   - **Status**: Deve ser 200 (não 406 ou CORS error)
   - **Headers Request**: Deve ter `Authorization: Bearer ...`
   - **Headers Response**: Deve ter `Access-Control-Allow-Origin: *`

## 📝 Recomendação Final

**Para envio de emails públicos (código de verificação):**
- ✅ **Desabilite JWT** - É mais simples e seguro o suficiente
- ✅ A função ainda valida os dados de entrada
- ✅ Você pode adicionar rate limiting depois se necessário

**Para funções que precisam de autenticação:**
- ✅ Mantenha JWT ativado
- ✅ Use `supabase.functions.invoke()` que já envia o token automaticamente


