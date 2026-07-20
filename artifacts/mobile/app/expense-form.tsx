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
import {
  CATEGORIES,
  currencySymbol,
  dateLabel,
  toDateKey,
} from '@/constants/categories';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useCurrency } from '@/hooks/useCurrency';
import { useCategoryName, useLang, useT } from '@/lib/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDailySummaryQueryKey,
  getGetSpendingStatsQueryKey,
  getGetSpendingTipsQueryKey,
  getGetWeeklySummaryQueryKey,
  getListExpensesQueryKey,
  getGetExpenseQueryKey,
  useCreateExpense,
  useDeleteExpense,
  useGetExpense,
  useUpdateExpense,
} from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';

function lastDays(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(toDateKey(d));
  }
  return out;
}

export default function ExpenseFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { currency } = useCurrency();
  const t = useT();
  const { lang, isRTL } = useLang();
  const categoryName = useCategoryName();
  const rtlText = isRTL
    ? ({ writingDirection: 'rtl', textAlign: 'right' } as const)
    : undefined;
  const params = useLocalSearchParams<{ id?: string }>();
  const expenseId = params.id ? parseInt(params.id, 10) : undefined;
  const isEdit = expenseId !== undefined && !Number.isNaN(expenseId);

  const existing = useGetExpense(expenseId ?? 0, {
    query: {
      queryKey: getGetExpenseQueryKey(expenseId ?? 0),
      enabled: isEdit,
    },
  });

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const pending =
    createExpense.isPending || updateExpense.isPending || deleteExpense.isPending;

  // Drafts fall back to the fetched expense in edit mode
  const [amountDraft, setAmountDraft] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState<string | null>(null);
  const [dateDraft, setDateDraft] = useState<string | null>(null);

  const amount =
    amountDraft ?? (existing.data ? String(existing.data.amount) : '');
  const category = categoryDraft ?? existing.data?.category ?? null;
  const description = descDraft ?? existing.data?.description ?? '';
  const date = dateDraft ?? existing.data?.date ?? toDateKey(new Date());

  const dates = useMemo(() => {
    const days = lastDays(14);
    // In edit mode the expense date might be older than 14 days — keep it selectable
    if (isEdit && existing.data && !days.includes(existing.data.date)) {
      days.push(existing.data.date);
    }
    return days;
  }, [isEdit, existing.data]);

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const isValid =
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    !!category &&
    description.trim().length > 0;

  const invalidateAll = () => {
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
      date,
    };
    const onSuccess = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidateAll();
      router.back();
    };
    if (isEdit && expenseId !== undefined) {
      updateExpense.mutate({ id: expenseId, data: payload }, { onSuccess });
    } else {
      createExpense.mutate({ data: payload }, { onSuccess });
    }
  };

  const handleDelete = () => {
    if (!isEdit || expenseId === undefined) return;
    Alert.alert(t('expenseForm.deleteTitle'), t('expenseForm.deleteBody'), [
      { text: t('common.keepIt'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteExpense.mutate(
            { id: expenseId },
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
    ]);
  };

  const saveError = createExpense.isError || updateExpense.isError;
  const topPad = Platform.OS === 'web' ? 24 : Math.max(insets.top, 16);
  const bottomPad =
    Platform.OS === 'web' ? 34 + 16 : Math.max(insets.bottom, 16);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      testID="screen-expense-form"
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          isRTL && { flexDirection: 'row-reverse' },
          { paddingTop: topPad },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
          testID="button-close-form"
        >
          <Ionicons name="close" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isEdit ? t('expenseForm.edit') : t('expenseForm.new')}
        </Text>
        {isEdit ? (
          <Pressable
            onPress={handleDelete}
            disabled={pending}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
            testID="button-delete-expense"
          >
            <Ionicons name="trash-outline" size={22} color={colors.destructive} />
          </Pressable>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      {isEdit && existing.isLoading ? (
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
              placeholder={t('form.amountPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              autoFocus={!isEdit}
              style={[styles.amountInput, { color: colors.foreground }]}
              testID="input-amount"
            />
          </View>

          {/* Category grid */}
          <Text style={[styles.label, { color: colors.mutedForeground }, rtlText]}>
            {t('expenseForm.category')}
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
                    isRTL && { flexDirection: 'row-reverse' },
                    {
                      backgroundColor: active ? colors.accent : colors.card,
                      borderColor: active ? c.color : colors.border,
                      borderRadius: colorTokens.radius - 2,
                    },
                  ]}
                  testID={`category-chip-${c.name}`}
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
                    {categoryName(c.name)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Description */}
          <Text style={[styles.label, { color: colors.mutedForeground }, rtlText]}>
            {t('expenseForm.description')}
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescDraft}
            placeholder={t('expenseForm.descriptionPlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.descInput,
              {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colorTokens.radius - 2,
              },
              rtlText,
            ]}
            testID="input-description"
          />

          {/* Date */}
          <Text style={[styles.label, { color: colors.mutedForeground }, rtlText]}>
            {t('expenseForm.date')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateChips}
          >
            {dates.map((d) => {
              const active = date === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDateDraft(d)}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: active ? colors.primary : colors.secondary,
                    },
                  ]}
                  testID={`date-chip-${d}`}
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
                    {dateLabel(d, lang)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {saveError ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {t('expenseForm.saveErrorFields')}
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
            isRTL && { flexDirection: 'row-reverse' },
            {
              backgroundColor: colors.primary,
              opacity: !isValid || pending ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
          testID="button-save-expense"
        >
          {pending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons
                name="checkmark"
                size={19}
                color={colors.primaryForeground}
              />
              <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
                {isEdit ? t('common.saveChanges') : t('expenseForm.logExpense')}
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
  descInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
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
