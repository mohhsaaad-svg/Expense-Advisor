import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ember/EmptyState';
import { formatMoney } from '@/constants/categories';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetBudgetQueryKey,
  getGetDailySummaryQueryKey,
  getGetSpendingTipsQueryKey,
  useGetBudget,
  useUpdateBudget,
} from '@workspace/api-client-react';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

export default function BudgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const budget = useGetBudget();
  const updateBudget = useUpdateBudget();

  // Controlled-with-fallback: null means "not touched yet, show server value"
  const [dailyDraft, setDailyDraft] = useState<string | null>(null);
  const [monthlyDraft, setMonthlyDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
          setDailyDraft(null);
          setMonthlyDraft(null);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  };

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
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
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
                  $
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
                  $
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
                {formatMoney(budget.data.dailyLimit)} a day adds up to about{' '}
                {formatMoney(budget.data.dailyLimit * 30)} a month — your
                monthly cap is {formatMoney(budget.data.monthlyLimit)}.
              </Text>
            </View>
          ) : null}
        </>
      )}

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
    padding: 18,
    borderWidth: 1,
    gap: 6,
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
