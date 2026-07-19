import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Layout } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Expenses from '@/pages/Expenses';
import Budget from '@/pages/Budget';

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
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h1 className="text-6xl font-serif font-bold text-muted-foreground mb-4">404</h1>
      <h2 className="text-2xl font-serif text-foreground mb-2">Page Not Found</h2>
      <p className="text-muted-foreground">The page you are looking for doesn't exist or has been moved.</p>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        {/* Make sure toaster is correctly imported if from our UI components, 
            or adjust if it's using sonner etc. We'll assume the generated code uses standard shadcn toaster */}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;