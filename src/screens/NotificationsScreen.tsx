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
import { useLang } from '../contexts/LanguageContext';
import { useNotif } from '../hooks/usePushNotifications';
import { RADIUS, FONT, TYPE } from '../constants/theme';
import { formatTimeAgo } from '../utils/format';
import type { AppNotification } from '../types';

export function NotificationsScreen({ navigation }: any) {
  const colors = useColors();
  const { t } = useLang();
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
        title={t('notif.title')}
        subtitle={unreadCount > 0 ? `${unreadCount} ${t('notif.unread')}` : undefined}
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryFaint, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full }}
              onPress={() => markAllRead().catch(() => {})}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done-outline" size={15} color={colors.primary} />
              <Text style={{ fontSize: FONT.xs, fontWeight: '700', color: colors.primary }}>{t('notif.markAll')}</Text>
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
                { backgroundColor: colors.card, borderColor: colors.border },
                !item.read && { backgroundColor: colors.primaryFaint, borderColor: colors.primary + '35' },
              ]}
              onPress={() => {
                if (item.order_id) {
                  navigation.navigate('OrdersTab', { screen: 'OrderDetail', params: { id: item.order_id } });
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.notifIcon, { backgroundColor: typeColor + '14' }]}>
                <Ionicons name={getTypeIcon(item.type)} size={18} color={typeColor} />
              </View>
              <View style={styles.notifBody}>
                <View style={styles.notifTop}>
                  <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.notifTime, TYPE.tabularNumbers, { color: colors.textMuted }]}>{formatTimeAgo(item.created_at)}</Text>
                </View>
                <Text style={[styles.notifBodyText, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
              </View>
              {!item.read && <View style={[styles.unreadDot, { backgroundColor: typeColor }]} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="notifications-off-outline" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>{t('notif.emptyTitle')}</Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>{t('notif.emptyHint')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8,
    padding: 13, borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notifIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  notifBody: { flex: 1 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  notifTitle: { fontSize: FONT.md, fontWeight: '700', flex: 1, marginRight: 8 },
  notifTime: { fontSize: 10, fontWeight: '600' },
  notifBodyText: { fontSize: FONT.sm, lineHeight: 19 },
  unreadDot: { width: 9, height: 9, borderRadius: 4.5, marginLeft: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 70, gap: 4 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: FONT.lg, fontWeight: '800', marginTop: 12 },
  emptyHint: { fontSize: FONT.sm, marginTop: 4 },
});
