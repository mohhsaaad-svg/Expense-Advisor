import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CategoryIcon } from '@/components/ember/CategoryIcon';
import { formatMoney } from '@/constants/categories';
import { useColors } from '@/hooks/useColors';
import type { Expense } from '@workspace/api-client-react';
import { router } from 'expo-router';

export function ExpenseRow({ expense }: { expense: Expense }) {
  const colors = useColors();

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
        <Text style={[styles.cat, { color: colors.mutedForeground }]}>
          {expense.category}
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors.foreground }]}>
        {formatMoney(expense.amount)}
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
  cat: {
    fontSize: 12.5,
    fontFamily: 'Outfit_400Regular',
  },
  amount: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
});
