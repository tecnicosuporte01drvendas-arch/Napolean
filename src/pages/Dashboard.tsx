import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  TrendingUp,
  FileText,
  Trophy,
  ChevronRight,
} from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import AppSidebar from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useUsuariosPorEscopo, useRelatorios, useUsuarios } from '@/hooks/useSupabase';
import { usuariosService } from '@/lib/supabaseServices';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { Usuario, Relatorio } from '@/lib/database.types';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: isLoadingUser } = useAuth();
  const { data: usuariosEscopo, isLoading: isLoadingUsuarios } =
    useUsuariosPorEscopo(user || null);
  const { data: relatorios, isLoading: isLoadingRelatorios } = useRelatorios();
  const { data: todosUsuarios, isLoading: isLoadingTodosUsuarios } = useUsuarios(); // Buscar todos os usuários para Master

  // Buscar dados de cada CS (gestores + colaboradores) usando a mesma abordagem da EquipeCSDetail
  const csQueries = useQueries({
    queries: user?.perfil_sistema === 'master' && usuariosEscopo
      ? usuariosEscopo
          .filter(u => u.perfil_sistema === 'cs')
          .map(cs => ({
            queryKey: ['cs-dados-dashboard', cs.id],
            queryFn: async () => {
              // Buscar gestores vinculados a este CS (igual EquipeCSDetail)
              const gestores = await usuariosService.getByCsId(cs.id);
              
              // Buscar colaboradores de cada gestor
              const todosUsuariosCS = [...gestores];
              for (const gestor of gestores) {
                const colaboradores = await usuariosService.getByGestorId(gestor.id);
                todosUsuariosCS.push(...colaboradores.filter(c => c.tipo === 'colaborador'));
              }
              
              return { csId: cs.id, usuarios: todosUsuariosCS };
            },
            enabled: !!cs.id,
            refetchInterval: 3000, // Auto-refresh a cada 3 segundos
          }))
      : [],
  });

  // Criar um mapa para acesso rápido aos dados de cada CS
  const csDadosMap = useMemo(() => {
    const map = new Map<string, Usuario[]>();
    csQueries.forEach((query) => {
      if (query.data) {
        map.set(query.data.csId, query.data.usuarios);
      }
    });
    return map;
  }, [csQueries]);

  // Buscar colaboradores da mesma equipe quando for colaborador
  const isColaboradorUser = user?.perfil_sistema === 'colaborador' || user?.tipo === 'colaborador';
  const { data: colaboradoresEquipe } = useQuery({
    queryKey: ['colaboradores-equipe', user?.gestor_id],
    queryFn: () => {
      if (!user?.gestor_id) return [];
      return usuariosService.getByGestorId(user.gestor_id);
    },
    enabled: !!isColaboradorUser && !!user?.gestor_id,
    refetchInterval: 3000,
  });

  const isLoading = isLoadingUser || isLoadingUsuarios || isLoadingRelatorios || (user?.perfil_sistema === 'master' && isLoadingTodosUsuarios);

  // --- Quem compõe a "equipe" dessa visão (por role) ---
  const teamUsers: Usuario[] = useMemo(() => {
    if (!user) return [];

    const perfil = user.perfil_sistema || user.tipo || null;

    // Colaborador: ver todos os colaboradores da mesma equipe (mesmo gestor_id)
    if (perfil === 'colaborador') {
      if (!colaboradoresEquipe) return [user];
      // Filtrar apenas colaboradores (excluir o próprio gestor)
      return colaboradoresEquipe.filter(u => 
        (u.tipo === 'colaborador' || u.perfil_sistema === 'colaborador') &&
        u.gestor_id === user.gestor_id
      );
    }

    // Master / Dev / CS / Gestor: usam escopo calculado pelo hook
    let usuarios = (usuariosEscopo || []).length > 0 ? (usuariosEscopo as Usuario[]) : [user];
    
    // Master: mostrar CS, Dev e outros Masters na lista da equipe
    if (perfil === 'master') {
      usuarios = usuarios.filter(u => 
        u.perfil_sistema === 'cs' || 
        u.perfil_sistema === 'dev' || 
        u.perfil_sistema === 'master'
      );
    }
    
    return usuarios;
  }, [user, usuariosEscopo, colaboradoresEquipe]);

  // --- Estatísticas reais vindas de relatorios ---
  const { teamStats, radarData, salespeople } = useMemo(() => {
    if (!relatorios || !user) {
      return {
        teamStats: {
          avgScore: '0.0',
          totalTranscriptions: 0,
          topPerformer: null as {
            id: string;
            name: string;
            averageScore: number;
          } | null,
        },
        radarData: [] as { step: string; score: number }[],
        salespeople: [] as {
          id: string;
          name: string;
          email: string;
          role: string;
          averageScore: number;
          totalTranscriptions: number;
        }[],
      };
    }

    // Para Master: calcular stats incluindo gestores e colaboradores de cada CS
    if (user.perfil_sistema === 'master') {
      const salespeople = teamUsers.map((u) => {
        // Se for CS, usar dados do csDadosMap (igual EquipeCSDetail)
        if (u.perfil_sistema === 'cs') {
          const usuariosCS = csDadosMap.get(u.id) || [];
          const teamUserIds = new Set(usuariosCS.map(usuario => usuario.id));
          
          // Relatórios de todos os usuários vinculados a este CS
          const relatoriosVinculados = (relatorios as Relatorio[]).filter(
            (r) => r.id_usuario && teamUserIds.has(r.id_usuario)
          );
          
          const validScores = relatoriosVinculados.filter((r) => r.nota_media !== null);
          const averageScore =
            validScores.length > 0
              ? validScores.reduce((sum, r) => sum + (r.nota_media || 0), 0) / validScores.length
              : 0;

          return {
            id: u.id,
            name: u.nome || u.email,
            email: u.email,
            role: u.perfil_sistema || 'Usuário',
            averageScore,
            totalTranscriptions: relatoriosVinculados.length,
          };
        }
        
        // Para Dev/Master, manter lógica atual (sem relatórios próprios geralmente)
        const relatoriosUsuario = (relatorios as Relatorio[]).filter((r) => r.id_usuario === u.id);
        const validScores = relatoriosUsuario.filter((r) => r.nota_media !== null);
        const averageScore =
          validScores.length > 0
            ? validScores.reduce((sum, r) => sum + (r.nota_media || 0), 0) / validScores.length
            : 0;

        return {
          id: u.id,
          name: u.nome || u.email,
          email: u.email,
          role: u.perfil_sistema || 'Usuário',
          averageScore,
          totalTranscriptions: relatoriosUsuario.length,
        };
      }).sort((a, b) => b.averageScore - a.averageScore);

      // Calcular stats gerais (todos os relatórios do sistema para Master)
      const totalTranscriptions = (relatorios as Relatorio[]).length;
      const validScores = (relatorios as Relatorio[]).filter((r) => r.nota_media !== null);
      const avgScore =
        validScores.length > 0
          ? validScores.reduce((sum, r) => sum + (r.nota_media || 0), 0) / validScores.length
          : 0;

      const topPerformer =
        salespeople.length > 0
          ? salespeople.reduce((best, current) =>
              current.averageScore > best.averageScore ? current : best,
            )
          : null;

      // Radar com todos os relatórios
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
        teamStats: {
          avgScore: avgScore.toFixed(1),
          totalTranscriptions,
          topPerformer,
        },
        radarData,
        salespeople,
      };
    }

    // Lógica original para outros perfis
    const teamUserIds = new Set(teamUsers.map((u) => u.id));
    const teamRelatorios = (relatorios as Relatorio[]).filter(
      (r) => r.id_usuario && teamUserIds.has(r.id_usuario),
    );

    // Para colaborador: usar apenas relatórios do próprio usuário para stats individuais
    const isColaboradorUser = user?.perfil_sistema === 'colaborador' || user?.tipo === 'colaborador';
    const relatoriosParaStats = isColaboradorUser
      ? (relatorios as Relatorio[]).filter((r) => r.id_usuario === user.id)
      : teamRelatorios;

    const salespeople = teamUsers
      .map((u) => {
        const relatoriosUsuario = teamRelatorios.filter((r) => r.id_usuario === u.id);
        const validScores = relatoriosUsuario.filter((r) => r.nota_media !== null);
        const averageScore =
          validScores.length > 0
            ? validScores.reduce((sum, r) => sum + (r.nota_media || 0), 0) /
              validScores.length
            : 0;

        return {
          id: u.id,
          name: u.nome || u.email,
          email: u.email,
          role:
            u.tipo === 'gestor'
              ? 'Gestor'
              : u.tipo === 'colaborador'
              ? 'Colaborador'
              : u.perfil_sistema || 'Usuário',
          averageScore,
          totalTranscriptions: relatoriosUsuario.length,
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore); // Ordenar por maior nota primeiro

    // Para colaborador: stats individuais; para outros: stats da equipe
    const totalTranscriptions = isColaboradorUser
      ? relatoriosParaStats.length
      : salespeople.reduce((sum, p) => sum + p.totalTranscriptions, 0);

    const validScoresStats = relatoriosParaStats.filter((r) => r.nota_media !== null);
    const avgScore = isColaboradorUser
      ? validScoresStats.length > 0
        ? validScoresStats.reduce((sum, r) => sum + (r.nota_media || 0), 0) / validScoresStats.length
        : 0
      : salespeople.length > 0
      ? salespeople.reduce((sum, p) => sum + p.averageScore, 0) / salespeople.length
      : 0;

    const topPerformer =
      salespeople.length > 0
        ? salespeople.reduce((best, current) =>
            current.averageScore > best.averageScore ? current : best,
          )
        : null;

    // Radar das 7 etapas (individual para colaborador, média da equipe para outros)
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
      const valores = relatoriosParaStats
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
      teamStats: {
        avgScore: avgScore.toFixed(1),
        totalTranscriptions,
        topPerformer,
      },
      radarData,
      salespeople,
    };
  }, [relatorios, teamUsers, user, csDadosMap]);

  const headerTitle = useMemo(() => {
    if (!user) return 'Dashboard';
    const perfil = user.perfil_sistema || user.tipo || null;
    if (perfil === 'colaborador') return 'Dashboard Individual';
    if (perfil === 'gestor') return 'Dashboard Gestor';
    if (perfil === 'cs') return 'Dashboard CS';
    if (perfil === 'master') return 'Dashboard Master';
    if (perfil === 'dev') return 'Dashboard Dev';
    return 'Dashboard';
  }, [user]);

  const isColaborador = user?.perfil_sistema === 'colaborador' || user?.tipo === 'colaborador';

  return (
    <AppSidebar>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <h1 className="text-3xl lg:text-4xl font-bold gradient-text mb-2">
            {headerTitle}
          </h1>
          <p className="text-muted-foreground">
            Visão geral da performance baseada nos relatórios reais
          </p>
        </header>

        {isLoading ? (
          <div className="text-muted-foreground">Carregando dados da dashboard...</div>
        ) : (
          <>
            {/* Cards principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card
                className="glass light-shadow p-6 hover-scale animate-fade-in"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary/20 glow-primary">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-3xl font-bold text-primary">
                    {teamStats.avgScore}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {isColaborador ? 'Nota Média Individual' : 'Nota Média da Equipe'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isColaborador ? 'Sua performance geral' : 'Performance geral do time'}
                </p>
              </Card>

              <Card
                className="glass light-shadow p-6 hover-scale animate-fade-in"
                style={{ animationDelay: '0.2s' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-accent/20 glow-accent">
                    <FileText className="w-6 h-6 text-accent" />
                  </div>
                  <span className="text-3xl font-bold text-accent">
                    {teamStats.totalTranscriptions}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Transcrições Analisadas
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isColaborador ? 'Total de suas análises' : 'Total de análises realizadas'}
                </p>
              </Card>

              <Card
                className="glass light-shadow p-6 hover-scale animate-fade-in"
                style={{ animationDelay: '0.3s' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-3xl font-bold text-primary">
                    {teamStats.topPerformer
                      ? teamStats.topPerformer.averageScore.toFixed(1)
                      : '0.0'}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Melhor Vendedor
                </h3>
                <p className="text-xs text-muted-foreground">
                  {teamStats.topPerformer
                    ? teamStats.topPerformer.name
                    : 'Sem dados suficientes'}
                </p>
              </Card>
            </div>

            {/* Gráfico + lista da equipe */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Chart */}
              <Card
                className="glass light-shadow p-6 animate-fade-in"
                style={{ animationDelay: '0.4s' }}
              >
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
                  {isColaborador ? 'Performance nas 7 Etapas Individual' : 'Performance nas 7 Etapas'}
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
                      name={isColaborador ? "Minha Performance" : "Média da Equipe"}
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

              {/* Team List */}
              <Card
                className="glass light-shadow p-6 animate-fade-in"
                style={{ animationDelay: '0.5s' }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-accent" />
                    Equipe
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {salespeople.length} {salespeople.length === 1 ? 'membro' : 'membros'} da equipe
                  </span>
                </div>

                 <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
                   {salespeople.map((person, index) => {
                     // Determinar rota baseado no perfil do usuário
                     const getRoute = () => {
                       const usuario = teamUsers.find(u => u.id === person.id);
                       if (!usuario) return `/salesperson/${person.id}`;
                       
                       const perfil = usuario.perfil_sistema || usuario.tipo;
                       if (perfil === 'cs') return `/equipe/cs/${person.id}`;
                       if (perfil === 'gestor') return `/equipe/gestor/${person.id}`;
                       if (perfil === 'colaborador') return `/colaborador/${person.id}`;
                       return `/salesperson/${person.id}`;
                     };
                     
                     return (
                     <div
                       key={person.id}
                       className={`glass p-4 rounded-xl transition-all group ${
                         isColaborador 
                           ? '' // Sem hover e cursor para colaborador
                           : 'hover:bg-primary/5 dark:hover:bg-white/5 cursor-pointer'
                       }`}
                       onClick={isColaborador ? undefined : () => navigate(getRoute())}
                       style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                     >
                       <div className="flex items-center gap-4">
                         <Avatar className="w-12 h-12 border-2 border-primary/50">
                           <AvatarFallback className="bg-primary/20 text-primary">
                             {person.name
                               .split(' ')
                               .map((n) => n[0])
                               .join('')}
                           </AvatarFallback>
                         </Avatar>

                         <div className="flex-1 min-w-0">
                           <h4 className="font-semibold text-foreground truncate">
                             {person.name}
                           </h4>
                           <p className="text-sm text-muted-foreground truncate">
                             {person.role}
                           </p>
                         </div>

                         <div className="text-right">
                           <div className="flex items-center gap-2">
                             <span className="text-2xl font-bold text-primary">
                               {person.averageScore.toFixed(1)}
                             </span>
                             {!isColaborador && (
                               <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                             )}
                           </div>
                           <p className="text-xs text-muted-foreground">
                             {person.totalTranscriptions} análises
                           </p>
                         </div>
                       </div>
                     </div>
                     );
                   })}
                 </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppSidebar>
  );
};

export default Dashboard;
