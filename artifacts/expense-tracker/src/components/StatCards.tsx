import { useGetSpendingStats, getGetSpendingStatsQueryKey } from "@workspace/api-client-react";
import { CountUp } from "@/components/CountUp";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/use-currency";
import { cn, localDateKey } from "@/lib/utils";
import { CalendarDays, Flame, Gauge, TrendingUp } from "lucide-react";

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
      label: "Month so far",
      icon: <CalendarDays className="w-4 h-4" />,
      value: <CountUp value={stats.monthToDate} format={format} />,
      sub: `${stats.monthPercentUsed}% of your ceiling`,
      subClass: stats.monthPercentUsed >= 90 ? "text-destructive font-semibold" : "",
    },
    {
      key: "projection",
      label: "Projected month-end",
      icon: <TrendingUp className="w-4 h-4" />,
      value: <CountUp value={stats.projectedMonthEnd} format={format} />,
      sub: overPace ? "On pace to exceed your ceiling" : "On pace to stay under",
      subClass: overPace ? "text-destructive font-semibold" : "text-primary font-medium",
    },
    {
      key: "streak",
      label: "Under-budget streak",
      icon: (
        <Flame className={cn("w-4 h-4", stats.underBudgetStreak >= 3 && "fill-current")} />
      ),
      value: (
        <span>
          <CountUp value={stats.underBudgetStreak} />
          <span className="text-xl text-muted-foreground font-light ml-2">
            day{stats.underBudgetStreak === 1 ? "" : "s"}
          </span>
        </span>
      ),
      sub: "at or under your daily limit",
      subClass: "",
    },
    {
      key: "avg",
      label: "Average per day",
      icon: <Gauge className="w-4 h-4" />,
      value: <CountUp value={stats.avgPerDay} format={format} />,
      sub: `across ${stats.daysElapsed} day${stats.daysElapsed === 1 ? "" : "s"} this month`,
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
