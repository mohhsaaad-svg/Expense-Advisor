import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ember/EmptyState';
import { ExpenseRow } from '@/components/ember/ExpenseRow';
import { Skeleton } from '@/components/ember/Skeleton';
import {
  CATEGORIES,
  dateLabel,
} from '@/constants/categories';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useCurrency } from '@/hooks/useCurrency';
import { Ionicons } from '@expo/vector-icons';
import { useListExpenses, type Expense } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

interface Section {
  title: string;
  total: number;
  data: Expense[];
}

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { format } = useCurrency();
  const [category, setCategory] = useState<string | null>(null);

  const query = useListExpenses(category ? { category } : undefined);

  const sections: Section[] = useMemo(() => {
    const byDate = new Map<string, Expense[]>();
    for (const e of query.data ?? []) {
      const list = byDate.get(e.date) ?? [];
      list.push(e);
      byDate.set(e.date, list);
    }
    return [...byDate.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, data]) => ({
        title: dateLabel(date),
        total: data.reduce((s, e) => s + e.amount, 0),
        data,
      }));
  }, [query.data]);

  const topPad = Platform.OS === 'web' ? 67 + 12 : insets.top + 12;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      testID="screen-expenses"
    >
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>
          Expenses
        </Text>
      </View>

      {/* Category filter chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Pressable
            onPress={() => setCategory(null)}
            style={[
              styles.chip,
              {
                backgroundColor: category === null ? colors.primary : colors.secondary,
              },
            ]}
            testID="filter-chip-all"
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    category === null
                      ? colors.primaryForeground
                      : colors.secondaryForeground,
                },
              ]}
            >
              All
            </Text>
          </Pressable>
          {CATEGORIES.map((c) => {
            const active = category === c.name;
            return (
              <Pressable
                key={c.name}
                onPress={() => setCategory(active ? null : c.name)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                  },
                ]}
                testID={`filter-chip-${c.name}`}
              >
                <Ionicons
                  name={c.icon}
                  size={14}
                  color={
                    active ? colors.primaryForeground : colors.mutedForeground
                  }
                />
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: active
                        ? colors.primaryForeground
                        : colors.secondaryForeground,
                    },
                  ]}
                >
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {query.isLoading ? (
        <View style={styles.loadingWrap} testID="expenses-loading">
          <Skeleton width={90} height={12} style={{ marginBottom: 12 }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.loadingRow}>
              <Skeleton width={40} height={40} radius={20} />
              <View style={{ flex: 1, gap: 7 }}>
                <Skeleton width="62%" height={14} />
                <Skeleton width="36%" height={11} />
              </View>
              <Skeleton width={56} height={14} />
            </View>
          ))}
        </View>
      ) : query.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load expenses"
          actionLabel="Retry"
          onAction={() => query.refetch()}
        />
      ) : sections.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title={category ? `No ${category} expenses` : 'Nothing logged yet'}
          message={
            category
              ? 'Try a different category or clear the filter.'
              : 'Log your first expense and Ember will start watching the embers for you.'
          }
          actionLabel="Add an expense"
          onAction={() => router.push('/expense-form')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={sections.length > 0}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor={colors.primary}
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: colors.mutedForeground }]}
              >
                {section.title}
              </Text>
              <Text
                style={[styles.sectionTotal, { color: colors.mutedForeground }]}
              >
                {format(section.total)}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 20 }}>
              <ExpenseRow expense={item} />
            </View>
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/expense-form');
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom:
              Platform.OS === 'web' ? 84 + 20 : Math.max(insets.bottom, 12) + 78,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
        testID="button-add-expense"
      >
        <Ionicons name="add" size={30} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  chips: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  listContent: {
    paddingBottom: 150,
  },
  loadingWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionTotal: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EE5C2B',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
