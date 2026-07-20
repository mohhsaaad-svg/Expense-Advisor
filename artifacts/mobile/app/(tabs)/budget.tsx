import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryIcon } from '@/components/ember/CategoryIcon';
import { EmptyState } from '@/components/ember/EmptyState';
import { Skeleton } from '@/components/ember/Skeleton';
import { currencySymbol } from '@/constants/categories';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/lib/auth';
import { useLang, useT, type Lang } from '@/lib/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetBudgetQueryKey,
  getGetDailySummaryQueryKey,
  getGetPreferencesQueryKey,
  getGetSafeToSpendQueryKey,
  getGetSpendingStatsQueryKey,
  getGetSpendingTipsQueryKey,
  getListExpensesQueryKey,
  getListRecurringExpensesQueryKey,
  useGetBudget,
  useGetPreferences,
  useListRecurringExpenses,
  useUpdateBudget,
  useUpdatePreferences,
  useUpdateRecurringExpense,
} from '@workspace/api-client-react';
import type { PreferencesInput } from '@workspace/api-client-react';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

const CURRENCY_OPTIONS = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'INR',
  'CAD',
  'AUD',
  'JOD',
  'KWD',
  'BHD',
] as const;
type CurrencyOption = (typeof CURRENCY_OPTIONS)[number];

const LANGUAGE_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];

