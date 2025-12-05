import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Calendar, ArrowLeft, FileSearch } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRelatoriosByUsuario, useCreateRelatorio } from '@/hooks/useSupabase';
import { useUsuariosByGestor } from '@/hooks/useSupabase';
import { storageService } from '@/lib/supabaseServices';
import type { Relatorio } from '@/lib/database.types';

const NovaAnalise = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: relatorios, isLoading: isLoadingRelatorios } = useRelatoriosByUsuario(user?.id || '');
  const { data: colaboradores } = useUsuariosByGestor(user?.id || '');
  const createRelatorio = useCreateRelatorio();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const isGestor = user?.perfil_sistema === 'gestor' || user?.tipo === 'gestor';
  const isColaborador = user?.perfil_sistema === 'colaborador' || user?.tipo === 'colaborador';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Se for gestor e houver colaboradores, abre o dialog
      // Caso contrário, apenas define o arquivo (não envia automaticamente)
      if (isGestor && colaboradores && colaboradores.length > 0) {
        setIsDialogOpen(true);
      }
      // Removido o handleUpload() automático - usuário deve clicar em "Enviar"
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    setSelectedColaboradorId('');
    // Limpar o input de arquivo
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Função para converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1]; // Remove o prefixo data:application/pdf;base64,
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    try {
      // Determinar o ID do usuário para o relatório
      const usuarioId = isGestor && selectedColaboradorId ? selectedColaboradorId : user.id;

      // Fazer upload do arquivo
      const uploadResult = await storageService.uploadFile(selectedFile, usuarioId);
      
      if (!uploadResult) {
        throw new Error('Erro ao fazer upload do arquivo');
      }

      // Criar registro do relatório
      const novoRelatorio = await createRelatorio.mutateAsync({
        id_usuario: usuarioId,
        nome_arquivo: selectedFile.name,
        url_arquivo: uploadResult.url,
      });

      if (!novoRelatorio) {
        throw new Error('Erro ao criar registro do relatório');
      }

      // Buscar destinatários
      let destinatarios: Array<{
        id: string;
        email: string;
        nome: string | null;
        telefone: string | null;
      }> = [];

      if (isGestor) {
        // Se for gestor, incluir colaboradores + o próprio gestor
        if (colaboradores && colaboradores.length > 0) {
          destinatarios = colaboradores.map((colab) => ({
            id: colab.id,
            email: colab.email,
            nome: colab.nome,
            telefone: colab.telefone || null,
          }));
        }
        // Adicionar o próprio gestor
        destinatarios.push({
          id: user.id,
          email: user.email,
          nome: user.nome,
          telefone: user.telefone || null,
        });
      } else {
        // Se for colaborador, apenas o próprio usuário
        destinatarios.push({
          id: user.id,
          email: user.email,
          nome: user.nome,
          telefone: user.telefone || null,
        });
      }

      // Converter arquivo para base64
      const arquivoBase64 = await fileToBase64(selectedFile);

      // Montar payload do webhook
      const webhookPayload = {
        arquivo: {
          nome: selectedFile.name,
          tipo: selectedFile.type,
          tamanho: selectedFile.size,
          base64: arquivoBase64,
        },
        usuario: {
          id: usuarioId,
          email: user.email,
          nome: user.nome || null,
          telefone: user.telefone || null,
          tipo: user.tipo || user.perfil_sistema || 'colaborador',
        },
        destinatarios: destinatarios,
        relatorio_id: novoRelatorio.id,
        url_arquivo: uploadResult.url,
        data_envio: new Date().toISOString(),
      };

      // Chamar webhook do n8n
      const webhookUrl = 'https://napolean-n8n.kpkckc.easypanel.host/webhook/Napolean';
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          console.error('Erro ao chamar webhook do n8n:', await webhookResponse.text());
          // Não falhar o upload se o webhook falhar
        }
      } catch (webhookError) {
        console.error('Erro ao chamar webhook do n8n:', webhookError);
        // Não falhar o upload se o webhook falhar
      }

      toast({
        title: 'Sucesso!',
        description: 'Arquivo enviado com sucesso. A análise será processada em breve.',
      });

      setSelectedFile(null);
      setSelectedColaboradorId('');
      setIsDialogOpen(false);
      
      // Limpar o input de arquivo
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const relatoriosOrdenados = useMemo(() => {
    if (!relatorios) return [];
    return [...relatorios].sort((a, b) => {
      const dateA = new Date(a.criado_em || 0).getTime();
      const dateB = new Date(b.criado_em || 0).getTime();
      return dateB - dateA;
    });
  }, [relatorios]);

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
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text mb-1">
            Nova Análise
          </h1>
          <p className="text-muted-foreground">
            {isGestor 
              ? 'Envie um arquivo de transcrição para análise de um colaborador'
              : 'Envie um arquivo de transcrição para análise'}
          </p>
        </header>

        {/* Upload Card */}
        <Card className="glass light-shadow p-4 mb-4 animate-fade-in">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Enviar Arquivo</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Selecione um arquivo de transcrição para análise
            </p>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Input
                id="file-upload"
                type="file"
                accept=".txt,.doc,.docx,.pdf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading || !!selectedFile}
              />
              <Button
                asChild
                disabled={isUploading || !!selectedFile}
                className={`bg-gradient-to-r from-primary to-accent ${
                  (isUploading || !!selectedFile) 
                    ? 'opacity-50 hover:opacity-50' 
                    : 'hover:opacity-90'
                }`}
              >
                <span>
                  Selecionar Arquivo
                </span>
              </Button>
            </Label>
            {selectedFile && (
              <div className="mt-4 flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {selectedFile.name}
                </p>
                {/* Se for gestor e tiver colaboradores, os botões aparecem após selecionar no dialog */}
                {/* Se não for gestor ou não tiver colaboradores, mostra os botões direto */}
                {(!isGestor || (isGestor && !colaboradores?.length) || (isGestor && selectedColaboradorId)) ? (
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleCancelFile}
                      disabled={isUploading}
                      variant="outline"
                    >
                      Cancelar Arquivo
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    >
                      {isUploading ? 'Enviando...' : 'Enviar Arquivo'}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </Card>

        {/* Histórico de Relatórios */}
        <Card className="glass light-shadow p-4 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Histórico de Relatórios
          </h3>
          {isLoadingRelatorios ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : relatoriosOrdenados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum relatório encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    {(isColaborador || isGestor) ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <TableHead>Nome do Arquivo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatoriosOrdenados.map((relatorio) => {
                    if (isColaborador || isGestor) {
                      const data = new Date(relatorio.criado_em || 0);
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
                                onClick={() => navigate(`/relatorio/${relatorio.id}/completo`)}
                                disabled={!relatorio.texto_relatorio_completo}
                                className="text-sm h-7 px-2 gap-1.5 w-full"
                              >
                                <FileSearch className="w-3 h-3" />
                                Relatório
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (relatorio.url_arquivo) {
                                    window.open(relatorio.url_arquivo, '_blank');
                                  }
                                }}
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
                    } else {
                      return (
                        <TableRow key={relatorio.id}>
                          <TableCell className="font-medium">
                            {relatorio.nome_arquivo || 'Sem nome'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {relatorio.criado_em
                                ? new Date(relatorio.criado_em).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/relatorio/${relatorio.id}/completo`)}
                            >
                              Ver Relatório
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Dialog para selecionar colaborador (apenas para gestores) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Selecionar Colaborador</DialogTitle>
              <DialogDescription>
                Para qual colaborador esta análise será atribuída?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="colaborador-select">Colaborador</Label>
              <Select
                value={selectedColaboradorId}
                onValueChange={setSelectedColaboradorId}
              >
                <SelectTrigger id="colaborador-select" className="mt-2">
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores && colaboradores.length > 0 ? (
                    colaboradores.map((colaborador) => (
                      <SelectItem key={colaborador.id} value={colaborador.id}>
                        {colaborador.nome || colaborador.email}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      Nenhum colaborador disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedFile(null);
                  setSelectedColaboradorId('');
                  // Limpar o input de arquivo
                  const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setIsDialogOpen(false);
                  // Os botões aparecerão abaixo do arquivo selecionado
                }}
                disabled={!selectedColaboradorId}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppSidebar>
  );
};

export default NovaAnalise;
