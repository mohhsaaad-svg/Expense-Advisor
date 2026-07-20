import {
  getGetPreferencesQueryKey,
  useGetPreferences,
} from '@workspace/api-client-react';
import { formatMoney } from '@/constants/categories';
import { useLang } from '@/lib/i18n';

/** Currency-aware money formatter driven by saved preferences + active language. */
export function useCurrency() {
  const { lang } = useLang();
  const prefs = useGetPreferences({
    query: { queryKey: getGetPreferencesQueryKey(), staleTime: 60_000 },
  });
  const currency = prefs.data?.currency ?? 'USD';
  return {
    currency,
    format: (n: number) => formatMoney(n, currency, lang),
  };
}
