# Configuração Gmail OAuth2 para Envio de Emails

## Passo 1: Criar Credenciais no Google Cloud Console

### 1.1 Criar Projeto
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Clique em "Criar Projeto"
3. Dê um nome ao projeto (ex: "Napolean Email")

### 1.2 Ativar Gmail API
1. No menu lateral, vá em **APIs e Serviços** > **Biblioteca**
2. Pesquise por "Gmail API"
3. Clique em **Ativar**

### 1.3 Configurar Tela de Consentimento OAuth
1. Vá em **APIs e Serviços** > **Tela de consentimento OAuth**
2. Escolha **Externo** (ou Interno se for apenas para sua organização)
3. Preencha:
   - Nome do aplicativo: `Napolean`
   - Email de suporte: seu email
   - Email do desenvolvedor: seu email
4. Clique em **Salvar e Continuar**
5. Em **Escopos**, clique em **Adicionar ou remover escopos**
6. Selecione: `https://mail.google.com/` (acesso completo ao Gmail)
7. Clique em **Salvar e Continuar**
8. Adicione usuários de teste (se necessário)
9. Clique em **Salvar e Continuar**

### 1.4 Criar Credenciais OAuth 2.0
1. Vá em **APIs e Serviços** > **Credenciais**
2. Clique em **Criar credenciais** > **ID do cliente OAuth**
3. Configure:
   - Tipo de aplicativo: **Aplicativo da Web**
   - Nome: `Napolean Email Client`
   - **URIs de redirecionamento autorizados**:
     - `https://developers.google.com/oauthplayground` (para obter refresh token)
     - `http://localhost:8080` (para desenvolvimento local)
4. Clique em **Criar**
5. **Copie o Client ID e Client Secret** (você precisará deles)

## Passo 2: Obter Refresh Token

### 2.1 Usar OAuth Playground
1. Acesse [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Clique no ícone de engrenagem (⚙️) no canto superior direito
3. Marque **Use your own OAuth credentials**
4. Cole seu **Client ID** e **Client Secret**
5. No painel esquerdo, encontre **Gmail API v1**
6. Selecione: `https://mail.google.com/`
7. Clique em **Authorize APIs**
8. Faça login com sua conta Google e autorize
9. Clique em **Exchange authorization code for tokens**
10. **Copie o Refresh Token** (você precisará dele)

## Passo 3: Configurar Variáveis de Ambiente no Supabase

### 3.1 No Dashboard do Supabase
1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Project Settings** > **Edge Functions**
3. Adicione as seguintes **Secrets**:

```
GMAIL_CLIENT_ID=seu_client_id_aqui
GMAIL_CLIENT_SECRET=seu_client_secret_aqui
GMAIL_REFRESH_TOKEN=seu_refresh_token_aqui
GMAIL_USER=seu_email@gmail.com
```

### 3.2 Ou via CLI do Supabase
```bash
supabase secrets set GMAIL_CLIENT_ID=seu_client_id_aqui
supabase secrets set GMAIL_CLIENT_SECRET=seu_client_secret_aqui
supabase secrets set GMAIL_REFRESH_TOKEN=seu_refresh_token_aqui
supabase secrets set GMAIL_USER=seu_email@gmail.com
```

## Passo 4: Fazer Deploy da Edge Function

### 4.1 Instalar Supabase CLI (se ainda não tiver)
```bash
npm install -g supabase
```

### 4.2 Login no Supabase
```bash
supabase login
```

### 4.3 Linkar Projeto
```bash
supabase link --project-ref seu-project-ref
```

### 4.4 Deploy da Function
```bash
supabase functions deploy send-email
```

## Passo 5: Testar

Após configurar tudo, o sistema automaticamente enviará emails quando:
- Um usuário solicitar código de verificação no login
- O código será enviado para o email informado

## Estrutura de Arquivos

```
supabase/
  functions/
    send-email/
      index.ts          # Edge Function que envia emails
```

## Troubleshooting

### Erro: "Credenciais do Gmail não configuradas"
- Verifique se todas as variáveis de ambiente estão configuradas no Supabase
- Certifique-se de que fez o deploy da Edge Function

### Erro: "Não foi possível obter access token"
- Verifique se o Refresh Token está correto
- Verifique se o Client ID e Client Secret estão corretos
- Certifique-se de que a Gmail API está ativada no projeto

### Email não chega
- Verifique a pasta de spam
- Verifique se o email do destinatário está correto
- Veja os logs da Edge Function no Supabase Dashboard

## Segurança

⚠️ **IMPORTANTE:**
- Nunca compartilhe suas credenciais
- Não commite o `.env` com credenciais
- Use Secrets do Supabase para armazenar credenciais
- O Refresh Token não expira, mas pode ser revogado no Google Cloud Console


