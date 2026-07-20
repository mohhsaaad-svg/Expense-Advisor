import { useState } from "react";
import { format } from "date-fns";
import { 
  useListGoals, 
  useCreateGoal, 
  useUpdateGoal, 
  useDeleteGoal, 
  useContributeToGoal,
  useListChallenges,
  useCreateChallenge,
  useDeleteChallenge,
  getGetDailySummaryQueryKey,
  getListGoalsQueryKey,
  getListChallengesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Target, Flame, Trash2, Edit2, Shield, Calendar, ArrowUpRight, ArrowDownRight, RefreshCw, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useCurrency } from "@/hooks/use-currency";
import { localDateKey } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import { useT, categoryLabel } from "@/lib/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.coerce.number().min(0.01, "Amount must be positive"),
  deadline: z.string().optional().nullable(),
});

const challengeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional().nullable(),
  durationDays: z.coerce.number().min(1).max(365),
  startDate: z.string().optional(),
});

const contributeSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  type: z.enum(["add", "withdraw"]),
});

export default function Goals() {
  const { format: formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const t = useT();
  const todayKey = localDateKey();

  const { data: goals, isLoading: loadingGoals } = useListGoals({
    query: { queryKey: getListGoalsQueryKey() }
  });

  const { data: challenges, isLoading: loadingChallenges } = useListChallenges(
    { today: todayKey },
    { query: { queryKey: getListChallengesQueryKey({ today: todayKey }) } }
  );

  const createGoal = useCreateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        toast({ title: t("toast.goalCreated.title"), description: t("toast.goalCreated.desc") });
      }
    }
  });

  const deleteGoal = useDeleteGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        toast({ title: t("toast.goalDeleted.title") });
      }
    }
  });

  const contributeGoal = useContributeToGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        toast({ title: t("toast.contributionLogged.title") });
      }
    }
  });

  const createChallenge = useCreateChallenge({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChallengesQueryKey({ today: todayKey }) });
        toast({ title: t("toast.challengeStarted.title"), description: t("toast.challengeStarted.desc") });
      }
    }
  });

  const deleteChallenge = useDeleteChallenge({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChallengesQueryKey({ today: todayKey }) });
        toast({ title: t("toast.challengeEnded.title") });
      }
    }
  });

  const updateGoal = useUpdateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        toast({ title: t("toast.goalUpdated.title") });
      }
    }
  });

  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [isChallengeDialogOpen, setIsChallengeDialogOpen] = useState(false);
  const [contributeGoalId, setContributeGoalId] = useState<number | null>(null);

  const goalForm = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: "", targetAmount: 0, deadline: null },
  });

  const challengeForm = useForm<z.infer<typeof challengeSchema>>({
    resolver: zodResolver(challengeSchema),
    defaultValues: { name: "", durationDays: 30, category: "all", startDate: todayKey },
  });

  const contributeForm = useForm<z.infer<typeof contributeSchema>>({
    resolver: zodResolver(contributeSchema),
    defaultValues: { amount: 0, type: "add" },
  });

  const onGoalSubmit = (data: z.infer<typeof goalSchema>) => {
    if (editingGoalId) {
      updateGoal.mutate({ id: editingGoalId, data: { name: data.name, targetAmount: data.targetAmount, deadline: data.deadline || null } });
      setEditingGoalId(null);
    } else {
      createGoal.mutate({ data: { name: data.name, targetAmount: data.targetAmount, deadline: data.deadline || null } });
    }
    setIsGoalDialogOpen(false);
    goalForm.reset();
  };

  const onChallengeSubmit = (data: z.infer<typeof challengeSchema>) => {
    const category = data.category === "all" ? null : data.category;
    createChallenge.mutate({ data: { name: data.name, durationDays: data.durationDays, category, startDate: data.startDate || todayKey } });
    setIsChallengeDialogOpen(false);
    challengeForm.reset();
  };

  const onContributeSubmit = (data: z.infer<typeof contributeSchema>) => {
    if (!contributeGoalId) return;
    const amount = data.type === "add" ? data.amount : -data.amount;
    contributeGoal.mutate({ id: contributeGoalId, data: { amount } });
    setContributeGoalId(null);
    contributeForm.reset();
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-4 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground mb-2">{t('goals.title')}</h1>
          <p className="text-lg text-muted-foreground font-light">{t('goals.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Goals Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-serif font-bold flex items-center gap-2"><Target className="w-6 h-6 text-primary" /> {t('goals.savingsGoals')}</h2>
            <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full"><Plus className="w-4 h-4 me-1" /> {t('goals.newGoal')}</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('goals.setGoal')}</DialogTitle>
                </DialogHeader>
                <Form {...goalForm}>
                  <form onSubmit={goalForm.handleSubmit(onGoalSubmit)} className="space-y-4">
                    <FormField
                      control={goalForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('goals.goalName')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('goals.goalNamePlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={goalForm.control}
                      name="targetAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('goals.targetAmount')}</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={goalForm.control}
                      name="deadline"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t('goals.deadlineOptional')}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant={"outline"} className={cn("ps-3 text-start font-normal", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(new Date(field.value), "PPP") : <span>{t('common.pickDate')}</span>}
                                  <Calendar className="ms-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(d) => field.onChange(d ? format(d, "yyyy-MM-dd") : null)}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createGoal.isPending}>{t('goals.saveGoal')}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {!loadingGoals && goals?.length === 0 && (
             <div className="p-8 rounded-2xl bg-secondary/30 border border-dashed border-border flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                 <Target className="h-8 w-8 text-muted-foreground/50" />
               </div>
               <h3 className="font-serif text-xl font-bold mb-2">{t('goals.noGoals')}</h3>
               <p className="text-muted-foreground max-w-[250px] mb-6 font-light">{t('goals.noGoalsDesc')}</p>
               <Button onClick={() => setIsGoalDialogOpen(true)}>{t('goals.createFirst')}</Button>
             </div>
          )}

          <div className="space-y-4">
            {goals?.map(goal => {
              const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
              return (
                <Card key={goal.id} className="overflow-hidden border-card-border/60 hover-elevate group">
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-serif">{goal.name}</CardTitle>
                      {goal.deadline && (
                        <CardDescription className="text-xs mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {t('goals.by', { date: format(new Date(goal.deadline), "MMM d, yyyy") })}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => {
                         goalForm.reset({
                           name: goal.name,
                           targetAmount: goal.targetAmount,
                           deadline: goal.deadline
                         });
                         setEditingGoalId(goal.id);
                         setIsGoalDialogOpen(true);
                       }}>
                         <Edit2 className="w-4 h-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteGoal.mutate({ id: goal.id })}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between mb-2">
                      <div className="font-sans">
                        <span className="text-2xl font-bold tracking-tight">{formatCurrency(goal.savedAmount)}</span>
                        <span className="text-muted-foreground text-sm ms-1">/ {formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <span className="text-sm font-bold bg-secondary px-2 py-0.5 rounded-md">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 mb-4" />
                    
                    <div className="flex gap-2">
                      <Dialog open={contributeGoalId === goal.id} onOpenChange={(open) => {
                        if (!open) setContributeGoalId(null);
                        else setContributeGoalId(goal.id);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full text-xs font-medium"><ArrowUpRight className="w-3 h-3 me-1" /> {t('goals.add')}</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm">
                          <DialogHeader>
                            <DialogTitle>{t('goals.update', { name: goal.name })}</DialogTitle>
                          </DialogHeader>
                          <Form {...contributeForm}>
                            <form onSubmit={contributeForm.handleSubmit(onContributeSubmit)} className="space-y-4">
                              <FormField control={contributeForm.control} name="type" render={({field}) => (
                                <FormItem>
                                  <FormLabel>{t('goals.action')}</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="add">{t('goals.addFunds')}</SelectItem>
                                      <SelectItem value="withdraw">{t('goals.withdrawFunds')}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )} />
                              <FormField control={contributeForm.control} name="amount" render={({field}) => (
                                <FormItem>
                                  <FormLabel>{t('common.amount')}</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <DialogFooter>
                                <Button type="submit" disabled={contributeGoal.isPending}>{t('goals.save')}</Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Challenges Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-serif font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-primary" /> {t('challenges.title')}</h2>
            <Dialog open={isChallengeDialogOpen} onOpenChange={setIsChallengeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full"><Plus className="w-4 h-4 me-1" /> {t('challenges.new')}</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('challenges.start')}</DialogTitle>
                </DialogHeader>
                <Form {...challengeForm}>
                  <form onSubmit={challengeForm.handleSubmit(onChallengeSubmit)} className="space-y-4">
                    <FormField
                      control={challengeForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('challenges.name')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('challenges.namePlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={challengeForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('challenges.categoryToBlock')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "all"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('common.allCategories')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">{t('challenges.blockAll')}</SelectItem>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {categoryLabel(t, c)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={challengeForm.control}
                      name="durationDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('challenges.duration')}</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" max="365" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={challengeForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t('challenges.startDate')}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant={"outline"} className={cn("ps-3 text-start font-normal", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(new Date(field.value), "PPP") : <span>{t('common.pickDate')}</span>}
                                  <Calendar className="ms-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(d) => field.onChange(d ? format(d, "yyyy-MM-dd") : todayKey)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createChallenge.isPending}>{t('challenges.startChallenge')}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {!loadingChallenges && challenges?.length === 0 && (
             <div className="p-8 rounded-2xl bg-secondary/30 border border-dashed border-border flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                 <Shield className="h-8 w-8 text-muted-foreground/50" />
               </div>
               <h3 className="font-serif text-xl font-bold mb-2">{t('challenges.noActive')}</h3>
               <p className="text-muted-foreground max-w-[250px] mb-6 font-light">{t('challenges.noActiveDesc')}</p>
               <Button onClick={() => setIsChallengeDialogOpen(true)} variant="secondary">{t('challenges.startFirst')}</Button>
             </div>
          )}

          <div className="space-y-4">
            {challenges?.map(challenge => {
              const progress = Math.min((challenge.daysElapsed / challenge.durationDays) * 100, 100);
              const isActive = challenge.status === "active";
              const isFailed = challenge.status === "failed";
              const isCompleted = challenge.status === "completed";

              return (
                <Card key={challenge.id} className={cn(
                  "overflow-hidden border-card-border/60 hover-elevate group transition-colors",
                  isFailed && "bg-destructive/5 border-destructive/20",
                  isCompleted && "bg-success/5 border-success/20"
                )}>
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg font-serif">{challenge.name}</CardTitle>
                        {isFailed && <span className="bg-destructive/20 text-destructive text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{t('challenges.failed')}</span>}
                        {isCompleted && <span className="bg-success/20 text-success text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{t('challenges.completed')}</span>}
                        {isActive && <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{t('challenges.active')}</span>}
                      </div>
                      <CardDescription className="text-xs">
                        {challenge.category ? t('challenges.noSpendingOn', { category: categoryLabel(t, challenge.category) }) : t('challenges.noSpendingAtAll')} • {t('challenges.daysLabel', { days: challenge.durationDays })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteChallenge.mutate({ id: challenge.id })}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between mb-2">
                      <div className="font-sans">
                        <span className={cn("text-2xl font-bold tracking-tight", isFailed ? "text-destructive" : isCompleted ? "text-success" : "")}>
                          {t('challenges.dayN', { n: challenge.daysElapsed })}
                        </span>
                        <span className="text-muted-foreground text-sm ms-1">/ {challenge.durationDays}</span>
                      </div>
                      <span className="text-sm font-bold bg-secondary/50 px-2 py-0.5 rounded-md">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className={cn("h-2 mb-4 bg-secondary", isFailed ? "[&>div]:bg-destructive" : isCompleted ? "[&>div]:bg-success" : "[&>div]:bg-primary")} />
                    
                    {isFailed && (
                      <div className="flex items-center gap-2 text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg">
                        <X className="w-4 h-4" />
                        {t('challenges.brokenBy', { count: challenge.violations, unit: challenge.violations > 1 ? t('challenges.expenses') : t('challenges.expense') })}
                      </div>
                    )}
                    {isCompleted && (
                      <div className="flex items-center gap-2 text-sm text-success font-medium bg-success/10 p-3 rounded-lg">
                        <Target className="w-4 h-4" />
                        {t('challenges.madeIt')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}