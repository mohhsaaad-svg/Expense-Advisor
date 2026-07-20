import { useGetPreferences, getGetPreferencesQueryKey } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

/** Currency-aware money formatter driven by saved preferences. */
export function useCurrency() {
  const lang = useLang();
  const { data } = useGetPreferences({
    query: { queryKey: getGetPreferencesQueryKey(), staleTime: 60_000 },
  });
  const currency = data?.currency ?? "USD";
  return {
    currency,
    format: (n: number) => formatCurrency(n, currency, lang),
    formatDate: (d: string) => formatDate(d, lang),
  };
}
