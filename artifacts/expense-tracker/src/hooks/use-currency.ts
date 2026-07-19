import { useGetPreferences, getGetPreferencesQueryKey } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";

/** Currency-aware money formatter driven by saved preferences. */
export function useCurrency() {
  const { data } = useGetPreferences({
    query: { queryKey: getGetPreferencesQueryKey(), staleTime: 60_000 },
  });
  const currency = data?.currency ?? "USD";
  return {
    currency,
    format: (n: number) => formatCurrency(n, currency),
  };
}
