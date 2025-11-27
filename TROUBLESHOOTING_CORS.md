# 🔧 Troubleshooting CORS - Guia Completo

## Problema Persistente

Mesmo com o código correto e Secrets configurados, o erro de CORS ainda aparece.

## ✅ Checklist de Verificação

### 1. Verificar se a Função foi Salva/Deployada

1. No editor da função, verifique se o código está lá
2. **Clique em "Deploy" ou "Save"** (não apenas salve o arquivo)
3. Aguarde a confirmação de sucesso
4. Verifique se aparece "Deployed" ou "Saved" na interface

### 2. Verificar Logs da Função

1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/functions
2. Clique na função `send-email`
3. Vá na aba **"Logs"**
4. Tente enviar um email novamente
5. Veja se há logs aparecendo

**O que procurar:**
- Se NÃO aparecer NENHUM log → A função não está sendo chamada (problema de CORS no preflight)
- Se aparecer logs de erro → Veja qual é o erro específico

### 3. Testar a Função Diretamente

No Dashboard do Supabase, há uma seção **"Invoke function"**:

1. Vá na função `send-email`
2. Role até **"Invoke function"**
3. Cole este JSON:
```json
{
  "to": "seu-email@teste.com",
  "subject": "Teste",
  "html": "<p>Teste de email</p>"
}
```
4. Clique em **"Invoke"**
5. Veja o que retorna

### 4. Verificar Network Tab do Navegador

1. Abra o DevTools (F12)
2. Vá na aba **"Network"**
3. Tente enviar o email
4. Procure pela requisição `send-email`
5. Clique nela e veja:
   - **Status**: Qual é o status code?
   - **Headers Request**: Está enviando os headers corretos?
   - **Headers Response**: Está recebendo os headers CORS?

## 🔍 Possíveis Causas

### Causa 1: Função não foi deployada
**Solução**: Clique em "Deploy" explicitamente

### Causa 2: Cache do navegador
**Solução**: 
- Limpe o cache (Ctrl+Shift+Delete)
- Ou teste em aba anônima

### Causa 3: Supabase interceptando OPTIONS
**Solução**: Pode ser necessário aguardar alguns minutos após o deploy

### Causa 4: Formato do código
**Solução**: Certifique-se de que não há caracteres especiais ou problemas de encoding

## 📝 Próximos Passos

1. Verifique os logs da função
2. Teste a função diretamente no Dashboard
3. Me envie:
   - O que aparece nos logs
   - O status code da requisição no Network tab
   - Qualquer erro específico

Com essas informações, posso identificar exatamente o que está acontecendo.


