import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useLang } from '@/lib/i18n';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  type: string; // alert | warning | tip | positive
  title: string;
  message: string;
}

export function TipCard({ type, title, message }: Props) {
  const colors = useColors();
  const { isRTL } = useLang();
  const rtlText = isRTL
    ? ({ writingDirection: 'rtl', textAlign: 'right' } as const)
    : undefined;

  const meta: Record<string, { icon: IoniconName; color: string }> = {
    alert: { icon: 'alert-circle', color: colors.destructive },
    warning: { icon: 'warning', color: colors.warning },
    positive: { icon: 'checkmark-circle', color: colors.success },
    tip: { icon: 'bulb', color: colors.accentForeground },
  };
  const m = meta[type] ?? meta.tip;

  return (
    <View
      style={[
        styles.card,
        isRTL && { flexDirection: 'row-reverse' },
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colorTokens.radius,
        },
      ]}
      testID={`tip-card-${type}`}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: `${m.color}14` }]}
      >
        <Ionicons name={m.icon} size={18} color={m.color} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }, rtlText]}>
          {title}
        </Text>
        <Text style={[styles.message, { color: colors.mutedForeground }, rtlText]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Outfit_400Regular',
  },
});
