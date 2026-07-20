import { useGetSpendingStats, getGetSpendingStatsQueryKey } from "@workspace/api-client-react";
import { CountUp } from "@/components/CountUp";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/use-currency";
import { cn, localDateKey } from "@/lib/utils";
import { CalendarDays, Flame, Gauge, TrendingUp } from "lucide-react";
import { useT } from "@/lib/i18n";

export function StatCards() {
  const todayKey = localDateKey();
  const { data: stats, isLoading } = useGetSpendingStats(
    { date: todayKey },
    {
      query: {
        queryKey: getGetSpendingStatsQueryKey({ date: todayKey }),
        refetchInterval: 60_000,
      },
    },
  );
  const { format } = useCurrency();
  const t = useT();

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
    );
  }

  const overPace = stats.projectedMonthEnd > stats.monthlyLimit;

  const cards = [
    {
      key: "mtd",
      label: t("stats.monthSoFar"),
      icon: <CalendarDays className="w-4 h-4" />,
      value: <CountUp value={stats.monthToDate} format={format} />,
      sub: t("stats.ofCeiling", { percent: stats.monthPercentUsed }),
      subClass: stats.monthPercentUsed >= 90 ? "text-destructive font-semibold" : "",
    },
    {
      key: "projection",
      label: t("stats.projectedMonthEnd"),
      icon: <TrendingUp className="w-4 h-4" />,
      value: <CountUp value={stats.projectedMonthEnd} format={format} />,
      sub: overPace ? t("stats.onPaceExceed") : t("stats.onPaceUnder"),
      subClass: overPace ? "text-destructive font-semibold" : "text-primary font-medium",
    },
    {
      key: "streak",
      label: t("stats.underBudgetStreak"),
      icon: (
        <Flame className={cn("w-4 h-4", stats.underBudgetStreak >= 3 && "fill-current")} />
      ),
      value: (
        <span>
          <CountUp value={stats.underBudgetStreak} />
          <span className="text-xl text-muted-foreground font-light ms-2">
            {stats.underBudgetStreak === 1 ? t("stats.day") : t("stats.days")}
          </span>
        </span>
      ),
      sub: t("stats.atOrUnder"),
      subClass: "",
    },
    {
      key: "avg",
      label: t("stats.avgPerDay"),
      icon: <Gauge className="w-4 h-4" />,
      value: <CountUp value={stats.avgPerDay} format={format} />,
      sub: t("stats.acrossDays", {
        days: stats.daysElapsed,
        unit: stats.daysElapsed === 1 ? t("stats.day") : t("stats.days"),
      }),
      subClass: "",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stat-cards">
      {cards.map((card) => (
        <div
          key={card.key}
          className="p-5 lg:p-6 rounded-3xl bg-card border border-card-border/60 shadow-sm relative overflow-hidden"
          data-testid={`stat-${card.key}`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <span className="text-primary">{card.icon}</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest">
              {card.label}
            </span>
          </div>
          <div className="text-2xl lg:text-3xl font-serif font-bold tracking-tight text-foreground">
            {card.value}
          </div>
          <p className={cn("text-xs text-muted-foreground mt-2", card.subClass)}>{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
