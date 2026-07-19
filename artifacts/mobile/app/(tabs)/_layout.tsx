import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Redirect, Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

// IMPORTANT: iOS 26 uses NativeTabs for native tabs with liquid glass support.
// NativeTabs intentionally does NOT use custom design tokens — liquid glass
// is a system-level appearance provided by iOS and cannot be overridden.
// Custom brand colors are applied only on the ClassicTabLayout path (older iOS / Android / web).
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'flame', selected: 'flame.fill' }} />
        <Label>Today</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="expenses">
        <Icon sf="list.bullet" />
        <Label>Expenses</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach">
        <Icon
          sf={{
            default: 'bubble.left.and.bubble.right',
            selected: 'bubble.left.and.bubble.right.fill',
          }}
        />
        <Label>Coach</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="goals">
        <Icon sf="target" />
        <Label>Goals</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="budget">
        <Icon sf={{ default: 'chart.pie', selected: 'chart.pie.fill' }} />
        <Label>Budget</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: 'Outfit_500Medium',
          fontSize: 11,
        },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? 'flame.fill' : 'flame'}
                tintColor={color}
                size={24}
              />
            ) : (
              <Ionicons
                name={focused ? 'flame' : 'flame-outline'}
                size={23}
                color={color}
              />
            ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="list.bullet" tintColor={color} size={24} />
            ) : (
              <Ionicons
                name={focused ? 'receipt' : 'receipt-outline'}
                size={22}
                color={color}
              />
            ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={
                  focused
                    ? 'bubble.left.and.bubble.right.fill'
                    : 'bubble.left.and.bubble.right'
                }
                tintColor={color}
                size={24}
              />
            ) : (
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={22}
                color={color}
              />
            ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="target" tintColor={color} size={24} />
            ) : (
              <Ionicons
                name={focused ? 'trophy' : 'trophy-outline'}
                size={22}
                color={color}
              />
            ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? 'chart.pie.fill' : 'chart.pie'}
                tintColor={color}
                size={24}
              />
            ) : (
              <Ionicons
                name={focused ? 'pie-chart' : 'pie-chart-outline'}
                size={22}
                color={color}
              />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
