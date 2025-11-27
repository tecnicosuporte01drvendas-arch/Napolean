# 🧪 Teste Direto da Função

## Como Testar a Função no Dashboard do Supabase

### Passo 1: Acessar a Função
1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/functions
2. Clique na função `send-email`
3. Role até a seção **"Invoke function"**

### Passo 2: Testar com JSON
Cole este JSON no campo de teste:

```json
{
  "to": "seu-email@teste.com",
  "subject": "Teste de Email",
  "html": "<h1>Teste</h1><p>Este é um teste de envio de email.</p>"
}
```

### Passo 3: Ver Resultado
- Se funcionar: Você verá `{"success": true, "messageId": "..."}`
- Se não funcionar: Verá o erro específico

## 🔍 Verificar Logs

1. Vá na aba **"Logs"** da função
2. Tente invocar a função
3. Veja se aparecem logs
4. Se aparecer erro, copie o erro completo

## 📝 O que me enviar

Se ainda não funcionar, me envie:
1. O que aparece quando você testa a função diretamente no Dashboard
2. O que aparece nos Logs da função
3. O status code que aparece no Network tab do navegador (quando tenta enviar do app)

Com essas informações, posso identificar exatamente onde está o problema.


