import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  TrendingUp,
  FileText,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Filter,
  Search,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import AppSidebar from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useUsuariosPorEscopo, useRelatorios, useUsuarios } from '@/hooks/useSupabase';
import { usuariosService } from '@/lib/supabaseServices';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { Usuario, Relatorio } from '@/lib/database.types';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: isLoadingUser } = useAuth();
  const { data: usuariosEscopo, isLoading: isLoadingUsuarios } =
    useUsuariosPorEscopo(user || null);
  const { data: relatorios, isLoading: isLoadingRelatorios } = useRelatorios();
  const { data: todosUsuarios, isLoading: isLoadingTodosUsuarios } = useUsuarios(); // Buscar todos os usuários para Master

  // Buscar dados de cada CS (gestores + colaboradores) usando a mesma abordagem da EquipeCSDetail
  const csQueries = useQueries({
    queries: user?.perfil_sistema === 'master' && usuariosEscopo
      ? usuariosEscopo
          .filter(u => u.perfil_sistema === 'cs')
          .map(cs => ({
            queryKey: ['cs-dados-dashboard', cs.id],
            queryFn: async () => {
              // Buscar gestores vinculados a este CS (igual EquipeCSDetail)
              const gestores = await usuariosService.getByCsId(cs.id);
              
              // Buscar colaboradores de cada gestor
              const todosUsuariosCS = [...gestores];
              for (const gestor of gestores) {
                const colaboradores = await usuariosService.getByGestorId(gestor.id);
                todosUsuariosCS.push(...colaboradores.filter(c => c.tipo === 'colaborador'));
              }
              
              return { csId: cs.id, usuarios: todosUsuariosCS };
            },
            enabled: !!cs.id,
            refetchInterval: 3000, // Auto-refresh a cada 3 segundos
          }))
      : [],
  });

  // Criar um mapa para acesso rápido aos dados de cada CS
  const csDadosMap = useMemo(() => {
    const map = new Map<string, Usuario[]>();
    csQueries.forEach((query) => {
      if (query.data) {
        map.set(query.data.csId, query.data.usuarios);
      }
    });
    return map;
  }, [csQueries]);

  // Buscar colaboradores da mesma equipe quando for colaborador
  const isColaboradorUser = user?.perfil_sistema === 'colaborador' || user?.tipo === 'colaborador';
  const { data: colaboradoresEquipe } = useQuery({
    queryKey: ['colaboradores-equipe', user?.gestor_id],
    queryFn: () => {
      if (!user?.gestor_id) return [];
      return usuariosService.getByGestorId(user.gestor_id);
    },
    enabled: !!isColaboradorUser && !!user?.gestor_id,
    refetchInterval: 3000,
  });

  const isLoading = isLoadingUser || isLoadingUsuarios || isLoadingRelatorios || (user?.perfil_sistema === 'master' && isLoadingTodosUsuarios);

  // --- Quem compõe a "equipe" dessa visão (por role) ---
  const teamUsers: Usuario[] = useMemo(() => {
    if (!user) return [];

    const perfil = user.perfil_sistema || user.tipo || null;

    // Colaborador: ver todos os colaboradores da mesma equipe (mesmo gestor_id)
    if (perfil === 'colaborador') {
      if (!colaboradoresEquipe) return [user];
      // Filtrar apenas colaboradores (excluir o próprio gestor)
      return colaboradoresEquipe.filter(u => 
        (u.tipo === 'colaborador' || u.perfil_sistema === 'colaborador') &&
        u.gestor_id === user.gestor_id
      );
    }

    // Master / Dev / CS / Gestor: usam escopo calculado pelo hook
    let usuarios = (usuariosEscopo || []).length > 0 ? (usuariosEscopo as Usuario[]) : [user];
    
    // Gestor: mostrar apenas colaboradores vinculados a ele
    if (perfil === 'gestor') {
      usuarios = usuarios.filter(u => 
        (u.tipo === 'colaborador' || u.perfil_sistema === 'colaborador') &&
        u.gestor_id === user.id
      );
    }
    
    // Master e CS: mostrar TODOS os gestores na lista da equipe
    if (perfil === 'master' || perfil === 'cs') {
      usuarios = usuarios.filter(u => 
        u.perfil_sistema === 'gestor' || u.tipo === 'gestor'
      );
    }
    
    return usuarios;
  }, [user, usuariosEscopo, colaboradoresEquipe]);

  // --- Estatísticas reais vindas de relatorios ---
  const { teamStats, radarData, salespeople } = useMemo(() => {
    if (!relatorios || !user) {
      return {
        teamStats: {
          avgScore: '0.0',
          totalTranscriptions: 0,
          topPerformer: null as {
            id: string;
            name: string;
            averageScore: number;
          } | null,
        },
        radarData: [] as Array<{ step: string; score: number }>,
        salespeople: [] as {
          id: string;
          name: string;
          email: string;
          role: string;
          averageScore: number;
          totalTranscriptions: number;
        }[],
      };
    }

    // Para Master e CS: agrupar por empresas únicas
    if (user.perfil_sistema === 'master' || user.perfil_sistema === 'cs') {
      // Buscar todos os gestores com nome_empresa
      const gestoresComEmpresa = teamUsers.filter(
        (u) => (u.perfil_sistema === 'gestor' || u.tipo === 'gestor') && u.nome_empresa
      );

      // Agrupar por nome_empresa
      const empresasMap = new Map<string, {
        nome_empresa: string;
        gestores: Usuario[];
        userIds: Set<string>;
      }>();

      gestoresComEmpresa.forEach((gestor) => {
        const nomeEmpresa = gestor.nome_empresa!;
        if (!empresasMap.has(nomeEmpresa)) {
          empresasMap.set(nomeEmpresa, {
            nome_empresa: nomeEmpresa,
            gestores: [],
            userIds: new Set(),
          });
        }
        const empresa = empresasMap.get(nomeEmpresa)!;
        empresa.gestores.push(gestor);
        empresa.userIds.add(gestor.id);

        // Adicionar colaboradores de cada gestor
        if (todosUsuarios) {
          const colaboradoresGestor = todosUsuarios.filter(
            (u) => (u.tipo === 'colaborador' || u.perfil_sistema === 'colaborador') && u.gestor_id === gestor.id
          );
          colaboradoresGestor.forEach((colab) => {
            empresa.userIds.add(colab.id);
          });
        }
      });

      // Calcular stats para cada empresa
      const salespeople = Array.from(empresasMap.values()).map((empresa) => {
        const relatoriosEmpresa = (relatorios as Relatorio[]).filter(
          (r) => r.id_usuario && empresa.userIds.has(r.id_usuario)
        );

        const validScores = relatoriosEmpresa.filter((r) => r.nota_media !== null);
        const averageScore =
          validScores.length > 0
            ? validScores.reduce((sum, r) => sum + (r.nota_media || 0), 0) / validScores.length
            : 0;

        // Calcular médias das etapas
        const calcularMediaEtapa = (notaFn: (r: Relatorio) => number | null) => {
          const notas = relatoriosEmpresa.map(notaFn).filter((n): n is number => n !== null);
          return notas.length > 0 ? notas.reduce((sum, n) => sum + n, 0) / notas.length : null;
        };

        return {
          id: empresa.nome_empresa, // Usar nome_empresa como ID para navegação
          name: empresa.nome_empresa,
          email: empresa.nome_empresa,
          role: 'Empresa',
          averageScore,
          totalTranscriptions: relatoriosEmpresa.length,
          etapa1: calcularMediaEtapa(r => r.nota_boas_vindas),
          etapa2: calcularMediaEtapa(r => r.nota_identificacao),
          etapa3: calcularMediaEtapa(r => r.nota_historia),
          etapa4: calcularMediaEtapa(r => r.nota_pilares),
          etapa5: calcularMediaEtapa(r => r.nota_objecoes),
          etapa6: calcularMediaEtapa(r => r.nota_impacto),
          etapa7: calcularMediaEtapa(r => r.nota_proposta),
        };
      }).sort((a, b) => b.averageScore - a.averageScore);

      // Calcular stats gerais (todos os relatórios do sistema para Master e CS)
      const totalTranscriptions = (relatorios as Relatorio[]).length;
      const validScores = (relatorios as Relatorio[]).filter((r) => r.nota_media !== null);
      const avgScore =
        validScores.length > 0
          ? validScores.reduce((sum, r) => sum + (r.nota_media || 0), 0) / validScores.length
          : 0;

      const topPerformer =
        salespeople.length > 0
          ? salespeople.reduce((best, current) =>
              current.averageScore > best.averageScore ? current : best,
            )
          : null;

      // Radar com todos os relatórios
      const steps = [
        { key: 'nota_boas_vindas', label: 'Apresentação' },
        { key: 'nota_identificacao', label: 'Identificação de Necessidades' },
        { key: 'nota_historia', label: 'Conexão por História Pessoal' },
        { key: 'nota_pilares', label: 'Pilares da Mentoria' },
        { key: 'nota_objecoes', label: 'Quebra de Objeções' },
        { key: 'nota_impacto', label: 'Impacto e Transformação' },
        { key: 'nota_proposta', label: 'Proposta de Valor' },
      ] as const;

      const radarData: Array<{ step: string; score: number }> = steps.map((step) => {
        const valores = (relatorios as Relatorio[])
          .map((r) => r[step.key as keyof Relatorio] as number | null)
          .filter((v): v is number => v !== null);

        const media =
          valores.length > 0
            ? valores.reduce((a, b) => a + b, 0) / valores.length
            : 0;

        return {
          step: step.label,
          score: Number(media.toFixed(1)),
        };
      });

      // Adicionar "Nota Final" após "Proposta de Valor" (entre Proposta e Apresentação)
      radarData.push({
        step: 'Nota Final',
        score: Number(avgScore.toFixed(1)),
      });

      return {
        teamStats: {
          avgScore: avgScore.toFixed(1),
          totalTranscriptions,
          topPerformer,
        },
        radarData,
        salespeople,
      };
    }

    // Lógica original para outros perfis
    const teamUserIds = new Set(teamUsers.map((u) => u.id));
    const teamRelatorios = (relatorios as Relatorio[]).filter(
      (r) => r.id_usuario && teamUserIds.has(r.id_usuario),
    );

    // Para colaborador e gestor: usar apenas relatórios do próprio usuário para stats individuais
    const isColaboradorUser = user?.perfil_sistema === 'colaborador' || user?.tipo === 'colaborador';
    const isGestorUser = user?.perfil_sistema === 'gestor' || user?.tipo === 'gestor';
    const relatoriosParaStats = (isColaboradorUser || isGestorUser)
      ? (relatorios as Relatorio[]).filter((r) => r.id_usuario === user.id)
      : teamRelatorios;

    const salespeople = teamUsers
      .map((u) => {
        const relatoriosUsuario = teamRelatorios.filter((r) => r.id_usuario === u.id);
        const validScores = relatoriosUsuario.filter((r) => r.nota_media !== null);
        const averageScore =
          validScores.length > 0
            ? validScores.reduce((sum, r) => sum + (r.nota_media || 0), 0) /
              validScores.length
            : 0;

        return {
          id: u.id,
          name: u.nome || u.email,
          email: u.email,
          role:
            u.tipo === 'gestor'
              ? 'Gestor'
              : u.tipo === 'colaborador'
              ? 'Colaborador'
              : u.perfil_sistema || 'Usuário',
          averageScore,
          totalTranscriptions: relatoriosUsuario.length,
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore); // Ordenar por maior nota primeiro

    // Para colaborador: stats individuais; para outros: stats da equipe
    const totalTranscriptions = isColaboradorUser
      ? relatoriosParaStats.length
      : salespeople.reduce((sum, p) => sum + p.totalTranscriptions, 0);

    const validScoresStats = relatoriosParaStats.filter((r) => r.nota_media !== null);
    const avgScore = isColaboradorUser
      ? validScoresStats.length > 0
        ? validScoresStats.reduce((sum, r) => sum + (r.nota_media || 0), 0) / validScoresStats.length
        : 0
      : salespeople.length > 0
      ? salespeople.reduce((sum, p) => sum + p.averageScore, 0) / salespeople.length
      : 0;

    const topPerformer =
      salespeople.length > 0
        ? salespeople.reduce((best, current) =>
            current.averageScore > best.averageScore ? current : best,
          )
        : null;

    // Radar das 7 etapas (individual para colaborador, média da equipe para outros)
    const steps = [
      { key: 'nota_boas_vindas', label: 'Apresentação' },
      { key: 'nota_identificacao', label: 'Identificação de Necessidades' },
      { key: 'nota_historia', label: 'Conexão por História Pessoal' },
      { key: 'nota_pilares', label: 'Pilares da Mentoria' },
      { key: 'nota_objecoes', label: 'Quebra de Objeções' },
      { key: 'nota_impacto', label: 'Impacto e Transformação' },
      { key: 'nota_proposta', label: 'Proposta de Valor' },
    ] as const;

    const radarData: Array<{ step: string; score: number }> = steps.map((step) => {
      const valores = relatoriosParaStats
        .map((r) => r[step.key as keyof Relatorio] as number | null)
        .filter((v): v is number => v !== null);

      const media =
        valores.length > 0
          ? valores.reduce((a, b) => a + b, 0) / valores.length
          : 0;

      return {
        step: step.label,
        score: Number(media.toFixed(1)),
      };
    });

    // Adicionar "Nota Final" após "Proposta de Valor" (entre Proposta e Apresentação)
    radarData.push({
      step: 'Nota Final',
      score: Number(avgScore.toFixed(1)),
    });

    return {
      teamStats: {
        avgScore: avgScore.toFixed(1),
        totalTranscriptions,
        topPerformer,
      },
      radarData,
      salespeople,
    };
  }, [relatorios, teamUsers, user, csDadosMap]);

  const headerTitle = useMemo(() => {
    if (!user) return 'Dashboard';
    const perfil = user.perfil_sistema || user.tipo || null;
    if (perfil === 'colaborador') return 'Dashboard Individual';
    if (perfil === 'gestor') return 'Dashboard Gestor';
    if (perfil === 'cs') return 'Dashboard CS';
    if (perfil === 'master') return 'Dashboard Master';
    if (perfil === 'dev') return 'Dashboard Dev';
    return 'Dashboard';
  }, [user]);

  const isColaborador = user?.perfil_sistema === 'colaborador' || user?.tipo === 'colaborador';

  // Estados para filtro e ordenação
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filtrar e ordenar salespeople
  const filteredAndSortedSalespeople = useMemo(() => {
    let filtered = salespeople;
    
    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(person => 
        person.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Ordenar por nota
    const sorted = [...filtered].sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.averageScore - a.averageScore;
      } else {
        return a.averageScore - b.averageScore;
      }
    });
    
    return sorted;
  }, [salespeople, searchTerm, sortOrder]);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSortedSalespeople.length / itemsPerPage);
  }, [filteredAndSortedSalespeople.length]);

  const paginatedSalespeople = useMemo(() => {
    if (!filteredAndSortedSalespeople || filteredAndSortedSalespeople.length === 0) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedSalespeople.slice(startIndex, endIndex);
  }, [filteredAndSortedSalespeople, currentPage, itemsPerPage]);

  // Resetar página quando filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder]);

  return (
    <AppSidebar>
      <div className="p-4 lg:p-6 overflow-x-hidden">
        {/* Header */}
        <header className="mb-4 animate-fade-in">
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text mb-1">
            {headerTitle}
          </h1>
          <p className="text-muted-foreground">
            Visão geral da performance baseada nos relatórios reais
          </p>
        </header>

        {isLoading ? (
          <div className="text-muted-foreground">Carregando dados da dashboard...</div>
        ) : (
          <>
            {/* Cards principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card
                className="glass light-shadow p-3 hover-scale animate-fade-in"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-1.5 rounded-xl bg-primary/20 glow-primary">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {teamStats.avgScore}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {isColaborador 
                    ? 'Nota Média Individual' 
                    : user?.perfil_sistema === 'master' 
                      ? 'Nota Média das Empresas' 
                      : 'Nota Média da Equipe'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isColaborador 
                    ? 'Sua performance geral' 
                    : user?.perfil_sistema === 'master' 
                      ? 'Performance geral' 
                      : 'Performance geral do time'}
                </p>
              </Card>

              <Card
                className="glass light-shadow p-3 hover-scale animate-fade-in"
                style={{ animationDelay: '0.2s' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-1.5 rounded-xl bg-accent/20 glow-accent">
                    <FileText className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-xl font-bold text-accent">
                    {teamStats.totalTranscriptions}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Transcrições Analisadas
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isColaborador ? 'Total de suas análises' : 'Total de análises realizadas'}
                </p>
              </Card>

              <Card
                className="glass light-shadow p-3 hover-scale animate-fade-in"
                style={{ animationDelay: '0.3s' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-1.5 rounded-xl bg-primary/20">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {teamStats.topPerformer
                      ? teamStats.topPerformer.averageScore.toFixed(1)
                      : '0.0'}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Melhor Vendedor
                </h3>
                <p className="text-xs text-muted-foreground">
                  {teamStats.topPerformer
                    ? teamStats.topPerformer.name
                    : 'Sem dados suficientes'}
                </p>
              </Card>
            </div>

            {/* Gráfico + lista da equipe - Um embaixo do outro */}
            <div className="space-y-4">
              {/* Performance Chart - Largura total */}
              <Card
                className="glass light-shadow p-3 animate-fade-in"
                style={{ animationDelay: '0.4s' }}
              >
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
                  {isColaborador ? 'Performance nas 7 Etapas Individual' : 'Performance nas 7 Etapas'}
                </h3>
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="step"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 10]}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      />
                      <Radar
                        name={isColaborador ? "Minha Performance" : "Média da Equipe"}
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                          color: 'hsl(var(--popover-foreground))',
                          fontSize: '12px',
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Team List - Largura total */}
              <Card
                className="glass light-shadow p-4 animate-fade-in"
                style={{ animationDelay: '0.5s' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-accent" />
                    {user?.perfil_sistema === 'master' || user?.perfil_sistema === 'cs' ? 'Empresa' : 'Equipe'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {filteredAndSortedSalespeople.length} {(user?.perfil_sistema === 'master' || user?.perfil_sistema === 'cs')
                        ? (filteredAndSortedSalespeople.length === 1 ? 'empresa' : 'empresas')
                        : (filteredAndSortedSalespeople.length === 1 ? 'membro' : 'membros') + ' da equipe'
                      }
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Filter className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        side="bottom"
                        sideOffset={5}
                        alignOffset={0}
                        className="w-64"
                        onCloseAutoFocus={(e) => e.preventDefault()}
                      >
                        <DropdownMenuLabel>Filtros</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="p-2">
                          <div className="relative mb-3">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder={(user?.perfil_sistema === 'master' || user?.perfil_sistema === 'cs') ? "Buscar empresa..." : "Buscar..."}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                          <DropdownMenuLabel>Ordenar por Nota</DropdownMenuLabel>
                          <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => setSortOrder(value as 'desc' | 'asc')}>
                            <DropdownMenuRadioItem value="desc">
                              Decrescente
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="asc">
                              Crescente
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                 <div className="min-h-[240px] overflow-x-auto">
                   <Table>
                     <TableHeader>
                       <TableRow className="border-border hover:bg-transparent">
                         <TableHead className="text-foreground px-2 text-sm max-w-[200px]">Nome da Empresa</TableHead>
                         <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 1</TableHead>
                         <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 2</TableHead>
                         <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 3</TableHead>
                         <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 4</TableHead>
                         <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 5</TableHead>
                         <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 6</TableHead>
                         <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 7</TableHead>
                         <TableHead className="text-center text-foreground px-1 text-sm">Nota Final</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {paginatedSalespeople.map((person) => {
                         const getRoute = () => {
                           if ((user?.perfil_sistema === 'master' || user?.perfil_sistema === 'cs') && person.role === 'Empresa') {
                             return `/empresa/${encodeURIComponent(person.name)}`;
                           }
                           
                           const usuario = teamUsers.find(u => u.id === person.id);
                           if (!usuario) return `/salesperson/${person.id}`;
                           
                           const perfil = usuario.perfil_sistema || usuario.tipo;
                           if (perfil === 'cs') return `/equipe/cs/${person.id}`;
                           if (perfil === 'gestor') return `/equipe/gestor/${person.id}`;
                           if (perfil === 'colaborador') return `/colaborador/${person.id}`;
                           return `/salesperson/${person.id}`;
                         };

                         return (
                           <TableRow
                             key={person.id}
                             className={`border-border hover:bg-primary/5 dark:hover:bg-white/5 transition-colors ${
                               isColaborador ? '' : 'cursor-pointer'
                             }`}
                             onClick={isColaborador ? undefined : () => navigate(getRoute())}
                           >
                             <TableCell className="px-2">
                               <div className="font-semibold text-foreground text-sm">
                                 {person.name}
                               </div>
                             </TableCell>
                             <TableCell className="text-center px-0.5">
                               {(person as any).etapa1 !== null && (person as any).etapa1 !== undefined ? (
                                 <span className="text-sm font-medium">
                                   {(person as any).etapa1.toFixed(1)}
                                 </span>
                               ) : (
                                 <span className="text-muted-foreground text-sm">-</span>
                               )}
                             </TableCell>
                             <TableCell className="text-center px-0.5">
                               {(person as any).etapa2 !== null && (person as any).etapa2 !== undefined ? (
                                 <span className="text-sm font-medium">
                                   {(person as any).etapa2.toFixed(1)}
                                 </span>
                               ) : (
                                 <span className="text-muted-foreground text-sm">-</span>
                               )}
                             </TableCell>
                             <TableCell className="text-center px-0.5">
                               {(person as any).etapa3 !== null && (person as any).etapa3 !== undefined ? (
                                 <span className="text-sm font-medium">
                                   {(person as any).etapa3.toFixed(1)}
                                 </span>
                               ) : (
                                 <span className="text-muted-foreground text-sm">-</span>
                               )}
                             </TableCell>
                             <TableCell className="text-center px-0.5">
                               {(person as any).etapa4 !== null && (person as any).etapa4 !== undefined ? (
                                 <span className="text-sm font-medium">
                                   {(person as any).etapa4.toFixed(1)}
                                 </span>
                               ) : (
                                 <span className="text-muted-foreground text-sm">-</span>
                               )}
                             </TableCell>
                             <TableCell className="text-center px-0.5">
                               {(person as any).etapa5 !== null && (person as any).etapa5 !== undefined ? (
                                 <span className="text-sm font-medium">
                                   {(person as any).etapa5.toFixed(1)}
                                 </span>
                               ) : (
                                 <span className="text-muted-foreground text-sm">-</span>
                               )}
                             </TableCell>
                             <TableCell className="text-center px-0.5">
                               {(person as any).etapa6 !== null && (person as any).etapa6 !== undefined ? (
                                 <span className="text-sm font-medium">
                                   {(person as any).etapa6.toFixed(1)}
                                 </span>
                               ) : (
                                 <span className="text-muted-foreground text-sm">-</span>
                               )}
                             </TableCell>
                             <TableCell className="text-center px-0.5">
                               {(person as any).etapa7 !== null && (person as any).etapa7 !== undefined ? (
                                 <span className="text-sm font-medium">
                                   {(person as any).etapa7.toFixed(1)}
                                 </span>
                               ) : (
                                 <span className="text-muted-foreground text-sm">-</span>
                               )}
                             </TableCell>
                             <TableCell className="text-center px-1">
                               {person.averageScore > 0 ? (
                                 <span className="text-base font-bold text-primary">
                                   {person.averageScore.toFixed(1)}
                                 </span>
                               ) : (
                                 <span className="text-muted-foreground text-sm">-</span>
                               )}
                             </TableCell>
                           </TableRow>
                         );
                       })}
                     </TableBody>
                   </Table>
                 </div>

                 {/* Paginação */}
                 {filteredAndSortedSalespeople.length > itemsPerPage && (
                   <Pagination className="mt-2">
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
                 )}
              </Card>
            </div>
          </>
        )}
      </div>
    </AppSidebar>
  );
};

export default Dashboard;
