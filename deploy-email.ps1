# Script PowerShell para fazer deploy da Edge Function
# Execute: .\deploy-email.ps1

Write-Host "🚀 Iniciando deploy da Edge Function send-email..." -ForegroundColor Cyan

# Verificar se Supabase CLI está instalado
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "⚠️  Supabase CLI não está instalado!" -ForegroundColor Yellow
    Write-Host "📦 Instale via Scoop:" -ForegroundColor Cyan
    Write-Host "   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor White
    Write-Host "   scoop install supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou baixe de: https://github.com/supabase/cli/releases" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "✅ Supabase CLI já está instalado" -ForegroundColor Green
}

# Verificar se está logado
Write-Host "`n🔐 Verificando login..." -ForegroundColor Cyan
$loginCheck = supabase projects list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Você precisa fazer login primeiro!" -ForegroundColor Yellow
    Write-Host "Execute: supabase login" -ForegroundColor Yellow
    exit 1
}

# Linkar projeto (se ainda não estiver linkado)
Write-Host "`n🔗 Linkando projeto..." -ForegroundColor Cyan
supabase link --project-ref pvbibgtwrkjkynmtfjiz

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Erro ao linkar projeto. Verifique se já está linkado." -ForegroundColor Yellow
}

# Deploy da função
Write-Host "`n📤 Fazendo deploy da função send-email..." -ForegroundColor Cyan
supabase functions deploy send-email

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy realizado com sucesso!" -ForegroundColor Green
    Write-Host "`n📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "1. Configure os Secrets no Supabase Dashboard" -ForegroundColor White
    Write-Host "2. Teste o envio de email na página de Login" -ForegroundColor White
} else {
    Write-Host "`n❌ Erro ao fazer deploy. Verifique os logs acima." -ForegroundColor Red
}

