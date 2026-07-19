import { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '@workspace/api-client-react';

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

function getBasePath() {
  return import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';
}

function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Navigate to an auth URL. OAuth/OIDC pages (and federated providers like
 * Google) refuse to render inside iframes, so when the app is embedded
 * (e.g. the Replit preview pane) the flow must run in a top-level tab.
 */
function navigateForAuth(url: string) {
  if (isEmbedded()) {
    const popup = window.open(url, '_blank', 'noopener');
    if (popup) return;
  }
  window.location.href = url;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = () => {
      fetch('/api/auth/user', { credentials: 'include' })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<{ user: AuthUser | null }>;
        })
        .then((data) => {
          if (!cancelled) {
            setUser(data.user ?? null);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUser(null);
            setIsLoading(false);
          }
        });
    };

    fetchUser();

    // When login happens in another tab (embedded flow), re-check auth
    // state whenever this document becomes visible/focused again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchUser();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const login = useCallback(() => {
    const base = getBasePath();
    navigateForAuth(`/api/login?returnTo=${encodeURIComponent(base)}`);
  }, []);

  const logout = useCallback(() => {
    const base = getBasePath();
    navigateForAuth(`/api/logout?returnTo=${encodeURIComponent(base)}`);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
