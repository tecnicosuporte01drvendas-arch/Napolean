# 📧 Deploy da Funcionalidade de Email

## ✅ Status Atual

- ✅ Edge Function criada: `supabase/functions/send-email/index.ts`
- ✅ Serviço de email criado: `src/lib/emailService.ts`
- ✅ Login atualizado para usar email real
- ⏳ **Pendente:** Configurar Secrets no Supabase
- ⏳ **Pendente:** Deploy da Edge Function

---

## 🚀 Passos para Finalizar

### 1. Configurar Secrets (OBRIGATÓRIO)

Acesse o Supabase Dashboard e adicione os 4 secrets:

**URL:** https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/settings/functions

**Secrets necessários:**
- `GMAIL_CLIENT_ID` = `132960724256-271cect7jvkc5b4houn61h9gjtuvb48s.apps.googleusercontent.com`
- `GMAIL_CLIENT_SECRET` = `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`
- `GMAIL_REFRESH_TOKEN` = `1//04P9cz2Wy2_ASCgYIARAAGAQSNwF-L9IreCcPDmItg5t-FobQw562jIiJIfCR0DfOKFVHbrTZeSwv8tY5HPAl7_pT56XtDcnp4HM`
- `GMAIL_USER` = `tecnicosuporte01.drvendas@gmail.com`

### 2. Deploy da Edge Function

**Método mais fácil: Via Dashboard**

1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/functions
2. Clique em **"Create a new function"**
3. Nome: `send-email`
4. Cole TODO o conteúdo do arquivo `supabase/functions/send-email/index.ts`
5. Clique em **Deploy**

**Método alternativo: Via CLI**

Se você tiver o Supabase CLI instalado:

```bash
supabase login
supabase link --project-ref pvbibgtwrkjkynmtfjiz
supabase functions deploy send-email
```

---

## 📝 Arquivos Criados

- `supabase/functions/send-email/index.ts` - Edge Function
- `src/lib/emailService.ts` - Serviço de email no frontend
- `DEPLOY_EMAIL.md` - Guia completo
- `CONFIGURACAO_RAPIDA.md` - Guia rápido
- `deploy-email.ps1` - Script PowerShell (Windows)
- `deploy-email.sh` - Script Bash (Linux/Mac)

---

## ✅ Teste Final

Após configurar tudo:

1. Acesse: http://localhost:8080/login
2. Digite um email válido
3. Clique em "Continuar"
4. Verifique se o email chegou! 📧

---

## 🆘 Precisa de Ajuda?

- Veja `DEPLOY_EMAIL.md` para troubleshooting detalhado
- Veja `CONFIGURACAO_RAPIDA.md` para guia rápido


