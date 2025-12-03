import { useParams } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRelatorio } from '@/hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import jsPDF from 'jspdf';

const RelatorioCompleto = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: relatorio, isLoading } = useRelatorio(id || '');

  const handleDownload = () => {
    if (!relatorio?.texto_relatorio_completo) return;

    // Criar PDF
    const doc = new jsPDF();
    
    // Configurar fonte e tamanho
    doc.setFontSize(12);
    
    // Dividir o texto em linhas que cabem na página
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    
    // Título
    doc.setFontSize(16);
    doc.text('Relatório Detalhado', margin, margin);
    
    // Nome do arquivo (se existir)
    if (relatorio.nome_arquivo) {
      doc.setFontSize(10);
      doc.text(`Arquivo: ${relatorio.nome_arquivo}`, margin, margin + 10);
    }
    
    // Conteúdo do relatório
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(relatorio.texto_relatorio_completo, maxWidth);
    
    let y = margin + (relatorio.nome_arquivo ? 20 : 15);
    const lineHeight = 7;
    
    lines.forEach((line: string) => {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });
    
    // Salvar PDF
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
            <Button onClick={() => navigate('/dashboard')}>
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
                  navigate(`/relatorio/${id}`);
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
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text mb-1">
            Relatório Detalhado
          </h1>
          {relatorio.nome_arquivo && (
            <p className="text-muted-foreground text-sm">
              Arquivo: {relatorio.nome_arquivo}
            </p>
          )}
        </header>

        {/* Conteúdo do Relatório */}
        <Card className="glass light-shadow p-4 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4">Relatório Completo</h3>
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed text-sm">
              {relatorio.texto_relatorio_completo}
            </div>
          </div>
        </Card>
      </div>
    </AppSidebar>
  );
};

export default RelatorioCompleto;

