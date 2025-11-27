import { useState, useRef, useMemo } from 'react';
import { Upload, FileText, X, CheckCircle2, Loader2, Calendar as CalendarIcon, FileSearch, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUsuariosByGestor, useRelatoriosByUsuario, useCreateRelatorio } from '@/hooks/useSupabase';
import { storageService } from '@/lib/supabaseServices';
import type { Usuario, TipoUsuario, Relatorio } from '@/lib/database.types';
import AppSidebar from '@/components/AppSidebar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const NovaAnalise = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: usuarios } = useUsuariosByGestor(user?.id || '');
  const { data: relatorios, isLoading: isLoadingRelatorios } = useRelatoriosByUsuario(user?.id || '');
  const createRelatorio = useCreateRelatorio();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDestinatarios, setSelectedDestinatarios] = useState<string[]>([]);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Filtrar colaboradores (apenas para gestores)
  const colaboradores = usuarios?.filter(
    (u) => u.tipo === 'colaborador' && u.id !== user?.id
  ) || [];

  const isGestor = user?.tipo === 'gestor';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar se é PDF ou TXT
      const isValidType = 
        file.type === 'application/pdf' || 
        file.type === 'text/plain' ||
        file.name.toLowerCase().endsWith('.pdf') ||
        file.name.toLowerCase().endsWith('.txt');

      if (!isValidType) {
        toast({
          title: 'Erro',
          description: 'Apenas arquivos PDF ou TXT são permitidos.',
          variant: 'destructive',
        });
        return;
      }

      // Validar tamanho (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'O arquivo deve ter no máximo 10MB.',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      return;
    }

    setIsUploading(true);

    try {
      // Fazer upload do arquivo
      const uploadResult = await storageService.uploadFile(selectedFile, user.id);

      if (!uploadResult) {
        toast({
          title: 'Erro',
          description: 'Não foi possível fazer upload do arquivo. Verifique se o bucket "relatorios" foi criado no Supabase Storage.',
          variant: 'destructive',
        });
        setIsUploading(false);
        return;
      }

      // Salvar URL e nome do arquivo
      setUploadedFileUrl(uploadResult.url);
      setUploadedFileName(selectedFile.name);

      // Abrir dialog para selecionar destinatários
      setIsDialogOpen(true);
      setIsUploading(false);

      // Se for gestor, já seleciona ele mesmo automaticamente
      if (isGestor) {
        setSelectedDestinatarios([user.id]);
      } else {
        // Se for colaborador, seleciona apenas ele mesmo
        setSelectedDestinatarios([user.id]);
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao fazer upload.',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };

  const handleConfirmEnvio = async () => {
    if (!user || !uploadedFileUrl || !uploadedFileName || !selectedFile) {
      return;
    }

    try {
      // 1. Criar registro do relatório no banco
      const relatorio = await createRelatorio.mutateAsync({
        id_usuario: user.id,
        nome_arquivo: uploadedFileName,
        url_arquivo: uploadedFileUrl,
      });

      if (!relatorio) {
        toast({
          title: 'Erro',
          description: 'Não foi possível criar o relatório.',
          variant: 'destructive',
        });
        return;
      }

      // 2. Preparar dados dos destinatários
      const destinatarios = usuarios?.filter((u) =>
        selectedDestinatarios.includes(u.id)
      ) || [];

      // 3. Converter arquivo para base64 para enviar no webhook
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remover o prefixo data:application/pdf;base64, ou data:text/plain;base64,
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // 4. Preparar payload para o webhook
      const webhookPayload = {
        arquivo: {
          nome: uploadedFileName,
          tipo: selectedFile.type,
          tamanho: selectedFile.size,
          base64: fileBase64,
        },
        usuario: {
          id: user.id,
          email: user.email,
          nome: user.nome || null,
          telefone: user.telefone || null,
          tipo: user.tipo || null,
        },
        destinatarios: destinatarios.map((d) => ({
          id: d.id,
          email: d.email,
          nome: d.nome || null,
          telefone: d.telefone || null,
        })),
        relatorio_id: relatorio.id,
        url_arquivo: uploadedFileUrl,
        data_envio: new Date().toISOString(),
      };

      // 5. Enviar para o webhook
      const webhookResponse = await fetch(
        'https://napolean-n8n.kpkckc.easypanel.host/webhook/Napolean',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      if (!webhookResponse.ok) {
        console.error('Erro ao enviar para webhook:', await webhookResponse.text());
        // Não falhar completamente, apenas logar o erro
        toast({
          title: 'Aviso',
          description: 'Arquivo enviado, mas houve um problema ao notificar o processamento.',
          variant: 'default',
        });
      }

      toast({
        title: 'Sucesso!',
        description: 'Análise enviada com sucesso. O relatório será processado em breve.',
      });

      // Resetar estado
      setSelectedFile(null);
      setUploadedFileUrl(null);
      setUploadedFileName(null);
      setSelectedDestinatarios([]);
      setIsDialogOpen(false);

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Erro ao enviar análise:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao enviar a análise.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    // Se cancelar, deletar o arquivo que foi feito upload
    if (uploadedFileUrl) {
      // Extrair path da URL (implementar se necessário)
      // storageService.deleteFile(path);
    }

    setSelectedFile(null);
    setUploadedFileUrl(null);
    setUploadedFileName(null);
    setSelectedDestinatarios([]);
    setIsDialogOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleDestinatario = (usuarioId: string) => {
    setSelectedDestinatarios((prev) => {
      if (prev.includes(usuarioId)) {
        return prev.filter((id) => id !== usuarioId);
      } else {
        return [...prev, usuarioId];
      }
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Mapeamento dos campos do banco para os nomes corretos
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
      // Abrir arquivo original em nova aba
      window.open(relatorio.url_arquivo, '_blank');
    } else if (type === 'relatorio' && relatorio.texto_relatorio_completo) {
      // Abrir página de relatório detalhado
      window.open(`/relatorio/${relatorio.id}`, '_blank');
    } else {
      toast({
        title: 'Info',
        description: type === 'relatorio' 
          ? 'Relatório detalhado ainda não está disponível.'
          : 'Arquivo não disponível.',
      });
    }
  };

  // Filtrar relatórios baseado no termo de busca e data selecionada
  const relatoriosFiltrados = useMemo(() => {
    if (!relatorios) return [];

    let filtrados = relatorios;

    // Filtro por termo de busca (nome ou data digitada)
    if (searchTerm.trim()) {
      const termo = searchTerm.toLowerCase();
      filtrados = filtrados.filter((relatorio) => {
        const nomeArquivo = relatorio.nome_arquivo?.toLowerCase() || '';
        const data = new Date(relatorio.criado_em).toLocaleDateString('pt-BR');
        return nomeArquivo.includes(termo) || data.includes(termo);
      });
    }

    // Filtro por data selecionada
    if (selectedDate) {
      filtrados = filtrados.filter((relatorio) => {
        const dataRelatorio = new Date(relatorio.criado_em);
        return (
          dataRelatorio.getDate() === selectedDate.getDate() &&
          dataRelatorio.getMonth() === selectedDate.getMonth() &&
          dataRelatorio.getFullYear() === selectedDate.getFullYear()
        );
      });
    }

    return filtrados;
  }, [relatorios, searchTerm, selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Atualizar o campo de busca com a data formatada
      setSearchTerm(format(date, 'dd/MM/yyyy', { locale: ptBR }));
    } else {
      // Se limpar a data, limpar também o campo de busca
      setSearchTerm('');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Se limpar o campo de busca, limpar também a data selecionada
    if (!value.trim()) {
      setSelectedDate(undefined);
    }
  };

  return (
    <AppSidebar>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <h1 className="text-3xl lg:text-4xl font-bold gradient-text mb-2">
            Nova Análise
          </h1>
          <p className="text-muted-foreground">
            Envie um arquivo PDF para análise e receba o relatório completo
          </p>
        </header>

        {/* Área de Upload */}
        <Card className="glass light-shadow p-12 animate-fade-in">
          <div className="max-w-2xl mx-auto">
            {!selectedFile ? (
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Upload className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Envie seu arquivo PDF ou TXT
                </h3>
                <p className="text-muted-foreground mb-6">
                  Clique para selecionar ou arraste o arquivo aqui
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="lg"
                  className="gap-2 glow-primary"
                >
                  <Upload className="w-5 h-5" />
                  Selecionar Arquivo (PDF/TXT)
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Formatos aceitos: PDF ou TXT • Tamanho máximo: 10MB
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border border-white/10">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  size="lg"
                  className="w-full gap-2 glow-primary"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Enviar para Análise
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Tabela de Histórico de Relatórios */}
        {user && (
          <Card className="glass light-shadow p-6 mt-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Histórico de Relatórios
              </h2>
              <div className="relative w-80 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome ou data..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-primary/10"
                      >
                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDate(undefined);
                      setSearchTerm('');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {isLoadingRelatorios ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando relatórios...
              </div>
            ) : relatoriosFiltrados && relatoriosFiltrados.length > 0 ? (
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
                    {relatoriosFiltrados.map((relatorio, index) => (
                      <TableRow
                        key={relatorio.id}
                        className="border-border hover:bg-primary/5 dark:hover:bg-white/5 transition-colors animate-fade-in"
                        style={{ animationDelay: `${0.3 + index * 0.1}s` }}
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
            ) : searchTerm ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum relatório encontrado para "{searchTerm}".
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum relatório encontrado. Envie seu primeiro arquivo para análise.
              </div>
            )}
          </Card>
        )}

        {/* Dialog de Seleção de Destinatários */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Selecionar Destinatários</DialogTitle>
              <DialogDescription>
                {isGestor
                  ? 'Selecione os colaboradores que receberão o relatório. Você sempre receberá uma cópia automaticamente.'
                  : 'Você receberá o relatório no seu WhatsApp assim que a análise for concluída.'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {isGestor && colaboradores.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {colaboradores.map((colaborador) => (
                    <div
                      key={colaborador.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <Checkbox
                        id={`colab-${colaborador.id}`}
                        checked={selectedDestinatarios.includes(colaborador.id)}
                        onCheckedChange={() => toggleDestinatario(colaborador.id)}
                      />
                      <Label
                        htmlFor={`colab-${colaborador.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div>
                          <p className="font-medium">
                            {colaborador.nome || colaborador.email}
                          </p>
                          {colaborador.telefone && (
                            <p className="text-sm text-muted-foreground">
                              📱 {colaborador.telefone}
                            </p>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {isGestor
                    ? 'Nenhum colaborador cadastrado ainda.'
                    : 'O relatório será enviado para você automaticamente.'}
                </div>
              )}

              {isGestor && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <p className="text-sm">
                      <strong>Você</strong> receberá o relatório automaticamente
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmEnvio}
                disabled={createRelatorio.isPending}
              >
                {createRelatorio.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Confirmar Envio'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppSidebar>
  );
};

export default NovaAnalise;

