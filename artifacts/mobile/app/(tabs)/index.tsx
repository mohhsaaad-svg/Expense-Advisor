import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ember/EmptyState';
import { AnimatedNumber } from '@/components/ember/AnimatedNumber';
import { CategoryIcon } from '@/components/ember/CategoryIcon';
import { ProgressBar } from '@/components/ember/ProgressBar';
import { Skeleton } from '@/components/ember/Skeleton';
import { TipCard } from '@/components/ember/TipCard';
import { dateLabel, toDateKey } from '@/constants/categories';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';
import {
  getGetDailySummaryQueryKey,
  getGetSpendingStatsQueryKey,
  getGetSpendingTipsQueryKey,
  useGetDailySummary,
  useGetSpendingStats,
  useGetSpendingTips,
  useGetWeeklySummary,
} from '@workspace/api-client-react';
import { Image } from 'expo-image';
import { router } from 'expo-router';

const PAYDAY_PROMPT_KEY = 'ember-payday-prompt-dismissed';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { format } = useCurrency();

  // Pass the device-local date explicitly — the server would otherwise
  // derive "today" in its own timezone, which drifts around midnight.
  const todayKey = toDateKey(new Date());
  const daily = useGetDailySummary(
    { date: todayKey },
    {
      query: {
        queryKey: getGetDailySummaryQueryKey({ date: todayKey }),
        refetchInterval: 60_000,
      },
    },
  );
  const weekly = useGetWeeklySummary({ date: todayKey });
  const insights = useGetSpendingTips(
    { date: todayKey },
    {
      query: {
        queryKey: getGetSpendingTipsQueryKey({ date: todayKey }),
        refetchInterval: 60_000,
      },
    },
  );
  const stats = useGetSpendingStats(
    { date: todayKey },
    {
      query: {
        queryKey: getGetSpendingStatsQueryKey({ date: todayKey }),
        refetchInterval: 60_000,
      },
    },
  );

  // null = still loading dismissal state; avoids flashing the prompt.
  const [paydayPromptDismissed, setPaydayPromptDismissed] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(PAYDAY_PROMPT_KEY)
      .then((v) => setPaydayPromptDismissed(v === '1'))
      .catch(() => setPaydayPromptDismissed(false));
  }, []);
  const dismissPaydayPrompt = () => {
    setPaydayPromptDismissed(true);
    AsyncStorage.setItem(PAYDAY_PROMPT_KEY, '1').catch(() => {});
  };

  const refreshing =
    daily.isRefetching ||
    weekly.isRefetching ||
    insights.isRefetching ||
    stats.isRefetching;

  const onRefresh = () => {
    daily.refetch();
    weekly.refetch();
    insights.refetch();
    stats.refetch();
  };

  const topPad = Platform.OS === 'web' ? 67 + 12 : insets.top + 12;
  const summary = daily.data;
  const month = stats.data;
  const alerts = insights.data?.alerts ?? [];
  const tips = insights.data?.tips ?? [];
  const maxDay = Math.max(1, ...(weekly.data?.days.map((d) => d.total) ?? [1]));
  const overPace = month ? month.projectedMonthEnd > month.monthlyLimit : false;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      testID="screen-today"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {greeting()}
            {user?.firstName ? `, ${user.firstName}` : ''}
          </Text>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>
            Today's burn
          </Text>
        </View>
        {user?.profileImageUrl ? (
          <Image
            source={{ uri: user.profileImageUrl }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View
            style={[styles.avatar, { backgroundColor: colors.secondary }]}
          />
        )}
      </View>

      {/* Hero card */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colorTokens.radius + 6,
          },
        ]}
      >
        {daily.isLoading ? (
          <View style={{ gap: 10 }} testID="hero-loading">
            <Skeleton width={170} height={42} radius={10} />
            <Skeleton width={225} height={14} />
            <Skeleton height={12} radius={6} style={{ marginTop: 10 }} />
            <Skeleton width={150} height={14} style={{ marginTop: 4 }} />
          </View>
        ) : daily.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load today"
            actionLabel="Retry"
            onAction={() => daily.refetch()}
          />
        ) : summary ? (
          <>
            {month && month.underBudgetStreak > 0 ? (
              <View
                style={[styles.streakPill, { backgroundColor: colors.accent }]}
                testID="streak-pill"
              >
                <Ionicons name="flame" size={12} color={colors.primary} />
                <Text style={[styles.streakText, { color: colors.accentForeground }]}>
                  {month.underBudgetStreak}-day streak
                </Text>
              </View>
            ) : null}
            <AnimatedNumber
              value={summary.totalSpent}
              format={format}
              style={[styles.heroAmount, { color: colors.foreground }]}
              testID="hero-amount"
            />
            <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
              of {format(summary.dailyLimit)} daily budget ·{' '}
              {summary.expenseCount}{' '}
              {summary.expenseCount === 1 ? 'expense' : 'expenses'}
            </Text>
            <View style={{ marginTop: 16 }}>
              <ProgressBar percent={summary.percentUsed} />
            </View>
            <Text
              style={[
                styles.remaining,
                {
                  color:
                    summary.totalSpent > summary.dailyLimit
                      ? colors.destructive
                      : colors.success,
                },
              ]}
            >
              {summary.totalSpent > summary.dailyLimit
                ? `${format(summary.totalSpent - summary.dailyLimit)} over budget`
                : `${format(summary.remaining)} still glowing`}
            </Text>
          </>
        ) : null}
      </View>

      {/* Payday prompt */}
      {month && !month.cycleAnchored && paydayPromptDismissed === false ? (
        <View
          style={[
            styles.paydayPrompt,
            {
              backgroundColor: colors.accent,
              borderRadius: colorTokens.radius,
            },
          ]}
          testID="payday-prompt"
        >
          <View style={styles.paydayPromptHeader}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.paydayPromptTitle, { color: colors.accentForeground }]}>
              Budget payday to payday
            </Text>
            <Pressable
              onPress={dismissPaydayPrompt}
              hitSlop={8}
              testID="payday-prompt-dismiss"
            >
              <Ionicons name="close" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={[styles.paydayPromptText, { color: colors.accentForeground }]}>
            Set the day your salary lands and Ember budgets follow your real
            salary cycle instead of the calendar month.
          </Text>
          <Pressable
            onPress={() => router.push('/budget')}
            style={({ pressed }) => [
              styles.paydayPromptBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            testID="payday-prompt-link"
          >
            <Text style={[styles.paydayPromptBtnText, { color: colors.primaryForeground }]}>
              Set my payday
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Cycle counters */}
      {month ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {month.cycleAnchored ? 'This salary cycle' : 'This month'}
            </Text>
            {month.cycleAnchored && month.daysUntilPayday !== null ? (
              <View
                style={[styles.paydayPill, { backgroundColor: colors.accent }]}
                testID="payday-pill"
              >
                <Ionicons name="cash-outline" size={12} color={colors.primary} />
                <Text style={[styles.paydayText, { color: colors.accentForeground }]}>
                  {month.daysUntilPayday} day{month.daysUntilPayday === 1 ? '' : 's'} to payday
                </Text>
              </View>
            ) : null}
          </View>
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
            <View style={styles.statGrid}>
              <View style={styles.statCell}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  Spent so far
                </Text>
                <AnimatedNumber
                  value={month.monthToDate}
                  format={format}
                  style={[styles.statValue, { color: colors.foreground }]}
                  testID="stat-month-to-date"
                />
                <Text
                  style={[
                    styles.statSub,
                    {
                      color:
                        month.monthPercentUsed >= 90
                          ? colors.destructive
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {month.monthPercentUsed}% of {format(month.monthlyLimit)}
                </Text>
              </View>
              <View
                style={[styles.statCell, styles.statCellRight, { borderLeftColor: colors.border }]}
              >
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  Projected
                </Text>
                <AnimatedNumber
                  value={month.projectedMonthEnd}
                  format={format}
                  style={[
                    styles.statValue,
                    { color: overPace ? colors.destructive : colors.foreground },
                  ]}
                  testID="stat-projected"
                />
                <Text
                  style={[
                    styles.statSub,
                    { color: overPace ? colors.destructive : colors.success },
                  ]}
                >
                  {overPace ? 'past your ceiling' : 'under your ceiling'}
                </Text>
              </View>
            </View>
            <View style={[styles.statGrid, styles.statGridBottom, { borderTopColor: colors.border }]}>
              <View style={styles.statCell}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  Average / day
                </Text>
                <AnimatedNumber
                  value={month.avgPerDay}
                  format={format}
                  style={[styles.statValue, { color: colors.foreground }]}
                  testID="stat-avg-day"
                />
                <Text style={[styles.statSub, { color: colors.mutedForeground }]}>
                  day {month.daysElapsed} of {month.daysInMonth}
                </Text>
              </View>
              <View
                style={[styles.statCell, styles.statCellRight, { borderLeftColor: colors.border }]}
              >
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  Streak
                </Text>
                <View style={styles.streakValueRow}>
                  <AnimatedNumber
                    value={month.underBudgetStreak}
                    style={[styles.statValue, { color: colors.foreground }]}
                    testID="stat-streak"
                  />
                  <Ionicons
                    name="flame"
                    size={16}
                    color={
                      month.underBudgetStreak >= 3
                        ? colors.primary
                        : colors.mutedForeground
                    }
                  />
                </View>
                <Text style={[styles.statSub, { color: colors.mutedForeground }]}>
                  days under budget
                </Text>
              </View>
            </View>
            {month.committedRemaining > 0 ? (
              <View
                style={[styles.recurringHint, { borderTopColor: colors.border }]}
                testID="committed-remaining"
              >
                <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />
                <Text style={[styles.recurringHintText, { color: colors.mutedForeground }]}>
                  {format(month.committedRemaining)} still committed before{' '}
                  {month.cycleAnchored ? 'payday' : 'month end'}
                  {month.upcomingObligations.length > 0
                    ? ` — next: ${month.upcomingObligations[0].description}`
                    : ''}
                </Text>
              </View>
            ) : null}
            {month.activeRecurringCount > 0 ? (
              <Pressable
                onPress={() => router.push('/budget')}
                style={({ pressed }) => [
                  styles.recurringHint,
                  {
                    borderTopColor: colors.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
                testID="link-rituals"
              >
                <Ionicons name="repeat" size={14} color={colors.primary} />
                <Text style={[styles.recurringHintText, { color: colors.mutedForeground }]}>
                  {month.activeRecurringCount} ritual
                  {month.activeRecurringCount === 1 ? '' : 's'} auto-logging ≈{' '}
                  {format(month.recurringMonthlyTotal)}/mo
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.mutedForeground}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Alerts & tips */}
      {alerts.length > 0 || tips.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Heads up
          </Text>
          <View style={{ gap: 10 }}>
            {alerts.map((a) => (
              <TipCard
                key={a.id}
                type={a.type}
                title={a.title}
                message={a.message}
              />
            ))}
            {tips.slice(0, 3).map((t) => (
              <TipCard
                key={t.id}
                type={t.type}
                title={t.title}
                message={t.message}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Category breakdown */}
      {summary && summary.categories.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Where it went
          </Text>
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
            {summary.categories.map((c, i) => (
              <View
                key={c.category}
                style={[
                  styles.catRow,
                  i > 0 && {
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <CategoryIcon category={c.category} size={34} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={[styles.catName, { color: colors.foreground }]}>
                    {c.category}
                  </Text>
                  <Text
                    style={[styles.catPct, { color: colors.mutedForeground }]}
                  >
                    {Math.round(c.percentage)}% of today
                  </Text>
                </View>
                <Text style={[styles.catTotal, { color: colors.foreground }]}>
                  {format(c.total)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Week strip */}
      {weekly.data ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            This week
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colorTokens.radius,
                gap: 14,
              },
            ]}
          >
            <View style={styles.weekRow}>
              {weekly.data.days.map((d) => {
                const isToday = d.date === todayKey;
                const h = Math.max(6, Math.round((d.total / maxDay) * 64));
                return (
                  <View key={d.date} style={styles.dayCol}>
                    <View style={styles.barZone}>
                      <View
                        style={{
                          height: h,
                          width: 14,
                          borderRadius: 7,
                          backgroundColor: isToday
                            ? colors.primary
                            : colors.secondary,
                        }}
                      />
                    </View>
                    <Text
                      style={[
                        styles.dayLabel,
                        {
                          color: isToday
                            ? colors.primary
                            : colors.mutedForeground,
                          fontFamily: isToday
                            ? 'Outfit_600SemiBold'
                            : 'Outfit_400Regular',
                        },
                      ]}
                    >
                      {dateLabel(d.date).slice(0, 3)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={[styles.weekStats, { borderTopColor: colors.border }]}>
              <View style={styles.weekStat}>
                <Text
                  style={[styles.weekStatLabel, { color: colors.mutedForeground }]}
                >
                  Week total
                </Text>
                <Text
                  style={[styles.weekStatValue, { color: colors.foreground }]}
                >
                  {format(weekly.data.weekTotal)}
                </Text>
              </View>
              <View style={styles.weekStat}>
                <Text
                  style={[styles.weekStatLabel, { color: colors.mutedForeground }]}
                >
                  Daily average
                </Text>
                <Text
                  style={[styles.weekStatValue, { color: colors.foreground }]}
                >
                  {format(weekly.data.dailyAverage)}
                </Text>
              </View>
              <View style={styles.weekStat}>
                <Text
                  style={[styles.weekStatLabel, { color: colors.mutedForeground }]}
                >
                  Top category
                </Text>
                <Text
                  style={[styles.weekStatValue, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {weekly.data.topCategory ?? '—'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 130,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginTop: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  heroCard: {
    padding: 22,
    borderWidth: 1,
    shadowColor: '#2E241F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  streakPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  streakText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  heroAmount: {
    fontSize: 46,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  remaining: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paydayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  paydayText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  paydayPrompt: {
    padding: 16,
    gap: 10,
    marginBottom: 24,
  },
  paydayPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paydayPromptTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  paydayPromptText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Outfit_400Regular',
  },
  paydayPromptBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  paydayPromptBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  card: {
    padding: 16,
    borderWidth: 1,
  },
  statGrid: {
    flexDirection: 'row',
  },
  statGridBottom: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  statCell: {
    flex: 1,
    gap: 3,
    paddingRight: 10,
  },
  statCellRight: {
    borderLeftWidth: 1,
    paddingLeft: 14,
    paddingRight: 0,
  },
  statLabel: {
    fontSize: 11.5,
    fontFamily: 'Outfit_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -0.4,
  },
  statSub: {
    fontSize: 11.5,
    fontFamily: 'Outfit_500Medium',
  },
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recurringHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  recurringHintText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: 'Outfit_500Medium',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  catName: {
    fontSize: 14.5,
    fontFamily: 'Outfit_500Medium',
  },
  catPct: {
    fontSize: 12.5,
    fontFamily: 'Outfit_400Regular',
  },
  catTotal: {
    fontSize: 14.5,
    fontFamily: 'Outfit_600SemiBold',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  barZone: {
    height: 64,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 11,
  },
  weekStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  weekStat: {
    flex: 1,
    gap: 2,
  },
  weekStatLabel: {
    fontSize: 11.5,
    fontFamily: 'Outfit_400Regular',
  },
  weekStatValue: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
});
