import {
  getGetPreferencesQueryKey,
  useGetPreferences,
} from '@workspace/api-client-react';
import { formatMoney } from '@/constants/categories';

/** Currency-aware money formatter driven by saved preferences. */
export function useCurrency() {
  const prefs = useGetPreferences({
    query: { queryKey: getGetPreferencesQueryKey(), staleTime: 60_000 },
  });
  const currency = prefs.data?.currency ?? 'USD';
  return {
    currency,
    format: (n: number) => formatMoney(n, currency),
  };
}
