import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useAuth } from '@workspace/replit-auth-web';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Expenses from '@/pages/Expenses';
import Budget from '@/pages/Budget';
import { Flame } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <h1 className="text-8xl font-serif font-bold text-primary mb-6">404</h1>
      <h2 className="text-3xl font-serif text-foreground mb-4">Page Not Found</h2>
      <p className="text-muted-foreground text-lg max-w-md">The page you are looking for has been moved or no longer exists.</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/budget" component={Budget} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthGate() {
  const { user, isLoading, isAuthenticated, login } = useAuth();

  // With embedded (iframe) login/logout the page is never reloaded, so cached
  // user-scoped queries would survive a session change. Clear them whenever
  // the authenticated identity actually changes.
  const lastUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const id = user?.id ?? null;
    if (lastUserId.current !== undefined && lastUserId.current !== id) {
      queryClient.clear();
    }
    lastUserId.current = id;
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Flame className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 relative z-10">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <span className="font-serif font-bold text-2xl tracking-tight text-foreground">
                Ember
              </span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground leading-[1.1] mb-6 tracking-tight">
              Keep your spending from catching fire.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed font-light">
              Small daily expenses are like embers: harmless while you keep an eye on them, costly when you don't.
            </p>
            <Button 
              onClick={login} 
              size="lg"
              className="text-lg h-14 px-8 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group"
              data-testid="button-login"
            >
              Sign In to Ember
              <Flame className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
            </Button>
          </div>
        </div>
        <div className="hidden md:block flex-1 bg-secondary relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, var(--color-primary) 0%, transparent 60%)' }}></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 mix-blend-overlay"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl animate-in fade-in duration-1000"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-in fade-in duration-1000 delay-500"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[1px] border-primary/10 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-[1px] border-primary/10 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Router />
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthGate />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;