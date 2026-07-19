import { useRef, useEffect } from "react";
import { useGetBudget, getGetBudgetQueryKey, useUpdateBudget } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Save, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

const formSchema = z.object({
  dailyLimit: z.coerce.number().min(1, "Daily limit must be at least $1"),
  monthlyLimit: z.coerce.number().min(1, "Monthly limit must be at least $1"),
});

export default function Budget() {
  const { data: budget, isLoading } = useGetBudget({
    query: { queryKey: getGetBudgetQueryKey() }
  });
  
  const updateBudget = useUpdateBudget();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dailyLimit: 0,
      monthlyLimit: 0,
    },
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (budget && initializedForId.current !== budget.id) {
      initializedForId.current = budget.id;
      form.reset({
        dailyLimit: budget.dailyLimit,
        monthlyLimit: budget.monthlyLimit,
      });
    }
  }, [budget, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateBudget.mutate(
      { data: values },
      {
        onSuccess: (updatedBudget) => {
          queryClient.setQueryData(getGetBudgetQueryKey(), updatedBudget);
          queryClient.invalidateQueries({ queryKey: ["/api/expenses/summary/daily"] });
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
        <div className="lg:col-span-8">
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
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-serif text-xl">$</span>
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
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-serif text-xl">$</span>
                              <Input type="number" className="pl-10 h-16 text-2xl font-serif rounded-2xl bg-secondary/30 border-transparent focus-visible:ring-primary/20" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  Your daily target equals <span className="font-bold">{formatCurrency(budget.dailyLimit * 30)}</span> over a typical 30-day month.
                </div>
                <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 flex justify-between items-center">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ceiling</span>
                  <span className="text-foreground font-serif text-2xl font-bold">{formatCurrency(budget.monthlyLimit)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}