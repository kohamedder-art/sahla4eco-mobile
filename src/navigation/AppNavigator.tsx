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
import React from 'react';
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
import { Tile } from '../components/Gloss';
import { GRADIENTS } from '../constants/theme';
import { useColors } from '../contexts/ThemeContext';
import { useNotif } from '../hooks/usePushNotifications';

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
  if (focused) {
    return (
      <Tile colors={[...GRADIENTS.primary]} size={34} radius={11}>
        <Ionicons name={name} size={19} color="#fff" />
      </Tile>
    );
  }
  return <Ionicons name={name} size={23} color={color} />;
}

export function AppNavigator() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotif();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 12 + insets.bottom,
          height: 68,
          borderRadius: 24,
          backgroundColor: colors.card,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          paddingBottom: 0,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.14,
          shadowRadius: 16,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 3 },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'الرئيسية',
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStackScreen}
        options={{
          tabBarLabel: 'الطلبات',
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'receipt' : 'receipt-outline'} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'الإشعارات',
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
          tabBarLabel: 'المزيد',
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
