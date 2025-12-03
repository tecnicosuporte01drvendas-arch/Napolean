// Tipos TypeScript baseados nas tabelas do Supabase

export type TipoUsuario = 'gestor' | 'colaborador';

export type PerfilSistema = 'master' | 'dev' | 'cs' | 'gestor' | 'colaborador';

export interface Usuario {
  id: string;
  email: string;
  telefone?: string | null;
  nome?: string | null;
  nome_empresa?: string | null;
  tipo?: TipoUsuario | null;
  perfil_sistema?: PerfilSistema | null;
  gestor_id?: string | null;
  cs_id?: string | null;
  criado_em: string;
}

export interface CodigoVerificacao {
  id: string;
  email_usuario: string;
  codigo: string;
  foi_usado: boolean;
  expira_em: string | null;
  criado_em: string;
}

export interface Relatorio {
  id: string;
  id_usuario: string | null;
  nome_arquivo: string | null;
  url_arquivo: string | null;
  nota_boas_vindas: number | null;      // Etapa 1
  nota_identificacao: number | null;     // Etapa 2
  nota_historia: number | null;          // Etapa 3
  nota_pilares: number | null;           // Etapa 4
  nota_objecoes: number | null;          // Etapa 5
  nota_impacto: number | null;          // Etapa 6
  nota_proposta: number | null;          // Etapa 7
  nota_media: number | null;
  resumo_pontos_fortes: string | null;
  resumo_melhorias: string | null;
  texto_relatorio_completo: string | null;
  criado_em: string;
}

// Tipos para inserção (sem campos gerados automaticamente)
export type UsuarioInsert = Omit<Usuario, 'id' | 'criado_em'>;
export type CodigoVerificacaoInsert = Omit<CodigoVerificacao, 'id' | 'criado_em'>;
export type RelatorioInsert = Omit<Relatorio, 'id' | 'criado_em'>;

