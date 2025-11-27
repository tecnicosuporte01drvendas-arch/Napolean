# 🚀 Guia de Deploy - Envio de Emails

## ✅ Passo 1: Configurar Secrets no Supabase Dashboard

**IMPORTANTE:** Isso precisa ser feito manualmente no Dashboard.

1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz
2. Vá em **Project Settings** > **Edge Functions** > **Secrets**
3. Adicione os 4 secrets abaixo:

### Secret 1:
```
Name: GMAIL_CLIENT_ID
Value: 132960724256-271cect7jvkc5b4houn61h9gjtuvb48s.apps.googleusercontent.com
```

### Secret 2:
```
Name: GMAIL_CLIENT_SECRET
Value: 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
```

### Secret 3:
```
Name: GMAIL_REFRESH_TOKEN
Value: 1//04P9cz2Wy2_ASCgYIARAAGAQSNwF-L9IreCcPDmItg5t-FobQw562jIiJIfCR0DfOKFVHbrTZeSwv8tY5HPAl7_pT56XtDcnp4HM
```

### Secret 4:
```
Name: GMAIL_USER
Value: tecnicosuporte01.drvendas@gmail.com
```

---

## ✅ Passo 2: Fazer Deploy da Edge Function

### Opção A: Via CLI (Recomendado)

Execute os comandos abaixo no terminal:

```bash
# 1. Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# 2. Login no Supabase
supabase login

# 3. Linkar projeto
supabase link --project-ref pvbibgtwrkjkynmtfjiz

# 4. Deploy da função
supabase functions deploy send-email
```

### Opção B: Via Dashboard

1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/functions
2. Clique em **"Create a new function"**
3. Nome: `send-email`
4. Cole o código do arquivo `supabase/functions/send-email/index.ts`
5. Clique em **Deploy**

---

## ✅ Passo 3: Testar

1. Acesse a página de Login do app
2. Digite um email válido
3. Clique em "Continuar"
4. Verifique se o email chegou (pode estar na pasta de spam)

---

## 🆘 Troubleshooting

### Erro ao fazer deploy?
- Certifique-se de que está logado: `supabase login`
- Verifique se o projeto está linkado: `supabase projects list`

### Email não está sendo enviado?
1. Verifique se todos os 4 secrets estão configurados no Dashboard
2. Veja os logs da Edge Function no Supabase Dashboard
3. Verifique se a função foi deployada com sucesso

### Ver logs da função:
```bash
supabase functions logs send-email
```

---

## 📝 Checklist Final

- [ ] 4 Secrets configurados no Supabase Dashboard
- [ ] Edge Function `send-email` deployada
- [ ] Teste de envio de email realizado
- [ ] Email chegou na caixa de entrada (ou spam)


