import { useState } from "react";
import { useListExpenses, getListExpensesQueryKey, useDeleteExpense } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExpensesSkeleton } from "@/components/Skeletons";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { Receipt, Search, Trash2, Calendar, Coffee, Car, ShoppingBag, Heart, Film, Home, Zap, MoreHorizontal, Pencil, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

export default function Expenses() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  
  const queryParams = categoryFilter !== "all" ? { category: categoryFilter } : {};
  const { data: expenses, isLoading } = useListExpenses(
    queryParams,
    { query: { queryKey: getListExpensesQueryKey(queryParams) } }
  );

  const deleteExpense = useDeleteExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpense.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          toast({ title: "Expense deleted", description: "The record has been removed." });
        }
      });
    }
  };

  const filteredExpenses = expenses?.filter(e => 
    e.description.toLowerCase().includes(search.toLowerCase()) || 
    e.amount.toString().includes(search)
  );

  const groupedExpenses = filteredExpenses?.reduce((acc, expense) => {
    const date = expense.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(expense);
    return acc;
  }, {} as Record<string, typeof expenses>);

  const sortedDates = Object.keys(groupedExpenses || {}).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-4 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground mb-2">Logbook</h1>
          <p className="text-lg text-muted-foreground font-light">Every ember tracked and categorized.</p>
        </div>
        <AddExpenseDialog />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-3 rounded-2xl border border-card-border/60 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by description or amount..." 
            className="pl-11 bg-background/50 border-transparent focus-visible:ring-primary/20 h-12 rounded-xl text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[220px] bg-background/50 border-transparent focus-visible:ring-primary/20 h-12 rounded-xl text-base font-medium">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="rounded-lg cursor-pointer">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c} className="rounded-lg cursor-pointer">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <ExpensesSkeleton />
        ) : filteredExpenses?.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-3xl border border-card-border/60 shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Receipt className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-2xl font-serif font-semibold text-foreground mb-2">No records found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {search || categoryFilter !== "all" 
                ? "Try clearing your search or filters to see your expenses." 
                : "Your logbook is empty. Time to add your first expense."}
            </p>
            {(search || categoryFilter !== "all") && (
              <Button 
                variant="outline" 
                className="mt-6 rounded-full"
                onClick={() => { setSearch(""); setCategoryFilter("all"); }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {sortedDates.map((date) => {
              const dayExpenses = groupedExpenses![date]!;
              const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
              
              return (
                <div key={date} className="space-y-4">
                  <div className="flex items-end justify-between px-2 pb-2 border-b border-border/50">
                    <h3 className="text-lg font-serif font-bold text-foreground">
                      {formatDate(date)}
                    </h3>
                    <div className="text-sm font-medium text-muted-foreground">
                      Total: <span className="text-foreground">{formatCurrency(dayTotal)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {dayExpenses.map((expense) => (
                      <div key={expense.id} className="group relative bg-card p-5 rounded-2xl border border-card-border/60 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-5 flex-1 min-w-0">
                          <div className="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 shadow-inner group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            {CATEGORY_ICONS[expense.category] || <Receipt className="w-6 h-6" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-lg text-foreground truncate mb-1" title={expense.description}>
                              {expense.description}
                            </p>
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-medium bg-background border-border text-xs px-2.5 py-0.5 rounded-md">
                                {expense.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 border-border/50 pt-3 sm:pt-0">
                          <div className="font-serif text-2xl font-bold tracking-tight text-foreground">
                            {formatCurrency(expense.amount)}
                          </div>
                          <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <EditExpenseDialog expenseId={expense.id} />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-10 w-10"
                              onClick={() => handleDelete(expense.id)}
                              disabled={deleteExpense.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}