import { supabase } from './supabase';
import type { Usuario, CodigoVerificacao, Relatorio, UsuarioInsert, CodigoVerificacaoInsert, RelatorioInsert } from './database.types';

// ========== SERVIÇOS DE USUÁRIOS ==========

export const usuariosService = {
  // Buscar usuário por email
  async getByEmail(email: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
    
    return data;
  },

  // Criar novo usuário
  async create(usuario: UsuarioInsert): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .insert(usuario)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar usuário:', error);
      return null;
    }
    
    return data;
  },

  // Buscar usuário por ID
  async getById(id: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
    
    return data;
  },

  // Listar todos os usuários
  async getAll(): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('criado_em', { ascending: false });
    
    if (error) {
      console.error('Erro ao listar usuários:', error);
      return [];
    }
    
    return data || [];
  },

  // Listar usuários por gestor (apenas equipe daquele gestor)
  async getByGestorId(gestorId: string): Promise<Usuario[]> {
    if (!gestorId) return [];

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .or(`gestor_id.eq.${gestorId},id.eq.${gestorId}`)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao listar usuários por gestor:', error);
      return [];
    }

    return data || [];
  },

  // Listar usuários por CS responsável
  async getByCsId(csId: string): Promise<Usuario[]> {
    if (!csId) return [];

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('cs_id', csId)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao listar usuários por CS:', error);
      return [];
    }

    return data || [];
  },

  // Listar usuários de acordo com o escopo do usuário logado
  async getByScope(user: Usuario | null): Promise<Usuario[]> {
    if (!user) return [];

    const perfil = user.perfil_sistema || user.tipo || null;

    // Master e Dev enxergam todos
    if (perfil === 'master' || perfil === 'dev') {
      return this.getAll();
    }

    // CS enxerga apenas usuários com cs_id = id dele
    if (perfil === 'cs') {
      return this.getByCsId(user.id);
    }

    // Gestor cliente enxerga ele mesmo + colaboradores dele
    if (perfil === 'gestor' || user.tipo === 'gestor') {
      return this.getByGestorId(user.id);
    }

    // Colaborador não deve ver equipe
    return [];
  },

  // Atualizar usuário
  async update(id: string, usuario: Partial<UsuarioInsert>): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .update(usuario)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      return null;
    }
    
    return data;
  },

  // Deletar usuário
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao deletar usuário:', error);
      return false;
    }
    
    return true;
  },
};

// ========== SERVIÇOS DE CÓDIGOS DE VERIFICAÇÃO ==========

export const codigosVerificacaoService = {
  // Criar código de verificação
  async create(codigo: CodigoVerificacaoInsert): Promise<CodigoVerificacao | null> {
    const { data, error } = await supabase
      .from('codigos_verificacao')
      .insert(codigo)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar código:', error);
      return null;
    }
    
    return data;
  },

  // Validar código de verificação
  async validateCode(email: string, codigo: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('codigos_verificacao')
      .select('*')
      .eq('email_usuario', email)
      .eq('codigo', codigo)
      .eq('foi_usado', false)
      .gt('expira_em', new Date().toISOString())
      .single();
    
    if (error || !data) {
      return false;
    }
    
    // Marcar código como usado
    await supabase
      .from('codigos_verificacao')
      .update({ foi_usado: true })
      .eq('id', data.id);
    
    return true;
  },

  // Gerar código aleatório de 6 dígitos
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
};

// ========== SERVIÇOS DE RELATÓRIOS ==========

