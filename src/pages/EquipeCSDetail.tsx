import { useMemo, useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import AppSidebar from '@/components/AppSidebar';
import { useUsuarioById, useRelatorios } from '@/hooks/useSupabase';
import { usuariosService } from '@/lib/supabaseServices';
import { useQuery } from '@tanstack/react-query';
import type { Usuario, Relatorio } from '@/lib/database.types';

const EquipeCSDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cs, isLoading: isLoadingCS } = useUsuarioById(id || '');
  const { data: relatorios, isLoading: isLoadingRelatorios } = useRelatorios();

  // Buscar gestores vinculados a este CS
  const { data: gestores, isLoading: isLoadingGestores } = useQuery({
    queryKey: ['gestores-cs', id],
    queryFn: () => usuariosService.getByCsId(id || ''),
    enabled: !!id,
  });

  // Buscar todos os colaboradores dos gestores (para stats gerais)
  const { data: todosUsuariosCS } = useQuery({
    queryKey: ['todos-usuarios-cs', id, gestores?.map(g => g.id)],
    queryFn: async () => {
      if (!gestores || gestores.length === 0) return [];
      const todos = [...gestores];
      // Buscar colaboradores de cada gestor
      for (const gestor of gestores) {
        const colaboradores = await usuariosService.getByGestorId(gestor.id);
        todos.push(...colaboradores.filter(c => c.tipo === 'colaborador'));
      }
      return todos;
    },
    enabled: !!id && !!gestores && gestores.length > 0,
  });

  const isLoading = isLoadingCS || isLoadingRelatorios || isLoadingGestores;

  // Calcular estatísticas da equipe completa (gestores + colaboradores)
  const { teamStats, radarData, gestoresList } = useMemo(() => {
    if (!cs || !relatorios || !gestores || !todosUsuariosCS) {
      return {
        teamStats: {
          avgScore: '0.0',
          totalTranscriptions: 0,
          topPerformer: null as { id: string; name: string; averageScore: number } | null,
        },
        radarData: [] as Array<{ step: string; score: number }>,
        gestoresList: [] as {
          id: string;
          name: string;
          email: string;
          averageScore: number;
          totalTranscriptions: number;
        }[],
      };
    }

    // Usar todos os usuários (gestores + colaboradores) para calcular stats gerais
    const teamUserIds = new Set(todosUsuariosCS.map(u => u.id));
    const teamRelatorios = (relatorios as Relatorio[]).filter(
      (r) => r.id_usuario && teamUserIds.has(r.id_usuario),
    );

    // Construir lista de gestores com stats
    const gestoresList = gestores.map((gestor) => {
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

    // Estatísticas gerais
    const totalTranscriptions = gestoresList.reduce(
      (sum, p) => sum + p.totalTranscriptions,
      0,
    );

    const avgScore =
      gestoresList.length > 0
        ? gestoresList.reduce((sum, p) => sum + p.averageScore, 0) / gestoresList.length
        : 0;

    const topPerformer =
      gestoresList.length > 0
        ? gestoresList.reduce((best, current) =>
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

    const radarData: Array<{ step: string; score: number }> = steps.map((step) => {
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
      gestoresList,
    };
  }, [cs, relatorios, gestores, todosUsuariosCS]);

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

  if (!cs) {
    return (
      <AppSidebar>
        <div className="p-6 lg:p-8">
          <Card className="glass p-8 text-center">
            <p className="text-muted-foreground mb-4">CS não encontrado</p>
            <Button onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate('/dashboard');
              }
            }}>
              Voltar
            </Button>
          </Card>
        </div>
      </AppSidebar>
    );
  }

  return (
    <AppSidebar>
      <div className="p-4 lg:p-6 overflow-x-hidden">
        {/* Header */}
        <header className="mb-4 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate('/dashboard');
              }
            }}
            className="mb-2 hover:bg-primary/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </header>

        {/* Header e Stats Cards - Todos na mesma linha */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Card do Header - Padronizado */}
          <Card className="glass light-shadow p-4 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-3">
              {/* Ícone quadrado no canto esquerdo */}
              <div className="p-2 rounded-xl bg-primary/20 glow-primary w-12 h-12 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {(cs.nome || cs.email).split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              {/* Métricas no canto direito com textos */}
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Média: • Análises:</div>
                <div className="text-2xl font-bold text-primary">
                  {teamStats.avgScore} • {teamStats.totalTranscriptions}
                </div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{cs.nome || cs.email}</h3>
            <p className="text-xs text-muted-foreground">
              CS - Sucesso do Cliente
            </p>
          </Card>
          <Card className="glass light-shadow p-4 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-xl bg-primary/20 glow-primary">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="text-2xl font-bold text-primary">{teamStats.avgScore}</span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Nota Média da Equipe</h3>
            <p className="text-xs text-muted-foreground">Performance geral</p>
          </Card>

          <Card className="glass light-shadow p-4 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-xl bg-accent/20 glow-accent">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <span className="text-2xl font-bold text-accent">
                {teamStats.totalTranscriptions}
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Transcrições Analisadas</h3>
            <p className="text-xs text-muted-foreground">Total de análises</p>
          </Card>

          <Card className="glass light-shadow p-4 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <span className="text-2xl font-bold text-primary">
                {teamStats.topPerformer
                  ? teamStats.topPerformer.averageScore.toFixed(1)
                  : '0.0'}
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Melhor Gestor</h3>
            <p className="text-xs text-muted-foreground">
              {teamStats.topPerformer ? teamStats.topPerformer.name : 'Sem dados suficientes'}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  name="Média da Equipe"
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

            <div className="space-y-3">
              {filteredAndSortedGestores.length > 0 ? (
                filteredAndSortedGestores.map((gestor, index) => (
                  <div
                    key={gestor.id}
                    className="glass p-4 rounded-xl hover:bg-primary/5 dark:hover:bg-white/5 transition-all cursor-pointer group"
                    onClick={() => navigate(`/equipe/gestor/${gestor.id}`)}
                    style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 border-2 border-primary/50">
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {gestor.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{gestor.name}</h4>
                        <p className="text-sm text-muted-foreground truncate">Gestor</p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-primary">
                            {gestor.averageScore.toFixed(1)}
                          </span>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
                  Nenhum gestor vinculado ainda.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppSidebar>
  );
};

export default EquipeCSDetail;

