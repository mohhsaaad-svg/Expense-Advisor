import React, { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

/**
 * Counter that eases from the previously shown value (0 on mount) to `value`.
 * Pure JS driver — cheap enough for a handful of stats on screen.
 */
export function AnimatedNumber({
  value,
  format = (n: number) => String(Math.round(n)),
  duration = 900,
  style,
  testID,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value) {
      setDisplay(value);
      return;
    }
    let raf: number;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(prev + (value - prev) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <Text style={style} testID={testID}>
      {format(display)}
    </Text>
  );
}
