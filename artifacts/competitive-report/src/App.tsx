import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, Link } from 'wouter';
import { Cover } from '@/components/report/Cover';
import { Recommendations } from '@/components/report/Recommendations';
import { Landscape } from '@/components/report/Landscape';
import { FeatureMatrix } from '@/components/report/FeatureMatrix';
import { PositioningMap } from '@/components/report/PositioningMap';
import { WhiteSpace } from '@/components/report/WhiteSpace';
import { Scorecard } from '@/components/report/Scorecard';
import { ActionPlan } from '@/components/report/ActionPlan';
import { Sources } from '@/components/report/Sources';

const queryClient = new QueryClient();

function ReportNav() {
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/90 backdrop-blur-md border border-border rounded-full px-6 py-3 shadow-lg flex items-center gap-6 overflow-x-auto max-w-[90vw] md:max-w-none no-scrollbar">
      {[
        { id: '#recommendations', label: 'Summary' },
        { id: '#landscape', label: 'Field' },
        { id: '#matrix', label: 'Matrix' },
        { id: '#positioning', label: 'Map' },
        { id: '#white-space', label: 'Gap' },
        { id: '#scorecard', label: 'Scorecard' },
        { id: '#action-plan', label: 'Plan' },
      ].map(link => (
        <a 
          key={link.id} 
          href={link.id}
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

function Report() {
  return (
    <main className="bg-background min-h-screen text-foreground selection:bg-primary/20">
      <Cover />
      <Recommendations />
      <Landscape />
      <FeatureMatrix />
      <PositioningMap />
      <WhiteSpace />
      <Scorecard />
      <ActionPlan />
      <Sources />
      <ReportNav />
    </main>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold font-serif mb-4">404 - Not Found</h1>
        <Link href="/" className="text-primary hover:underline">
          Return to Report
        </Link>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Report} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
