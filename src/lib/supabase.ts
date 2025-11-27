import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Debug: verificar se as variáveis estão sendo carregadas
if (import.meta.env.DEV) {
  console.log('🔍 Debug - Variáveis de ambiente:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseAnonKey?.length || 0,
    allEnvKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')),
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = `Missing Supabase environment variables. 
    VITE_SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}
    VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅' : '❌'}
    
    Certifique-se de que o arquivo .env existe na raiz do projeto e reinicie o servidor (npm run dev).`;
  
  console.error('❌ Erro:', errorMsg);
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

