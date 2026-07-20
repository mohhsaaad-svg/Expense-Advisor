import { useState, useRef } from "react";
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
import { Plus } from "lucide-react";
import {
  useCreateExpense,
  getListExpensesQueryKey,
  getGetDailySummaryQueryKey,
  getGetWeeklySummaryQueryKey,
  getGetSpendingStatsQueryKey,
  getGetSpendingTipsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useT, categoryLabel } from "@/lib/i18n";
import { currencySymbol } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";

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

export function AddExpenseDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const t = useT();
  const { currency } = useCurrency();
  const queryClient = useQueryClient();
  const createExpense = useCreateExpense();
  const mutateFnRef = useRef(createExpense.mutate);
  mutateFnRef.current = createExpense.mutate;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      category: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutateFnRef.current(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDailySummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWeeklySummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSpendingStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSpendingTipsQueryKey() });
          toast({
            title: t("toast.recordAdded.title"),
            description: t("toast.recordAdded.desc"),
          });
          setOpen(false);
          form.reset();
        },
        onError: () => {
          toast({
            title: t("toast.error.title"),
            description: t("toast.addFailed.desc"),
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
          <Button className="h-12 gap-2 px-6 rounded-full shadow-lg shadow-primary/20 hover-elevate transition-all font-medium text-base">
            <Plus className="w-5 h-5" /> {t("expense.add")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-border/50 shadow-2xl overflow-hidden p-0 gap-0">
        <div className="h-2 bg-gradient-to-r from-primary via-orange-400 to-primary/50 w-full" />
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-serif font-bold text-foreground">{t("expense.log")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">{t("common.amount")}</FormLabel>
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
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">{t("common.date")}</FormLabel>
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
                    <FormLabel className="text-sm font-medium">{t("common.category")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 h-12">
                          <SelectValue placeholder={t("common.selectCategory")} />
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">{t("common.description")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("common.descriptionPlaceholder")} className="rounded-xl bg-secondary/50 border-transparent focus-visible:ring-primary/20 min-h-[100px] resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base font-medium"
                  disabled={createExpense.isPending}
                >
                  {createExpense.isPending ? t("expense.adding") : t("expense.add")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}