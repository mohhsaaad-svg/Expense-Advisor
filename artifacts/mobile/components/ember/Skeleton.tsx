import React, { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  /** Defaults to filling the parent width. */
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pulsing placeholder block used while content loads.
 * Compose a few of these to sketch the shape of the incoming content
 * (a text line, an avatar circle, a progress bar) instead of showing
 * a bare spinner.
 */
export function Skeleton({ width = '100%', height = 14, radius = 7, style }: Props) {
  const colors = useColors();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.45, { duration: 700 }),
      ),
      -1,
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.secondary,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
