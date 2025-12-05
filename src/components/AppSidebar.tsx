import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText,
  Sun, 
  Moon, 
  Menu, 
  X,
  ShieldCheck,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

interface AppSidebarProps {
  children: React.ReactNode;
}

const AppSidebar = ({ children }: AppSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();

  const isColaborador =
    user?.perfil_sistema === 'colaborador' || user?.tipo === 'colaborador';

  const isGestor =
    user?.perfil_sistema === 'gestor' || user?.tipo === 'gestor';
  
  const isMasterDevCs =
    user?.perfil_sistema === 'master' ||
    user?.perfil_sistema === 'dev' ||
    user?.perfil_sistema === 'cs';

  const isMaster = user?.perfil_sistema === 'master';
  const isCS = user?.perfil_sistema === 'cs';

  const navItems = isColaborador
    ? [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: FileText, label: 'Nova Análise', path: '/nova-analise' },
      ]
    : isGestor
    ? [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Equipe', path: '/equipe' },
        { icon: FileText, label: 'Nova Análise', path: '/nova-analise' },
      ]
    : [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: isMaster || isCS ? 'Gerenciar Empresas' : 'Equipe', path: '/equipe' },
      ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full glass-strong border-r border-white/10 transition-all duration-300 flex flex-col",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center gap-3 p-4 border-b border-white/10",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-lg gradient-text">Napolean</span>
            )}
          </div>
          
          {/* Close mobile menu */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-white/10"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.label}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 transition-all",
                  isCollapsed && "justify-center px-2",
                  isActive 
                    ? "bg-primary/20 text-primary border border-primary/30 glow-primary" 
                    : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileOpen(false);
                }}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                {!isCollapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10 dark:border-white/10 space-y-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost-sidebar"
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground",
              isCollapsed && "justify-center px-2"
            )}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-5 h-5 text-amber-400" />
                {!isCollapsed && <span>Modo Claro</span>}
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 text-accent" />
                {!isCollapsed && <span>Modo Escuro</span>}
              </>
            )}
          </Button>

          {/* Logout */}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 hover:bg-destructive/10 hover:text-destructive",
              isCollapsed && "justify-center px-2"
            )}
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span>Sair</span>}
          </Button>

          {/* Collapse Toggle (Desktop only) */}
          <Button
            variant="ghost-sidebar"
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground hidden lg:flex",
              isCollapsed && "justify-center px-2"
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <ChevronLeft className={cn(
              "w-5 h-5 transition-transform",
              isCollapsed && "rotate-180"
            )} />
            {!isCollapsed && <span>Recolher</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 overflow-x-hidden min-h-0",
        isCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 glass-strong border-b border-white/10 p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-white/10"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span className="font-bold gradient-text">Napolean</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-white/10"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-accent" />
            )}
          </Button>
        </header>

        {/* Page Content */}
        {children}
      </main>
    </div>
  );
};

export default AppSidebar;
