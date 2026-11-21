import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetUsers, getGetUsersQueryKey } from '../../api/endpoints/users/users';
import { shouldForceLogout } from '../../lib/authState';
import { clearOutletAccessCache } from '../../lib/roles';

export interface User {
  id: number;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  deposit: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const CACHED_USER_KEY = 'pos_auth_user';

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

/**
 * Checks if a token exists in localStorage.
 * Used by route guards (beforeLoad) which run BEFORE React renders,
 * so we can't rely on React state there — only on localStorage directly.
 */
export function hasToken(): boolean {
  return !!localStorage.getItem('token');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [cachedUser, setCachedUser] = useState<User | null>(() => readCachedUser());
  const queryClient = useQueryClient();

  const { data: userResponse, isLoading, isError, error } = useGetUsers({
    query: { enabled: !!token, retry: false, staleTime: 5 * 60 * 1000 },
  });

  const fetchedUser = useMemo<User | null>(() => {
    if (!userResponse?.data) return null;
    if ('data' in userResponse.data) {
      return userResponse.data.data as User;
    }
    return null;
  }, [userResponse]);

  useEffect(() => {
    if (!fetchedUser) return;
    setCachedUser(fetchedUser);
    try {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(fetchedUser));
    } catch {
      // Storage is best-effort.
    }
  }, [fetchedUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem(CACHED_USER_KEY);
    clearOutletAccessCache();
    setToken(null);
    setCachedUser(null);
    // Clear all React Query cache so stale user data doesn't persist.
    queryClient.removeQueries({ queryKey: getGetUsersQueryKey() });
  }, [queryClient]);

  const errorStatus = (error as unknown as { status?: number } | null)?.status;
  const forceLogout = shouldForceLogout(isError, errorStatus, !!cachedUser);

  useEffect(() => {
    if (forceLogout) {
      logout();
    }
  }, [forceLogout, logout]);

  const login = useCallback(
    (newToken: string) => {
      localStorage.setItem('token', newToken);
      setToken(newToken);
      // Invalidate the user query so it refetches with the new token.
      queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
    },
    [queryClient],
  );

  const user = fetchedUser ?? cachedUser;
  const authFailed = forceLogout;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token && !!user && !authFailed,
        isLoading: !!token && isLoading && !cachedUser,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
