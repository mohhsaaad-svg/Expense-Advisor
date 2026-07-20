import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}>
          <Ionicons name="flame-outline" size={30} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Nothing burning here
        </Text>
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          This screen doesn&apos;t exist — the embers must have drifted.
        </Text>
        <Pressable
          onPress={() => router.navigate('/')}
          style={({ pressed }) => [
            styles.button,
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
            Back to Today
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
