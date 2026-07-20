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
import { dateLabel, formatPercent, toDateKey } from '@/constants/categories';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/lib/auth';
import { useCategoryName, useLang, useT, type TFunc } from '@/lib/i18n';
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

function greeting(t: TFunc): string {
  const h = new Date().getHours();
  if (h < 12) return t('today.morning');
  if (h < 18) return t('today.afternoon');
  return t('today.evening');
}

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { format } = useCurrency();
  const t = useT();
  const { lang, isRTL } = useLang();
  const categoryName = useCategoryName();
  const rtlText = isRTL
    ? ({ writingDirection: 'rtl', textAlign: 'right' } as const)
    : undefined;
  const rowReverse = isRTL ? ({ flexDirection: 'row-reverse' } as const) : undefined;

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
      <View style={[styles.header, rowReverse]}>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.greeting, { color: colors.mutedForeground }, rtlText]}
          >
            {greeting(t)}
            {user?.firstName ? `${isRTL ? '،' : ','} ${user.firstName}` : ''}
          </Text>
          <Text
            style={[styles.screenTitle, { color: colors.foreground }, rtlText]}
          >
            {t('today.title')}
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
            title={t('today.couldntLoad')}
            actionLabel={t('common.retry')}
            onAction={() => daily.refetch()}
          />
        ) : summary ? (
          <>
            {month && month.underBudgetStreak > 0 ? (
              <View
                style={[
                  styles.streakPill,
                  isRTL ? { left: 16, right: undefined } : null,
                  rowReverse,
                  { backgroundColor: colors.accent },
                ]}
                testID="streak-pill"
              >
                <Ionicons name="flame" size={12} color={colors.primary} />
                <Text style={[styles.streakText, { color: colors.accentForeground }]}>
                  {t('today.streak', { n: month.underBudgetStreak })}
                </Text>
              </View>
            ) : null}
            <AnimatedNumber
              value={summary.totalSpent}
              format={format}
              style={[styles.heroAmount, { color: colors.foreground }, rtlText]}
              testID="hero-amount"
            />
            <Text
              style={[styles.heroSub, { color: colors.mutedForeground }, rtlText]}
            >
              {t('today.ofDailyBudget', { amount: format(summary.dailyLimit) })} ·{' '}
              {summary.expenseCount}{' '}
              {summary.expenseCount === 1
                ? t('today.expenseOne')
                : t('today.expenseOther')}
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
                rtlText,
              ]}
            >
              {summary.totalSpent > summary.dailyLimit
                ? t('today.overBudget', {
                    amount: format(summary.totalSpent - summary.dailyLimit),
                  })
                : t('today.stillGlowing', { amount: format(summary.remaining) })}
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
          <View style={[styles.paydayPromptHeader, rowReverse]}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.paydayPromptTitle, { color: colors.accentForeground }, rtlText]}>
              {t('today.paydayPromptTitle')}
            </Text>
            <Pressable
              onPress={dismissPaydayPrompt}
              hitSlop={8}
              testID="payday-prompt-dismiss"
            >
              <Ionicons name="close" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={[styles.paydayPromptText, { color: colors.accentForeground }, rtlText]}>
            {t('today.paydayPromptText')}
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
              {t('today.paydayPromptCta')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Cycle counters */}
      {month ? (
        <View style={styles.section}>
          <View style={[styles.sectionHeaderRow, rowReverse]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }, rtlText]}>
              {month.cycleAnchored
                ? t('today.thisSalaryCycle')
                : t('today.thisMonth')}
            </Text>
            {month.cycleAnchored && month.daysUntilPayday !== null ? (
              <View
                style={[styles.paydayPill, rowReverse, { backgroundColor: colors.accent }]}
                testID="payday-pill"
              >
                <Ionicons name="cash-outline" size={12} color={colors.primary} />
                <Text style={[styles.paydayText, { color: colors.accentForeground }]}>
                  {month.daysUntilPayday === 1
                    ? t('today.daysToPaydayOne', { n: month.daysUntilPayday })
                    : t('today.daysToPaydayOther', { n: month.daysUntilPayday })}
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
            <View style={[styles.statGrid, rowReverse]}>
              <View style={styles.statCell}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }, rtlText]}>
                  {t('today.spentSoFar')}
                </Text>
                <AnimatedNumber
                  value={month.monthToDate}
                  format={format}
                  style={[styles.statValue, { color: colors.foreground }, rtlText]}
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
                    rtlText,
                  ]}
                >
                  {t('today.percentOf', {
                    pct: month.monthPercentUsed,
                    amount: format(month.monthlyLimit),
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.statCell,
                  isRTL ? styles.statCellRightRTL : styles.statCellRight,
                  { borderLeftColor: colors.border, borderRightColor: colors.border },
                ]}
              >
                <Text style={[styles.statLabel, { color: colors.mutedForeground }, rtlText]}>
                  {t('today.projected')}
                </Text>
                <AnimatedNumber
                  value={month.projectedMonthEnd}
                  format={format}
                  style={[
                    styles.statValue,
                    { color: overPace ? colors.destructive : colors.foreground },
                    rtlText,
                  ]}
                  testID="stat-projected"
                />
                <Text
                  style={[
                    styles.statSub,
                    { color: overPace ? colors.destructive : colors.success },
                    rtlText,
                  ]}
                >
                  {overPace ? t('today.pastCeiling') : t('today.underCeiling')}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.statGrid,
                styles.statGridBottom,
                rowReverse,
                { borderTopColor: colors.border },
              ]}
            >
              <View style={styles.statCell}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }, rtlText]}>
                  {t('today.avgPerDay')}
                </Text>
                <AnimatedNumber
                  value={month.avgPerDay}
                  format={format}
                  style={[styles.statValue, { color: colors.foreground }, rtlText]}
                  testID="stat-avg-day"
                />
                <Text style={[styles.statSub, { color: colors.mutedForeground }, rtlText]}>
                  {t('today.avgDayOf', {
                    day: month.daysElapsed,
                    total: month.daysInMonth,
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.statCell,
                  isRTL ? styles.statCellRightRTL : styles.statCellRight,
                  { borderLeftColor: colors.border, borderRightColor: colors.border },
                ]}
              >
                <Text style={[styles.statLabel, { color: colors.mutedForeground }, rtlText]}>
                  {t('today.streakLabel')}
                </Text>
                <View style={[styles.streakValueRow, rowReverse]}>
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
                <Text style={[styles.statSub, { color: colors.mutedForeground }, rtlText]}>
                  {t('today.daysUnderBudget')}
                </Text>
              </View>
            </View>
            {month.committedRemaining > 0 ? (
              <View
                style={[styles.recurringHint, { borderTopColor: colors.border }]}
                testID="committed-remaining"
              >
                <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />
                <Text style={[styles.recurringHintText, { color: colors.mutedForeground }, rtlText]}>
                  {month.cycleAnchored
                    ? month.upcomingObligations.length > 0
                      ? t('today.committedBeforePaydayNext', {
                          amount: format(month.committedRemaining),
                          next: month.upcomingObligations[0].description,
                        })
                      : t('today.committedBeforePayday', {
                          amount: format(month.committedRemaining),
                        })
                    : month.upcomingObligations.length > 0
                      ? t('today.committedBeforeMonthEndNext', {
                          amount: format(month.committedRemaining),
                          next: month.upcomingObligations[0].description,
                        })
                      : t('today.committedBeforeMonthEnd', {
                          amount: format(month.committedRemaining),
                        })}
                </Text>
              </View>
            ) : null}
            {month.activeRecurringCount > 0 ? (
              <Pressable
                onPress={() => router.push('/budget')}
                style={({ pressed }) => [
                  styles.recurringHint,
                  rowReverse,
                  {
                    borderTopColor: colors.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
                testID="link-rituals"
              >
                <Ionicons name="repeat" size={14} color={colors.primary} />
                <Text
                  style={[
                    styles.recurringHintText,
                    { color: colors.mutedForeground },
                    rtlText,
                  ]}
                >
                  {month.activeRecurringCount === 1
                    ? t('today.ritualsHintOne', {
                        n: month.activeRecurringCount,
                        amount: format(month.recurringMonthlyTotal),
                      })
                    : t('today.ritualsHintOther', {
                        n: month.activeRecurringCount,
                        amount: format(month.recurringMonthlyTotal),
                      })}
                </Text>
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
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
          <Text style={[styles.sectionTitle, { color: colors.foreground }, rtlText]}>
            {t('today.headsUp')}
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
          <Text style={[styles.sectionTitle, { color: colors.foreground }, rtlText]}>
            {t('today.whereItWent')}
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
                  rowReverse,
                  i > 0 && {
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <CategoryIcon category={c.category} size={34} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={[styles.catName, { color: colors.foreground }, rtlText]}>
                    {categoryName(c.category)}
                  </Text>
                  <Text
                    style={[styles.catPct, { color: colors.mutedForeground }, rtlText]}
                  >
                    {t('today.pctOfToday', { pct: Math.round(c.percentage) })}
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
          <Text style={[styles.sectionTitle, { color: colors.foreground }, rtlText]}>
            {t('today.thisWeek')}
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
            <View style={[styles.weekRow, rowReverse]}>
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
                      {lang === 'ar'
                        ? dateLabel(d.date, lang)
                        : dateLabel(d.date, lang).slice(0, 3)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View
              style={[
                styles.weekStats,
                rowReverse,
                { borderTopColor: colors.border },
              ]}
            >
              <View style={styles.weekStat}>
                <Text
                  style={[styles.weekStatLabel, { color: colors.mutedForeground }, rtlText]}
                >
                  {t('today.weekTotal')}
                </Text>
                <Text
                  style={[styles.weekStatValue, { color: colors.foreground }, rtlText]}
                >
                  {format(weekly.data.weekTotal)}
                </Text>
              </View>
              <View style={styles.weekStat}>
                <Text
                  style={[styles.weekStatLabel, { color: colors.mutedForeground }, rtlText]}
                >
                  {t('today.dailyAverage')}
                </Text>
                <Text
                  style={[styles.weekStatValue, { color: colors.foreground }, rtlText]}
                >
                  {format(weekly.data.dailyAverage)}
                </Text>
              </View>
              <View style={styles.weekStat}>
                <Text
                  style={[styles.weekStatLabel, { color: colors.mutedForeground }, rtlText]}
                >
                  {t('today.topCategory')}
                </Text>
                <Text
                  style={[styles.weekStatValue, { color: colors.foreground }, rtlText]}
                  numberOfLines={1}
                >
                  {weekly.data.topCategory
                    ? categoryName(weekly.data.topCategory)
                    : '—'}
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
  statCellRightRTL: {
    borderRightWidth: 1,
    paddingRight: 14,
    paddingLeft: 0,
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
