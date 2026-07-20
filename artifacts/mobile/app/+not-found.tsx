import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useLang, useT } from '@/lib/i18n';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLang();
  const rtlText = isRTL
    ? ({ writingDirection: 'rtl', textAlign: 'center' } as const)
    : undefined;
  const rowReverse = isRTL
    ? ({ flexDirection: 'row-reverse' } as const)
    : undefined;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}>
          <Ionicons name="flame-outline" size={30} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }, rtlText]}>
          {t('notFound.title')}
        </Text>
        <Text style={[styles.message, { color: colors.mutedForeground }, rtlText]}>
          {t('notFound.body')}
        </Text>
        <Pressable
          onPress={() => router.navigate('/')}
          style={({ pressed }) => [
            styles.button,
            rowReverse,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="button-not-found-home"
        >
          <Ionicons
            name="home-outline"
            size={16}
            color={colors.primaryForeground}
          />
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {t('notFound.back')}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
    textAlign: 'center',
  },
  message: {
    fontSize: 14.5,
    lineHeight: 21,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    maxWidth: 280,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 999,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
});
