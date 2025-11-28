import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, UserPlus, Shield, User, Search } from 'lucide-react';
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
import type { Usuario, UsuarioInsert, TipoUsuario, PerfilSistema } from '@/lib/database.types';
import { Crown, Code, UserCheck } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';

const Equipe = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: usuariosEscopo, isLoading } = useUsuariosPorEscopo(user || null);
  const { data: todosUsuarios } = useUsuarios(); // Para filtrar Masters e CS
  
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
    tipo: TipoUsuario | '';
    perfilSistema: PerfilSistema | '';
    gestorId: string;
    responsavelId: string;
  }>({
    nome: '',
    email: '',
    telefone: '',
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
      tipo: isGestor ? 'colaborador' : '',
      perfilSistema: isGestor ? 'colaborador' : '',
      gestorId: isGestor ? (user?.id || '') : '',
      responsavelId: '',
    });
    setEditingUsuario(null);
  };

  // Sincronizar formData quando editingUsuario mudar ou dialog abrir
  useEffect(() => {
    if (isDialogOpen) {
      if (editingUsuario) {
        // Preencher com dados do usuário sendo editado
        setFormData({
          nome: editingUsuario.nome || '',
          email: editingUsuario.email,
          telefone: editingUsuario.telefone || '',
          tipo: (editingUsuario.tipo as TipoUsuario) || '',
          perfilSistema: (editingUsuario.perfil_sistema as PerfilSistema) || '',
          gestorId: editingUsuario.gestor_id || '',
          responsavelId: editingUsuario.cs_id || '',
        });
      } else {
        // Resetar para novo usuário
        resetForm();
        // Se for gestor, garantir que tipo e gestorId estejam definidos
        const isGestor = user?.perfil_sistema === 'gestor' || user?.tipo === 'gestor';
        if (isGestor) {
          setFormData(prev => ({
            ...prev,
            tipo: 'colaborador',
            perfilSistema: 'colaborador',
            gestorId: user?.id || '',
          }));
        }
      }
    }
  }, [editingUsuario, isDialogOpen, user]);

  const handleOpenDialog = (usuario?: Usuario) => {
    if (usuario) {
      // Definir o usuário a ser editado ANTES de abrir o dialog
      setEditingUsuario(usuario);
      // Preencher os dados imediatamente também
      setFormData({
        nome: usuario.nome || '',
        email: usuario.email,
        telefone: usuario.telefone || '',
        tipo: (usuario.tipo as TipoUsuario) || '',
        perfilSistema: (usuario.perfil_sistema as PerfilSistema) || '',
        gestorId: usuario.gestor_id || '',
        responsavelId: usuario.cs_id || '',
      });
    } else {
      // Limpar para novo usuário
      setEditingUsuario(null);
      resetForm();
    }
    // Abrir o dialog após definir os estados
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // Resetar após um pequeno delay para evitar flicker
    setTimeout(() => {
      resetForm();
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado.',
        variant: 'destructive',
      });
      return;
    }

    const perfil: PerfilSistema | null = user.perfil_sistema || null;
    const isGestor = perfil === 'gestor' || user.tipo === 'gestor';

    // Se for gestor, forçar tipo como colaborador se não estiver definido
    if (isGestor && !formData.tipo && !formData.perfilSistema) {
      formData.tipo = 'colaborador';
      formData.perfilSistema = 'colaborador';
    }

    // Determinar gestor responsável e cs responsável conforme perfil
    let gestorId: string | null = null;
    let csId: string | null = null;
    let tipoFinal: TipoUsuario | null = null;
    let perfilSistemaFinal: PerfilSistema | null = null;

    // Se Master/Dev está criando um perfil de sistema (master, dev, cs)
    if (formData.perfilSistema && ['master', 'dev', 'cs'].includes(formData.perfilSistema)) {
      perfilSistemaFinal = formData.perfilSistema as PerfilSistema;
      tipoFinal = null; // Perfis de sistema não têm tipo
      gestorId = null;
      csId = null;
    }
    // Se for colaborador, precisamos de um gestor vinculado
    else if (formData.tipo === 'colaborador' || formData.perfilSistema === 'colaborador') {
      tipoFinal = 'colaborador';
      perfilSistemaFinal = 'colaborador';
      
      if (isGestor) {
        // Gestor só pode criar colaboradores da própria equipe
        gestorId = user.id;
        csId = user.cs_id || null;
      } else {
        // Master, Dev, CS precisam escolher um gestor
        if (!formData.gestorId) {
          toast({
            title: 'Atenção',
            description: 'Selecione o gestor responsável por este colaborador.',
            variant: 'destructive',
          });
          return;
        }
        gestorId = formData.gestorId;

        // Tentar herdar cs_id do gestor selecionado
        const gestor = usuarios?.find((u) => u.id === formData.gestorId);
        csId = gestor?.cs_id || null;
      }
    } 
    // Se for gestor cliente
    else if (formData.tipo === 'gestor' || formData.perfilSistema === 'gestor') {
      tipoFinal = 'gestor';
      perfilSistemaFinal = 'gestor';
      gestorId = null;
      
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

    // Validação: Master/Dev deve ter selecionado um perfil
    if ((perfil === 'master' || perfil === 'dev') && !formData.perfilSistema && !formData.tipo) {
      toast({
        title: 'Atenção',
        description: 'Selecione o tipo/perfil do usuário.',
        variant: 'destructive',
      });
      return;
    }

    // Validação: Se for gestor e não tiver tipo/perfil definido, definir como colaborador
    if (isGestor && !tipoFinal && !perfilSistemaFinal) {
      tipoFinal = 'colaborador';
      perfilSistemaFinal = 'colaborador';
      gestorId = user.id;
      csId = user.cs_id || null;
    }

    // Validação: Se for gestor criando colaborador, garantir que gestorId está definido
    if (isGestor && tipoFinal === 'colaborador' && !gestorId) {
      gestorId = user.id;
      csId = user.cs_id || null;
    }

    const usuarioData: UsuarioInsert = {
      nome: formData.nome || null,
      email: formData.email,
      telefone: formData.telefone || null,
      tipo: tipoFinal,
      perfil_sistema: perfilSistemaFinal,
      gestor_id: gestorId,
      cs_id: csId,
    };

    try {
      if (editingUsuario) {
        const result = await updateUsuario.mutateAsync({
          id: editingUsuario.id,
          updates: usuarioData,
        });

        if (result) {
          toast({
            title: 'Sucesso!',
            description: 'Usuário atualizado com sucesso.',
          });
          handleCloseDialog();
        } else {
          toast({
            title: 'Erro',
            description: 'Não foi possível atualizar o usuário.',
            variant: 'destructive',
          });
        }
      } else {
        const result = await createUsuario.mutateAsync(usuarioData);

        if (result) {
          toast({
            title: 'Sucesso!',
            description: 'Usuário cadastrado com sucesso.',
          });
          handleCloseDialog();
        } else {
          toast({
            title: 'Erro',
            description: 'Não foi possível cadastrar o usuário. Verifique se o email já não está em uso.',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar o usuário.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (usuario: Usuario) => {
    setUsuarioToDelete(usuario);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!usuarioToDelete) return;

    try {
      const success = await deleteUsuario.mutateAsync(usuarioToDelete.id);

      if (success) {
        toast({
          title: 'Sucesso!',
          description: 'Usuário excluído com sucesso.',
        });
        setIsDeleteDialogOpen(false);
        setUsuarioToDelete(null);
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível excluir o usuário.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao excluir o usuário.',
        variant: 'destructive',
      });
    }
  };

  const getTipoLabel = (usuario: Usuario) => {
    // Priorizar perfil_sistema se existir
    if (usuario.perfil_sistema) {
      switch (usuario.perfil_sistema) {
        case 'master':
          return 'Master';
        case 'dev':
          return 'Dev';
        case 'cs':
          return 'CS';
        case 'gestor':
          return 'Gestor';
        case 'colaborador':
          return 'Colaborador';
        default:
          break;
      }
    }
    
    // Se não tiver perfil_sistema, usar tipo
    if (usuario.tipo) {
      switch (usuario.tipo) {
        case 'gestor':
          return 'Gestor';
        case 'colaborador':
          return 'Colaborador';
        default:
          break;
      }
    }
    
    return 'Não definido';
  };

  const getTipoIcon = (usuario: Usuario) => {
    // Priorizar perfil_sistema se existir
    if (usuario.perfil_sistema) {
      switch (usuario.perfil_sistema) {
        case 'master':
          return <Crown className="w-4 h-4" />;
        case 'dev':
          return <Code className="w-4 h-4" />;
        case 'cs':
          return <UserCheck className="w-4 h-4" />;
        case 'gestor':
          return <Shield className="w-4 h-4" />;
        case 'colaborador':
          return <User className="w-4 h-4" />;
        default:
          break;
      }
    }
    
    // Se não tiver perfil_sistema, usar tipo
    if (usuario.tipo) {
      switch (usuario.tipo) {
        case 'gestor':
          return <Shield className="w-4 h-4" />;
        case 'colaborador':
          return <User className="w-4 h-4" />;
        default:
          break;
      }
    }
    
    return <User className="w-4 h-4" />;
  };

  return (
    <AppSidebar>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold gradient-text mb-2">
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
                  {editingUsuario ? 'Editar Usuário' : (user?.perfil_sistema === 'master' ? 'Inserir Novo Usuário' : 'Novo Usuário')}
                </DialogTitle>
                <DialogDescription>
                  {editingUsuario
                    ? 'Atualize as informações do usuário.'
                    : 'Preencha os dados para cadastrar um novo usuário na equipe.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    placeholder="Nome completo"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    disabled={!!editingUsuario}
                  />
                  {editingUsuario && (
                    <p className="text-xs text-muted-foreground">
                      O email não pode ser alterado.
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={(e) =>
                      setFormData({ ...formData, telefone: e.target.value })
                    }
                  />
                </div>

                {/* Master/Dev: pode criar qualquer perfil */}
                {(user?.perfil_sistema === 'master' || user?.perfil_sistema === 'dev') ? (
                  <div className="grid gap-2">
                    <Label htmlFor="perfilSistema">Perfil do Sistema *</Label>
                    <Select
                      value={formData.perfilSistema}
                      onValueChange={(value: PerfilSistema) => {
                        // Limpar tipo quando selecionar perfil de sistema
                        if (['master', 'dev', 'cs'].includes(value)) {
                          setFormData({ ...formData, perfilSistema: value, tipo: '', gestorId: '', responsavelId: '' });
                        } else {
                          setFormData({ ...formData, perfilSistema: value, tipo: value as TipoUsuario, responsavelId: '' });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="master">
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4" />
                            Master
                          </div>
                        </SelectItem>
                        <SelectItem value="dev">
                          <div className="flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            Dev
                          </div>
                        </SelectItem>
                        <SelectItem value="cs">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4" />
                            CS - Sucesso do Cliente
                          </div>
                        </SelectItem>
                        <SelectItem value="gestor">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Gestor
                          </div>
                        </SelectItem>
                        <SelectItem value="colaborador">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Colaborador
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      <strong>Master/Dev:</strong> Acesso total ao sistema.
                      <br />
                      <strong>CS:</strong> Gerencia gestores e colaboradores de clientes.
                      <br />
                      <strong>Gestor:</strong> Pode gerenciar usuários e recebe cópia de todos os relatórios.
                      <br />
                      <strong>Colaborador:</strong> Pode enviar áudios/transcrições e recebe apenas seus relatórios.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="tipo">Tipo de Usuário *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value: TipoUsuario) =>
                        setFormData({ ...formData, tipo: value, perfilSistema: value as PerfilSistema })
                      }
                      disabled={user?.perfil_sistema === 'gestor' || user?.tipo === 'gestor'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gestor">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Gestor
                          </div>
                        </SelectItem>
                        <SelectItem value="colaborador">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Colaborador
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      <strong>Gestor:</strong> Pode gerenciar usuários e recebe cópia de todos os relatórios.
                      <br />
                      <strong>Colaborador:</strong> Pode enviar áudios/transcrições e recebe apenas seus relatórios.
                    </p>
                  </div>
                )}

                {/* Seleção de Responsável (apenas quando Master criar/editar gestor) */}
                {user?.perfil_sistema === 'master' && (formData.tipo === 'gestor' || formData.perfilSistema === 'gestor') && (
                  <div className="grid gap-2">
                    <Label htmlFor="responsavel">Responsável *</Label>
                    <Select
                      value={formData.responsavelId}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, responsavelId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável (Master ou CS)" />
                      </SelectTrigger>
                      <SelectContent>
                        {(todosUsuarios || [])
                          .filter((u) => 
                            u.perfil_sistema === 'master' || u.perfil_sistema === 'cs'
                          )
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
                    <p className="text-xs text-muted-foreground">
                      Selecione o Master ou CS responsável por este gestor.
                    </p>
                  </div>
                )}

                {/* Seleção de Gestor responsável (apenas quando criando/alterando colaborador) */}
                {(formData.tipo === 'colaborador' || formData.perfilSistema === 'colaborador') && (
                  <div className="grid gap-2">
                    <Label htmlFor="gestor">Gestor responsável *</Label>
                    <Select
                      value={formData.gestorId}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, gestorId: value })
                      }
                      disabled={user?.perfil_sistema === 'gestor' || user?.tipo === 'gestor'}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            user?.perfil_sistema === 'gestor' || user?.tipo === 'gestor'
                              ? 'Você é o gestor responsável'
                              : 'Selecione o gestor responsável'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(usuarios || [])
                          .filter((u) => u.tipo === 'gestor')
                          .map((gestor) => (
                            <SelectItem key={gestor.id} value={gestor.id}>
                              {gestor.nome || gestor.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {user?.perfil_sistema === 'gestor' || user?.tipo === 'gestor'
                        ? 'Como gestor, todos os colaboradores criados/gerenciados por você ficarão automaticamente vinculados à sua equipe.'
                        : 'O colaborador receberá relatórios e será considerado parte da equipe do gestor selecionado.'}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createUsuario.isPending || updateUsuario.isPending}
                >
                  {createUsuario.isPending || updateUsuario.isPending
                    ? 'Salvando...'
                    : editingUsuario
                    ? 'Atualizar'
                    : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o usuário{' '}
                <strong>
                  {usuarioToDelete?.nome || usuarioToDelete?.email}
                </strong>
                ? Esta ação irá apagar também todos os relatórios e dados vinculados a este usuário e não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUsuarioToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteUsuario.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppSidebar>
  );
};

export default Equipe;