export default function BudgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const t = useT();
  const { lang, isRTL } = useLang();
  const rtlText = isRTL
    ? ({ writingDirection: 'rtl', textAlign: 'right' } as const)
    : undefined;
  const rowReverse = isRTL ? ({ flexDirection: 'row-reverse' } as const) : undefined;
  const FREQ_LABEL: Record<string, string> = {
    daily: t('budget.freqDaily'),
    weekly: t('budget.freqWeekly'),
    monthly: t('budget.freqMonthly'),
    quarterly: t('budget.freqQuarterly'),
    yearly: t('budget.freqYearly'),
  };

  const budget = useGetBudget();
  const updateBudget = useUpdateBudget();
  const rules = useListRecurringExpenses({
    query: { queryKey: getListRecurringExpensesQueryKey() },
  });
  const updateRule = useUpdateRecurringExpense();
  const prefs = useGetPreferences({
    query: { queryKey: getGetPreferencesQueryKey() },
  });
  const updatePreferences = useUpdatePreferences();

  // Controlled-with-fallback: null means "not touched yet, show server value"
  const [dailyDraft, setDailyDraft] = useState<string | null>(null);
  const [monthlyDraft, setMonthlyDraft] = useState<string | null>(null);
  const [salaryAmountDraft, setSalaryAmountDraft] = useState<string | null>(null);
  const [salaryDayDraft, setSalaryDayDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [currencyDraft, setCurrencyDraft] = useState<CurrencyOption | null>(null);
  const [languageDraft, setLanguageDraft] = useState<Lang | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState<number | null>(null);
  const [savedPrefs, setSavedPrefs] = useState(false);

  const dailyValue =
    dailyDraft ?? (budget.data ? String(budget.data.dailyLimit) : '');
  const monthlyValue =
    monthlyDraft ?? (budget.data ? String(budget.data.monthlyLimit) : '');

  const salaryAmountValue =
    salaryAmountDraft ??
    (budget.data && budget.data.salaryAmount !== null
      ? String(budget.data.salaryAmount)
      : '');
  const salaryDayValue =
    salaryDayDraft ??
    (budget.data && budget.data.salaryDay !== null
      ? String(budget.data.salaryDay)
      : '');

  const parsedDaily = parseFloat(dailyValue.replace(',', '.'));
  const parsedMonthly = parseFloat(monthlyValue.replace(',', '.'));
  // Empty salary fields mean "not set" (calendar-month budgeting).
  const parsedSalaryAmount =
    salaryAmountValue.trim() === ''
      ? null
      : parseFloat(salaryAmountValue.replace(',', '.'));
  const parsedSalaryDay =
    salaryDayValue.trim() === '' ? null : parseInt(salaryDayValue, 10);
  const salaryValid =
    (parsedSalaryAmount === null ||
      (!Number.isNaN(parsedSalaryAmount) && parsedSalaryAmount >= 1)) &&
    (parsedSalaryDay === null ||
      (!Number.isNaN(parsedSalaryDay) &&
        parsedSalaryDay >= 1 &&
        parsedSalaryDay <= 31));
  const isValid =
    !Number.isNaN(parsedDaily) &&
    parsedDaily >= 1 &&
    !Number.isNaN(parsedMonthly) &&
    parsedMonthly >= 1 &&
    salaryValid;
  const isDirty =
    budget.data !== undefined &&
    (parsedDaily !== budget.data.dailyLimit ||
      parsedMonthly !== budget.data.monthlyLimit ||
      parsedSalaryAmount !== budget.data.salaryAmount ||
      parsedSalaryDay !== budget.data.salaryDay);

  const currencyValue: CurrencyOption =
    currencyDraft ?? ((prefs.data?.currency as CurrencyOption | undefined) ?? 'USD');
  const languageValue: Lang =
    languageDraft ?? ((prefs.data?.language as Lang | undefined) ?? 'en');
  const thresholdValue = thresholdDraft ?? prefs.data?.alertThreshold ?? 80;
  const prefsDirty =
    prefs.data !== undefined &&
    (currencyValue !== prefs.data.currency ||
      languageValue !== (prefs.data.language ?? 'en') ||
      thresholdValue !== prefs.data.alertThreshold);

  const handleSave = () => {
    if (!isValid) return;
    updateBudget.mutate(
      {
        data: {
          dailyLimit: parsedDaily,
          monthlyLimit: parsedMonthly,
          salaryAmount: parsedSalaryAmount,
          salaryDay: parsedSalaryDay,
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          queryClient.invalidateQueries({ queryKey: getGetBudgetQueryKey() });
          queryClient.invalidateQueries({
            queryKey: getGetDailySummaryQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetSpendingTipsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetSpendingStatsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetSafeToSpendQueryKey(),
          });
          setDailyDraft(null);
          setMonthlyDraft(null);
          setSalaryAmountDraft(null);
          setSalaryDayDraft(null);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  };

  const handleSavePrefs = () => {
    updatePreferences.mutate(
      {
        data: {
          currency: currencyValue,
          language: languageValue,
          alertThreshold: thresholdValue,
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Invalidate everything so currency + language flip live across the UI.
          queryClient.invalidateQueries();
          setCurrencyDraft(null);
          setLanguageDraft(null);
          setThresholdDraft(null);
          setSavedPrefs(true);
          setTimeout(() => setSavedPrefs(false), 2000);
        },
      },
    );
  };

  const toggleRule = (id: number, active: boolean) => {
    Haptics.selectionAsync();
    updateRule.mutate(
      { id, data: { active } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListRecurringExpensesQueryKey(),
          });
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          queryClient.invalidateQueries({
            queryKey: getGetDailySummaryQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetSpendingStatsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetSpendingTipsQueryKey(),
          });
        },
      },
    );
  };

  const committed = (rules.data ?? [])
    .filter((r) => r.active)
    .reduce(
      (s, r) =>
        s +
        (r.frequency === 'daily'
          ? r.amount * 30
          : r.frequency === 'weekly'
            ? r.amount * 4
            : r.frequency === 'quarterly'
              ? r.amount / 3
              : r.frequency === 'yearly'
                ? r.amount / 12
                : r.amount),
      0,
    );

  const topPad = Platform.OS === 'web' ? 67 + 12 : insets.top + 12;

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : t('budget.myAccount');

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad }]}
      keyboardShouldPersistTaps="handled"
      testID="screen-budget"
    >
      <Text style={[styles.screenTitle, { color: colors.foreground }, rtlText]}>
        {t('budget.title')}
      </Text>

      {budget.isLoading ? (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colorTokens.radius,
            },
          ]}
          testID="budget-loading"
        >
          <Skeleton width={130} height={16} />
          <Skeleton width="85%" height={12} style={{ marginTop: 2 }} />
          <Skeleton height={48} radius={12} style={{ marginTop: 14 }} />
          <Skeleton height={48} radius={12} style={{ marginTop: 6 }} />
        </View>
      ) : budget.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('budget.couldntLoad')}
          actionLabel={t('common.retry')}
          onAction={() => budget.refetch()}
        />
      ) : (
        <>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colorTokens.radius,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.foreground }, rtlText]}>
              {t('budget.spendingLimits')}
            </Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }, rtlText]}>
              {t('budget.spendingLimitsSub')}
            </Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }, rtlText]}>
                {t('budget.dailyLimit')}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  rowReverse,
                  {
                    borderColor: colors.input,
                    backgroundColor: colors.background,
                    borderRadius: colorTokens.radius - 4,
                  },
                ]}
              >
                <Text style={[styles.currency, { color: colors.mutedForeground }]}>
                  {currencySymbol(currencyValue)}
                </Text>
                <TextInput
                  value={dailyValue}
                  onChangeText={setDailyDraft}
                  keyboardType="decimal-pad"
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="80"
                  placeholderTextColor={colors.mutedForeground}
                  testID="input-daily-limit"
                />
                <Text style={[styles.per, { color: colors.mutedForeground }]}>
                  {t('budget.perDay')}
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }, rtlText]}>
                {t('budget.monthlyLimit')}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  rowReverse,
                  {
                    borderColor: colors.input,
                    backgroundColor: colors.background,
                    borderRadius: colorTokens.radius - 4,
                  },
                ]}
              >
                <Text style={[styles.currency, { color: colors.mutedForeground }]}>
                  {currencySymbol(currencyValue)}
                </Text>
                <TextInput
                  value={monthlyValue}
                  onChangeText={setMonthlyDraft}
                  keyboardType="decimal-pad"
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="2000"
                  placeholderTextColor={colors.mutedForeground}
                  testID="input-monthly-limit"
                />
                <Text style={[styles.per, { color: colors.mutedForeground }]}>
                  {t('budget.perMonth')}
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }, rtlText]}>
                {t('budget.salaryLabel')}
              </Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground, marginBottom: 0 }, rtlText]}>
                {t('budget.salarySub')}
              </Text>
              <View style={[{ flexDirection: 'row', gap: 8 }, rowReverse]}>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      flex: 1.4,
                      borderColor: colors.input,
                      backgroundColor: colors.background,
                      borderRadius: colorTokens.radius - 4,
                    },
                  ]}
                >
                  <Text style={[styles.currency, { color: colors.mutedForeground }]}>
                    {currencySymbol(currencyValue)}
                  </Text>
                  <TextInput
                    value={salaryAmountValue}
                    onChangeText={setSalaryAmountDraft}
                    keyboardType="decimal-pad"
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={t('budget.salaryAmountPlaceholder')}
                    placeholderTextColor={colors.mutedForeground}
                    testID="input-salary-amount"
                  />
                </View>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      flex: 1,
                      borderColor: colors.input,
                      backgroundColor: colors.background,
                      borderRadius: colorTokens.radius - 4,
                    },
                  ]}
                >
                  <TextInput
                    value={salaryDayValue}
                    onChangeText={setSalaryDayDraft}
                    keyboardType="number-pad"
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={t('budget.salaryDayPlaceholder')}
                    placeholderTextColor={colors.mutedForeground}
                    testID="input-salary-day"
                  />
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleSave}
              disabled={!isValid || !isDirty || updateBudget.isPending}
              style={({ pressed }) => [
                styles.saveBtn,
                rowReverse,
                {
                  backgroundColor:
                    saved && !isDirty ? colors.success : colors.primary,
                  opacity:
                    !isValid || !isDirty || updateBudget.isPending
                      ? saved
                        ? 1
                        : 0.45
                      : pressed
                        ? 0.85
                        : 1,
                },
              ]}
              testID="button-save-budget"
            >
              {updateBudget.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Ionicons
                    name={saved && !isDirty ? 'checkmark' : 'flame'}
                    size={17}
                    color={colors.primaryForeground}
                  />
                  <Text
                    style={[styles.saveText, { color: colors.primaryForeground }]}
                  >
                    {saved && !isDirty ? t('common.saved') : t('budget.saveLimits')}
                  </Text>
                </>
              )}
            </Pressable>
            {updateBudget.isError ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {t('common.saveErrorRetry')}
              </Text>
            ) : null}
          </View>

          {budget.data ? (
            <View
              style={[
                styles.hintCard,
                rowReverse,
                {
                  backgroundColor: colors.accent,
                  borderRadius: colorTokens.radius,
                },
              ]}
            >
              <Ionicons
                name="information-circle"
                size={18}
                color={colors.accentForeground}
              />
              <Text style={[styles.hintText, { color: colors.accentForeground }, rtlText]}>
                {t('budget.dailyMonthlyHint', {
                  daily: format(budget.data.dailyLimit),
                  monthly: format(budget.data.dailyLimit * 30),
                  cap: format(budget.data.monthlyLimit),
                })}
              </Text>
            </View>
          ) : null}

        </>
      )}

      {/* Rituals — recurring expenses */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colorTokens.radius,
          },
        ]}
      >
        <View style={[styles.cardHeaderRow, rowReverse]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }, rtlText]}>
            {t('budget.rituals')}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/recurring-form');
            }}
            style={({ pressed }) => [
              styles.newBtn,
              rowReverse,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            testID="button-new-ritual"
          >
            <Ionicons name="add" size={15} color={colors.accentForeground} />
            <Text style={[styles.newBtnText, { color: colors.accentForeground }]}>
              {t('common.new')}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.cardSub, { color: colors.mutedForeground }, rtlText]}>
          {rules.data && rules.data.length > 0
            ? t('budget.ritualsAutoSub', { amount: format(committed) })
            : t('budget.ritualsSub')}
        </Text>

        {rules.isLoading ? (
          <View style={{ paddingVertical: 6 }} testID="rituals-loading">
            {[0, 1].map((i) => (
              <View key={i} style={styles.ritualRow}>
                <Skeleton width={40} height={40} radius={20} />
                <View style={{ flex: 1, gap: 7 }}>
                  <Skeleton width="55%" height={14} />
                  <Skeleton width="35%" height={11} />
                </View>
                <Skeleton width={44} height={24} radius={12} />
              </View>
            ))}
          </View>
        ) : (rules.data ?? []).length === 0 ? (
          <Text style={[styles.emptyRituals, { color: colors.mutedForeground }, rtlText]}>
            {t('budget.ritualsEmpty')}
          </Text>
        ) : (
          (rules.data ?? []).map((r, i) => (
            <View
              key={r.id}
              style={[
                styles.ritualRow,
                rowReverse,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
              testID={`ritual-row-${r.id}`}
            >
              <Pressable
                onPress={() => router.push(`/recurring-form?id=${r.id}`)}
                style={({ pressed }) => [
                  styles.ritualPressable,
                  rowReverse,
                  { opacity: pressed ? 0.6 : r.active ? 1 : 0.55 },
                ]}
                testID={`ritual-edit-${r.id}`}
              >
                <CategoryIcon category={r.category} size={34} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text
                    style={[styles.ritualName, { color: colors.foreground }, rtlText]}
                    numberOfLines={1}
                  >
                    {r.description}
                  </Text>
                  <Text
                    style={[styles.ritualMeta, { color: colors.mutedForeground }, rtlText]}
                  >
                    {FREQ_LABEL[r.frequency] ?? r.frequency} · {format(r.amount)}
                    {r.active ? '' : ` · ${t('budget.paused')}`}
                  </Text>
                </View>
              </Pressable>
              <Switch
                value={r.active}
                onValueChange={(v) => toggleRule(r.id, v)}
                disabled={updateRule.isPending}
                trackColor={{ false: colors.secondary, true: colors.primary }}
                thumbColor="#FFFFFF"
                testID={`switch-ritual-${r.id}`}
              />
            </View>
          ))
        )}
      </View>

      {/* Preferences */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colorTokens.radius,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.foreground }, rtlText]}>
          {t('budget.preferences')}
        </Text>
        <Text style={[styles.cardSub, { color: colors.mutedForeground }, rtlText]}>
          {t('budget.preferencesSub')}
        </Text>

        <Text style={[styles.label, { color: colors.mutedForeground }, rtlText]}>
          {t('budget.currency')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.currencyChips}
        >
          {CURRENCY_OPTIONS.map((code) => {
            const active = currencyValue === code;
            return (
              <Pressable
                key={code}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCurrencyDraft(code);
                }}
                style={[
                  styles.currencyChip,
                  rowReverse,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                  },
                ]}
                testID={`currency-chip-${code}`}
              >
                <Text
                  style={[
                    styles.currencyChipSymbol,
                    {
                      color: active
                        ? colors.primaryForeground
                        : colors.foreground,
                    },
                  ]}
                >
                  {currencySymbol(code)}
                </Text>
                <Text
                  style={[
                    styles.currencyChipCode,
                    {
                      color: active
                        ? colors.primaryForeground
                        : colors.secondaryForeground,
                    },
                  ]}
                >
                  {code}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Language */}
        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }, rtlText]}>
          {t('budget.language')}
        </Text>
        <View style={[styles.langRow, rowReverse]}>
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = languageValue === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setLanguageDraft(opt.value);
                }}
                style={[
                  styles.langChip,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                    borderRadius: colorTokens.radius - 4,
                  },
                ]}
                testID={`language-chip-${opt.value}`}
              >
                <Text
                  style={[
                    styles.langChipText,
                    {
                      color: active
                        ? colors.primaryForeground
                        : colors.secondaryForeground,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }, rtlText]}>
          {t('budget.alertThreshold')}
        </Text>
        <View style={[styles.stepperRow, rowReverse]}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setThresholdDraft(Math.max(50, thresholdValue - 5));
            }}
            disabled={thresholdValue <= 50}
            style={({ pressed }) => [
              styles.stepBtn,
              {
                backgroundColor: colors.secondary,
                opacity: thresholdValue <= 50 ? 0.4 : pressed ? 0.7 : 1,
              },
            ]}
            testID="button-threshold-minus"
          >
            <Ionicons name="remove" size={18} color={colors.foreground} />
          </Pressable>
          <View style={styles.stepValueWrap}>
            <Text style={[styles.stepValue, { color: colors.foreground }]}>
              {lang === 'ar' ? `${thresholdValue}٪` : `${thresholdValue}%`}
            </Text>
            <Text style={[styles.stepHint, { color: colors.mutedForeground }]}>
              {t('budget.ofALimit')}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setThresholdDraft(Math.min(100, thresholdValue + 5));
            }}
            disabled={thresholdValue >= 100}
            style={({ pressed }) => [
              styles.stepBtn,
              {
                backgroundColor: colors.secondary,
                opacity: thresholdValue >= 100 ? 0.4 : pressed ? 0.7 : 1,
              },
            ]}
            testID="button-threshold-plus"
          >
            <Ionicons name="add" size={18} color={colors.foreground} />
          </Pressable>
        </View>
        <Text style={[styles.thresholdHint, { color: colors.mutedForeground }, rtlText]}>
          {t('budget.thresholdHint')}
        </Text>

        <Pressable
          onPress={handleSavePrefs}
          disabled={!prefsDirty || updatePreferences.isPending}
          style={({ pressed }) => [
            styles.saveBtn,
            rowReverse,
            {
              backgroundColor:
                savedPrefs && !prefsDirty ? colors.success : colors.primary,
              opacity:
                !prefsDirty || updatePreferences.isPending
                  ? savedPrefs
                    ? 1
                    : 0.45
                  : pressed
                    ? 0.85
                    : 1,
            },
          ]}
          testID="button-save-preferences"
        >
          {updatePreferences.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons
                name={savedPrefs && !prefsDirty ? 'checkmark' : 'options'}
                size={17}
                color={colors.primaryForeground}
              />
              <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
                {savedPrefs && !prefsDirty
                  ? t('common.saved')
                  : t('budget.savePreferences')}
              </Text>
            </>
          )}
        </Pressable>
        {updatePreferences.isError ? (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {t('common.saveErrorRetry')}
          </Text>
        ) : null}
      </View>

      {/* Account */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colorTokens.radius,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.foreground }, rtlText]}>
          {t('budget.account')}
        </Text>
        <View style={[styles.accountRow, rowReverse]}>
          {user?.profileImageUrl ? (
            <Image
              source={{ uri: user.profileImageUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              <Ionicons name="person" size={20} color={colors.mutedForeground} />
            </View>
          )}
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[styles.accountName, { color: colors.foreground }, rtlText]}>
              {displayName}
            </Text>
            {user?.email ? (
              <Text
                style={[styles.accountEmail, { color: colors.mutedForeground }, rtlText]}
                numberOfLines={1}
              >
                {user.email}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => logout()}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
            testID="button-logout"
          >
            <Ionicons name="log-out-outline" size={22} color={colors.destructive} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 130,
    gap: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  card: {
    padding: 16,
    borderWidth: 1,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  cardSub: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 8,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  newBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  emptyRituals: {
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: 'Outfit_400Regular',
    paddingVertical: 8,
  },
  ritualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  ritualPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ritualName: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  ritualMeta: {
    fontSize: 12.5,
    fontFamily: 'Outfit_400Regular',
  },
  field: {
    gap: 6,
    marginTop: 8,
  },
  label: {
    fontSize: 12.5,
    fontFamily: 'Outfit_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  currency: {
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    paddingVertical: 12,
  },
  per: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  currencyChips: {
    gap: 8,
    paddingVertical: 4,
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  langChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
  },
  langChipText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },
  currencyChipSymbol: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
  },
  currencyChipCode: {
    fontSize: 12.5,
    fontFamily: 'Outfit_500Medium',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValueWrap: {
    alignItems: 'center',
    gap: 1,
  },
  stepValue: {
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -0.4,
  },
  stepHint: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  thresholdHint: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Outfit_400Regular',
    marginTop: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 999,
  },
  saveText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
  },
  hintCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    alignItems: 'flex-start',
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Outfit_400Regular',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  accountEmail: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
});
