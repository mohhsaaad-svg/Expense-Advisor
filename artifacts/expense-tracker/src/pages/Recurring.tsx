import { useEffect, useState } from "react";
import {
  useListRecurringExpenses,
  getListRecurringExpensesQueryKey,
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
  useDeleteRecurringExpense,
  getListExpensesQueryKey,
  getGetDailySummaryQueryKey,
  getGetWeeklySummaryQueryKey,
  getGetSpendingStatsQueryKey,
  getGetSpendingTipsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/CountUp";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { currencySymbol, localDateKey } from "@/lib/utils";
import { nextOccurrence, monthlyEquivalent } from "@/lib/recurrence-ui";
import { useT, categoryLabel, type TranslationKey } from "@/lib/i18n";
import { Repeat, Plus, Pencil, Trash2 } from "lucide-react";
import { CATEGORIES, CATEGORY_ICONS, type Category } from "@/lib/categories";

function CategoryIcon({ category }: { category: string }) {
  const Icon = CATEGORY_ICONS[category as Category];
  return Icon ? <Icon className="w-5 h-5" /> : <Repeat className="w-6 h-6" />;
}

const FREQUENCY_LABEL_KEYS: Record<string, TranslationKey> = {
  daily: "frequency.daily",
  weekly: "frequency.weekly",
  monthly: "frequency.monthly",
  quarterly: "frequency.quarterly",
  yearly: "frequency.yearly",
};

const FREQUENCY_SUFFIX_KEYS: Record<string, TranslationKey> = {
  daily: "frequency.suffix.daily",
  weekly: "frequency.suffix.weekly",
  monthly: "frequency.suffix.monthly",
  quarterly: "frequency.suffix.quarterly",
  yearly: "frequency.suffix.yearly",
};

type RecurringRule = {
  id: number;
  description: string;
  amount: number;
  category: string;
  frequency: string;
  startDate: string;
  active: boolean;
  lastMaterializedDate: string | null;
  createdAt: string;
};

const formSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  startDate: z.string().min(1, "Start date is required"),
});

