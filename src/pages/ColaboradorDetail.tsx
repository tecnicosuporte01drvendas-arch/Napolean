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

          <div className="glass-strong light-shadow p-6 rounded-2xl">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <Avatar className="w-24 h-24 border-4 border-primary/50 glow-primary">
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  {(colaborador.nome || colaborador.email).split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-3xl font-bold gradient-text mb-2">
                  {colaborador.nome || colaborador.email}
                </h1>
                <p className="text-muted-foreground mb-4">Colaborador</p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Média Geral:</span>
                    <span className="text-lg font-bold text-primary">{stats.avgScore}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent" />
                    <span className="text-sm text-muted-foreground">Análises:</span>
                    <span className="text-lg font-bold text-accent">{stats.totalTranscriptions}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="glass light-shadow p-6 hover-scale animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/20 glow-primary">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl font-bold text-primary">{stats.avgScore}</span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Nota Média</h3>
            <p className="text-xs text-muted-foreground">Performance geral</p>
          </Card>

          <Card className="glass light-shadow p-6 hover-scale animate-fade-in">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Histórico de Relatórios */}
        <Card className="glass light-shadow p-6 animate-fade-in">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Histórico de Relatórios
          </h3>

          {relatorios && relatorios.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-foreground">Data</TableHead>
                    <TableHead className="text-foreground">Nome do Documento</TableHead>
                    {colunasRelatorio.map((coluna) => (
                      <TableHead key={coluna.key} className="text-center text-foreground">
                        {coluna.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-center text-foreground">Total</TableHead>
                    <TableHead className="text-center text-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorios.map((relatorio, index) => (
                    <TableRow
                      key={relatorio.id}
                      className="border-border hover:bg-primary/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="font-medium">
                        {new Date(relatorio.criado_em).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate" title={relatorio.nome_arquivo || ''}>
                        {relatorio.nome_arquivo || '-'}
                      </TableCell>
                      {colunasRelatorio.map((coluna) => {
                        const nota = getNota(relatorio, coluna.key);
                        return (
                          <TableCell key={coluna.key} className="text-center">
                            {nota !== null ? (
                              <span
                                className={`inline-block px-2 py-1 rounded text-sm font-semibold ${
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
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {relatorio.nota_media !== null ? (
                          <span className="text-lg font-bold text-primary">
                            {relatorio.nota_media.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="hover:bg-primary/20 hover:text-primary"
                            onClick={() => handleAction('relatorio', relatorio)}
                            title="Relatório Detalhado"
                            disabled={!relatorio.texto_relatorio_completo}
                          >
                            <FileSearch className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="hover:bg-accent/20 hover:text-accent"
                            onClick={() => handleAction('transcript', relatorio)}
                            title="Ver Transcrição Original"
                            disabled={!relatorio.url_arquivo}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum relatório encontrado ainda.
            </div>
          )}
        </Card>
      </div>
    </AppSidebar>
  );
};

export default ColaboradorDetail;


