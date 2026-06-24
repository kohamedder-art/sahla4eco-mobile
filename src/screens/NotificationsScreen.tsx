/**
 * AGENT INSTRUCTIONS — NOTIFICATIONS SCREEN
 * ----------------------------------------------------------------------------
 * This is the hero feature of the app. The whole app was built around
 * notifications. Keep this screen focused: list notifications, mark all
 * read, tap to open the related order. Do not add marketing banners,
 * "tips", or promotional content.
 * ----------------------------------------------------------------------------
 */
import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { useColors } from '../contexts/ThemeContext';
import { useNotif } from '../hooks/usePushNotifications';
import { RADIUS, FONT } from '../constants/theme';
import { formatTimeAgo } from '../utils/format';
import type { AppNotification } from '../types';

export function NotificationsScreen({ navigation }: any) {
  const colors = useColors();
  const { notifications, unreadCount, refresh, markAllRead } = useNotif();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'new_order': return colors.success;
      case 'status_change': return colors.primary;
      case 'low_stock': return colors.warning;
      case 'flagged_order': return colors.danger;
      case 'ai_alert': return colors.info;
      default: return colors.textMuted;
    }
  };

  const getTypeIcon = (type: string): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (type) {
      case 'new_order': return 'bag-check-outline';
      case 'status_change': return 'swap-horizontal-outline';
      case 'low_stock': return 'alert-circle-outline';
      case 'flagged_order': return 'flag-outline';
      case 'ai_alert': return 'hardware-chip-outline';
      default: return 'notifications-outline';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="الإشعارات"
        subtitle={unreadCount > 0 ? `${unreadCount} غير مقروء` : undefined}
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm }}
              onPress={() => markAllRead().catch(() => {})}
            >
              <Ionicons name="checkmark-done-outline" size={14} color="#fff" />
              <Text style={{ fontSize: FONT.xs, fontWeight: '600', color: '#fff' }}>تحديد الكل</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const typeColor = getTypeColor(item.type);
          return (
            <TouchableOpacity
              style={[
                styles.notifRow,
                { backgroundColor: colors.card },
                !item.read && { borderLeftColor: typeColor },
              ]}
              onPress={() => {
                if (item.order_id) {
                  navigation.navigate('OrdersTab', { screen: 'OrderDetail', params: { id: item.order_id } });
                }
              }}
            >
              <View style={[styles.notifIcon, { backgroundColor: typeColor + '15' }]}>
                <Ionicons name={getTypeIcon(item.type)} size={16} color={typeColor} />
              </View>
              <View style={styles.notifBody}>
                <View style={styles.notifTop}>
                  <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.notifTime, { color: colors.textMuted }]}>{formatTimeAgo(item.created_at)}</Text>
                </View>
                <Text style={[styles.notifBodyText, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
              </View>
              {!item.read && <View style={[styles.unreadDot, { backgroundColor: typeColor }]} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="notifications-off-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>لا توجد إشعارات</Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>عند وصول إشعار جديد، ستراه هنا</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 6,
    padding: 12, borderRadius: RADIUS.lg, borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  notifIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  notifBody: { flex: 1 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  notifTitle: { fontSize: FONT.sm, fontWeight: '700', flex: 1, marginRight: 6 },
  notifTime: { fontSize: 10, fontWeight: '500' },
  notifBodyText: { fontSize: FONT.xs, lineHeight: 16 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyText: { fontSize: FONT.md, fontWeight: '700' },
  emptyHint: { fontSize: FONT.sm, marginTop: 2 },
});
