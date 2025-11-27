import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Usuario } from '@/lib/database.types';
import { usuariosService } from '@/lib/supabaseServices';

interface AuthContextType {
  user: Usuario | null;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se há usuário salvo no localStorage
    const userEmail = localStorage.getItem('napolean-user-email');
    if (userEmail) {
      loadUser(userEmail);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUser = async (email: string) => {
    try {
      const usuario = await usuariosService.getByEmail(email);
      setUser(usuario);
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      localStorage.removeItem('napolean-user-email');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string) => {
    const usuario = await usuariosService.getByEmail(email);
    if (usuario) {
      setUser(usuario);
      localStorage.setItem('napolean-user-email', email);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('napolean-user-email');
    window.location.href = '/';
  };

  const refreshUser = async () => {
    if (user?.email) {
      await loadUser(user.email);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

