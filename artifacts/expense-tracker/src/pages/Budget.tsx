import { useRef, useEffect, useState } from "react";
import {
  useGetBudget,
  getGetBudgetQueryKey,
  useUpdateBudget,
  useGetPreferences,
  getGetPreferencesQueryKey,
  useUpdatePreferences,
  getGetSpendingTipsQueryKey,
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Save, ShieldCheck, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { currencySymbol } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";

const formSchema = z.object({
  dailyLimit: z.coerce.number().min(1, "Daily limit must be at least $1"),
  monthlyLimit: z.coerce.number().min(1, "Monthly limit must be at least $1"),
  // Empty string means "not set" — cleared to null on submit.
  salaryAmount: z.string(),
  salaryDay: z.string(),
});

export default function Budget() {
  const { data: budget, isLoading } = useGetBudget({
    query: { queryKey: getGetBudgetQueryKey() }
  });
  
  const updateBudget = useUpdateBudget();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { format, currency } = useCurrency();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dailyLimit: 0,
      monthlyLimit: 0,
      salaryAmount: "",
      salaryDay: "",
    },
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (budget && initializedForId.current !== budget.id) {
      initializedForId.current = budget.id;
      form.reset({
        dailyLimit: budget.dailyLimit,
        monthlyLimit: budget.monthlyLimit,
        salaryAmount: budget.salaryAmount === null ? "" : String(budget.salaryAmount),
        salaryDay: budget.salaryDay === null ? "" : String(budget.salaryDay),
      });
    }
  }, [budget, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const salaryAmount = values.salaryAmount.trim() === "" ? null : parseFloat(values.salaryAmount);
    const salaryDay = values.salaryDay.trim() === "" ? null : parseInt(values.salaryDay, 10);
    if (salaryAmount !== null && (Number.isNaN(salaryAmount) || salaryAmount < 1)) {
      form.setError("salaryAmount", { message: "Enter a valid salary amount, or leave it empty." });
      return;
    }
    if (salaryDay !== null && (Number.isNaN(salaryDay) || salaryDay < 1 || salaryDay > 31)) {
      form.setError("salaryDay", { message: "Pick a day between 1 and 31, or leave it empty." });
      return;
    }
    updateBudget.mutate(
      {
        data: {
          dailyLimit: values.dailyLimit,
          monthlyLimit: values.monthlyLimit,
          salaryAmount,
          salaryDay,
        },
      },
      {
        onSuccess: (updatedBudget) => {
          queryClient.setQueryData(getGetBudgetQueryKey(), updatedBudget);
          queryClient.invalidateQueries({ queryKey: ["/api/expenses/summary/daily"] });
          queryClient.invalidateQueries({ queryKey: ["/api/insights/stats"] });
          queryClient.invalidateQueries({ queryKey: getGetSpendingTipsQueryKey() });
          toast({
            title: "Settings saved",
            description: "Your Ember limits have been successfully updated.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Could not update limits. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-4 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground mb-2">Boundaries</h1>
          <p className="text-lg text-muted-foreground font-light">Set your limits to prevent fires.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {isLoading ? (
            <Card className="rounded-3xl border-card-border/60">
              <CardContent className="p-8 space-y-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-12 w-32 mt-6" />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-card-border/60 shadow-sm rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full pointer-events-none" />
              <CardHeader className="p-8 pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl font-serif">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  Spending Limits
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Define how much oxygen your spending gets before we alert you.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative z-10">
                    <FormField
                      control={form.control}
                      name="dailyLimit"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-lg font-medium">Daily Target</FormLabel>
                          <FormDescription className="text-sm">
                            Your ideal max spending per day.
                          </FormDescription>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-serif text-xl">{currencySymbol(currency)}</span>
                              <Input type="number" className="pl-10 h-16 text-2xl font-serif rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="monthlyLimit"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-lg font-medium">Monthly Ceiling</FormLabel>
                          <FormDescription className="text-sm">
                            The absolute max you want to spend in a month.
                          </FormDescription>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-serif text-xl">{currencySymbol(currency)}</span>
                              <Input type="number" className="pl-10 h-16 text-2xl font-serif rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2 border-t border-border/50 space-y-2">
                      <div className="text-lg font-medium pt-4">Salary anchoring</div>
                      <p className="text-sm text-muted-foreground">
                        Tell Ember when your salary lands and budgets run payday to payday instead of by calendar month.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="salaryAmount"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base font-medium">Salary per payday</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-serif text-lg">{currencySymbol(currency)}</span>
                                <Input
                                  type="number"
                                  placeholder="Optional"
                                  className="pl-10 h-14 text-xl font-serif rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20"
                                  data-testid="input-salary-amount"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salaryDay"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base font-medium">Day it lands</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={31}
                                placeholder="e.g. 25"
                                className="h-14 text-xl font-serif rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20"
                                data-testid="input-salary-day"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              1–31 · leave both empty for calendar-month budgeting.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="pt-6 flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateBudget.isPending || !form.formState.isDirty}
                        className="h-14 gap-2 px-8 rounded-full shadow-lg shadow-primary/20 hover-elevate text-lg transition-all"
                      >
                        <Save className="w-5 h-5" />
                        {updateBudget.isPending ? "Saving..." : "Save Limits"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <PreferencesCard />
        </div>
        
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-secondary/50 border-secondary-border shadow-none rounded-3xl">
            <CardContent className="p-8 space-y-5">
              <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center shadow-sm">
                <Flame className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif font-bold text-2xl text-foreground">Why limits work</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                A daily limit helps you make micro-decisions. Instead of stressing over a massive monthly number, you only have to think about today.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                We'll let you know when you're getting close to your daily boundary so you can adjust your plans before the day is over.
              </p>
            </CardContent>
          </Card>
          
          {budget && (
            <Card className="bg-primary/5 border-primary/10 shadow-none rounded-3xl">
              <CardContent className="p-8">
                <h3 className="font-sans font-bold text-xs text-primary uppercase tracking-widest mb-3">Alignment Check</h3>
                <div className="text-base text-foreground mb-6 leading-relaxed font-medium">
                  Your daily target equals <span className="font-bold">{format(budget.dailyLimit * 30)}</span> over a typical 30-day {budget.salaryDay !== null ? "salary cycle" : "month"}.
                </div>
                <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 flex justify-between items-center">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{budget.salaryDay !== null ? "Cycle ceiling" : "Ceiling"}</span>
                  <span className="text-foreground font-serif text-2xl font-bold">{format(budget.monthlyLimit)}</span>
                </div>
                {budget.salaryDay !== null && (
                  <div className="mt-4 p-4 bg-background/50 rounded-2xl border border-primary/10 flex justify-between items-center">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payday</span>
                    <span className="text-foreground font-serif text-2xl font-bold">Day {budget.salaryDay}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

const CURRENCIES = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "CAD", label: "Canadian Dollar (CA$)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];

function PreferencesCard() {
  const { data: prefs, isLoading } = useGetPreferences({
    query: { queryKey: getGetPreferencesQueryKey() },
  });
  const updatePreferences = useUpdatePreferences();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [draftCurrency, setDraftCurrency] = useState<CurrencyCode | null>(null);
  const [draftThreshold, setDraftThreshold] = useState<string | null>(null);

  const currency = draftCurrency ?? (prefs?.currency as CurrencyCode | undefined) ?? "USD";
  const threshold = draftThreshold ?? String(prefs?.alertThreshold ?? 80);
  const dirty = !!prefs && (currency !== prefs.currency || threshold !== String(prefs.alertThreshold));

  const save = () => {
    const t = parseInt(threshold, 10);
    if (Number.isNaN(t) || t < 50 || t > 100) {
      toast({
        title: "Invalid threshold",
        description: "Pick a percentage between 50 and 100.",
        variant: "destructive",
      });
      return;
    }
    updatePreferences.mutate(
      { data: { currency, alertThreshold: t } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetPreferencesQueryKey(), updated);
          queryClient.invalidateQueries({ queryKey: getGetSpendingTipsQueryKey() });
          setDraftCurrency(null);
          setDraftThreshold(null);
          toast({
            title: "Preferences saved",
            description: "Ember now speaks your currency and warns at your pace.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Could not save preferences. Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Card className="border-card-border/60 shadow-sm rounded-3xl">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="flex items-center gap-3 text-2xl font-serif">
          <Settings2 className="w-6 h-6 text-primary" />
          Preferences
        </CardTitle>
        <CardDescription className="text-base mt-2">
          The currency Ember displays and how early it warns you.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="text-lg font-medium">Currency</div>
                <p className="text-sm text-muted-foreground">How amounts are displayed everywhere.</p>
                <Select value={currency} onValueChange={(v) => setDraftCurrency(v as CurrencyCode)}>
                  <SelectTrigger
                    className="h-14 rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20 text-lg font-medium"
                    data-testid="select-currency"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="rounded-lg cursor-pointer">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="text-lg font-medium">Alert threshold</div>
                <p className="text-sm text-muted-foreground">Warn me once I've burned this much of a limit.</p>
                <div className="relative">
                  <Input
                    type="number"
                    min={50}
                    max={100}
                    value={threshold}
                    onChange={(e) => setDraftThreshold(e.target.value)}
                    className="h-14 pr-10 rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20 text-lg font-serif"
                    data-testid="input-threshold"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground font-serif text-lg">%</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={save}
                disabled={!dirty || updatePreferences.isPending}
                variant="outline"
                className="h-12 gap-2 px-6 rounded-full hover-elevate transition-all"
                data-testid="button-save-preferences"
              >
                <Save className="w-4 h-4" />
                {updatePreferences.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}