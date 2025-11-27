import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usuariosService, codigosVerificacaoService, relatoriosService } from '@/lib/supabaseServices';
import type { Usuario, Relatorio, UsuarioInsert, RelatorioInsert } from '@/lib/database.types';

// ========== HOOKS DE USUÁRIOS ==========

export const useUsuario = (email: string) => {
  return useQuery({
    queryKey: ['usuario', email],
    queryFn: () => usuariosService.getByEmail(email),
    enabled: !!email,
  });
};

export const useUsuarioById = (id: string) => {
  return useQuery({
    queryKey: ['usuario', id],
    queryFn: () => usuariosService.getById(id),
    enabled: !!id,
  });
};

export const useUsuarios = () => {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: () => usuariosService.getAll(),
    refetchInterval: 3000,
  });
};

// Usuários visíveis de acordo com o escopo do usuário logado
export const useUsuariosPorEscopo = (user: Usuario | null) => {
  return useQuery({
    queryKey: ['usuarios-escopo', user?.id, user?.perfil_sistema, user?.tipo],
    queryFn: () => usuariosService.getByScope(user),
    enabled: !!user,
    refetchInterval: 3000,
  });
};

export const useUsuariosByGestor = (gestorId: string) => {
  return useQuery({
    queryKey: ['usuarios', 'gestor', gestorId],
    queryFn: () => usuariosService.getByGestorId(gestorId),
    enabled: !!gestorId,
  });
};

export const useCreateUsuario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (usuario: UsuarioInsert) => usuariosService.create(usuario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
};

export const useUpdateUsuario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<UsuarioInsert> }) =>
      usuariosService.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuario', variables.id] });
    },
  });
};

export const useDeleteUsuario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => usuariosService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
};

// ========== HOOKS DE RELATÓRIOS ==========

export const useRelatorios = () => {
  return useQuery({
    queryKey: ['relatorios'],
    queryFn: () => relatoriosService.getAll(),
    refetchInterval: 3000,
  });
};

export const useRelatoriosByUsuario = (usuarioId: string) => {
  return useQuery({
    queryKey: ['relatorios', 'usuario', usuarioId],
    queryFn: () => relatoriosService.getByUsuarioId(usuarioId),
    enabled: !!usuarioId,
    refetchInterval: 3000,
  });
};

export const useRelatorio = (id: string) => {
  return useQuery({
    queryKey: ['relatorio', id],
    queryFn: () => relatoriosService.getById(id),
    enabled: !!id,
  });
};

export const useCreateRelatorio = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (relatorio: RelatorioInsert) => relatoriosService.create(relatorio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
    },
  });
};

export const useUpdateRelatorio = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<RelatorioInsert> }) =>
      relatoriosService.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
      queryClient.invalidateQueries({ queryKey: ['relatorio', variables.id] });
    },
  });
};

export const useDeleteRelatorio = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => relatoriosService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
    },
  });
};

export const useRelatorioStats = (usuarioId: string) => {
  return useQuery({
    queryKey: ['relatorio-stats', usuarioId],
    queryFn: () => relatoriosService.getStatsByUsuarioId(usuarioId),
    enabled: !!usuarioId,
    refetchInterval: 3000,
  });
};

// ========== HOOKS DE CÓDIGOS DE VERIFICAÇÃO ==========

export const useValidateCode = () => {
  return useMutation({
    mutationFn: ({ email, codigo }: { email: string; codigo: string }) =>
      codigosVerificacaoService.validateCode(email, codigo),
  });
};

export const useCreateCode = () => {
  return useMutation({
    mutationFn: (codigo: { email_usuario: string; codigo: string; expira_em: string }) =>
      codigosVerificacaoService.create(codigo),
  });
};

