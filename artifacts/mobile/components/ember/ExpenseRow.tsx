import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CategoryIcon } from '@/components/ember/CategoryIcon';
import { useColors } from '@/hooks/useColors';
import { useCurrency } from '@/hooks/useCurrency';
import { Ionicons } from '@expo/vector-icons';
import type { Expense } from '@workspace/api-client-react';
import { router } from 'expo-router';

export function ExpenseRow({ expense }: { expense: Expense }) {
  const colors = useColors();
  const { format } = useCurrency();

  return (
    <Pressable
      onPress={() => router.push(`/expense-form?id=${expense.id}`)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
      testID={`expense-row-${expense.id}`}
    >
      <CategoryIcon category={expense.category} />
      <View style={styles.mid}>
        <Text
          style={[styles.desc, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {expense.description}
        </Text>
        <View style={styles.catLine}>
          <Text style={[styles.cat, { color: colors.mutedForeground }]}>
            {expense.category}
          </Text>
          {expense.recurringId != null ? (
            <View
              style={[styles.autoBadge, { backgroundColor: colors.accent }]}
              testID={`badge-auto-${expense.id}`}
            >
              <Ionicons name="repeat" size={10} color={colors.accentForeground} />
              <Text style={[styles.autoText, { color: colors.accentForeground }]}>
                Auto
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={[styles.amount, { color: colors.foreground }]}>
        {format(expense.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  mid: {
    flex: 1,
    gap: 1,
  },
  desc: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  catLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cat: {
    fontSize: 12.5,
    fontFamily: 'Outfit_400Regular',
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  autoText: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
  },
  amount: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
});
