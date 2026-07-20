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
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetBudgetQueryKey,
  getGetDailySummaryQueryKey,
  getGetPreferencesQueryKey,
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
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'CAD', 'AUD'] as const;
type CurrencyOption = (typeof CURRENCY_OPTIONS)[number];

const FREQ_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export default function BudgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { format } = useCurrency();

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
  const [saved, setSaved] = useState(false);

  const [currencyDraft, setCurrencyDraft] = useState<CurrencyOption | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState<number | null>(null);
  const [savedPrefs, setSavedPrefs] = useState(false);

  const dailyValue =
    dailyDraft ?? (budget.data ? String(budget.data.dailyLimit) : '');
  const monthlyValue =
    monthlyDraft ?? (budget.data ? String(budget.data.monthlyLimit) : '');

  const parsedDaily = parseFloat(dailyValue.replace(',', '.'));
  const parsedMonthly = parseFloat(monthlyValue.replace(',', '.'));
  const isValid =
    !Number.isNaN(parsedDaily) &&
    parsedDaily >= 1 &&
    !Number.isNaN(parsedMonthly) &&
    parsedMonthly >= 1;
  const isDirty =
    budget.data !== undefined &&
    (parsedDaily !== budget.data.dailyLimit ||
      parsedMonthly !== budget.data.monthlyLimit);

  const currencyValue: CurrencyOption =
    currencyDraft ?? ((prefs.data?.currency as CurrencyOption | undefined) ?? 'USD');
  const thresholdValue = thresholdDraft ?? prefs.data?.alertThreshold ?? 80;
  const prefsDirty =
    prefs.data !== undefined &&
    (currencyValue !== prefs.data.currency ||
      thresholdValue !== prefs.data.alertThreshold);

  const handleSave = () => {
    if (!isValid) return;
    updateBudget.mutate(
      { data: { dailyLimit: parsedDaily, monthlyLimit: parsedMonthly } },
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
          setDailyDraft(null);
          setMonthlyDraft(null);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  };

  const handleSavePrefs = () => {
    updatePreferences.mutate(
      { data: { currency: currencyValue, alertThreshold: thresholdValue } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          queryClient.invalidateQueries({
            queryKey: getGetPreferencesQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetSpendingTipsQueryKey(),
          });
          setCurrencyDraft(null);
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
            : r.amount),
      0,
    );

  const topPad = Platform.OS === 'web' ? 67 + 12 : insets.top + 12;

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : 'My account';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad }]}
      keyboardShouldPersistTaps="handled"
      testID="screen-budget"
    >
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>
        Budget
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
          title="Couldn't load budget"
          actionLabel="Retry"
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
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Spending limits
            </Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Ember watches these and nudges you before things flare up.
            </Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Daily limit
              </Text>
              <View
                style={[
                  styles.inputWrap,
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
                  / day
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Monthly limit
              </Text>
              <View
                style={[
                  styles.inputWrap,
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
                  / month
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleSave}
              disabled={!isValid || !isDirty || updateBudget.isPending}
              style={({ pressed }) => [
                styles.saveBtn,
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
                    {saved && !isDirty ? 'Saved' : 'Save limits'}
                  </Text>
                </>
              )}
            </Pressable>
            {updateBudget.isError ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                Couldn't save — please try again.
              </Text>
            ) : null}
          </View>

          {budget.data ? (
            <View
              style={[
                styles.hintCard,
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
              <Text style={[styles.hintText, { color: colors.accentForeground }]}>
                {format(budget.data.dailyLimit)} a day adds up to about{' '}
                {format(budget.data.dailyLimit * 30)} a month — your
                monthly cap is {format(budget.data.monthlyLimit)}.
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
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Rituals
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/recurring-form');
            }}
            style={({ pressed }) => [
              styles.newBtn,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            testID="button-new-ritual"
          >
            <Ionicons name="add" size={15} color={colors.accentForeground} />
            <Text style={[styles.newBtnText, { color: colors.accentForeground }]}>
              New
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
          {rules.data && rules.data.length > 0
            ? `Auto-logged on schedule — about ${format(committed)} a month right now.`
            : 'Repeating expenses Ember logs for you automatically.'}
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
          <Text style={[styles.emptyRituals, { color: colors.mutedForeground }]}>
            Nothing repeats yet. Add rent, subscriptions or your daily coffee —
            set it once and forget it.
          </Text>
        ) : (
          (rules.data ?? []).map((r, i) => (
            <View
              key={r.id}
              style={[
                styles.ritualRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
              testID={`ritual-row-${r.id}`}
            >
              <Pressable
                onPress={() => router.push(`/recurring-form?id=${r.id}`)}
                style={({ pressed }) => [
                  styles.ritualPressable,
                  { opacity: pressed ? 0.6 : r.active ? 1 : 0.55 },
                ]}
                testID={`ritual-edit-${r.id}`}
              >
                <CategoryIcon category={r.category} size={34} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text
                    style={[styles.ritualName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {r.description}
                  </Text>
                  <Text
                    style={[styles.ritualMeta, { color: colors.mutedForeground }]}
                  >
                    {FREQ_LABEL[r.frequency] ?? r.frequency} · {format(r.amount)}
                    {r.active ? '' : ' · paused'}
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
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          Preferences
        </Text>
        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
          The currency Ember shows and how early it warns you.
        </Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Currency
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

        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>
          Alert threshold
        </Text>
        <View style={styles.stepperRow}>
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
              {thresholdValue}%
            </Text>
            <Text style={[styles.stepHint, { color: colors.mutedForeground }]}>
              of a limit
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
        <Text style={[styles.thresholdHint, { color: colors.mutedForeground }]}>
          Ember raises a warning once you've burned this share of your daily or
          monthly limit.
        </Text>

        <Pressable
          onPress={handleSavePrefs}
          disabled={!prefsDirty || updatePreferences.isPending}
          style={({ pressed }) => [
            styles.saveBtn,
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
                {savedPrefs && !prefsDirty ? 'Saved' : 'Save preferences'}
              </Text>
            </>
          )}
        </Pressable>
        {updatePreferences.isError ? (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            Couldn't save — please try again.
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
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          Account
        </Text>
        <View style={styles.accountRow}>
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
            <Text style={[styles.accountName, { color: colors.foreground }]}>
              {displayName}
            </Text>
            {user?.email ? (
              <Text
                style={[styles.accountEmail, { color: colors.mutedForeground }]}
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
