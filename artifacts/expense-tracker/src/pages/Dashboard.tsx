import { useGetDailySummary, getGetDailySummaryQueryKey, useGetSpendingTips, getGetSpendingTipsQueryKey } from "@workspace/api-client-react";
import { localDateKey } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SummarySkeleton } from "@/components/Skeletons";
import { Flame, Lightbulb, TrendingDown, ShieldAlert } from "lucide-react";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { StatCards } from "@/components/StatCards";
import { CountUp } from "@/components/CountUp";
import { useCurrency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const todayKey = localDateKey();
  const { data: summary, isLoading: loadingSummary } = useGetDailySummary(
    { date: todayKey },
    {
      query: {
        queryKey: getGetDailySummaryQueryKey({ date: todayKey }),
        refetchInterval: 60_000,
      },
    }
  );

  const { data: insights, isLoading: loadingInsights } = useGetSpendingTips(
    { date: todayKey },
    {
      query: {
        queryKey: getGetSpendingTipsQueryKey({ date: todayKey }),
        refetchInterval: 60_000,
      },
    }
  );

  const { format } = useCurrency();

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <ShieldAlert className="h-5 w-5" />;
      case "warning":
        return <TrendingDown className="h-5 w-5" />;
      case "positive":
        return <Flame className="h-5 w-5" />;
      case "tip":
      default:
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  const getAlertStyle = (type: string) => {
    switch (type) {
      case "alert":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "warning":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "positive":
        return "bg-primary/10 text-primary border-primary/20";
      case "tip":
      default:
        return "bg-secondary text-secondary-foreground border-border";
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-4 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground mb-2">Overview</h1>
          <p className="text-lg text-muted-foreground font-light">Your money's temperature today.</p>
        </div>
        <AddExpenseDialog />
      </div>

      <StatCards />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          {loadingSummary || !summary ? (
            <SummarySkeleton />
          ) : (
            <Card className="bg-card border-card-border/60 shadow-sm rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full pointer-events-none" />
              <CardHeader className="pb-2 pt-8 px-8">
                <CardTitle className="text-sm font-sans font-semibold text-muted-foreground tracking-widest uppercase">Today's Burn</CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="mb-8 flex items-baseline gap-3">
                  <CountUp
                    value={summary.totalSpent}
                    format={format}
                    className="text-6xl font-serif tracking-tighter text-foreground font-bold"
                  />
                  <span className="text-xl text-muted-foreground font-light">/ {format(summary.dailyLimit)}</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span className={cn("transition-colors", summary.totalSpent > summary.dailyLimit ? "text-destructive font-bold" : "text-foreground")}>
                      {summary.totalSpent > summary.dailyLimit
                        ? `${format(summary.totalSpent - summary.dailyLimit)} over your limit`
                        : `${format(summary.remaining)} left to spend safely`}
                    </span>
                    <span className="text-muted-foreground bg-secondary px-2 py-1 rounded-md text-xs font-bold">{Math.round(summary.percentUsed)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(summary.percentUsed, 100)} 
                    className={cn("h-3 rounded-full bg-secondary", summary.percentUsed >= 100 ? "[&>div]:bg-destructive" : summary.percentUsed > 80 ? "[&>div]:bg-warning" : "[&>div]:bg-primary")}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {!loadingSummary && summary && summary.categories.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-semibold tracking-tight text-foreground">Categories Today</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {summary.categories.map((cat) => (
                  <div key={cat.category} className="group p-5 rounded-2xl bg-card border border-card-border/60 shadow-sm hover-elevate flex items-center justify-between transition-all hover:border-primary/30">
                    <div>
                      <div className="font-medium text-foreground text-lg mb-1">{cat.category}</div>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{cat.count} transaction{cat.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-serif text-xl font-bold tracking-tight text-foreground">{format(cat.total)}</div>
                      <div className="text-xs text-muted-foreground mt-1 font-medium">{Math.round(cat.percentage)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-serif font-semibold tracking-tight text-foreground">Insights</h3>
          </div>
          
          <div className="space-y-4">
            {!loadingInsights && insights && (insights.alerts.length > 0 || insights.tips.length > 0) && (
              <>
                {insights.alerts.map((alert) => (
                  <div key={alert.id} className={cn("p-5 rounded-2xl border flex gap-4 items-start shadow-sm", getAlertStyle(alert.type))}>
                    <div className="mt-0.5 shrink-0 bg-background/50 p-2 rounded-xl backdrop-blur-sm">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-base mb-1">{alert.title}</h4>
                      <p className="text-sm opacity-90 leading-relaxed">{alert.message}</p>
                    </div>
                  </div>
                ))}
                {insights.tips.slice(0, 2).map((tip) => (
                  <div key={tip.id} className={cn("p-5 rounded-2xl border flex gap-4 items-start shadow-sm", getAlertStyle(tip.type))}>
                    <div className="mt-0.5 shrink-0 bg-background/50 p-2 rounded-xl backdrop-blur-sm">
                      {getAlertIcon(tip.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-base mb-1">{tip.title}</h4>
                      <p className="text-sm opacity-90 leading-relaxed">{tip.message}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {!loadingInsights && (!insights || (insights.alerts.length === 0 && insights.tips.length === 0)) && (
              <div className="p-6 rounded-2xl bg-secondary/50 border border-border text-center flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <Flame className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <h4 className="font-serif font-semibold text-lg mb-2">Quiet on the front</h4>
                <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">Your spending is perfectly aligned with your goals today.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
