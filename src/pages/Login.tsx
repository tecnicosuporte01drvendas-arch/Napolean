import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Mail, KeyRound, Loader2, CheckCircle2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usuariosService, codigosVerificacaoService } from '@/lib/supabaseServices';
import { useCreateCode, useValidateCode } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { emailService } from '@/lib/emailService';

const Login = () => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const createCodeMutation = useCreateCode();
  const validateCodeMutation = useValidateCode();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.includes('@')) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Verificar se usuário existe (NÃO criar se não existir)
      const usuario = await usuariosService.getByEmail(email);
      
      if (!usuario) {
        toast({
          title: 'Email não cadastrado',
          description: 'Este email não está cadastrado no sistema. Entre em contato com o administrador.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Gerar código de verificação
      const codigo = codigosVerificacaoService.generateCode();
      const expiraEm = new Date();
      expiraEm.setMinutes(expiraEm.getMinutes() + 15); // 15 minutos de validade

      const codigoCriado = await createCodeMutation.mutateAsync({
        email_usuario: email,
        codigo,
        expira_em: expiraEm.toISOString(),
      });

      if (codigoCriado) {
        // Enviar código por email
        const emailEnviado = await emailService.sendVerificationCode(email, codigo);
        
        if (emailEnviado) {
          setShowSuccessCard(true);
          setStep('otp');
        } else {
          // Fallback: mostrar código no console se email falhar (desenvolvimento)
          console.log('Código de verificação (email falhou):', codigo);
          toast({
            title: 'Código gerado',
            description: `Código: ${codigo} (verifique o console se o email não chegou)`,
            variant: 'default',
          });
          setStep('otp');
        }
      } else {
        throw new Error('Erro ao gerar código');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o código. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast({
        title: 'Código inválido',
        description: 'Por favor, insira um código de 6 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const isValid = await validateCodeMutation.mutateAsync({ email, codigo: otp });

      if (isValid) {
        await login(email);
        
        toast({
          title: 'Bem-vindo!',
          description: 'Login realizado com sucesso.',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Código inválido',
          description: 'O código inserido está incorreto ou expirado.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro na validação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível validar o código. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl -top-48 -left-48 animate-glow-pulse" />
        <div className="absolute w-96 h-96 bg-accent/20 rounded-full blur-3xl -bottom-48 -right-48 animate-glow-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass glow-primary mb-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-1">Napolean</h1>
          <p className="text-muted-foreground">Plataforma de Inteligência em Vendas</p>
        </div>

        {/* Login Form */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email Corporativo
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50 border-white/10 focus:border-primary transition-colors"
                />
                <p className="text-xs text-muted-foreground">
                  Acesso restrito a usuários cadastrados
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity glow-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>
            </form>
          ) : (
            <>
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-foreground flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-accent" />
                    Código de Verificação
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="bg-background/50 border-white/10 focus:border-accent transition-colors text-center text-2xl tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground">
                    Código enviado para {email}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity glow-accent"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      'Validar Código'
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => setStep('email')}
                  >
                    Voltar
                  </Button>
                </div>
              </form>
              
              {/* Card de Sucesso - Código Enviado */}
              {showSuccessCard && (
                <Card className="glass-strong rounded-2xl p-4 shadow-2xl mt-3 border-accent/50 bg-accent/20 animate-fade-in">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-foreground mb-0.5">
                          Código enviado!
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Um código foi enviado para <span className="font-medium text-foreground">{email}</span>. Verifique sua caixa de entrada.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 hover:bg-accent/10"
                      onClick={() => setShowSuccessCard(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Powered by Napolean Intelligence Platform
        </p>
      </div>
    </div>
  );
};

export default Login;
