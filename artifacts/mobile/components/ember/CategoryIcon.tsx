import React from 'react';
import { StyleSheet, View } from 'react-native';
import { categoryMeta } from '@/constants/categories';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  category: string;
  size?: number;
}

export function CategoryIcon({ category, size = 40 }: Props) {
  const meta = categoryMeta(category);
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${meta.color}1A`,
        },
      ]}
    >
      <Ionicons name={meta.icon} size={size * 0.5} color={meta.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
