import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "wouter";
import {
  useGetDailySummary,
  getGetDailySummaryQueryKey,
  useGetSpendingTips,
  getGetSpendingTipsQueryKey,
  useGetSpendingStats,
  getGetSpendingStatsQueryKey,
  useGetPreferences,
  getGetPreferencesQueryKey,
  useUpdatePreferences,
  useGetSafeToSpend,
  getGetSafeToSpendQueryKey,
  type SafeToSpend,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { localDateKey, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SummarySkeleton } from "@/components/Skeletons";
import { Flame, Lightbulb, TrendingDown, ShieldAlert, CalendarClock, X, Wallet, ChevronDown, ArrowRight, AlertTriangle } from "lucide-react";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { StatCards } from "@/components/StatCards";
import { CountUp } from "@/components/CountUp";
import { useCurrency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";
import { useT, categoryLabel } from "@/lib/i18n";

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

  const { data: stats } = useGetSpendingStats(
    { date: todayKey },
    {
      query: {
        queryKey: getGetSpendingStatsQueryKey({ date: todayKey }),
        refetchInterval: 60_000,
      },
    }
  );

  const { format } = useCurrency();
  const t = useT();

  // Dismissal is stored in server-side preferences so it follows the
  // account across devices. Local state hides the prompt instantly.
  const queryClient = useQueryClient();
  const { data: prefs } = useGetPreferences({
    query: { queryKey: getGetPreferencesQueryKey() },
  });
  const updatePreferences = useUpdatePreferences();
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const dismissPaydayPrompt = () => {
    setDismissedLocally(true);
    if (!prefs) return;
    updatePreferences.mutate(
      {
        data: {
          currency: prefs.currency,
          alertThreshold: prefs.alertThreshold,
          paydayPromptDismissed: true,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPreferencesQueryKey() });
        },
      }
    );
  };
  const showPaydayPrompt =
    !!stats &&
    !stats.cycleAnchored &&
    !!prefs &&
    !prefs.paydayPromptDismissed &&
    !dismissedLocally;

  const { data: safe, isLoading: loadingSafe } = useGetSafeToSpend(
    { date: todayKey },
    {
      query: {
        queryKey: getGetSafeToSpendQueryKey({ date: todayKey }),
        refetchInterval: 60_000,
      },
    }
  );

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
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground mb-2">{t('dashboard.title')}</h1>
          <p className="text-lg text-muted-foreground font-light">{t('dashboard.subtitle')}</p>
        </div>
        <AddExpenseDialog />
      </div>

      <StatCards />

      {showPaydayPrompt && (
        <div
          className="relative p-6 rounded-3xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm"
          data-testid="payday-prompt"
        >
          <div className="w-12 h-12 shrink-0 bg-background rounded-2xl flex items-center justify-center shadow-sm">
            <CalendarClock className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-serif font-semibold text-lg text-foreground mb-1">
              {t('dashboard.paydayPrompt.title')}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('dashboard.paydayPrompt.desc')}
            </p>
          </div>
          <Link href="/budget">
            <Button className="rounded-full px-6 shrink-0" data-testid="payday-prompt-link">
              {t('dashboard.paydayPrompt.cta')}
            </Button>
          </Link>
          <button
            type="button"
            onClick={dismissPaydayPrompt}
            aria-label={t('dashboard.paydayPrompt.dismiss')}
            className="absolute top-3 end-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            data-testid="payday-prompt-dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {stats && (
        <Card className="bg-card border-card-border/60 shadow-sm rounded-3xl overflow-hidden relative" data-testid="cycle-card">
          <div className="absolute top-0 end-0 w-48 h-48 bg-primary/5 rounded-bl-full rtl:rounded-bl-none rtl:rounded-br-full pointer-events-none" />
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <CalendarClock className="w-5 h-5 text-primary" />
              <span className="text-sm font-sans font-semibold text-muted-foreground tracking-widest uppercase">
                {stats.cycleAnchored ? t('dashboard.cycle.thisCycle') : t('dashboard.cycle.thisMonth')}
              </span>
              {stats.cycleAnchored && stats.daysUntilPayday !== null && (
                <span className="ms-auto text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {stats.daysUntilPayday === 1
                    ? t('dashboard.cycle.daysToPayday', { days: stats.daysUntilPayday })
                    : t('dashboard.cycle.daysToPaydayPlural', { days: stats.daysUntilPayday })}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{t('dashboard.cycle.spentSoFar')}</div>
                <div className="font-serif text-2xl font-bold tracking-tight text-foreground">{format(stats.monthToDate)}</div>
                <div className={cn("text-xs mt-1 font-medium", stats.monthPercentUsed >= 90 ? "text-destructive" : "text-muted-foreground")}>
                  {t('dashboard.cycle.percentOf', { percent: stats.monthPercentUsed, amount: format(stats.monthlyLimit) })}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{t('dashboard.cycle.projected')}</div>
                <div className={cn("font-serif text-2xl font-bold tracking-tight", stats.projectedMonthEnd > stats.monthlyLimit ? "text-destructive" : "text-foreground")}>
                  {format(stats.projectedMonthEnd)}
                </div>
                <div className="text-xs mt-1 font-medium text-muted-foreground">
                  {stats.cycleAnchored ? t('dashboard.cycle.byPayday') : t('dashboard.cycle.byMonthEnd')}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{t('dashboard.cycle.stillCommitted')}</div>
                <div className="font-serif text-2xl font-bold tracking-tight text-foreground">{format(stats.committedRemaining)}</div>
                <div className="text-xs mt-1 font-medium text-muted-foreground">
                  {t('dashboard.cycle.ofObligations', { amount: format(stats.committedTotal) })}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                  {stats.cycleAnchored ? t('dashboard.cycle.salary') : t('dashboard.cycle.daysElapsed')}
                </div>
                <div className="font-serif text-2xl font-bold tracking-tight text-foreground">
                  {stats.cycleAnchored && stats.salaryAmount !== null
                    ? format(stats.salaryAmount)
                    : `${stats.daysElapsed} / ${stats.daysInMonth}`}
                </div>
                <div className="text-xs mt-1 font-medium text-muted-foreground">
                  {stats.cycleAnchored
                    ? t('dashboard.cycle.dayOf', { current: stats.daysElapsed, total: stats.daysInMonth })
                    : t('dashboard.cycle.ofWindow')}
                </div>
              </div>
            </div>
            {stats.upcomingObligations.length > 0 && (
              <div className="mt-6 pt-5 border-t border-border/50">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">{stats.cycleAnchored ? t('dashboard.cycle.dueBeforePayday') : t('dashboard.cycle.dueBeforeMonthEnd')}</div>
                <div className="flex flex-wrap gap-2">
                  {stats.upcomingObligations.slice(0, 4).map((o) => (
                    <span key={`${o.recurringId}-${o.date}`} className="text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full">
                      {o.description} · {format(o.amount)} · {o.date.slice(5)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <SafeToSpendCard safe={safe} loading={loadingSafe} format={format} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          {loadingSummary || !summary ? (
            <SummarySkeleton />
          ) : (
            <Card className="bg-card border-card-border/60 shadow-sm rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 end-0 w-64 h-64 bg-primary/5 rounded-bl-full rtl:rounded-bl-none rtl:rounded-br-full pointer-events-none" />
              <CardHeader className="pb-2 pt-8 px-8">
                <CardTitle className="text-sm font-sans font-semibold text-muted-foreground tracking-widest uppercase">{t('dashboard.todaysBurn')}</CardTitle>
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
                        ? t('dashboard.overLimit', { amount: format(summary.totalSpent - summary.dailyLimit) })
                        : t('dashboard.leftToSpend', { amount: format(summary.remaining) })}
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
              <h3 className="text-xl font-serif font-semibold tracking-tight text-foreground">{t('dashboard.categoriesToday')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {summary.categories.map((cat) => (
                  <div key={cat.category} className="group p-5 rounded-2xl bg-card border border-card-border/60 shadow-sm hover-elevate flex items-center justify-between transition-all hover:border-primary/30">
                    <div>
                      <div className="font-medium text-foreground text-lg mb-1">{categoryLabel(t, cat.category)}</div>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{cat.count} {cat.count !== 1 ? t('dashboard.transactions') : t('dashboard.transaction')}</div>
                    </div>
                    <div className="text-end">
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
            <h3 className="text-xl font-serif font-semibold tracking-tight text-foreground">{t('dashboard.insights')}</h3>
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
                <h4 className="font-serif font-semibold text-lg mb-2">{t('dashboard.quietTitle')}</h4>
                <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">{t('dashboard.quietDesc')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SafeToSpendCard({
  safe,
  loading,
  format,
}: {
  safe: SafeToSpend | undefined;
  loading: boolean;
  format: (n: number) => string;
}) {
  const [showMath, setShowMath] = useState(false);

  if (loading || !safe) {
    return <Skeleton className="h-40 rounded-3xl" />;
  }

  // Not configured — friendly setup state linking to Budget.
  if (!safe.configured) {
    return (
      <Card className="bg-card border-card-border/60 shadow-sm rounded-3xl overflow-hidden relative" data-testid="card-safe-to-spend-setup">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full pointer-events-none" />
        <CardContent className="p-8 flex flex-col sm:flex-row sm:items-center gap-6 relative z-10">
          <div className="w-14 h-14 shrink-0 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Wallet className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-serif font-bold tracking-tight text-foreground mb-1">Safe to spend before payday</h3>
            <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
              Tell Ember your salary and payday and we'll show a verified number you can spend before the next paycheck — with the math.
            </p>
          </div>
          <Link href="/budget" className="shrink-0">
            <Button className="h-14 gap-2 px-6 rounded-full shadow-lg shadow-primary/20 hover-elevate text-lg transition-all" data-testid="button-setup-safe-to-spend">
              Set your salary and payday
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const negative = (safe.safeToSpend ?? 0) < 0;
  const days = safe.daysUntilPayday ?? 0;

  return (
    <Card
      className={cn(
        "shadow-sm rounded-3xl overflow-hidden relative",
        negative ? "bg-destructive/5 border-destructive/30" : "bg-card border-card-border/60"
      )}
      data-testid="card-safe-to-spend"
    >
      <div className={cn("absolute top-0 right-0 w-72 h-72 rounded-bl-full pointer-events-none", negative ? "bg-destructive/10" : "bg-primary/5")} />
      <CardHeader className="pb-2 pt-8 px-8 relative z-10">
        <CardTitle className="flex items-center gap-2 text-sm font-sans font-semibold text-muted-foreground tracking-widest uppercase">
          {negative ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Wallet className="w-4 h-4 text-primary" />}
          Safe to spend before payday
        </CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <CountUp
                value={safe.safeToSpend ?? 0}
                format={format}
                className={cn(
                  "text-6xl font-serif tracking-tighter font-bold",
                  negative ? "text-destructive" : "text-foreground"
                )}
              />
            </div>
            {safe.nextPayday && (
              <p className="text-lg text-muted-foreground font-light">
                until {formatDate(safe.nextPayday)} · {days} day{days === 1 ? "" : "s"}
              </p>
            )}
            {negative && (
              <p className="text-sm text-destructive font-semibold mt-2">
                You're over your cushion — ease off before payday.
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">Per day</div>
            <div className="font-serif text-3xl font-bold tracking-tight text-foreground">
              {format(safe.safePerDay ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">a day until payday</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMath((v) => !v)}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
          data-testid="button-show-math"
          aria-expanded={showMath}
        >
          Show the math
          <ChevronDown className={cn("w-4 h-4 transition-transform", showMath && "rotate-180")} />
        </button>

        {showMath && (
          <div className="mt-4 p-6 rounded-2xl bg-background/60 border border-border/60 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="safe-to-spend-math">
            <MathRow
              label={
                <>
                  Salary
                  {safe.cycleStart && (
                    <span className="text-muted-foreground font-normal"> · received {formatDate(safe.cycleStart)}</span>
                  )}
                </>
              }
              value={format(safe.salary ?? 0)}
              emphasize
            />
            <MathRow label="Spent this cycle" value={`− ${format(safe.spentThisCycle)}`} negative />

            {safe.upcomingCommitments.length > 0 && (
              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Upcoming commitments</div>
                {safe.upcomingCommitments.map((c, i) => (
                  <MathRow
                    key={`${c.description}-${c.dueDate}-${i}`}
                    label={
                      <>
                        {c.description}
                        <span className="text-muted-foreground font-normal"> · due {formatDate(c.dueDate)}</span>
                      </>
                    }
                    value={`− ${format(c.amount)}`}
                    negative
                    indent
                  />
                ))}
                <MathRow label="Commitments total" value={`− ${format(safe.upcomingCommitmentsTotal)}`} negative subtle />
              </div>
            )}

            {safe.goalBuffers.length > 0 && (
              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Goal buffers</div>
                {safe.goalBuffers.map((g, i) => (
                  <MathRow
                    key={`${g.name}-${i}`}
                    label={
                      <>
                        {g.name}
                        {g.deadline && (
                          <span className="text-muted-foreground font-normal"> · by {formatDate(g.deadline)}</span>
                        )}
                      </>
                    }
                    value={`− ${format(g.amount)}`}
                    negative
                    indent
                  />
                ))}
                <MathRow label="Goal buffers total" value={`− ${format(safe.goalBuffersTotal)}`} negative subtle />
              </div>
            )}

            <div className="pt-3 border-t border-border">
              <MathRow
                label="Safe to spend"
                value={format(safe.safeToSpend ?? 0)}
                emphasize
                negative={negative}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MathRow({
  label,
  value,
  emphasize,
  negative,
  subtle,
  indent,
}: {
  label: ReactNode;
  value: string;
  emphasize?: boolean;
  negative?: boolean;
  subtle?: boolean;
  indent?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", indent && "pl-4")}>
      <span
        className={cn(
          "text-sm",
          emphasize ? "font-semibold text-foreground" : "text-foreground",
          subtle && "text-muted-foreground font-medium"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-serif tabular-nums shrink-0",
          emphasize ? "text-lg font-bold" : "text-base font-semibold",
          negative ? "text-destructive" : emphasize ? "text-foreground" : "text-foreground",
          subtle && "text-sm font-semibold"
        )}
      >
        {value}
      </span>
    </div>
  );
}
