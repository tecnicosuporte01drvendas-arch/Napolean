import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  TrendingUp,
  FileText,
  Trophy,
  Users,
  ChevronRight,
} from 'lucide-react';
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

const EquipeGestorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: gestor, isLoading: isLoadingGestor } = useUsuarioById(id || '');
  const { data: relatorios, isLoading: isLoadingRelatorios } = useRelatorios();

  // Buscar colaboradores vinculados a este gestor
  const { data: colaboradores, isLoading: isLoadingColaboradores } = useQuery({
    queryKey: ['colaboradores-gestor', id],
    queryFn: () => usuariosService.getByGestorId(id || ''),
    enabled: !!id,
  });

  const isLoading = isLoadingGestor || isLoadingRelatorios || isLoadingColaboradores;

  // Calcular estatísticas da equipe (gestor + colaboradores)
  const { teamStats, radarData, colaboradoresList } = useMemo(() => {
    if (!gestor || !relatorios || !colaboradores) {
      return {
        teamStats: {
          avgScore: '0.0',
          totalTranscriptions: 0,
          topPerformer: null as { id: string; name: string; averageScore: number } | null,
        },
        radarData: [] as { step: string; score: number }[],
        colaboradoresList: [] as {
          id: string;
          name: string;
          email: string;
          averageScore: number;
          totalTranscriptions: number;
        }[],
      };
    }

    // Filtrar apenas colaboradores (não incluir o próprio gestor na lista)
    const colaboradoresFiltrados = colaboradores.filter(c => c.tipo === 'colaborador' && c.id !== gestor.id);
    const teamUserIds = new Set(colaboradoresFiltrados.map(u => u.id));
    teamUserIds.add(gestor.id); // Incluir gestor nas estatísticas gerais
    
    const teamRelatorios = (relatorios as Relatorio[]).filter(
      (r) => r.id_usuario && teamUserIds.has(r.id_usuario),
    );

    // Construir lista de colaboradores com stats
    const colaboradoresList = colaboradoresFiltrados.map((colaborador) => {
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

    // Estatísticas gerais (gestor + colaboradores)
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
      colaboradoresList,
    };
  }, [gestor, relatorios, colaboradores]);

  if (isLoading) {
    return (
      <AppSidebar>
        <div className="p-6 lg:p-8">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </AppSidebar>
    );
  }

  if (!gestor) {
    return (
      <AppSidebar>
        <div className="p-6 lg:p-8">
          <Card className="glass p-8 text-center">
            <p className="text-muted-foreground mb-4">Gestor não encontrado</p>
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
      <div className="p-6 lg:p-8">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 hover:bg-primary/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </header>

        {/* Header e Stats Cards - Todos na mesma linha */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Card do Header - Padronizado */}
          <Card className="glass light-shadow p-6 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              {/* Ícone quadrado no canto esquerdo */}
              <div className="p-3 rounded-xl bg-primary/20 glow-primary w-12 h-12 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {(gestor.nome || gestor.email).split(' ').map(n => n[0]).join('')}
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
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{gestor.nome || gestor.email}</h3>
            <p className="text-xs text-muted-foreground">
              Gestor
            </p>
          </Card>
          <Card className="glass light-shadow p-6 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/20 glow-primary">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl font-bold text-primary">{teamStats.avgScore}</span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Nota Média da Equipe</h3>
            <p className="text-xs text-muted-foreground">Performance geral</p>
          </Card>

          <Card className="glass light-shadow p-6 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-accent/20 glow-accent">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <span className="text-3xl font-bold text-accent">
                {teamStats.totalTranscriptions}
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Transcrições Analisadas</h3>
            <p className="text-xs text-muted-foreground">Total de análises</p>
          </Card>

          <Card className="glass light-shadow p-6 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl font-bold text-primary">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Chart */}
          <Card className="glass light-shadow p-6 animate-fade-in">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
              Performance nas 7 Etapas
            </h3>
            <ResponsiveContainer width="100%" height={300}>
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

          {/* Colaboradores List */}
          <Card className="glass light-shadow p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Colaboradores
              </h3>
              <span className="text-sm text-muted-foreground">
                {colaboradoresList.length} {colaboradoresList.length === 1 ? 'colaborador' : 'colaboradores'}
              </span>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
              {colaboradoresList.length > 0 ? (
                colaboradoresList.map((colaborador, index) => (
                  <div
                    key={colaborador.id}
                    className="glass p-4 rounded-xl hover:bg-primary/5 dark:hover:bg-white/5 transition-all cursor-pointer group"
                    onClick={() => navigate(`/colaborador/${colaborador.id}`)}
                    style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 border-2 border-primary/50">
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {colaborador.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{colaborador.name}</h4>
                        <p className="text-sm text-muted-foreground truncate">Colaborador</p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-primary">
                            {colaborador.averageScore.toFixed(1)}
                          </span>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {colaborador.totalTranscriptions} análises
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum colaborador vinculado ainda.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppSidebar>
  );
};

export default EquipeGestorDetail;



