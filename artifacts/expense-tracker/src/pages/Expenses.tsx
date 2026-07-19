import { useState } from "react";
import { useListExpenses, getListExpensesQueryKey, useDeleteExpense } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExpensesSkeleton } from "@/components/Skeletons";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { Receipt, Search, Trash2, Calendar, Coffee, Car, ShoppingBag, Heart, Film, Home, Zap, MoreHorizontal, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Food & Drink": <Coffee className="w-4 h-4" />,
  "Transport": <Car className="w-4 h-4" />,
  "Shopping": <ShoppingBag className="w-4 h-4" />,
  "Health": <Heart className="w-4 h-4" />,
  "Entertainment": <Film className="w-4 h-4" />,
  "Housing": <Home className="w-4 h-4" />,
  "Utilities": <Zap className="w-4 h-4" />,
  "Other": <MoreHorizontal className="w-4 h-4" />,
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
          toast({ title: "Expense deleted" });
        }
      });
    }
  };

  const filteredExpenses = expenses?.filter(e => 
    e.description.toLowerCase().includes(search.toLowerCase()) || 
    e.amount.toString().includes(search)
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Expenses</h1>
          <p className="text-muted-foreground mt-1">Review and manage your transaction history.</p>
        </div>
        <AddExpenseDialog />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-2xl border border-card-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search expenses..." 
            className="pl-9 bg-background/50 border-transparent focus-visible:border-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-background/50 border-transparent focus-visible:border-input">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <ExpensesSkeleton />
        ) : filteredExpenses?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-card-border border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-serif font-medium text-foreground">No expenses found</h3>
            <p className="text-muted-foreground mt-1">
              {search || categoryFilter !== "all" 
                ? "Try adjusting your filters to find what you're looking for." 
                : "You haven't logged any expenses yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses?.map((expense) => (
              <Card key={expense.id} className="group overflow-hidden border-card-border/60 shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                      {CATEGORY_ICONS[expense.category] || <Receipt className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate" title={expense.description}>
                        {expense.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="font-normal text-[10px] px-1.5 py-0">
                          {expense.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(expense.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-serif text-lg font-medium mr-2">
                      {formatCurrency(expense.amount)}
                    </span>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditExpenseDialog expenseId={expense.id} />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(expense.id)}
                        disabled={deleteExpense.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}