export default function Recurring() {
  const { data: rules, isLoading } = useListRecurringExpenses({
    query: { queryKey: getListRecurringExpensesQueryKey() },
  });
  const createRule = useCreateRecurringExpense();
  const updateRule = useUpdateRecurringExpense();
  const deleteRule = useDeleteRecurringExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format, currency, formatDate } = useCurrency();
  const t = useT();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);

  const invalidateSpendingData = () => {
    queryClient.invalidateQueries({ queryKey: getListRecurringExpensesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDailySummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetWeeklySummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSpendingStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSpendingTipsQueryKey() });
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: 0,
      category: "",
      frequency: "monthly",
      startDate: localDateKey(),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              description: editing.description,
              amount: editing.amount,
              category: editing.category,
              frequency: (["daily", "weekly", "monthly", "quarterly", "yearly"].includes(editing.frequency)
                ? editing.frequency
                : "monthly") as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
              startDate: editing.startDate,
            }
          : {
              description: "",
              amount: 0,
              category: "",
              frequency: "monthly",
              startDate: localDateKey(),
            },
      );
    }
  }, [open, editing, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const backfilling = values.startDate < localDateKey();
    const opts = {
      onSuccess: () => {
        invalidateSpendingData();
        toast({
          title: editing ? t("toast.ritualUpdated.title") : t("toast.ritualLit.title"),
          description: backfilling && !editing
            ? t("toast.ritualBackfill.desc")
            : t("toast.ritualGoing.desc"),
        });
        setOpen(false);
      },
      onError: () => {
        toast({
          title: t("toast.error.title"),
          description: t("toast.ritualSaveError.desc"),
          variant: "destructive" as const,
        });
      },
    };
    if (editing) {
      updateRule.mutate({ id: editing.id, data: values }, opts);
    } else {
      createRule.mutate({ data: values }, opts);
    }
  };

  const handleToggle = (rule: RecurringRule, active: boolean) => {
    updateRule.mutate(
      { id: rule.id, data: { active } },
      {
        onSuccess: () => {
          invalidateSpendingData();
          toast({
            title: active ? t("toast.ritualResumed.title") : t("toast.ritualPaused.title"),
            description: active
              ? t("toast.ritualResumed.desc")
              : t("toast.ritualPaused.desc"),
          });
        },
      },
    );
  };

  const handleDelete = (rule: RecurringRule) => {
    if (confirm(t("recurring.confirmDelete"))) {
      deleteRule.mutate(
        { id: rule.id },
        {
          onSuccess: () => {
            invalidateSpendingData();
            toast({ title: t("toast.ritualRemoved.title"), description: t("toast.ritualRemoved.desc") });
          },
        },
      );
    }
  };

  const activeRules = (rules ?? []).filter((r) => r.active);
  const committedMonthly = activeRules.reduce(
    (s, r) => s + monthlyEquivalent(r.frequency, r.amount),
    0,
  );
  const todayKey = localDateKey();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-4 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground mb-2">{t('recurring.title')}</h1>
          <p className="text-lg text-muted-foreground font-light">{t('recurring.subtitle')}</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setOpen(true); }}
          className="h-12 gap-2 px-6 rounded-full shadow-lg shadow-primary/20 hover-elevate transition-all font-medium text-base"
          data-testid="button-add-recurring"
        >
          <Plus className="w-5 h-5" /> {t('recurring.add')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </>
          ) : (rules ?? []).length === 0 ? (
            <div className="text-center py-24 bg-card rounded-3xl border border-card-border/60 shadow-sm flex flex-col items-center">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Repeat className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-2xl font-serif font-semibold text-foreground mb-2">{t('recurring.noRituals')}</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                {t('recurring.emptyDesc')}
              </p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => { setEditing(null); setOpen(true); }}
                data-testid="button-add-recurring-empty"
              >
                <Plus className="w-4 h-4 me-2" /> {t('recurring.addFirst')}
              </Button>
            </div>
          ) : (
            (rules ?? []).map((rule) => (
              <div
                key={rule.id}
                className={`group bg-card p-5 rounded-2xl border border-card-border/60 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${rule.active ? "" : "opacity-60"}`}
                data-testid={`recurring-rule-${rule.id}`}
              >
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 shadow-inner group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <CategoryIcon category={rule.category} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-lg text-foreground truncate mb-1" title={rule.description}>
                      {rule.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="font-medium bg-background border-border text-xs px-2.5 py-0.5 rounded-md">
                        {categoryLabel(t, rule.category)}
                      </Badge>
                      <Badge variant="secondary" className="font-medium bg-primary/10 text-primary border-transparent text-xs px-2.5 py-0.5 rounded-md">
                        <Repeat className="w-3 h-3 me-1" />
                        {FREQUENCY_LABEL_KEYS[rule.frequency] ? t(FREQUENCY_LABEL_KEYS[rule.frequency]) : rule.frequency}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium">
                        {rule.active
                          ? t('recurring.next', { date: formatDate(nextOccurrence(rule.frequency, rule.startDate, todayKey)) })
                          : t('recurring.paused')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-5 sm:w-auto w-full border-t sm:border-0 border-border/50 pt-3 sm:pt-0">
                  <div className="text-end">
                    <div className="font-serif text-2xl font-bold tracking-tight text-foreground">
                      {format(rule.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {FREQUENCY_SUFFIX_KEYS[rule.frequency] ? t(FREQUENCY_SUFFIX_KEYS[rule.frequency]) : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={rule.active}
                      onCheckedChange={(checked) => handleToggle(rule, checked)}
                      disabled={updateRule.isPending}
                      data-testid={`switch-active-${rule.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl h-10 w-10"
                      onClick={() => { setEditing(rule); setOpen(true); }}
                      data-testid={`button-edit-recurring-${rule.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-10 w-10"
                      onClick={() => handleDelete(rule)}
                      disabled={deleteRule.isPending}
                      data-testid={`button-delete-recurring-${rule.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-primary/5 border-primary/10 shadow-none rounded-3xl">
            <CardContent className="p-8">
              <h3 className="font-sans font-bold text-xs text-primary uppercase tracking-widest mb-5">{t('recurring.committedMonthly')}</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <CountUp
                  value={committedMonthly}
                  format={format}
                  className="text-4xl font-serif font-bold tracking-tight text-foreground"
                />
                <span className="text-muted-foreground font-light">{t('common.approx')}</span>
              </div>
              <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 flex justify-between items-center">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('recurring.activeRituals')}</span>
                <CountUp value={activeRules.length} className="text-foreground font-serif text-2xl font-bold" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/50 border-secondary-border shadow-none rounded-3xl">
            <CardContent className="p-8 space-y-5">
              <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center shadow-sm">
                <Repeat className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif font-bold text-2xl text-foreground">{t('recurring.howItWorks')}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                {t('recurring.how1')}
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                {t('recurring.how2')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-border/50 shadow-2xl overflow-hidden p-0 gap-0">
          <div className="h-2 bg-gradient-to-r from-primary via-orange-400 to-primary/50 w-full" />
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-serif font-bold text-foreground">
                {editing ? t('recurring.editRitual') : t('recurring.newRitual')}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">{t('recurring.name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('recurring.namePlaceholder')} className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">{t('common.amount')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground font-serif">{currencySymbol(currency)}</span>
                            <Input type="number" step="0.01" className="ps-8 rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 font-serif text-lg h-12" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">{t('recurring.repeats')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 h-12" data-testid="select-frequency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="daily" className="rounded-md cursor-pointer">{t('frequency.daily')}</SelectItem>
                            <SelectItem value="weekly" className="rounded-md cursor-pointer">{t('frequency.weekly')}</SelectItem>
                            <SelectItem value="monthly" className="rounded-md cursor-pointer">{t('frequency.monthly')}</SelectItem>
                            <SelectItem value="quarterly" className="rounded-md cursor-pointer">{t('frequency.quarterly')}</SelectItem>
                            <SelectItem value="yearly" className="rounded-md cursor-pointer">{t('frequency.yearly')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">{t('common.category')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 h-12">
                            <SelectValue placeholder={t('common.selectCategory')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat} className="rounded-md cursor-pointer">
                              {categoryLabel(t, cat)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">{t('recurring.startsOn')}</FormLabel>
                      <FormControl>
                        <Input type="date" className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 h-12" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('recurring.startsOnDesc')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-base font-medium"
                    disabled={createRule.isPending || updateRule.isPending}
                    data-testid="button-save-recurring"
                  >
                    {createRule.isPending || updateRule.isPending
                      ? t('common.saving')
                      : editing ? t('common.saveChanges') : t('recurring.lightIt')}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