export const relatoriosService = {
  // Criar novo relatório
  async create(relatorio: RelatorioInsert): Promise<Relatorio | null> {
    const { data, error } = await supabase
      .from('relatorios')
      .insert(relatorio)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar relatório:', error);
      return null;
    }
    
    return data;
  },

  // Buscar relatório por ID
  async getById(id: string): Promise<Relatorio | null> {
    const { data, error } = await supabase
      .from('relatorios')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Erro ao buscar relatório:', error);
      return null;
    }
    
    return data;
  },

  // Buscar relatórios de um usuário
  async getByUsuarioId(usuarioId: string): Promise<Relatorio[]> {
    const { data, error } = await supabase
      .from('relatorios')
      .select('*')
      .eq('id_usuario', usuarioId)
      .order('criado_em', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar relatórios:', error);
      return [];
    }
    
    return data || [];
  },

  // Listar todos os relatórios
  async getAll(): Promise<Relatorio[]> {
    const { data, error } = await supabase
      .from('relatorios')
      .select('*')
      .order('criado_em', { ascending: false });
    
    if (error) {
      console.error('Erro ao listar relatórios:', error);
      return [];
    }
    
    return data || [];
  },

  // Atualizar relatório
  async update(id: string, updates: Partial<RelatorioInsert>): Promise<Relatorio | null> {
    const { data, error } = await supabase
      .from('relatorios')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao atualizar relatório:', error);
      return null;
    }
    
    return data;
  },

  // Deletar relatório
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('relatorios')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao deletar relatório:', error);
      return false;
    }
    
    return true;
  },

  // Calcular estatísticas de um usuário
  async getStatsByUsuarioId(usuarioId: string) {
    const relatorios = await this.getByUsuarioId(usuarioId);
    
    if (relatorios.length === 0) {
      return {
        totalRelatorios: 0,
        notaMedia: 0,
        notasPorEtapa: {
          boas_vindas: 0,
          identificacao: 0,
          historia: 0,
          pilares: 0,
          objecoes: 0,
          impacto: 0,
          proposta: 0,
        },
      };
    }

    const notasValidas = relatorios.filter(r => r.nota_media !== null);
    const notaMedia = notasValidas.length > 0
      ? notasValidas.reduce((sum, r) => sum + (r.nota_media || 0), 0) / notasValidas.length
      : 0;

    const calcularMediaEtapa = (getter: (r: Relatorio) => number | null) => {
      const valores = relatorios.map(getter).filter((n): n is number => n !== null);
      return valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
    };

    return {
      totalRelatorios: relatorios.length,
      notaMedia: Number(notaMedia.toFixed(1)),
      notasPorEtapa: {
        boas_vindas: Number(calcularMediaEtapa(r => r.nota_boas_vindas).toFixed(1)),
        identificacao: Number(calcularMediaEtapa(r => r.nota_identificacao).toFixed(1)),
        historia: Number(calcularMediaEtapa(r => r.nota_historia).toFixed(1)),
        pilares: Number(calcularMediaEtapa(r => r.nota_pilares).toFixed(1)),
        objecoes: Number(calcularMediaEtapa(r => r.nota_objecoes).toFixed(1)),
        impacto: Number(calcularMediaEtapa(r => r.nota_impacto).toFixed(1)),
        proposta: Number(calcularMediaEtapa(r => r.nota_proposta).toFixed(1)),
      },
    };
  },
};

// ========== SERVIÇOS DE STORAGE (UPLOAD DE ARQUIVOS) ==========

export const storageService = {
  // Upload de arquivo para o bucket 'relatorios'
  async uploadFile(file: File, userId: string): Promise<{ path: string; url: string } | null> {
    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('relatorios')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Erro ao fazer upload:', error);
        
        // Mensagem mais amigável se o bucket não existir
        if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
          throw new Error('Bucket "relatorios" não encontrado. Por favor, crie o bucket no Supabase Storage seguindo as instruções em CONFIGURAR_STORAGE.md');
        }
        
        throw error;
      }

      // Obter URL pública do arquivo
      const { data: urlData } = supabase.storage
        .from('relatorios')
        .getPublicUrl(data.path);

      return {
        path: data.path,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
      return null;
    }
  },

  // Deletar arquivo do storage
  async deleteFile(path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('relatorios')
        .remove([path]);

      if (error) {
        console.error('Erro ao deletar arquivo:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      return false;
    }
  },
};

