import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, UserPlus, Shield, User, Search, Crown, Code, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUsuariosPorEscopo, useCreateUsuario, useUpdateUsuario, useDeleteUsuario, useUsuarios } from '@/hooks/useSupabase';
import { usuariosService } from '@/lib/supabaseServices';
import type { Usuario, UsuarioInsert, TipoUsuario, PerfilSistema } from '@/lib/database.types';
import AppSidebar from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';

const Equipe = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: usuariosEscopo, isLoading } = useUsuariosPorEscopo(user || null);
  const { data: todosUsuarios } = useUsuarios();
  
  // Master: mostrar todas as roles exceto colaboradores
  const usuarios = useMemo(() => {
    if (!user || !usuariosEscopo) return usuariosEscopo;
    const perfil = user.perfil_sistema || user.tipo || null;
    if (perfil === 'master') {
      return usuariosEscopo.filter(u => 
        u.perfil_sistema !== 'colaborador' && u.tipo !== 'colaborador'
      );
    }
    return usuariosEscopo;
  }, [user, usuariosEscopo]);
  
  const createUsuario = useCreateUsuario();
  const updateUsuario = useUpdateUsuario();
  const deleteUsuario = useDeleteUsuario();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<{
    nome: string;
    email: string;
    telefone: string;
    nome_empresa: string;
    tipo: TipoUsuario | '';
    perfilSistema: PerfilSistema | '';
    gestorId: string;
    responsavelId: string;
  }>({
    nome: '',
    email: '',
    telefone: '',
    nome_empresa: '',
    tipo: '',
    perfilSistema: '',
    gestorId: '',
    responsavelId: '',
  });

  const resetForm = () => {
    const isGestor = user?.perfil_sistema === 'gestor' || user?.tipo === 'gestor';
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      nome_empresa: '',
      tipo: isGestor ? 'colaborador' : '',
      perfilSistema: isGestor ? 'colaborador' : '',
      gestorId: isGestor ? (user?.id || '') : '',
      responsavelId: '',
    });
    setEditingUsuario(null);
  };

  useEffect(() => {
    if (!isDialogOpen) {
      resetForm();
    }
  }, [isDialogOpen]);

  useEffect(() => {
    if (editingUsuario) {
      setFormData({
        nome: editingUsuario.nome || '',
        email: editingUsuario.email || '',
        telefone: editingUsuario.telefone || '',
        nome_empresa: editingUsuario.nome_empresa || '',
        tipo: (editingUsuario.tipo as TipoUsuario) || '',
        perfilSistema: (editingUsuario.perfil_sistema as PerfilSistema) || '',
        gestorId: editingUsuario.gestor_id || '',
        responsavelId: editingUsuario.cs_id || '',
      });
    }
  }, [editingUsuario]);

  const handleOpenDialog = (usuario?: Usuario) => {
    if (usuario) {
      setEditingUsuario(usuario);
    } else {
      setEditingUsuario(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    const perfil = user.perfil_sistema || user.tipo || null;
    let tipoFinal: TipoUsuario | null = null;
    let perfilSistemaFinal: PerfilSistema | null = null;
    let gestorId: string | null = null;
    let csId: string | null = null;

    // Se for colaborador
    if (formData.tipo === 'colaborador' || formData.perfilSistema === 'colaborador') {
      tipoFinal = 'colaborador';
      perfilSistemaFinal = 'colaborador';
      
      if (perfil === 'gestor') {
        gestorId = user.id;
      } else if (formData.gestorId) {
        gestorId = formData.gestorId;
      } else {
        toast({
          title: 'Atenção',
          description: 'Selecione um gestor responsável.',
          variant: 'destructive',
        });
        return;
      }

      // Tentar herdar cs_id e nome_empresa do gestor selecionado
      const gestor = usuarios?.find((u) => u.id === formData.gestorId);
      csId = gestor?.cs_id || null;
      // Colaborador herda a empresa do gestor (não precisa definir aqui, será feito depois)
    } 
    // Se for gestor cliente
    else if (formData.tipo === 'gestor' || formData.perfilSistema === 'gestor') {
      tipoFinal = 'gestor';
      perfilSistemaFinal = 'gestor';
      gestorId = null;
      
      // Validar nome da empresa (obrigatório para gestor)
      if (!formData.nome_empresa || formData.nome_empresa.trim() === '') {
        toast({
          title: 'Atenção',
          description: 'O nome da empresa é obrigatório para gestores.',
          variant: 'destructive',
        });
        return;
      }
      
      if (perfil === 'master') {
        // Master escolhe o responsável (Master ou CS)
        if (!formData.responsavelId) {
          toast({
            title: 'Atenção',
            description: 'Selecione o responsável (Master ou CS) por este gestor.',
            variant: 'destructive',
          });
          return;
        }
        
        // Verificar se o responsável é CS ou Master
        const responsavel = todosUsuarios?.find((u) => u.id === formData.responsavelId);
        if (responsavel?.perfil_sistema === 'cs') {
          csId = responsavel.id;
        } else {
          // Se for Master, não tem cs_id
          csId = null;
        }
      } else if (perfil === 'cs') {
        csId = user.id;
      } else {
        csId = user.cs_id || null;
      }
    }
    // Se for CS, Dev ou Master
    else if (formData.perfilSistema === 'cs' || formData.perfilSistema === 'dev' || formData.perfilSistema === 'master') {
      tipoFinal = null;
      perfilSistemaFinal = formData.perfilSistema;
      gestorId = null;
      csId = null;
    } else {
      toast({
        title: 'Atenção',
        description: 'Selecione um tipo de usuário.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.email) {
      toast({
        title: 'Atenção',
        description: 'O email é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Determinar nome_empresa
      let nomeEmpresa: string | null = null;
      
      if (tipoFinal === 'gestor' || perfilSistemaFinal === 'gestor') {
        // Gestor: usa o nome_empresa do formulário
        nomeEmpresa = formData.nome_empresa || null;
      } else if (tipoFinal === 'colaborador' || perfilSistemaFinal === 'colaborador') {
        // Colaborador: herda do gestor
        const gestorSelecionado = usuarios?.find((u) => u.id === gestorId);
        nomeEmpresa = gestorSelecionado?.nome_empresa || null;
      }

      const usuarioData: UsuarioInsert = {
        nome: formData.nome || null,
        email: formData.email,
        telefone: formData.telefone || null,
        nome_empresa: nomeEmpresa,
        tipo: tipoFinal,
        perfil_sistema: perfilSistemaFinal,
        gestor_id: gestorId,
        cs_id: csId,
      };

      if (editingUsuario) {
        await updateUsuario.mutateAsync({ id: editingUsuario.id, updates: usuarioData });
        
        // Se for gestor e mudou a empresa, atualizar todos os colaboradores dele
        if ((tipoFinal === 'gestor' || perfilSistemaFinal === 'gestor') && 
            formData.nome_empresa !== editingUsuario.nome_empresa) {
          // Buscar todos os colaboradores deste gestor (getByGestorId retorna gestor + colaboradores)
          const todosUsuariosGestor = await usuariosService.getByGestorId(editingUsuario.id);
          
          // Filtrar apenas colaboradores (excluir o próprio gestor)
          const colaboradores = todosUsuariosGestor.filter(
            (u) => u.id !== editingUsuario.id && 
                   (u.tipo === 'colaborador' || u.perfil_sistema === 'colaborador')
          );
          
          // Atualizar a empresa de todos os colaboradores
          for (const colaborador of colaboradores) {
            await usuariosService.update(colaborador.id, {
              nome_empresa: formData.nome_empresa || null,
            });
          }
        }
        
        toast({
          title: 'Sucesso',
          description: 'Usuário atualizado com sucesso.',
        });
      } else {
        await createUsuario.mutateAsync(usuarioData);
        toast({
          title: 'Sucesso',
          description: 'Usuário criado com sucesso.',
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o usuário.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (usuario: Usuario) => {
    setUsuarioToDelete(usuario);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!usuarioToDelete) return;

    try {
      await deleteUsuario.mutateAsync(usuarioToDelete.id);
      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso.',
      });
      setIsDeleteDialogOpen(false);
      setUsuarioToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o usuário.',
        variant: 'destructive',
      });
    }
  };

  const getTipoLabel = (usuario: Usuario): string => {
    if (usuario.perfil_sistema === 'master') return 'Master';
    if (usuario.perfil_sistema === 'dev') return 'Dev';
    if (usuario.perfil_sistema === 'cs') return 'CS';
    if (usuario.perfil_sistema === 'gestor' || usuario.tipo === 'gestor') return 'Gestor';
    if (usuario.perfil_sistema === 'colaborador' || usuario.tipo === 'colaborador') return 'Colaborador';
    return 'Usuário';
  };

  const getTipoIcon = (usuario: Usuario) => {
    if (usuario.perfil_sistema === 'master') return <Crown className="w-3 h-3" />;
    if (usuario.perfil_sistema === 'dev') return <Code className="w-3 h-3" />;
    if (usuario.perfil_sistema === 'cs') return <UserCheck className="w-3 h-3" />;
    if (usuario.perfil_sistema === 'gestor' || usuario.tipo === 'gestor') return <Shield className="w-3 h-3" />;
    return <User className="w-3 h-3" />;
  };

  // Filtrar colaboradores disponíveis para gestores
  const colaboradoresDisponiveis = useMemo(() => {
    if (!usuarios || !user) return [];
    const perfil = user.perfil_sistema || user.tipo || null;
    
    if (perfil === 'gestor') {
      return usuarios.filter(u => 
        (u.perfil_sistema === 'colaborador' || u.tipo === 'colaborador') &&
        u.gestor_id === user.id
      );
    }
    
    return usuarios.filter(u => 
      u.perfil_sistema === 'colaborador' || u.tipo === 'colaborador'
    );
  }, [usuarios, user]);

  // Filtrar gestores disponíveis
  const gestoresDisponiveis = useMemo(() => {
    if (!usuarios) return [];
    return usuarios.filter(u => 
      u.perfil_sistema === 'gestor' || u.tipo === 'gestor'
    );
  }, [usuarios]);

  return (
    <AppSidebar>
      <div className="p-4 lg:p-6 overflow-x-hidden">
        {/* Header */}
        <header className="mb-4 animate-fade-in">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold gradient-text mb-1">
                {user?.perfil_sistema === 'master' ? 'Gerenciar Empresas Master' : 'Equipe'}
              </h1>
              <p className="text-muted-foreground">
                {user?.perfil_sistema === 'master' 
                  ? 'Gerencie os usuarios Gestores/ Devs/ Equipe CS'
                  : 'Gerencie os usuários da sua equipe'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              {user && user.perfil_sistema !== 'colaborador' && (
                <Button
                  onClick={() => handleOpenDialog()}
                  className="gap-2 glow-primary"
                >
                  <UserPlus className="w-4 h-4" />
                  {user?.perfil_sistema === 'master' ? 'Inserir Novo Usuário' : 'Novo Usuário'}
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Lista de Usuários */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        ) : usuarios && usuarios.length > 0 ? (
          <Card className="glass light-shadow">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-foreground">Usuário</TableHead>
                  <TableHead className="text-foreground text-center">Email</TableHead>
                  <TableHead className="text-foreground text-center hidden md:table-cell">Telefone</TableHead>
                  <TableHead className="text-foreground text-center hidden lg:table-cell">Nome da Empresa</TableHead>
                  <TableHead className="text-foreground text-center">Tipo</TableHead>
                  <TableHead className="text-foreground text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios
                  ?.filter((usuario) => {
                    // Filtrar o próprio usuário
                    if (usuario.id === user?.id) return false;
                    
                    // Filtrar por termo de busca
                    if (searchTerm.trim() === '') return true;
                    
                    const term = searchTerm.toLowerCase();
                    const nome = (usuario.nome || '').toLowerCase();
                    const email = (usuario.email || '').toLowerCase();
                    const tipo = getTipoLabel(usuario).toLowerCase();
                    
                    return nome.includes(term) || email.includes(term) || tipo.includes(term);
                  })
                  .map((usuario) => (
                    <TableRow
                      key={usuario.id}
                      className="border-border hover:bg-primary/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
                            {usuario.nome
                              ? usuario.nome.charAt(0).toUpperCase()
                              : usuario.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">
                              {usuario.nome || 'Sem nome'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-center">
                        {usuario.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-center hidden md:table-cell">
                        {usuario.telefone || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-center hidden lg:table-cell">
                        {usuario.nome_empresa || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-xs min-w-[80px]">
                          {getTipoIcon(usuario)}
                          {getTipoLabel(usuario)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleOpenDialog(usuario)}
                          >
                            <Edit className="w-4 h-4" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(usuario)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="glass light-shadow p-12 text-center">
            <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Nenhum usuário cadastrado</h3>
            <p className="text-muted-foreground mb-6">
              Comece adicionando o primeiro usuário da sua equipe.
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2 glow-primary">
              <Plus className="w-4 h-4" />
              Adicionar Usuário
            </Button>
          </Card>
        )}

        {/* Dialog de Cadastro/Edição */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
                </DialogTitle>
                <DialogDescription>
                  {editingUsuario
                    ? 'Atualize as informações do usuário.'
                    : 'Preencha os dados para criar um novo usuário.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {/* Nome da Empresa - Apenas para Gestor */}
                {(formData.tipo === 'gestor' || formData.perfilSistema === 'gestor') && (
                  <div className="grid gap-2">
                    <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
                    <Input
                      id="nome_empresa"
                      value={formData.nome_empresa}
                      onChange={(e) => setFormData({ ...formData, nome_empresa: e.target.value })}
                      placeholder="Nome da empresa"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome da empresa que este gestor representa.
                    </p>
                  </div>
                )}

                {/* Tipo/Perfil - Depende do perfil do usuário logado */}
                {user?.perfil_sistema === 'master' ? (
                  <div className="grid gap-2">
                    <Label htmlFor="perfilSistema">Tipo de Usuário *</Label>
                    <Select
                      value={formData.perfilSistema}
                      onValueChange={(value: string) => {
                        setFormData({ 
                          ...formData, 
                          perfilSistema: value as PerfilSistema,
                          tipo: value === 'gestor' ? 'gestor' : value === 'colaborador' ? 'colaborador' : '',
                          responsavelId: value !== 'gestor' ? '' : formData.responsavelId,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="master">Master</SelectItem>
                        <SelectItem value="dev">Dev</SelectItem>
                        <SelectItem value="cs">CS</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : user?.perfil_sistema === 'cs' ? (
                  <div className="grid gap-2">
                    <Label htmlFor="tipo">Tipo de Usuário *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value: string) => {
                        setFormData({ 
                          ...formData, 
                          tipo: value as TipoUsuario,
                          perfilSistema: value as PerfilSistema,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gestor">Gestor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="tipo">Tipo de Usuário *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value: string) => {
                        setFormData({ 
                          ...formData, 
                          tipo: value as TipoUsuario,
                          perfilSistema: value as PerfilSistema,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="colaborador">Colaborador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Seleção de Responsável (apenas quando Master criar/editar gestor) */}
                {user?.perfil_sistema === 'master' && (formData.tipo === 'gestor' || formData.perfilSistema === 'gestor') && (
                  <div className="grid gap-2">
                    <Label htmlFor="responsavel">Responsável *</Label>
                    <Select
                      value={formData.responsavelId}
                      onValueChange={(value: string) => setFormData({ ...formData, responsavelId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável (Master ou CS)" />
                      </SelectTrigger>
                      <SelectContent>
                        {(todosUsuarios || [])
                          .filter((u) => u.perfil_sistema === 'master' || u.perfil_sistema === 'cs')
                          .map((responsavel) => (
                            <SelectItem key={responsavel.id} value={responsavel.id}>
                              <div className="flex items-center gap-2">
                                {responsavel.perfil_sistema === 'master' ? (
                                  <Crown className="w-4 h-4" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                                {responsavel.nome || responsavel.email} ({responsavel.perfil_sistema === 'master' ? 'Master' : 'CS'})
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Selecione o Master ou CS responsável por este gestor.</p>
                  </div>
                )}

                {/* Seleção de Gestor responsável (apenas quando criando/alterando colaborador) */}
                {(formData.tipo === 'colaborador' || formData.perfilSistema === 'colaborador') && (
                  <div className="grid gap-2">
                    <Label htmlFor="gestor">Gestor responsável *</Label>
                    <Select
                      value={formData.gestorId}
                      onValueChange={(value: string) => setFormData({ ...formData, gestorId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gestor" />
                      </SelectTrigger>
                      <SelectContent>
                        {gestoresDisponiveis.map((gestor) => (
                          <SelectItem key={gestor.id} value={gestor.id}>
                            {gestor.nome || gestor.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {user?.perfil_sistema === 'master'
                        ? 'O colaborador receberá relatórios e será considerado parte da equipe do gestor selecionado.'
                        : 'O colaborador receberá relatórios e será considerado parte da equipe do gestor selecionado.'}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createUsuario.isPending || updateUsuario.isPending}>
                  {createUsuario.isPending || updateUsuario.isPending ? (
                    'Salvando...'
                  ) : editingUsuario ? (
                    'Salvar Alterações'
                  ) : (
                    'Criar Usuário'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                {usuarioToDelete?.perfil_sistema === 'master' || usuarioToDelete?.perfil_sistema === 'dev' || usuarioToDelete?.perfil_sistema === 'cs'
                  ? 'Esta ação irá apagar também todos os relatórios e dados vinculados a este usuário e não pode ser desfeita.'
                  : 'Esta ação irá apagar também todos os relatórios e dados vinculados a este usuário e não pode ser desfeita.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUsuarioToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppSidebar>
  );
};

export default Equipe;
