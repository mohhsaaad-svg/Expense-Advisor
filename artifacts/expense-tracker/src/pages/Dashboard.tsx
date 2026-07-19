import { useGetDailySummary, getGetDailySummaryQueryKey, useGetSpendingTips, getGetSpendingTipsQueryKey, useGetWeeklySummary, getGetWeeklySummaryQueryKey } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SummarySkeleton } from "@/components/Skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Lightbulb, TrendingDown, Info, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDailySummary(
    {}, 
    { query: { queryKey: getGetDailySummaryQueryKey() } }
  );

  const { data: insights, isLoading: loadingInsights } = useGetSpendingTips({
    query: { queryKey: getGetSpendingTipsQueryKey() }
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <AlertCircle className="h-5 w-5" />;
      case "warning":
        return <TrendingDown className="h-5 w-5" />;
      case "positive":
        return <CheckCircle2 className="h-5 w-5" />;
      case "tip":
      default:
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case "alert":
        return "destructive";
      case "warning":
        return "warning";
      case "positive":
        return "positive";
      case "tip":
      default:
        return "tip";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Here is what is happening with your money today.</p>
        </div>
        <AddExpenseDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loadingSummary || !summary ? (
          <SummarySkeleton />
        ) : (
          <Card className="bg-card border-card-border overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-sans font-medium text-muted-foreground uppercase tracking-wider">Today's Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-5xl font-serif tracking-tighter text-foreground">{formatCurrency(summary.totalSpent)}</span>
                <span className="text-muted-foreground ml-2">/ {formatCurrency(summary.dailyLimit)}</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium">
                  <span className={summary.percentUsed >= 100 ? "text-destructive" : "text-foreground"}>
                    {summary.percentUsed >= 100 ? "Budget exceeded" : `${formatCurrency(summary.remaining)} remaining`}
                  </span>
                  <span className="text-muted-foreground">{Math.round(summary.percentUsed)}%</span>
                </div>
                <Progress 
                  value={Math.min(summary.percentUsed, 100)} 
                  className={summary.percentUsed >= 100 ? "[&>div]:bg-destructive" : summary.percentUsed > 80 ? "[&>div]:bg-orange-500" : ""}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6 flex flex-col">
          {!loadingInsights && insights && (insights.alerts.length > 0 || insights.tips.length > 0) && (
            <div className="space-y-4 flex-1">
              {insights.alerts.map((alert) => (
                <Alert key={alert.id} variant={getAlertVariant(alert.type) as any}>
                  {getAlertIcon(alert.type)}
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              ))}
              {insights.tips.slice(0, 1).map((tip) => (
                <Alert key={tip.id} variant={getAlertVariant(tip.type) as any}>
                  {getAlertIcon(tip.type)}
                  <AlertTitle>{tip.title}</AlertTitle>
                  <AlertDescription>{tip.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          {!loadingInsights && (!insights || (insights.alerts.length === 0 && insights.tips.length === 0)) && (
            <Alert variant="tip">
              <Info className="h-5 w-5" />
              <AlertTitle>All good!</AlertTitle>
              <AlertDescription>Your spending looks healthy today. Keep it up!</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {!loadingSummary && summary && summary.categories.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-serif tracking-tight text-foreground">Categories Today</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {summary.categories.map((cat) => (
              <Card key={cat.category} className="shadow-sm border-card-border/60 hover-elevate">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{cat.category}</div>
                    <div className="text-sm text-muted-foreground">{cat.count} transaction{cat.count !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-lg tracking-tight">{formatCurrency(cat.total)}</div>
                    <div className="text-xs text-muted-foreground">{Math.round(cat.percentage)}%</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}