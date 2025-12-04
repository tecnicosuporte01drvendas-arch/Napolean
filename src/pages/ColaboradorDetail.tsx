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
  FileSearch,
  Calendar as CalendarIcon,
  ChevronLeft,
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import AppSidebar from '@/components/AppSidebar';
import { useUsuarioById, useRelatoriosByUsuario } from '@/hooks/useSupabase';
import type { Relatorio } from '@/lib/database.types';

const ColaboradorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: colaborador, isLoading: isLoadingColaborador } = useUsuarioById(id || '');
  const { data: relatorios, isLoading: isLoadingRelatorios } = useRelatoriosByUsuario(id || '');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estados para busca
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const isLoading = isLoadingColaborador || isLoadingRelatorios;

  // Filtrar relatórios por nome ou data
  const filteredRelatorios = useMemo(() => {
    if (!relatorios) return [];
    
    let filtered = relatorios;
    
    // Filtrar por termo de busca (nome do arquivo)
    if (searchTerm) {
      filtered = filtered.filter(relatorio => 
        (relatorio.nome_arquivo || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por data selecionada
    if (selectedDate) {
      filtered = filtered.filter(relatorio => {
        const relatorioDate = new Date(relatorio.criado_em);
        return (
          relatorioDate.getDate() === selectedDate.getDate() &&
          relatorioDate.getMonth() === selectedDate.getMonth() &&
          relatorioDate.getFullYear() === selectedDate.getFullYear()
        );
      });
    }
    
    return filtered;
  }, [relatorios, searchTerm, selectedDate]);

  // Paginação: 4 itens por página
  const itemsPerPage = 4;
  const totalPages = useMemo(() => {
    return Math.ceil(filteredRelatorios.length / itemsPerPage);
  }, [filteredRelatorios.length, itemsPerPage]);

  const paginatedRelatorios = useMemo(() => {
    if (!filteredRelatorios || filteredRelatorios.length === 0) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRelatorios.slice(startIndex, endIndex);
  }, [filteredRelatorios, currentPage, itemsPerPage]);

  // Resetar página quando filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDate]);

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
        <div className="p-4 lg:p-6">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </AppSidebar>
    );
  }

  if (!colaborador) {
    return (
      <AppSidebar>
        <div className="p-4 lg:p-6">
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

  const handleAction = (type: 'transcript' | 'relatorio', relatorio: Relatorio) => {
    if (type === 'transcript' && relatorio.url_arquivo) {
      window.open(relatorio.url_arquivo, '_blank');
    } else if (type === 'relatorio' && relatorio.texto_relatorio_completo) {
      navigate(`/relatorio/${relatorio.id}/completo`);
    }
  };

  return (
    <AppSidebar>
      <div className="p-4 sm:p-6 lg:p-6 overflow-x-hidden">
        {/* Header */}
        <header className="mb-4 sm:mb-4 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-1 hover:bg-primary/10 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </header>

        {/* Header e Stats Cards - Todos na mesma linha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {/* Card do Header - Padronizado */}
          <Card className="glass light-shadow p-3 hover-scale animate-fade-in h-full flex flex-col min-w-0">
            <div className="flex items-start mb-2 gap-2 min-w-0">
              {/* Ícone quadrado no canto esquerdo */}
              <div className="p-1.5 rounded-xl bg-primary/20 glow-primary w-10 h-10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-primary">
                  {(colaborador.nome || colaborador.email).split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1 truncate">{colaborador.nome || colaborador.email}</h3>
            <p className="text-xs text-muted-foreground">
              Colaborador
            </p>
          </Card>

          <Card className="glass light-shadow p-3 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div className="p-1.5 rounded-xl bg-primary/20 glow-primary">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xl font-bold text-primary">{stats.avgScore}</span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Nota Média</h3>
            <p className="text-xs text-muted-foreground">Performance geral</p>
          </Card>

          <Card className="glass light-shadow p-3 hover-scale animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div className="p-1.5 rounded-xl bg-accent/20 glow-accent">
                <FileText className="w-4 h-4 text-accent" />
              </div>
              <span className="text-xl font-bold text-accent">
                {stats.totalTranscriptions}
              </span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Transcrições Analisadas</h3>
            <p className="text-xs text-muted-foreground">Total de análises</p>
          </Card>
        </div>

        {/* Performance Chart e Histórico de Relatórios - Um embaixo do outro */}
        <div className="space-y-4">
          {/* Performance Chart - Largura total */}
          <Card className="glass light-shadow p-3 animate-fade-in">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
              Performance nas 7 Etapas
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
            </div>
          </Card>

          {/* Histórico de Relatórios - Largura total */}
          <Card className="glass light-shadow p-3 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Histórico de Relatórios
              </h3>
              
              {/* Input de busca com botão de calendário */}
              <div className="relative w-64">
                <Input
                  placeholder="Buscar por nome ou data..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedDate(undefined); // Limpar data quando buscar por nome
                  }}
                  className="pr-20"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSearchTerm(''); // Limpar busca por nome quando selecionar data
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {filteredRelatorios && filteredRelatorios.length > 0 ? (
              <>
                <div className="min-h-[260px] overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-center text-foreground px-1 text-sm max-w-[60px]">Data</TableHead>
                        <TableHead className="text-foreground px-2 text-sm max-w-[120px]">Nome do arquivo</TableHead>
                        <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 1</TableHead>
                        <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 2</TableHead>
                        <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 3</TableHead>
                        <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 4</TableHead>
                        <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 5</TableHead>
                        <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 6</TableHead>
                        <TableHead className="text-center text-foreground whitespace-nowrap px-0.5 text-sm min-w-[50px]">Etapa 7</TableHead>
                        <TableHead className="text-center text-foreground px-1 text-sm">Nota final</TableHead>
                        <TableHead className="text-center text-foreground px-0.5 text-sm">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRelatorios.map((relatorio) => {
                        const data = new Date(relatorio.criado_em);
                        const diaMes = data.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        });
                        const ano = data.getFullYear();
                        
                        return (
                        <TableRow
                          key={relatorio.id}
                          className="border-border hover:bg-primary/5 dark:hover:bg-white/5 transition-colors"
                        >
                          <TableCell className="font-medium px-1 text-sm max-w-[60px]">
                            <div className="flex flex-col items-center">
                              <span>{diaMes}</span>
                              <span>{ano}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground px-2 text-sm max-w-[120px]">
                            <div className="truncate" title={relatorio.nome_arquivo || ''}>
                              {relatorio.nome_arquivo || 'Sem nome'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center px-0.5">
                            {relatorio.nota_boas_vindas !== null ? (
                              <span className="text-sm font-medium">
                                {relatorio.nota_boas_vindas.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center px-0.5">
                            {relatorio.nota_identificacao !== null ? (
                              <span className="text-sm font-medium">
                                {relatorio.nota_identificacao.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center px-0.5">
                            {relatorio.nota_historia !== null ? (
                              <span className="text-sm font-medium">
                                {relatorio.nota_historia.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center px-0.5">
                            {relatorio.nota_pilares !== null ? (
                              <span className="text-sm font-medium">
                                {relatorio.nota_pilares.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center px-0.5">
                            {relatorio.nota_objecoes !== null ? (
                              <span className="text-sm font-medium">
                                {relatorio.nota_objecoes.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center px-0.5">
                            {relatorio.nota_impacto !== null ? (
                              <span className="text-sm font-medium">
                                {relatorio.nota_impacto.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center px-0.5">
                            {relatorio.nota_proposta !== null ? (
                              <span className="text-sm font-medium">
                                {relatorio.nota_proposta.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center px-1">
                            {relatorio.nota_media !== null ? (
                              <span className="text-base font-bold text-primary">
                                {relatorio.nota_media.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center px-0.5">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAction('relatorio', relatorio)}
                                disabled={!relatorio.texto_relatorio_completo}
                                className="text-sm h-7 px-2 gap-1.5 w-full"
                              >
                                <FileSearch className="w-3 h-3" />
                                Relatório
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAction('transcript', relatorio)}
                                disabled={!relatorio.url_arquivo}
                                className="text-sm h-7 px-2 gap-1.5 w-full"
                              >
                                <FileText className="w-3 h-3" />
                                Transcrição
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Paginação */}
                {filteredRelatorios.length > itemsPerPage && (
                  <div className="mt-3 flex justify-center">
                    <Pagination>
                      <PaginationContent className="gap-0.5">
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            className={`${currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-7 w-7 text-xs`}
                          >
                            <ChevronRight className="h-3 w-3" />
                          </PaginationLink>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
                  {searchTerm || selectedDate ? 'Nenhum relatório encontrado com os filtros aplicados.' : 'Nenhum relatório encontrado ainda.'}
                </div>
              )}
          </Card>
        </div>
      </div>
    </AppSidebar>
  );
};

export default ColaboradorDetail;
