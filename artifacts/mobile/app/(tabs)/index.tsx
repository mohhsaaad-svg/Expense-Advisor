import React from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ember/EmptyState';
import { CategoryIcon } from '@/components/ember/CategoryIcon';
import { ProgressBar } from '@/components/ember/ProgressBar';
import { TipCard } from '@/components/ember/TipCard';
import { dateLabel, formatMoney, toDateKey } from '@/constants/categories';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import {
  useGetDailySummary,
  useGetSpendingTips,
  useGetWeeklySummary,
} from '@workspace/api-client-react';
import { Image } from 'expo-image';

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

  // Pass the device-local date explicitly — the server would otherwise
  // derive "today" in its own timezone, which drifts around midnight.
  const todayKey = toDateKey(new Date());
  const daily = useGetDailySummary({ date: todayKey });
  const weekly = useGetWeeklySummary();
  const insights = useGetSpendingTips();

  const refreshing =
    daily.isRefetching || weekly.isRefetching || insights.isRefetching;

  const onRefresh = () => {
    daily.refetch();
    weekly.refetch();
    insights.refetch();
  };

  const topPad = Platform.OS === 'web' ? 67 + 12 : insets.top + 12;
  const summary = daily.data;
  const alerts = insights.data?.alerts ?? [];
  const tips = insights.data?.tips ?? [];
  const maxDay = Math.max(1, ...(weekly.data?.days.map((d) => d.total) ?? [1]));

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
          <ActivityIndicator color={colors.primary} style={{ padding: 30 }} />
        ) : daily.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load today"
            actionLabel="Retry"
            onAction={() => daily.refetch()}
          />
        ) : summary ? (
          <>
            <Text style={[styles.heroAmount, { color: colors.foreground }]}>
              {formatMoney(summary.totalSpent)}
            </Text>
            <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
              of {formatMoney(summary.dailyLimit)} daily budget ·{' '}
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
                ? `${formatMoney(summary.totalSpent - summary.dailyLimit)} over budget`
                : `${formatMoney(summary.remaining)} still glowing`}
            </Text>
          </>
        ) : null}
      </View>

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
                  {formatMoney(c.total)}
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
                  {formatMoney(weekly.data.weekTotal)}
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
                  {formatMoney(weekly.data.dailyAverage)}
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
  card: {
    padding: 16,
    borderWidth: 1,
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
