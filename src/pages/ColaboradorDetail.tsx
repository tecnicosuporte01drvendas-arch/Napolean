import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  TrendingUp,
  FileText,
  FileSearch,
  Calendar,
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
import { useUsuarioById, useRelatoriosByUsuario } from '@/hooks/useSupabase';
import type { Relatorio } from '@/lib/database.types';

const ColaboradorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: colaborador, isLoading: isLoadingColaborador } = useUsuarioById(id || '');
  const { data: relatorios, isLoading: isLoadingRelatorios } = useRelatoriosByUsuario(id || '');

  const isLoading = isLoadingColaborador || isLoadingRelatorios;

  // Calcular estatísticas individuais
  const { stats, radarData } = useMemo(() => {
    if (!colaborador || !relatorios) {
      return {
        stats: {
          avgScore: '0.0',
          totalTranscriptions: 0,
        },
        radarData: [] as { step: string; score: number }[],
      };
    }

    const validScores = (relatorios as Relatorio[]).filter((r) => r.nota_media !== null);
    const avgScore =
      validScores.length > 0
        ? validScores.reduce((sum, r) => sum + (r.nota_media || 0), 0) / validScores.length
        : 0;

    // Radar das 7 etapas (média do colaborador)
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
      stats: {
        avgScore: avgScore.toFixed(1),
        totalTranscriptions: (relatorios as Relatorio[]).length,
      },
      radarData,
    };
  }, [colaborador, relatorios]);

  if (isLoading) {
    return (
      <AppSidebar>
        <div className="p-6 lg:p-8">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </AppSidebar>
    );
  }

  if (!colaborador) {
    return (
      <AppSidebar>
        <div className="p-6 lg:p-8">
          <Card className="glass p-8 text-center">
            <p className="text-muted-foreground mb-4">Colaborador não encontrado</p>
            <Button onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </Card>
        </div>
      </AppSidebar>
    );
  }

  const colunasRelatorio = [
    { key: 'nota_boas_vindas', label: 'Apresentação' },
    { key: 'nota_identificacao', label: 'Identificação de Necessidades' },
    { key: 'nota_historia', label: 'Conexão por História Pessoal' },
    { key: 'nota_pilares', label: 'Pilares da Mentoria' },
    { key: 'nota_objecoes', label: 'Quebra de Objeções' },
    { key: 'nota_impacto', label: 'Impacto e Transformação' },
    { key: 'nota_proposta', label: 'Proposta de Valor' },
  ] as const;

  const getNota = (relatorio: Relatorio, key: string): number | null => {
    return relatorio[key as keyof Relatorio] as number | null;
  };

  const handleAction = (type: 'transcript' | 'relatorio', relatorio: Relatorio) => {
    if (type === 'transcript' && relatorio.url_arquivo) {
      window.open(relatorio.url_arquivo, '_blank');
    } else if (type === 'relatorio' && relatorio.texto_relatorio_completo) {
      window.open(`/relatorio/${relatorio.id}`, '_blank');
    }
  };

  return (
    <AppSidebar>
      <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        {/* Header */}
        <header className="mb-6 sm:mb-8 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-3 sm:mb-4 hover:bg-primary/10 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </header>

        {/* Header e Stats Cards - Todos na mesma linha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {/* Card do Header - Padronizado */}
          <Card className="glass light-shadow p-6 hover-scale animate-fade-in h-full flex flex-col min-w-0">
            <div className="flex items-start justify-between mb-4 gap-2 min-w-0">
              {/* Ícone quadrado no canto esquerdo */}
              <div className="p-3 rounded-xl bg-primary/20 glow-primary w-12 h-12 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-primary">
                  {(colaborador.nome || colaborador.email).split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              {/* Métricas no canto direito com textos */}
              <div className="text-right min-w-0 flex-1">
                <div className="text-xs text-muted-foreground mb-1 whitespace-nowrap">Média: • Análises:</div>
                <div className="text-2xl font-bold text-primary truncate">
                  {stats.avgScore} • {stats.totalTranscriptions}
                </div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1 truncate">{colaborador.nome || colaborador.email}</h3>
            <p className="text-xs text-muted-foreground">
              Colaborador
            </p>
          </Card>

          <Card className="glass light-shadow p-6 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/20 glow-primary">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl font-bold text-primary">{stats.avgScore}</span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Nota Média</h3>
            <p className="text-xs text-muted-foreground">Performance geral</p>
          </Card>

          <Card className="glass light-shadow p-6 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-accent/20 glow-accent">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <span className="text-3xl font-bold text-accent">
                {stats.totalTranscriptions}
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Transcrições Analisadas</h3>
            <p className="text-xs text-muted-foreground">Total de análises</p>
          </Card>
        </div>

        {/* Performance Chart */}
        <Card className="glass light-shadow p-4 sm:p-6 animate-fade-in mb-8">
          <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
            Performance nas 7 Etapas
          </h3>
          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
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
                name="Média Individual"
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
        </Card>

        {/* Histórico de Relatórios */}
        <Card className="glass light-shadow p-4 sm:p-6 animate-fade-in">
          <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Histórico de Relatórios
          </h3>

          {relatorios && relatorios.length > 0 ? (
            <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-foreground text-xs sm:text-sm">Data</TableHead>
                      <TableHead className="text-foreground text-xs sm:text-sm hidden sm:table-cell">Nome do Documento</TableHead>
                      {colunasRelatorio.map((coluna) => (
                        <TableHead key={coluna.key} className="text-center text-foreground text-xs sm:text-sm hidden md:table-cell px-3 sm:px-4 min-w-[120px] sm:min-w-[140px]">
                          <span className="hidden lg:inline whitespace-normal leading-tight">{coluna.label}</span>
                          <span className="lg:hidden whitespace-normal leading-tight">{coluna.label.split(' ')[0]}</span>
                        </TableHead>
                      ))}
                      <TableHead className="text-center text-foreground text-xs sm:text-sm">Nota Final</TableHead>
                      <TableHead className="text-center text-foreground text-xs sm:text-sm">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorios.map((relatorio, index) => (
                      <TableRow
                        key={relatorio.id}
                        className="border-border hover:bg-primary/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <TableCell className="font-medium text-xs sm:text-sm">
                          {new Date(relatorio.criado_em).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-medium max-w-xs truncate text-xs sm:text-sm hidden sm:table-cell" title={relatorio.nome_arquivo || ''}>
                          {relatorio.nome_arquivo || '-'}
                        </TableCell>
                        {colunasRelatorio.map((coluna) => {
                          const nota = getNota(relatorio, coluna.key);
                          return (
                            <TableCell key={coluna.key} className="text-center hidden md:table-cell px-3 sm:px-4">
                              {nota !== null ? (
                                <span
                                  className={`inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-semibold ${
                                    nota >= 8
                                      ? 'text-primary bg-primary/20'
                                      : nota >= 7
                                      ? 'text-accent bg-accent/20'
                                      : 'text-muted-foreground bg-muted/20'
                                  }`}
                                >
                                  {nota.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs sm:text-sm">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          {relatorio.nota_media !== null ? (
                            <span className="text-base sm:text-lg font-bold text-primary">
                              {relatorio.nota_media.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs sm:text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 hover:bg-primary/20 hover:text-primary min-w-[160px]"
                              onClick={() => handleAction('relatorio', relatorio)}
                              disabled={!relatorio.texto_relatorio_completo}
                            >
                              <FileSearch className="w-4 h-4" />
                              <span className="text-xs sm:text-sm">Relatório Detalhado</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 hover:bg-accent/20 hover:text-accent min-w-[160px]"
                              onClick={() => handleAction('transcript', relatorio)}
                              disabled={!relatorio.url_arquivo}
                            >
                              <FileText className="w-4 h-4" />
                              <span className="text-xs sm:text-sm">Transcrição Original</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
              Nenhum relatório encontrado ainda.
            </div>
          )}
        </Card>
      </div>
    </AppSidebar>
  );
};

export default ColaboradorDetail;



