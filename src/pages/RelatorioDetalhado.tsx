import { useParams } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRelatorio } from '@/hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import jsPDF from 'jspdf';

const RelatorioDetalhado = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: relatorio, isLoading } = useRelatorio(id || '');

  const handleDownload = () => {
    if (!relatorio?.texto_relatorio_completo) return;

    // Criar PDF de forma síncrona
    const doc = new jsPDF();
    
    // Configurar fonte e tamanho
    doc.setFontSize(12);
    
    // Obter dimensões da página
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    
    // Dividir texto em linhas que cabem na página
    const lines = doc.splitTextToSize(relatorio.texto_relatorio_completo, maxWidth);
    
    let y = margin;
    const lineHeight = 7;
    
    // Adicionar título se houver nome do arquivo
    if (relatorio.nome_arquivo) {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      const titleLines = doc.splitTextToSize(relatorio.nome_arquivo, maxWidth);
      titleLines.forEach((line: string) => {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight + 2;
      });
      y += 5; // Espaço após título
    }
    
    // Adicionar conteúdo
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    lines.forEach((line: string) => {
      // Se não couber na página, adiciona nova página
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });
    
    // Chamar save() imediatamente - método mais confiável
    // O save() deve ser chamado de forma totalmente síncrona após o clique
    doc.save(`relatorio-${relatorio.id}.pdf`);
  };

  if (isLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Carregando relatório...</div>
        </div>
      </AppSidebar>
    );
  }

  if (!relatorio || !relatorio.texto_relatorio_completo) {
    return (
      <AppSidebar>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="glass p-8 text-center max-w-md">
            <p className="text-muted-foreground mb-4">Relatório não encontrado ou ainda não processado.</p>
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
      <div className="p-6 lg:p-8">
        {/* Header */}
        <header className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => {
                // Sempre volta para a tela anterior, nunca para Nova Análise
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
            <Button
              onClick={handleDownload}
              className="gap-2 glow-primary"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold gradient-text mb-2">
            Relatório Detalhado
          </h1>
          {relatorio.nome_arquivo && (
            <p className="text-muted-foreground">
              Arquivo: {relatorio.nome_arquivo}
            </p>
          )}
        </header>

        {/* Conteúdo do Relatório */}
        <Card className="glass light-shadow p-8 lg:p-12 animate-fade-in">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                {relatorio.texto_relatorio_completo}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppSidebar>
  );
};

export default RelatorioDetalhado;

