import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldCheck, BarChart3, Users, Zap } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl -top-48 -left-48 animate-glow-pulse" />
        <div className="absolute w-96 h-96 bg-accent/20 rounded-full blur-3xl -bottom-48 -right-48 animate-glow-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Hero Section */}
        <div className="animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass glow-primary mb-6">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold gradient-text mb-6">
            Napolean
          </h1>
          
          <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Plataforma de Inteligência e Qualidade em Vendas
          </p>

          <Button 
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity glow-primary text-lg px-8 py-6"
          >
            Acessar Plataforma
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="glass p-6 rounded-2xl hover-scale">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 mx-auto">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Metodologia 7 Etapas</h3>
            <p className="text-sm text-muted-foreground">
              Avaliação completa baseada em metodologia comprovada
            </p>
          </div>

          <div className="glass p-6 rounded-2xl hover-scale">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-4 mx-auto">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">Gestão de Equipes</h3>
            <p className="text-sm text-muted-foreground">
              Acompanhe a performance de toda sua equipe
            </p>
          </div>

          <div className="glass p-6 rounded-2xl hover-scale">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 mx-auto">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Análise em Tempo Real</h3>
            <p className="text-sm text-muted-foreground">
              Relatórios instantâneos e insights acionáveis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
