import { useRef, useEffect, useState } from "react";
import {
  useGetBudget,
  getGetBudgetQueryKey,
  useUpdateBudget,
  useGetPreferences,
  getGetPreferencesQueryKey,
  useUpdatePreferences,
  getGetSpendingTipsQueryKey,
  getGetSafeToSpendQueryKey,
  type PreferencesInput,
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
import { Flame, Save, ShieldCheck, Settings2, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { currencySymbol, currencyDecimals } from "@/lib/utils";

/**
 * Inline padding that clears the currency prefix inside an input.
 * Multi-letter symbols (JOD, CA$…) are wider than the default ps-10.
 */
function prefixPadStyle(symbol: string): React.CSSProperties {
  return { paddingInlineStart: `calc(1.6rem + ${Math.max(symbol.length, 1) * 0.72}em)` };
}
import { useCurrency } from "@/hooks/use-currency";
import { useT, type Lang } from "@/lib/i18n";

const emptyToNull = (v: unknown) => (v === "" || v === null || v === undefined ? null : v);

const formSchema = z.object({
  dailyLimit: z.coerce.number().min(1, "Daily limit must be at least 1"),
  monthlyLimit: z.coerce.number().min(1, "Monthly limit must be at least 1"),
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
  const t = useT();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dailyLimit: 0,
      monthlyLimit: 0,
      salaryAmount: "",
      salaryDay: "",
    },
  });

  const initializedForKey = useRef<string | null>(null);

  useEffect(() => {
    // Re-initialize when the budget row or the display currency changes (the
    // currency drives how many decimals the salary input shows), but never
    // clobber in-progress edits.
    const key = `${budget?.id}:${currency}`;
    if (budget && initializedForKey.current !== key && !form.formState.isDirty) {
      initializedForKey.current = key;
      form.reset({
        dailyLimit: budget.dailyLimit,
        monthlyLimit: budget.monthlyLimit,
        salaryAmount:
          budget.salaryAmount === null
            ? ""
            : budget.salaryAmount.toFixed(currencyDecimals(currency)),
        salaryDay: budget.salaryDay === null ? "" : String(budget.salaryDay),
      });
    }
  }, [budget, form, currency]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const salaryAmount = values.salaryAmount.trim() === "" ? null : parseFloat(values.salaryAmount);
    const salaryDay = values.salaryDay.trim() === "" ? null : parseInt(values.salaryDay, 10);
    if (salaryAmount !== null && (Number.isNaN(salaryAmount) || salaryAmount < 1)) {
      form.setError("salaryAmount", { message: t("budget.salaryAmountInvalid") });
      return;
    }
    if (salaryDay !== null && (Number.isNaN(salaryDay) || salaryDay < 1 || salaryDay > 31)) {
      form.setError("salaryDay", { message: t("budget.salaryDayInvalid") });
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
          queryClient.invalidateQueries({ queryKey: getGetSafeToSpendQueryKey() });
          toast({
            title: t("toast.settingsSaved.title"),
            description: t("toast.settingsSaved.desc"),
          });
        },
        onError: () => {
          toast({
            title: t("toast.error.title"),
            description: t("toast.limitsError.desc"),
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
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground mb-2">{t('budget.title')}</h1>
          <p className="text-lg text-muted-foreground font-light">{t('budget.subtitle')}</p>
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
              <div className="absolute top-0 end-0 w-64 h-64 bg-primary/5 rounded-bl-full rtl:rounded-bl-none rtl:rounded-br-full pointer-events-none" />
              <CardHeader className="p-8 pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl font-serif">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  {t('budget.spendingLimits')}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {t('budget.spendingLimitsDesc')}
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
                          <FormLabel className="text-lg font-medium">{t('budget.dailyTarget')}</FormLabel>
                          <FormDescription className="text-sm">
                            {t('budget.dailyTargetDesc')}
                          </FormDescription>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute start-5 top-1/2 -translate-y-1/2 text-muted-foreground font-serif text-xl">{currencySymbol(currency)}</span>
                              <Input type="number" style={prefixPadStyle(currencySymbol(currency))} className="ps-10 h-16 text-2xl font-serif rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20" {...field} />
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
                          <FormLabel className="text-lg font-medium">{t('budget.monthlyCeiling')}</FormLabel>
                          <FormDescription className="text-sm">
                            {t('budget.monthlyCeilingDesc')}
                          </FormDescription>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute start-5 top-1/2 -translate-y-1/2 text-muted-foreground font-serif text-xl">{currencySymbol(currency)}</span>
                              <Input type="number" style={prefixPadStyle(currencySymbol(currency))} className="ps-10 h-16 text-2xl font-serif rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2 border-t border-border/50 space-y-2">
                      <div className="text-lg font-medium pt-4">{t('budget.salaryAnchoring')}</div>
                      <p className="text-sm text-muted-foreground">
                        {t('budget.salaryAnchoringDesc')}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="salaryAmount"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-base font-medium">{t('budget.salaryPerPayday')}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute start-5 top-1/2 -translate-y-1/2 text-muted-foreground font-serif text-lg">{currencySymbol(currency)}</span>
                                <Input
                                  type="number"
                                  step="0.001"
                                  placeholder={t('budget.salaryOptional')}
                                  style={prefixPadStyle(currencySymbol(currency))}
                                  className="ps-10 h-14 text-xl font-serif rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20"
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
                            <FormLabel className="text-base font-medium">{t('budget.dayItLands')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={31}
                                placeholder={t('budget.dayItLandsPlaceholder')}
                                className="h-14 text-xl font-serif rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20"
                                data-testid="input-salary-day"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              {t('budget.dayItLandsDesc')}
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
                        {updateBudget.isPending ? t('common.saving') : t('budget.saveLimits')}
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
              <h3 className="font-serif font-bold text-2xl text-foreground">{t('budget.whyLimitsWork')}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                {t('budget.whyLimits1')}
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                {t('budget.whyLimits2')}
              </p>
            </CardContent>
          </Card>
          
          {budget && (
            <Card className="bg-primary/5 border-primary/10 shadow-none rounded-3xl">
              <CardContent className="p-8">
                <h3 className="font-sans font-bold text-xs text-primary uppercase tracking-widest mb-3">{t('budget.alignmentCheck')}</h3>
                <div className="text-base text-foreground mb-6 leading-relaxed font-medium">
                  {budget.salaryDay !== null
                    ? t('budget.alignmentDescCycle', { amount: format(budget.dailyLimit * 30) })
                    : t('budget.alignmentDesc', { amount: format(budget.dailyLimit * 30) })}
                </div>
                <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 flex flex-wrap justify-between items-center gap-x-4 gap-y-1">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{budget.salaryDay !== null ? t('budget.cycleCeiling') : t('budget.ceiling')}</span>
                  <span className="text-foreground font-serif text-xl font-bold whitespace-nowrap">{format(budget.monthlyLimit)}</span>
                </div>
                {budget.salaryDay !== null && (
                  <div className="mt-4 p-4 bg-background/50 rounded-2xl border border-primary/10 flex flex-wrap justify-between items-center gap-x-4 gap-y-1">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('budget.payday')}</span>
                    <span className="text-foreground font-serif text-xl font-bold whitespace-nowrap">{t('budget.paydayDay', { day: budget.salaryDay })}</span>
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
  { code: "JOD", label: "Jordanian Dinar (JOD)" },
  { code: "KWD", label: "Kuwaiti Dinar (KD)" },
  { code: "BHD", label: "Bahraini Dinar (BD)" },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];

function PreferencesCard() {
  const { data: prefs, isLoading } = useGetPreferences({
    query: { queryKey: getGetPreferencesQueryKey() },
  });
  const updatePreferences = useUpdatePreferences();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const t = useT();

  const [draftCurrency, setDraftCurrency] = useState<CurrencyCode | null>(null);
  const [draftThreshold, setDraftThreshold] = useState<string | null>(null);
  const [draftLang, setDraftLang] = useState<Lang | null>(null);

  const currency = draftCurrency ?? (prefs?.currency as CurrencyCode | undefined) ?? "USD";
  const threshold = draftThreshold ?? String(prefs?.alertThreshold ?? 80);
  const language = draftLang ?? ((prefs?.language as Lang | undefined) ?? "en");
  const dirty =
    !!prefs &&
    (currency !== prefs.currency ||
      threshold !== String(prefs.alertThreshold) ||
      language !== (prefs.language ?? "en"));

  const save = () => {
    const th = parseInt(threshold, 10);
    if (Number.isNaN(th) || th < 50 || th > 100) {
      toast({
        title: t("toast.invalidThreshold.title"),
        description: t("toast.invalidThreshold.desc"),
        variant: "destructive",
      });
      return;
    }
    updatePreferences.mutate(
      { data: { currency, alertThreshold: th, language } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetPreferencesQueryKey(), updated);
          // Flip the whole UI (language/RTL + formatting) immediately.
          queryClient.invalidateQueries({ queryKey: getGetPreferencesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSpendingTipsQueryKey() });
          setDraftCurrency(null);
          setDraftThreshold(null);
          setDraftLang(null);
          toast({
            title: t("toast.prefsSaved.title"),
            description: t("toast.prefsSaved.desc"),
          });
        },
        onError: () => {
          toast({
            title: t("toast.error.title"),
            description: t("toast.prefsError.desc"),
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
          {t('prefs.title')}
        </CardTitle>
        <CardDescription className="text-base mt-2">
          {t('prefs.desc')}
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
                <div className="text-lg font-medium">{t('prefs.currency')}</div>
                <p className="text-sm text-muted-foreground">{t('prefs.currencyDesc')}</p>
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
                <div className="text-lg font-medium">{t('prefs.language')}</div>
                <p className="text-sm text-muted-foreground">{t('prefs.languageDesc')}</p>
                <Select value={language} onValueChange={(v) => setDraftLang(v as Lang)}>
                  <SelectTrigger
                    className="h-14 rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20 text-lg font-medium"
                    data-testid="select-language"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="en" className="rounded-lg cursor-pointer">English</SelectItem>
                    <SelectItem value="ar" className="rounded-lg cursor-pointer">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="text-lg font-medium">{t('prefs.alertThreshold')}</div>
                <p className="text-sm text-muted-foreground">{t('prefs.alertThresholdDesc')}</p>
                <div className="relative">
                  <Input
                    type="number"
                    min={50}
                    max={100}
                    value={threshold}
                    onChange={(e) => setDraftThreshold(e.target.value)}
                    className="h-14 pe-10 rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20 text-lg font-serif"
                    data-testid="input-threshold"
                  />
                  <span className="absolute end-5 top-1/2 -translate-y-1/2 text-muted-foreground font-serif text-lg">%</span>
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
                {updatePreferences.isPending ? t('common.saving') : t('prefs.save')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}