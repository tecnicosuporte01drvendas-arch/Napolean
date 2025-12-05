import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, UserPlus, Shield, User, Search, Crown, Code, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';

const Equipe = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMasterOrDev = user?.perfil_sistema === 'master' || user?.perfil_sistema === 'dev';
  const isMasterOrDevOrCS = user?.perfil_sistema === 'master' || user?.perfil_sistema === 'dev' || user?.perfil_sistema === 'cs';
  const isCS = user?.perfil_sistema === 'cs';
  const { data: usuariosEscopo, isLoading } = useUsuariosPorEscopo(user || null);
  const { data: todosUsuarios } = useUsuarios();
  
  // Master e CS: mostrar todos os usuários (mas CS não vê master/dev/cs)
  const usuarios = useMemo(() => {
    if (!user || !usuariosEscopo) return usuariosEscopo;
    const perfil = user.perfil_sistema || user.tipo || null;
    if (perfil === 'master') {
      // Master vê todos os usuários, incluindo colaboradores
      return usuariosEscopo;
    }
    if (perfil === 'cs') {
      // CS vê todos os usuários, exceto master/dev/cs
      return usuariosEscopo.filter(u => 
        u.perfil_sistema !== 'master' && 
        u.perfil_sistema !== 'dev' && 
        u.perfil_sistema !== 'cs'
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
  const [erroNomeEmpresa, setErroNomeEmpresa] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    setErroNomeEmpresa(false);
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
      // Validar nome da empresa para Master/Dev/CS criando colaborador
      if (isMasterOrDevOrCS && (!formData.nome_empresa || formData.nome_empresa.trim() === '')) {
        setErroNomeEmpresa(true);
        toast({
          title: 'Atenção',
          description: 'O nome da empresa é obrigatório para criar colaboradores.',
          variant: 'destructive',
        });
        return;
      }
      setErroNomeEmpresa(false);
      
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
        // Gestores são vinculados pela empresa, não mais por responsável específico
        csId = null;
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

  // Verificar se o usuário pode editar/excluir outro usuário
  const canEditOrDelete = (usuario: Usuario): boolean => {
    const protectedEmail = 'sergioricardorocharj@gmail.com';
    
    // Se o usuário sendo visualizado é o protegido
    if (usuario.email.toLowerCase() === protectedEmail.toLowerCase()) {
      // Apenas o próprio usuário com role master pode editar/excluir a si mesmo
      const isProtectedUser = user?.email?.toLowerCase() === protectedEmail.toLowerCase();
      const isMaster = user?.perfil_sistema === 'master';
      return isProtectedUser && isMaster;
    }
    
    // CS não pode editar/excluir master/dev/cs
    if (isCS) {
      const isRestrictedRole = usuario.perfil_sistema === 'master' || 
                               usuario.perfil_sistema === 'dev' || 
                               usuario.perfil_sistema === 'cs';
      if (isRestrictedRole) {
        return false;
      }
    }
    
    // Para outros usuários, permitir edição/exclusão normalmente
    return true;
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
    let gestores = usuarios.filter(u => 
      u.perfil_sistema === 'gestor' || u.tipo === 'gestor'
    );
    
    // Se for Master/Dev/CS criando colaborador, filtrar gestores pela empresa selecionada
    if (isMasterOrDevOrCS && (formData.tipo === 'colaborador' || formData.perfilSistema === 'colaborador') && formData.nome_empresa) {
      gestores = gestores.filter(u => u.nome_empresa === formData.nome_empresa);
    }
    
    return gestores;
  }, [usuarios, isMasterOrDevOrCS, formData.tipo, formData.perfilSistema, formData.nome_empresa]);

  // Filtrar usuários por termo de busca
  const filteredUsuarios = useMemo(() => {
    if (!usuarios) return [];
    
    return usuarios.filter((usuario) => {
      // Filtrar o próprio usuário
      if (usuario.id === user?.id) return false;
      
      // Filtrar por termo de busca
      if (searchTerm.trim() === '') return true;
      
      const term = searchTerm.toLowerCase();
      const nome = (usuario.nome || '').toLowerCase();
      const email = (usuario.email || '').toLowerCase();
      const tipo = getTipoLabel(usuario).toLowerCase();
      
      return nome.includes(term) || email.includes(term) || tipo.includes(term);
    });
  }, [usuarios, user, searchTerm]);

  // Paginação
  const totalPages = useMemo(() => {
    return Math.ceil(filteredUsuarios.length / itemsPerPage);
  }, [filteredUsuarios.length]);

  const paginatedUsuarios = useMemo(() => {
    if (!filteredUsuarios || filteredUsuarios.length === 0) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsuarios.slice(startIndex, endIndex);
  }, [filteredUsuarios, currentPage, itemsPerPage]);

  // Resetar página quando filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <AppSidebar>
      <div className="p-4 lg:p-6 overflow-x-hidden">
        {/* Header */}
        <header className="mb-4 animate-fade-in">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold gradient-text mb-1">
                {user?.perfil_sistema === 'master' 
                  ? 'Gerenciar Empresas Master' 
                  : user?.perfil_sistema === 'cs'
                  ? 'Gerenciar Empresas CS'
                  : 'Equipe'}
              </h1>
              <p className="text-muted-foreground">
                {user?.perfil_sistema === 'master' || user?.perfil_sistema === 'cs'
                  ? 'Gerencie todos os usuarios'
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
                {paginatedUsuarios.map((usuario) => (
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
                            disabled={!canEditOrDelete(usuario)}
                          >
                            <Edit className="w-4 h-4" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(usuario)}
                            disabled={!canEditOrDelete(usuario)}
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
            
            {/* Paginação */}
            {filteredUsuarios.length > itemsPerPage && (
              <div className="mt-3">
                <Pagination>
                  <PaginationContent className="gap-0.5">
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={`${currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-7 w-7 text-xs`}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </PaginationLink>
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer h-7 w-7 text-xs"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={`${currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-7 w-7 text-xs`}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </PaginationLink>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
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
                {/* Nome da Empresa - Sempre visível para Master, Dev e CS (PRIMEIRO INPUT) */}
                {isMasterOrDevOrCS && (
                  <div className="grid gap-2">
                    <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
                    <Input
                      id="nome_empresa"
                      value={formData.nome_empresa}
                      onChange={(e) => {
                        setFormData({ ...formData, nome_empresa: e.target.value });
                        setErroNomeEmpresa(false); // Limpar erro ao digitar
                      }}
                      placeholder="Nome da empresa"
                      required
                      className={erroNomeEmpresa ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome {isMasterOrDevOrCS && '*'}</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome completo"
                    required={isMasterOrDev}
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
                  <Label htmlFor="telefone">Telefone {isMasterOrDevOrCS && '*'}</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    required={isMasterOrDev}
                  />
                </div>

                {/* Tipo/Perfil - Depende do perfil do usuário logado */}
                {user?.perfil_sistema === 'master' ? (
                  <div className="grid gap-2">
                    <Label htmlFor="perfilSistema">Tipo de Usuário *</Label>
                    <Select
                      value={formData.perfilSistema}
                      onValueChange={(value: string) => {
                        const isMasterDevCS = value === 'master' || value === 'dev' || value === 'cs';
                        setFormData({ 
                          ...formData, 
                          perfilSistema: value as PerfilSistema,
                          tipo: value === 'gestor' ? 'gestor' : value === 'colaborador' ? 'colaborador' : '',
                          nome_empresa: isMasterDevCS ? 'Dr vendas' : formData.nome_empresa,
                        });
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="master">Master</SelectItem>
                        <SelectItem value="dev">Dev</SelectItem>
                        <SelectItem value="cs">CS</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="colaborador">Colaborador</SelectItem>
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
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="colaborador">Colaborador</SelectItem>
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
                      required
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

                {/* Seleção de Gestor responsável (apenas quando criando/alterando colaborador) */}
                {(formData.tipo === 'colaborador' || formData.perfilSistema === 'colaborador') && (
                  <>
                    {/* Para Master/Dev/CS: mostrar apenas se nome_empresa estiver preenchido */}
                    {isMasterOrDevOrCS ? (
                      formData.nome_empresa && formData.nome_empresa.trim() !== '' && (
                        <div className="grid gap-2">
                          <Label htmlFor="gestor">Gestor responsável *</Label>
                          <Select
                            value={formData.gestorId}
                            onValueChange={(value: string) => setFormData({ ...formData, gestorId: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o gestor" />
                            </SelectTrigger>
                            <SelectContent>
                              {gestoresDisponiveis.length > 0 ? (
                                gestoresDisponiveis.map((gestor) => (
                                  <SelectItem key={gestor.id} value={gestor.id}>
                                    {gestor.nome || gestor.email}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                  Nenhum gestor encontrado para esta empresa.
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            O colaborador receberá relatórios e será considerado parte da equipe do gestor selecionado.
                          </p>
                        </div>
                      )
                    ) : (
                      /* Para outras roles: mostrar normalmente */
                      <div className="grid gap-2">
                        <Label htmlFor="gestor">Gestor responsável *</Label>
                        <Select
                          value={formData.gestorId}
                          onValueChange={(value: string) => setFormData({ ...formData, gestorId: value })}
                          required
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
                          O colaborador receberá relatórios e será considerado parte da equipe do gestor selecionado.
                        </p>
                      </div>
                    )}
                  </>
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

