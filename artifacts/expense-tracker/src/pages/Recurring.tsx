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
import { currencySymbol, formatDate, localDateKey } from "@/lib/utils";
import { nextOccurrence, monthlyEquivalent, FREQUENCY_LABELS } from "@/lib/recurrence-ui";
import {
  Repeat, Plus, Pencil, Trash2, Coffee, Car, ShoppingBag, Heart, Film, Home, Zap, MoreHorizontal,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Food & Drink": <Coffee className="w-5 h-5" />,
  "Transport": <Car className="w-5 h-5" />,
  "Shopping": <ShoppingBag className="w-5 h-5" />,
  "Health": <Heart className="w-5 h-5" />,
  "Entertainment": <Film className="w-5 h-5" />,
  "Housing": <Home className="w-5 h-5" />,
  "Utilities": <Zap className="w-5 h-5" />,
  "Other": <MoreHorizontal className="w-5 h-5" />,
};

const CATEGORIES = [
  "Food & Drink",
  "Transport",
  "Shopping",
  "Health",
  "Entertainment",
  "Housing",
  "Utilities",
  "Other",
];

const FREQUENCY_SUFFIX: Record<string, string> = {
  daily: "/ day",
  weekly: "/ week",
  monthly: "/ month",
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
  frequency: z.enum(["daily", "weekly", "monthly"]),
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
  const { format, currency } = useCurrency();

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
              frequency: (["daily", "weekly", "monthly"].includes(editing.frequency)
                ? editing.frequency
                : "monthly") as "daily" | "weekly" | "monthly",
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
          title: editing ? "Ritual updated" : "Ritual lit",
          description: backfilling && !editing
            ? "Ember logged every occurrence since the start date, and will keep going automatically."
            : "Ember will log this expense automatically from now on.",
        });
        setOpen(false);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Could not save the recurring expense. Please try again.",
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
            title: active ? "Ritual resumed" : "Ritual paused",
            description: active
              ? "Logging picks up from today — no catch-up entries for the paused stretch."
              : "Ember will stop logging this one until you resume it.",
          });
        },
      },
    );
  };

  const handleDelete = (rule: RecurringRule) => {
    if (confirm("Delete this recurring expense? Entries already in your logbook will stay.")) {
      deleteRule.mutate(
        { id: rule.id },
        {
          onSuccess: () => {
            invalidateSpendingData();
            toast({ title: "Ritual removed", description: "Its logged entries remain in your logbook." });
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
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground mb-2">Rituals</h1>
          <p className="text-lg text-muted-foreground font-light">Repeating expenses, logged for you automatically.</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setOpen(true); }}
          className="h-12 gap-2 px-6 rounded-full shadow-lg shadow-primary/20 hover-elevate transition-all font-medium text-base"
          data-testid="button-add-recurring"
        >
          <Plus className="w-5 h-5" /> Add Recurring
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
              <h3 className="text-2xl font-serif font-semibold text-foreground mb-2">No rituals yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                Rent, subscriptions, the gym, your daily coffee — add them once and Ember logs them on schedule, automatically.
              </p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => { setEditing(null); setOpen(true); }}
                data-testid="button-add-recurring-empty"
              >
                <Plus className="w-4 h-4 mr-2" /> Add your first
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
                    {CATEGORY_ICONS[rule.category] || <Repeat className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-lg text-foreground truncate mb-1" title={rule.description}>
                      {rule.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="font-medium bg-background border-border text-xs px-2.5 py-0.5 rounded-md">
                        {rule.category}
                      </Badge>
                      <Badge variant="secondary" className="font-medium bg-primary/10 text-primary border-transparent text-xs px-2.5 py-0.5 rounded-md">
                        <Repeat className="w-3 h-3 mr-1" />
                        {FREQUENCY_LABELS[rule.frequency] ?? rule.frequency}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium">
                        {rule.active
                          ? `Next: ${formatDate(nextOccurrence(rule.frequency, rule.startDate, todayKey))}`
                          : "Paused"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-5 sm:w-auto w-full border-t sm:border-0 border-border/50 pt-3 sm:pt-0">
                  <div className="text-right">
                    <div className="font-serif text-2xl font-bold tracking-tight text-foreground">
                      {format(rule.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {FREQUENCY_SUFFIX[rule.frequency] ?? ""}
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
              <h3 className="font-sans font-bold text-xs text-primary uppercase tracking-widest mb-5">Committed each month</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <CountUp
                  value={committedMonthly}
                  format={format}
                  className="text-4xl font-serif font-bold tracking-tight text-foreground"
                />
                <span className="text-muted-foreground font-light">approx.</span>
              </div>
              <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 flex justify-between items-center">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active rituals</span>
                <CountUp value={activeRules.length} className="text-foreground font-serif text-2xl font-bold" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/50 border-secondary-border shadow-none rounded-3xl">
            <CardContent className="p-8 space-y-5">
              <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center shadow-sm">
                <Repeat className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif font-bold text-2xl text-foreground">How rituals work</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Each ritual is logged into your logbook automatically on its schedule — daily, weekly on the start date's weekday, or monthly on its day of the month.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                Pause one and Ember stops logging it; resume and it picks up from today. Deleting a ritual never touches what's already in the logbook.
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
                {editing ? "Edit Ritual" : "New Ritual"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Netflix, rent, gym…" className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 h-12" {...field} />
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
                        <FormLabel className="text-sm font-medium">Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-serif">{currencySymbol(currency)}</span>
                            <Input type="number" step="0.01" className="pl-8 rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 font-serif text-lg h-12" {...field} />
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
                        <FormLabel className="text-sm font-medium">Repeats</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 h-12" data-testid="select-frequency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="daily" className="rounded-md cursor-pointer">Daily</SelectItem>
                            <SelectItem value="weekly" className="rounded-md cursor-pointer">Weekly</SelectItem>
                            <SelectItem value="monthly" className="rounded-md cursor-pointer">Monthly</SelectItem>
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
                      <FormLabel className="text-sm font-medium">Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 h-12">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat} className="rounded-md cursor-pointer">
                              {cat}
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
                      <FormLabel className="text-sm font-medium">Starts on</FormLabel>
                      <FormControl>
                        <Input type="date" className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 h-12" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Pick a past date and Ember will backfill every occurrence since then.
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
                      ? "Saving..."
                      : editing ? "Save Changes" : "Light It"}
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
