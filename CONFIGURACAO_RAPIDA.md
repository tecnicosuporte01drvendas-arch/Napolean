# ⚡ Configuração Rápida - Envio de Emails

## 🎯 O que você precisa fazer (2 passos):

### 1️⃣ Configurar Secrets no Supabase Dashboard (5 minutos)

1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/settings/functions
2. Role até a seção **"Secrets"**
3. Clique em **"Add new secret"** e adicione cada um:

```
Nome: GMAIL_CLIENT_ID
Valor: 132960724256-271cect7jvkc5b4houn61h9gjtuvb48s.apps.googleusercontent.com
```

```
Nome: GMAIL_CLIENT_SECRET
Valor: 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
```

```
Nome: GMAIL_REFRESH_TOKEN
Valor: 1//04P9cz2Wy2_ASCgYIARAAGAQSNwF-L9IreCcPDmItg5t-FobQw562jIiJIfCR0DfOKFVHbrTZeSwv8tY5HPAl7_pT56XtDcnp4HM
```

```
Nome: GMAIL_USER
Valor: tecnicosuporte01.drvendas@gmail.com
```

---

### 2️⃣ Fazer Deploy da Edge Function

**Opção A: Script Automático (Windows)**
```powershell
.\deploy-email.ps1
```

**Opção B: Script Automático (Linux/Mac)**
```bash
chmod +x deploy-email.sh
./deploy-email.sh
```

**Opção C: Manual (Windows)**

1. Instale o Supabase CLI via Scoop:
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

   Ou baixe diretamente: https://github.com/supabase/cli/releases

2. Depois execute:
   ```bash
   supabase login
   supabase link --project-ref pvbibgtwrkjkynmtfjiz
   supabase functions deploy send-email
   ```

**Opção D: Via Dashboard do Supabase (Mais Fácil)**

1. Acesse: https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz/functions
2. Clique em **"Create a new function"**
3. Nome: `send-email`
4. Cole o código do arquivo `supabase/functions/send-email/index.ts`
5. Clique em **Deploy**

---

## ✅ Depois de configurar:

1. Acesse a página de Login do app
2. Digite um email válido
3. Clique em "Continuar"
4. Verifique se o email chegou! 📧

---

## 🆘 Problemas?

- **Email não chegou?** Verifique a pasta de spam
- **Erro no deploy?** Veja `DEPLOY_EMAIL.md` para troubleshooting
- **Precisa de ajuda?** Me avise!

