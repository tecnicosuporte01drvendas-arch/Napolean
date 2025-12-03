import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  TrendingUp,
  FileText,
  Trophy,
  Users,
  ChevronRight,
  Building2,
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
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import AppSidebar from '@/components/AppSidebar';
import { useRelatorios, useUsuarios } from '@/hooks/useSupabase';
import { usuariosService } from '@/lib/supabaseServices';
import type { Usuario, Relatorio } from '@/lib/database.types';

const EmpresaDetail = () => {
  const { nome_empresa } = useParams<{ nome_empresa: string }>();
  const navigate = useNavigate();
  const { data: todosUsuarios, isLoading: isLoadingUsuarios } = useUsuarios();
  const { data: relatorios, isLoading: isLoadingRelatorios } = useRelatorios();

  const isLoading = isLoadingUsuarios || isLoadingRelatorios;

  // Filtrar gestores e colaboradores da empresa
  const { gestores, colaboradores, teamStats, radarData, gestoresList, colaboradoresList } = useMemo(() => {
    if (!todosUsuarios || !relatorios || !nome_empresa) {
      return {
        gestores: [] as Usuario[],
        colaboradores: [] as Usuario[],
        teamStats: {
          avgScore: '0.0',
          totalTranscriptions: 0,
          topPerformer: null as { id: string; name: string; averageScore: number } | null,
        },
        radarData: [] as { step: string; score: number }[],
        gestoresList: [] as {
          id: string;
          name: string;
          email: string;
          averageScore: number;
          totalTranscriptions: number;
        }[],
        colaboradoresList: [] as {
          id: string;
          name: string;
          email: string;
          averageScore: number;
          totalTranscriptions: number;
        }[],
      };
    }

    // Filtrar gestores da empresa
    const gestoresEmpresa = todosUsuarios.filter(
      (u) => (u.perfil_sistema === 'gestor' || u.tipo === 'gestor') && u.nome_empresa === nome_empresa
    );

    // Buscar colaboradores de todos os gestores da empresa
    const colaboradoresEmpresa: Usuario[] = [];
    for (const gestor of gestoresEmpresa) {
      const colaboradoresGestor = todosUsuarios.filter(
        (u) => (u.tipo === 'colaborador' || u.perfil_sistema === 'colaborador') && u.gestor_id === gestor.id
      );
      colaboradoresEmpresa.push(...colaboradoresGestor);
    }

    // IDs de todos os usuários da empresa (gestores + colaboradores)
    const teamUserIds = new Set([
      ...gestoresEmpresa.map((g) => g.id),
      ...colaboradoresEmpresa.map((c) => c.id),
    ]);

    // Relatórios da empresa
    const teamRelatorios = (relatorios as Relatorio[]).filter(
      (r) => r.id_usuario && teamUserIds.has(r.id_usuario)
    );

    // Construir lista de gestores com stats
    const gestoresList = gestoresEmpresa.map((gestor) => {
      const relatoriosGestor = teamRelatorios.filter((r) => r.id_usuario === gestor.id);
      const validScores = relatoriosGestor.filter((r) => r.nota_media !== null);
      const averageScore =
        validScores.length > 0
          ? validScores.reduce((sum, r) => sum + (r.nota_media || 0), 0) / validScores.length
          : 0;

      return {
        id: gestor.id,
        name: gestor.nome || gestor.email,
        email: gestor.email,
        averageScore,
        totalTranscriptions: relatoriosGestor.length,
      };
    }).sort((a, b) => b.averageScore - a.averageScore);

    // Construir lista de colaboradores com stats
    const colaboradoresList = colaboradoresEmpresa.map((colaborador) => {
      const relatoriosColab = teamRelatorios.filter((r) => r.id_usuario === colaborador.id);
      const validScores = relatoriosColab.filter((r) => r.nota_media !== null);
      const averageScore =
        validScores.length > 0
          ? validScores.reduce((sum, r) => sum + (r.nota_media || 0), 0) / validScores.length
          : 0;

      return {
        id: colaborador.id,
        name: colaborador.nome || colaborador.email,
        email: colaborador.email,
        averageScore,
        totalTranscriptions: relatoriosColab.length,
      };
    }).sort((a, b) => b.averageScore - a.averageScore);

    // Estatísticas gerais da empresa
    const totalTranscriptions = teamRelatorios.length;
    const validScores = teamRelatorios.filter((r) => r.nota_media !== null);
    const avgScore =
      validScores.length > 0
        ? validScores.reduce((sum, r) => sum + (r.nota_media || 0), 0) / validScores.length
        : 0;

    const topPerformer =
      colaboradoresList.length > 0
        ? colaboradoresList.reduce((best, current) =>
            current.averageScore > best.averageScore ? current : best,
          )
        : null;

    // Radar das 7 etapas
    const steps = [
      { key: 'nota_boas_vindas', label: 'Apresentação' },
      { key: 'nota_identificacao', label: 'Identificação de Necessidades' },
      { key: 'nota_historia', label: 'Conexão por História Pessoal' },
      { key: 'nota_pilares', label: 'Pilares da Mentoria' },
      { key: 'nota_objecoes', label: 'Quebra de Objeções' },
      { key: 'nota_impacto', label: 'Impacto e Transformação' },
      { key: 'nota_proposta', label: 'Proposta de Valor' },
    ] as const;

    const radarData = steps.map((step) => {
      const valores = teamRelatorios
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

    // Adicionar "Nota Final" após "Proposta de Valor"
    radarData.push({
      step: 'Nota Final',
      score: Number(avgScore.toFixed(1)),
    });

    return {
      gestores: gestoresEmpresa,
      colaboradores: colaboradoresEmpresa,
      teamStats: {
        avgScore: avgScore.toFixed(1),
        totalTranscriptions,
        topPerformer,
      },
      radarData,
      gestoresList,
      colaboradoresList,
    };
  }, [todosUsuarios, relatorios, nome_empresa]);

  // Estados para filtro e ordenação dos gestores
  const [searchTermGestores, setSearchTermGestores] = useState('');
  const [sortOrderGestores, setSortOrderGestores] = useState<'desc' | 'asc'>('desc');

  // Filtrar e ordenar gestores
  const filteredAndSortedGestores = useMemo(() => {
    let filtered = gestoresList;
    
    // Filtrar por termo de busca
    if (searchTermGestores) {
      filtered = filtered.filter(gestor => 
        gestor.name.toLowerCase().includes(searchTermGestores.toLowerCase())
      );
    }
    
    // Ordenar por nota
    const sorted = [...filtered].sort((a, b) => {
      if (sortOrderGestores === 'desc') {
        return b.averageScore - a.averageScore;
      } else {
        return a.averageScore - b.averageScore;
      }
    });
    
    return sorted;
  }, [gestoresList, searchTermGestores, sortOrderGestores]);

  if (isLoading) {
    return (
      <AppSidebar>
        <div className="p-6 lg:p-8">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </AppSidebar>
    );
  }

  if (!nome_empresa || gestores.length === 0) {
    return (
      <AppSidebar>
        <div className="p-6 lg:p-8">
          <Card className="glass p-8 text-center">
            <p className="text-muted-foreground mb-4">Empresa não encontrada</p>
            <Button onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </Card>
        </div>
      </AppSidebar>
    );
  }

  return (
    <AppSidebar>
      <div className="p-4 lg:p-6">
        {/* Header */}
        <header className="mb-4 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-2 hover:bg-primary/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </header>

        {/* Header e Stats Cards - Todos na mesma linha */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Card do Header - Padronizado */}
          <Card className="glass light-shadow p-3 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start mb-2">
              {/* Ícone quadrado no canto esquerdo */}
              <div className="p-1.5 rounded-xl bg-primary/20 glow-primary w-10 h-10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1 truncate">{nome_empresa}</h3>
            <p className="text-xs text-muted-foreground">
              Empresa
            </p>
          </Card>
          <Card className="glass light-shadow p-3 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div className="p-1.5 rounded-xl bg-primary/20 glow-primary">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xl font-bold text-primary">{teamStats.avgScore}</span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Nota Média da Empresa</h3>
            <p className="text-xs text-muted-foreground">Performance geral</p>
          </Card>

          <Card className="glass light-shadow p-3 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div className="p-1.5 rounded-xl bg-accent/20 glow-accent">
                <FileText className="w-4 h-4 text-accent" />
              </div>
              <span className="text-xl font-bold text-accent">
                {teamStats.totalTranscriptions}
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Transcrições Analisadas</h3>
            <p className="text-xs text-muted-foreground">Total de análises</p>
          </Card>

          <Card className="glass light-shadow p-3 hover-scale animate-fade-in h-full flex flex-col">
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
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Melhor Colaborador</h3>
            <p className="text-xs text-muted-foreground">
              {teamStats.topPerformer ? teamStats.topPerformer.name : 'Sem dados suficientes'}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Performance Chart */}
          <Card className="glass light-shadow p-4 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
              Performance nas 7 Etapas
            </h3>
            <ResponsiveContainer width="100%" height={275}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="step"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 10]}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Radar
                  name="Média da Empresa"
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
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Gestores List */}
          <Card className="glass light-shadow p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Gestores
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {filteredAndSortedGestores.length} {filteredAndSortedGestores.length === 1 ? 'gestor' : 'gestores'}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Filtros</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                      <div className="relative mb-3">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar gestor..."
                          value={searchTermGestores}
                          onChange={(e) => setSearchTermGestores(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                      <DropdownMenuLabel>Ordenar por Nota</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={sortOrderGestores} onValueChange={(value) => setSortOrderGestores(value as 'desc' | 'asc')}>
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

            <div className="space-y-2">
              {filteredAndSortedGestores.length > 0 ? (
                filteredAndSortedGestores.map((gestor, index) => (
                  <div
                    key={gestor.id}
                    className="glass p-3 rounded-xl hover:bg-primary/5 dark:hover:bg-white/5 transition-all cursor-pointer group"
                    onClick={() => navigate(`/equipe/gestor/${gestor.id}`)}
                    style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border-2 border-primary/50">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {gestor.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate text-sm">{gestor.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">Gestor</p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-primary">
                            {gestor.averageScore.toFixed(1)}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {gestor.totalTranscriptions} análises
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum gestor encontrado.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppSidebar>
  );
};

export default EmpresaDetail;

