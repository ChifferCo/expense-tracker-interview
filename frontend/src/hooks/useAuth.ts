import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as authApi from '../api/auth';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        setAuthState({ user, isAuthenticated: true, isLoading: false });
      } catch {
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuthState({ user: data.user, isAuthenticated: true, isLoading: false });
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.register(email, password),
    onSuccess: (data) => {
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuthState({ user: data.user, isAuthenticated: true, isLoading: false });
    },
  });

  const logout = useCallback(() => {
    authApi.logout();
    localStorage.removeItem('user');
    setAuthState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return {
    ...authState,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
  };
}
