import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { DeviceEventEmitter } from 'react-native';
import { login as apiLogin, me } from '../api/auth';
import { clearToken, AUTH_UNAUTHORIZED_EVENT, setToken } from '../api/client';
import { ChauffeurProfil } from '../types/api';

interface AuthState {
  chauffeur: ChauffeurProfil | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    chauffeur: null,
    token: null,
    loading: true,
  });

  // Évite le double-fire du listener en cas de re-render
  const logoutRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const logout = useCallback(async () => {
    await clearToken();
    setState({ chauffeur: null, token: null, loading: false });
  }, []);

  logoutRef.current = logout;

  const reload = useCallback(async () => {
    try {
      const profil = await me();
      setState(prev => ({ ...prev, chauffeur: profil, loading: false }));
    } catch (_err) {
      await logout();
    }
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    await setToken(response.token);
    const profil = await me();
    setState({ chauffeur: profil, token: response.token, loading: false });
  }, []);

  // Hydratation au démarrage
  useEffect(() => {
    reload();
  }, [reload]);

  // Écoute les 401 émis par le client HTTP
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(AUTH_UNAUTHORIZED_EVENT, () => {
      logoutRef.current?.();
    });
    return () => sub.remove();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, reload }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
