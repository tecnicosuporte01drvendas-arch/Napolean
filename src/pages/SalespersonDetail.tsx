import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Download, 
  FileAudio, 
  FileText,
  Calendar,
  TrendingUp,
  FileBarChart,
} from 'lucide-react';
import { mockSalespeople, getTranscriptionsForSalesperson, METHODOLOGY_STEPS } from '@/lib/mockData';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AppSidebar from '@/components/AppSidebar';

const SalespersonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const salesperson = useMemo(() => 
    mockSalespeople.find(p => p.id === id), [id]
  );

  const transcriptions = useMemo(() => 
    getTranscriptionsForSalesperson(id || ''), [id]
  );

  if (!salesperson) {
    return (
      <AppSidebar>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="glass p-8 text-center">
            <p className="text-muted-foreground mb-4">Vendedor não encontrado</p>
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

  const handleDownload = (type: 'audio' | 'transcript' | 'report', transcriptionId: string) => {
    console.log(`Downloading ${type} for transcription ${transcriptionId}`);
  };

  return (
    <AppSidebar>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <Button 
            variant="ghost" 
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate('/dashboard');
              }
            }}
            className="mb-4 hover:bg-primary/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="glass-strong light-shadow p-6 rounded-2xl">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <Avatar className="w-24 h-24 border-4 border-primary/50 glow-primary">
                <AvatarImage src={salesperson.avatar} alt={salesperson.name} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  {salesperson.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-3xl font-bold gradient-text mb-2">{salesperson.name}</h1>
                <p className="text-muted-foreground mb-4">{salesperson.role}</p>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Média Geral:</span>
                    <span className="text-lg font-bold text-primary">{salesperson.averageScore.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileBarChart className="w-4 h-4 text-accent" />
                    <span className="text-sm text-muted-foreground">Análises:</span>
                    <span className="text-lg font-bold text-accent">{salesperson.totalTranscriptions}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Transcriptions History */}
        <Card className="glass light-shadow p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Histórico de Transcrições
          </h2>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-foreground">Data</TableHead>
                  {METHODOLOGY_STEPS.map(step => (
                    <TableHead key={step.key} className="text-center text-foreground">
                      {step.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center text-foreground">Total</TableHead>
                  <TableHead className="text-center text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transcriptions.map((transcription, index) => (
                  <TableRow 
                    key={transcription.id} 
                    className="border-border hover:bg-primary/5 dark:hover:bg-white/5 transition-colors animate-fade-in"
                    style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                  >
                    <TableCell className="font-medium">
                      {new Date(transcription.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    {METHODOLOGY_STEPS.map(step => (
                      <TableCell key={step.key} className="text-center">
                        <span className={`inline-block px-2 py-1 rounded text-sm font-semibold ${
                          transcription.scores[step.key as keyof typeof transcription.scores] >= 8 
                            ? 'text-primary bg-primary/20' 
                            : transcription.scores[step.key as keyof typeof transcription.scores] >= 7
                            ? 'text-accent bg-accent/20'
                            : 'text-muted-foreground bg-muted/20'
                        }`}>
                          {transcription.scores[step.key as keyof typeof transcription.scores].toFixed(1)}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <span className="text-lg font-bold text-primary">
                        {transcription.totalScore.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="hover:bg-primary/20 hover:text-primary"
                          onClick={() => handleDownload('audio', transcription.id)}
                        >
                          <FileAudio className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="hover:bg-accent/20 hover:text-accent"
                          onClick={() => handleDownload('transcript', transcription.id)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="hover:bg-primary/20 hover:text-primary"
                          onClick={() => handleDownload('report', transcription.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AppSidebar>
  );
};

export default SalespersonDetail;
