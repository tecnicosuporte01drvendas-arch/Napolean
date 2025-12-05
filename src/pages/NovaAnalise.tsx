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
import { Upload, FileText, Calendar, ArrowLeft } from 'lucide-react';
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
      if (isGestor && colaboradores && colaboradores.length > 0) {
        setIsDialogOpen(true);
      } else {
        handleUpload();
      }
    }
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
      await createRelatorio.mutateAsync({
        id_usuario: usuarioId,
        nome_arquivo: selectedFile.name,
        url_arquivo: uploadResult.url,
      });

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
                disabled={isUploading}
              />
              <Button
                asChild
                disabled={isUploading}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <span>
                  {isUploading ? 'Enviando...' : 'Selecionar Arquivo'}
                </span>
              </Button>
            </Label>
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-4">
                Arquivo selecionado: {selectedFile.name}
              </p>
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
                  <TableRow>
                    <TableHead>Nome do Arquivo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatoriosOrdenados.map((relatorio) => (
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
                  ))}
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
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedColaboradorId || isUploading}
              >
                {isUploading ? 'Enviando...' : 'Enviar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppSidebar>
  );
};

export default NovaAnalise;
