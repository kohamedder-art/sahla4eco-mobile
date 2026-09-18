/**
 * AGENT INSTRUCTIONS — MOBILE APP NAVIGATOR
 * ----------------------------------------------------------------------------
 * THE MOBILE APP IS BASIC BY DESIGN. Do not turn it into a mini-platform.
 *
 * Store owners open this app to do ONLY TWO things:
 *   1. See and confirm orders quickly (so they don't have to open the platform).
 *   2. Receive notifications about new orders / status changes.
 *
 * NOTIFICATIONS is the hero feature — the whole app was built around it.
 * If you add screens, prefer SHELL features (e.g. settings, profile) over
 * duplicating platform functionality (analytics, marketing, billing).
 *
 * Headers MUST use primary color background with white text/icons to extend
 * into the status bar area. The Orders stack's OrderDetail MUST show a back
 * arrow even when it is the first screen in the stack (navigates to Orders).
 * ----------------------------------------------------------------------------
 */
import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/DashboardScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { TrackingScreen } from '../screens/TrackingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { useColors } from '../contexts/ThemeContext';
import { useNotif } from '../hooks/usePushNotifications';
import { useLang } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../constants/api';

const Tab = createBottomTabNavigator();
const OrdersStack = createNativeStackNavigator();

function OrdersStackScreen() {
  const colors = useColors();
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="Orders" component={OrdersScreen} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <OrdersStack.Screen name="Tracking" component={TrackingScreen} />
    </OrdersStack.Navigator>
  );
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused, color }: { name: IoniconsName; focused: boolean; color: string }) {
  return <Ionicons name={name} size={24} color={color} />;
}

export function AppNavigator() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotif();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const { t } = useLang();
  const { getAccessToken, user } = useAuth();

  // Pending-orders badge on the Orders tab (money waiting — glanceable).
  useEffect(() => {
    if (!user) {
      setPendingCount(0);
      return;
    }
    let cancelled = false;
    const fetchPending = async () => {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;
        const res = await fetch(`${API_BASE_URL}/api/mobile/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setPendingCount(Number(data.pending_count) || 0);
        }
      } catch {}
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, getAccessToken]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('tab.home'),
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStackScreen}
        options={{
          tabBarLabel: t('tab.orders'),
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'receipt' : 'receipt-outline'} focused={focused} color={color} />,
          tabBarBadge: pendingCount > 0 ? (pendingCount > 99 ? '99+' : pendingCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.notification,
            fontSize: 10,
            fontWeight: '800',
            minWidth: 18,
            height: 18,
            fontVariant: ['tabular-nums'],
          },
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          tabBarLabel: t('tab.notifications'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'notifications' : 'notifications-outline'} focused={focused} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.notification,
            fontSize: 10,
            fontWeight: '800',
            minWidth: 18,
            height: 18,
            fontVariant: ['tabular-nums'],
          },
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tab.more'),
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
