# 🔧 Solução: Erro "Bucket not found"

Se você está vendo este erro:
```
StorageApiError: Bucket not found
```

## ✅ Solução Rápida (5 minutos)

### 1. Acesse o Supabase Dashboard
👉 https://supabase.com/dashboard/project/pvbibgtwrkjkynmtfjiz

### 2. Vá em Storage
- Menu lateral esquerdo
- Clique em **Storage** (ícone de pasta 📁)

### 3. Crie o Bucket
1. Clique em **New bucket**
2. Preencha:
   - **Name:** `relatorios` (⚠️ EXATAMENTE assim, minúsculo)
   - **Public bucket:** ✅ **MARQUE** (muito importante!)
   - **File size limit:** 10 MB
   - **Allowed MIME types:** Deixe vazio
3. Clique em **Create bucket**

### 4. Verifique
- O bucket `relatorios` deve aparecer na lista
- Deve ter um ícone de "globo" 🌐 indicando que é público

### 5. Teste Novamente
- Volte para a página "Nova Análise"
- Tente fazer upload novamente

## 📸 Passo a Passo Visual

```
Supabase Dashboard
  └── Storage (menu lateral)
      └── New bucket (botão no topo)
          └── Name: relatorios
          └── ✅ Public bucket (marcar)
          └── Create bucket
```

## ❓ Perguntas Frequentes

### O bucket já existe mas ainda dá erro?
- Verifique se o nome está exatamente `relatorios` (sem espaços, minúsculo)
- Verifique se está marcado como público
- Tente recarregar a página (F5)

### Posso usar outro nome?
- Não, o código está configurado para `relatorios`
- Se quiser mudar, precisa alterar o código em `src/lib/supabaseServices.ts`

### Preciso configurar políticas RLS?
- Para desenvolvimento/teste: não é obrigatório
- Para produção: sim, veja `CONFIGURAR_STORAGE.md`

## 🆘 Ainda não funciona?

1. Verifique se está logado no Supabase correto
2. Verifique se tem permissão de administrador no projeto
3. Tente criar o bucket novamente
4. Limpe o cache do navegador (Ctrl+Shift+Delete)


