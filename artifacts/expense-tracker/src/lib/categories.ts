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
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
