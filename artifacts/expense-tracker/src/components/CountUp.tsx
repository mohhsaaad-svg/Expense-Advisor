import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

/**
 * Animated counter: eases from the previously shown value (0 on mount) to
 * `value`. Respects prefers-reduced-motion.
 */
export function CountUp({
  value,
  format,
  duration = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const lang = useLang();
  const fmt =
    format ??
    ((n: number) =>
      new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : "en-US").format(
        Math.round(n),
      ));
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value) {
      setDisplay(value);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      prevRef.current = value;
      setDisplay(value);
      return;
    }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
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

  return <span className={className}>{fmt(display)}</span>;
}
