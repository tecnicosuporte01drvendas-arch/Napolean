import { useParams } from 'react-router-dom';
import { ArrowLeft, TrendingUp, FileText, FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRelatorio } from '@/hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';

const RelatorioDetalhado = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: relatorio, isLoading } = useRelatorio(id || '');


  if (isLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Carregando relatório...</div>
        </div>
      </AppSidebar>
    );
  }

  // Array com todas as notas
  const notas = [
    { key: 'nota_boas_vindas', label: 'Apresentação', value: relatorio?.nota_boas_vindas },
    { key: 'nota_identificacao', label: 'Identificação de Necessidades', value: relatorio?.nota_identificacao },
    { key: 'nota_historia', label: 'Conexão por História Pessoal', value: relatorio?.nota_historia },
    { key: 'nota_pilares', label: 'Pilares da Mentoria', value: relatorio?.nota_pilares },
    { key: 'nota_objecoes', label: 'Quebra de Objeções', value: relatorio?.nota_objecoes },
    { key: 'nota_impacto', label: 'Impacto e Transformação', value: relatorio?.nota_impacto },
    { key: 'nota_proposta', label: 'Proposta de Valor', value: relatorio?.nota_proposta },
    { key: 'nota_media', label: 'Nota Final', value: relatorio?.nota_media, isFinal: true },
  ];

  if (!relatorio) {
    return (
      <AppSidebar>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="glass p-8 text-center max-w-md">
            <p className="text-muted-foreground mb-4">Relatório não encontrado.</p>
            <Button onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate('/dashboard');
              }
            }}>
              <ArrowLeft className="w-4 h-4 mr-2" />
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
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate('/dashboard');
                }
              }}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              {relatorio.url_arquivo && (
                <Button
                  onClick={() => window.open(relatorio.url_arquivo!, '_blank')}
                  className="gap-2 bg-primary hover:bg-primary/80 text-primary-foreground"
                >
                  <FileAudio className="w-4 h-4" />
                  Transcrição Original
                </Button>
              )}
              {relatorio.texto_relatorio_completo && (
                <Button
                  onClick={() => navigate(`/relatorio/${relatorio.id}/completo`)}
                  className="gap-2 glow-primary"
                >
                  <FileText className="w-4 h-4" />
                  Ver Relatório Completo
                </Button>
              )}
            </div>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text mb-1">
            Relatório
          </h1>
          {relatorio.nome_arquivo && (
            <p className="text-muted-foreground text-sm">
              Arquivo: {relatorio.nome_arquivo}
            </p>
          )}
        </header>

        {/* Cards com as Notas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {notas.map((nota) => {
            return (
              <Card
                key={nota.key}
                className={`glass light-shadow p-4 hover-scale animate-fade-in ${
                  nota.isFinal ? 'border-primary/30 bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {nota.label}
                    </h3>
                    <div className={`text-2xl font-bold ${
                      nota.isFinal ? 'text-primary' : 'text-foreground'
                    }`}>
                      {nota.value !== null ? nota.value.toFixed(1) : '-'}
                    </div>
                  </div>
                  {nota.isFinal && nota.value !== null && (
                    <div className="p-2 rounded-xl bg-primary/20">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppSidebar>
  );
};

export default RelatorioDetalhado;

