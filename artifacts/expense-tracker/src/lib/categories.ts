import {
  Coffee, Car, ShoppingBag, Heart, Film, Home, Zap, Send, Users, CreditCard, MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

// Canonical expense categories — must match the values used when logging
// expenses (AddExpenseDialog/EditExpenseDialog) and the mobile app's
// constants/categories.ts. Challenge violation counting on the server uses
// exact string equality against expense rows, so any drift here breaks it.
export const CATEGORIES = [
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
] as const;

export type Category = (typeof CATEGORIES)[number];

// Shared icon map — single source of truth for category icons on web.
// Values are Lucide icon components; render as e.g. <Icon className="w-5 h-5" />.
export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  "Food & Drink": Coffee,
  "Transport": Car,
  "Shopping": ShoppingBag,
  "Health": Heart,
  "Entertainment": Film,
  "Housing": Home,
  "Utilities": Zap,
  "Remittances": Send,
  "Family support": Users,
  "Installments": CreditCard,
  "Other": MoreHorizontal,
};

export function categoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name as Category] ?? MoreHorizontal;
}
