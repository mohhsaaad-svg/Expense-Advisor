import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Skeleton } from '@/components/ember/Skeleton';
import { CATEGORIES, currencySymbol, dateLabel, toDateKey } from '@/constants/categories';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useCurrency } from '@/hooks/useCurrency';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDailySummaryQueryKey,
  getGetSpendingStatsQueryKey,
  getGetSpendingTipsQueryKey,
  getGetWeeklySummaryQueryKey,
  getListExpensesQueryKey,
  getListRecurringExpensesQueryKey,
  useCreateRecurringExpense,
  useDeleteRecurringExpense,
  useListRecurringExpenses,
  useUpdateRecurringExpense,
} from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', hint: 'every day' },
  { value: 'weekly', label: 'Weekly', hint: 'same weekday' },
  { value: 'monthly', label: 'Monthly', hint: 'same day each month' },
  { value: 'quarterly', label: 'Quarterly', hint: 'every 3 months' },
  { value: 'yearly', label: 'Yearly', hint: 'once a year' },
] as const;

type FrequencyValue = (typeof FREQUENCIES)[number]['value'];

function lastDays(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(toDateKey(d));
  }
  return out;
}

export default function RecurringFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { currency } = useCurrency();
  const params = useLocalSearchParams<{ id?: string }>();
  const ruleId = params.id ? parseInt(params.id, 10) : undefined;
  const isEdit = ruleId !== undefined && !Number.isNaN(ruleId);

  // There is no GET /recurring/{id}; the (small, cached) list serves edit mode.
  const rules = useListRecurringExpenses({
    query: {
      queryKey: getListRecurringExpensesQueryKey(),
      enabled: isEdit,
    },
  });
  const existing = isEdit ? rules.data?.find((r) => r.id === ruleId) : undefined;

  const createRule = useCreateRecurringExpense();
  const updateRule = useUpdateRecurringExpense();
  const deleteRule = useDeleteRecurringExpense();
  const pending =
    createRule.isPending || updateRule.isPending || deleteRule.isPending;

  // Drafts fall back to the fetched rule in edit mode
  const [amountDraft, setAmountDraft] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState<string | null>(null);
  const [frequencyDraft, setFrequencyDraft] = useState<FrequencyValue | null>(null);
  const [startDraft, setStartDraft] = useState<string | null>(null);

  const amount = amountDraft ?? (existing ? String(existing.amount) : '');
  const category = categoryDraft ?? existing?.category ?? null;
  const description = descDraft ?? existing?.description ?? '';
  const frequency: FrequencyValue =
    frequencyDraft ??
    ((existing &&
    (['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const).includes(
      existing.frequency as FrequencyValue,
    )
      ? (existing.frequency as FrequencyValue)
      : 'monthly') as FrequencyValue);
  const startDate = startDraft ?? existing?.startDate ?? toDateKey(new Date());

  const dates = useMemo(() => {
    const days = lastDays(14);
    if (isEdit && existing && !days.includes(existing.startDate)) {
      days.push(existing.startDate);
    }
    return days;
  }, [isEdit, existing]);

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const isValid =
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    !!category &&
    description.trim().length > 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListRecurringExpensesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDailySummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetWeeklySummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSpendingStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSpendingTipsQueryKey() });
  };

  const handleSave = () => {
    if (!isValid || !category) return;
    const payload = {
      amount: parsedAmount,
      category,
      description: description.trim(),
      frequency,
      startDate,
    };
    const onSuccess = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidateAll();
      router.back();
    };
    if (isEdit && ruleId !== undefined) {
      updateRule.mutate({ id: ruleId, data: payload }, { onSuccess });
    } else {
      createRule.mutate({ data: payload }, { onSuccess });
    }
  };

  const handleDelete = () => {
    if (!isEdit || ruleId === undefined) return;
    Alert.alert(
      'Delete ritual',
      'Ember stops logging it. Entries already in your logbook stay.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteRule.mutate(
              { id: ruleId },
              {
                onSuccess: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Warning,
                  );
                  invalidateAll();
                  router.back();
                },
              },
            );
          },
        },
      ],
    );
  };

  const saveError = createRule.isError || updateRule.isError;
  const topPad = Platform.OS === 'web' ? 24 : Math.max(insets.top, 16);
  const bottomPad =
    Platform.OS === 'web' ? 34 + 16 : Math.max(insets.bottom, 16);
  const backfilling = !isEdit && startDate < toDateKey(new Date());

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      testID="screen-recurring-form"
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
          testID="button-close-recurring-form"
        >
          <Ionicons name="close" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isEdit ? 'Edit ritual' : 'New ritual'}
        </Text>
        {isEdit ? (
          <Pressable
            onPress={handleDelete}
            disabled={pending}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
            testID="button-delete-recurring"
          >
            <Ionicons name="trash-outline" size={22} color={colors.destructive} />
          </Pressable>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      {isEdit && rules.isLoading ? (
        <View style={styles.form} testID="form-loading">
          <Skeleton
            width={150}
            height={40}
            radius={10}
            style={{ alignSelf: 'center', marginVertical: 10 }}
          />
          <Skeleton width={80} height={12} style={{ marginTop: 12 }} />
          <Skeleton height={48} radius={12} />
          <Skeleton width={80} height={12} style={{ marginTop: 12 }} />
          <Skeleton height={48} radius={12} />
        </View>
      ) : (
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={styles.form}
          bottomOffset={110}
        >
          {/* Amount */}
          <View style={styles.amountWrap}>
            <Text style={[styles.amountCurrency, { color: colors.mutedForeground }]}>
              {currencySymbol(currency)}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmountDraft}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              autoFocus={!isEdit}
              style={[styles.amountInput, { color: colors.foreground }]}
              testID="input-recurring-amount"
            />
          </View>

          {/* Name */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Name
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescDraft}
            placeholder="Netflix, rent, gym…"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.descInput,
              {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colorTokens.radius - 2,
              },
            ]}
            testID="input-recurring-description"
          />

          {/* Frequency */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Repeats
          </Text>
          <View style={styles.freqRow}>
            {FREQUENCIES.map((f) => {
              const active = frequency === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFrequencyDraft(f.value);
                  }}
                  style={[
                    styles.freqChip,
                    {
                      backgroundColor: active ? colors.accent : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                      borderRadius: colorTokens.radius - 2,
                    },
                  ]}
                  testID={`frequency-chip-${f.value}`}
                >
                  <Text
                    style={[
                      styles.freqLabel,
                      {
                        color: active
                          ? colors.accentForeground
                          : colors.foreground,
                      },
                    ]}
                  >
                    {f.label}
                  </Text>
                  <Text
                    style={[styles.freqHint, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {f.hint}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Category grid */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Category
          </Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => {
              const active = category === c.name;
              return (
                <Pressable
                  key={c.name}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCategoryDraft(c.name);
                  }}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active ? colors.accent : colors.card,
                      borderColor: active ? c.color : colors.border,
                      borderRadius: colorTokens.radius - 2,
                    },
                  ]}
                  testID={`recurring-category-chip-${c.name}`}
                >
                  <Ionicons
                    name={c.icon}
                    size={16}
                    color={active ? c.color : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.catChipText,
                      {
                        color: active
                          ? colors.accentForeground
                          : colors.secondaryForeground,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Start date */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Starts on
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateChips}
          >
            {dates.map((d) => {
              const active = startDate === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setStartDraft(d)}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: active ? colors.primary : colors.secondary,
                    },
                  ]}
                  testID={`start-date-chip-${d}`}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      {
                        color: active
                          ? colors.primaryForeground
                          : colors.secondaryForeground,
                      },
                    ]}
                  >
                    {dateLabel(d)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {backfilling ? (
            <View
              style={[
                styles.hintCard,
                { backgroundColor: colors.accent, borderRadius: colorTokens.radius - 2 },
              ]}
            >
              <Ionicons
                name="sparkles"
                size={16}
                color={colors.accentForeground}
              />
              <Text style={[styles.hintText, { color: colors.accentForeground }]}>
                Ember will log every occurrence since{' '}
                {dateLabel(startDate)} the moment you save.
              </Text>
            </View>
          ) : null}

          {saveError ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              Couldn't save — check the fields and try again.
            </Text>
          ) : null}
        </KeyboardAwareScrollViewCompat>
      )}

      {/* Save */}
      <View style={[styles.footer, { paddingBottom: bottomPad }]}>
        <Pressable
          onPress={handleSave}
          disabled={!isValid || pending}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: colors.primary,
              opacity: !isValid || pending ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
          testID="button-save-recurring"
        >
          {pending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons
                name="repeat"
                size={19}
                color={colors.primaryForeground}
              />
              <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
                {isEdit ? 'Save changes' : 'Start the ritual'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    gap: 4,
  },
  amountCurrency: {
    fontSize: 30,
    fontFamily: 'Outfit_500Medium',
  },
  amountInput: {
    fontSize: 52,
    fontFamily: 'Outfit_700Bold',
    minWidth: 130,
    textAlign: 'center',
    padding: 0,
  },
  label: {
    fontSize: 12.5,
    fontFamily: 'Outfit_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
  },
  descInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
  },
  freqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  freqChip: {
    flexBasis: '30%',
    flexGrow: 1,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 2,
    alignItems: 'center',
  },
  freqLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  freqHint: {
    fontSize: 10.5,
    fontFamily: 'Outfit_400Regular',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    maxWidth: '48%',
  },
  catChipText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    flexShrink: 1,
  },
  dateChips: {
    gap: 8,
    paddingVertical: 2,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  dateChipText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  hintCard: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    alignItems: 'flex-start',
    marginTop: 10,
  },
  hintText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: 'Outfit_500Medium',
  },
  errorText: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
  },
  saveText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
});
