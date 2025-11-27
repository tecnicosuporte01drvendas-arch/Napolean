#!/bin/bash
# Script Bash para fazer deploy da Edge Function
# Execute: chmod +x deploy-email.sh && ./deploy-email.sh

echo "🚀 Iniciando deploy da Edge Function send-email..."

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "📦 Instalando Supabase CLI..."
    npm install -g supabase
else
    echo "✅ Supabase CLI já está instalado"
fi

# Verificar se está logado
echo ""
echo "🔐 Verificando login..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Você precisa fazer login primeiro!"
    echo "Execute: supabase login"
    exit 1
fi

# Linkar projeto (se ainda não estiver linkado)
echo ""
echo "🔗 Linkando projeto..."
supabase link --project-ref pvbibgtwrkjkynmtfjiz

# Deploy da função
echo ""
echo "📤 Fazendo deploy da função send-email..."
supabase functions deploy send-email

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deploy realizado com sucesso!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Configure os Secrets no Supabase Dashboard"
    echo "2. Teste o envio de email na página de Login"
else
    echo ""
    echo "❌ Erro ao fazer deploy. Verifique os logs acima."
fi


