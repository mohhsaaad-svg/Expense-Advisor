import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colorTokens from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated, login } = useAuth();
  const [busy, setBusy] = React.useState(false);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const handleLogin = async () => {
    setBusy(true);
    try {
      await login();
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.accent, colors.background]}
      style={styles.container}
    >
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 48 },
        ]}
      >
        <View style={styles.brand}>
          <View style={[styles.flameWrap, { backgroundColor: colors.primary }]}>
            <Ionicons name="flame" size={34} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.wordmark, { color: colors.foreground }]}>
            Ember
          </Text>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            Keep your spending{'\n'}from catching fire.
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Small daily expenses are like embers — harmless while you keep an
            eye on them, costly when you don't.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Pressable
            onPress={handleLogin}
            disabled={busy}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: colors.primary,
                borderRadius: 999,
                opacity: pressed || busy ? 0.8 : 1,
              },
            ]}
            testID="button-login"
          >
            {busy ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text
                  style={[styles.ctaText, { color: colors.primaryForeground }]}
                >
                  Sign in to continue
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.primaryForeground}
                />
              </>
            )}
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flameWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EE5C2B',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  wordmark: {
    fontSize: 30,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  hero: {
    gap: 14,
  },
  headline: {
    fontSize: 38,
    lineHeight: 44,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  sub: {
    fontSize: 16,
    lineHeight: 23,
    fontFamily: 'Outfit_400Regular',
    maxWidth: 320,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: colorTokens.radius,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
});
