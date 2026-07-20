import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import {
  useGetExpense,
  getGetExpenseQueryKey,
  useUpdateExpense,
  getListExpensesQueryKey,
  getGetDailySummaryQueryKey,
  getGetWeeklySummaryQueryKey,
  getGetSpendingStatsQueryKey,
  getGetSpendingTipsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Food & Drink",
  "Transport",
  "Shopping",
  "Health",
  "Entertainment",
  "Housing",
  "Utilities",
  "Remittances",
  "Family support",
  "Installments",
  "Other",
];

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
});

export function EditExpenseDialog({ expenseId, children }: { expenseId: number; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: expense } = useGetExpense(expenseId, {
    query: {
      enabled: open,
      queryKey: getGetExpenseQueryKey(expenseId)
    }
  });

  const updateExpense = useUpdateExpense();
  const mutateFnRef = useRef(updateExpense.mutate);
  mutateFnRef.current = updateExpense.mutate;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      category: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (expense && open) {
      form.reset({
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: expense.date,
      });
    }
  }, [expense, open, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutateFnRef.current(
      { id: expenseId, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDailySummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWeeklySummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSpendingStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSpendingTipsQueryKey() });
          toast({
            title: "Record updated",
            description: "Your expense has been successfully updated.",
          });
          setOpen(false);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update expense. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-xl h-10 w-10 bg-secondary/50">
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-border/50 shadow-2xl overflow-hidden p-0 gap-0">
        <div className="h-2 bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10 w-full" />
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-serif font-bold text-foreground">Edit Expense</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-serif">$</span>
                          <Input type="number" step="0.01" className="pl-8 rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 font-serif text-lg h-12" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 h-12" {...field} />
                      </FormControl>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What was this for?" className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 min-h-[100px] resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base font-medium"
                  disabled={updateExpense.isPending}
                >
                  {updateExpense.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}