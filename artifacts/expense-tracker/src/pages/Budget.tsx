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
import { PiggyBank, Save } from "lucide-react";
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
            title: "Budget updated",
            description: "Your spending limits have been successfully saved.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Could not update budget. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Budget Settings</h1>
        <p className="text-muted-foreground mt-1">Set your boundaries and we'll help you stick to them.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 space-y-6">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-24 mt-4" />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-card-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <PiggyBank className="w-5 h-5 text-primary" />
                  Spending Limits
                </CardTitle>
                <CardDescription>
                  Define how much you want to spend to stay on track.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="dailyLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Daily Target</FormLabel>
                          <FormDescription>
                            Your ideal max spending per day.
                          </FormDescription>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input type="number" className="pl-8 text-lg font-serif" {...field} />
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
                        <FormItem>
                          <FormLabel className="text-base">Monthly Ceiling</FormLabel>
                          <FormDescription>
                            The absolute max you want to spend in a month.
                          </FormDescription>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input type="number" className="pl-8 text-lg font-serif" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-4 flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateBudget.isPending || !form.formState.isDirty}
                        className="gap-2 px-8 shadow-sm hover-elevate"
                      >
                        <Save className="w-4 h-4" />
                        {updateBudget.isPending ? "Saving..." : "Save Limits"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-secondary/50 border-secondary-border shadow-none">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-serif font-medium text-lg text-secondary-foreground">Why set limits?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A daily limit helps you make micro-decisions. Instead of stressing over a massive monthly number, you only have to think about today.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We'll let you know when you're getting close to your daily boundary so you can adjust your plans before the day is over.
              </p>
            </CardContent>
          </Card>
          
          {budget && (
            <Card className="bg-primary/5 border-primary/20 shadow-none">
              <CardContent className="p-6">
                <h3 className="font-sans font-semibold text-sm text-primary uppercase tracking-wider mb-2">Current Alignment</h3>
                <div className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Your daily target equals {formatCurrency(budget.dailyLimit * 30)} over a 30-day month.
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-foreground">Monthly Ceiling</span>
                  <span className="text-foreground font-serif text-lg">{formatCurrency(budget.monthlyLimit)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}