import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../contexts/AuthContext';
import { useColors } from '../contexts/ThemeContext';
import { RADIUS, FONT } from '../constants/theme';
import { formatCurrency, formatTimeAgo, getStatusLabel } from '../utils/format';
import { API_BASE_URL } from '../constants/api';

export function DashboardScreen({ navigation }: any) {
  const { user, getAccessToken } = useAuth();
  const colors = useColors();
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const baseUrl = API_BASE_URL;
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`${baseUrl}/api/mobile/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/api/mobile/orders?limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (ordersRes.ok) setRecentOrders(await ordersRes.json());
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAccessToken]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getStatusColor = (status: string) => {
    if (status === 'delivered' || status === 'confirmed') return colors.success;
    if (status === 'cancelled' || status === 'returned' || status === 'fake') return colors.danger;
    if (status === 'pending') return colors.warning;
    return colors.primary;
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <ScreenHeader
        title={user?.name || 'المالك'}
        subtitle="Sahla4Eco"
        onNotificationPress={() => navigation.navigate('NotificationsTab')}
      />

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + '15' }]}>
            <Ionicons name="wallet-outline" size={18} color={colors.success} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(stats?.today_revenue || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>إيرادات اليوم</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {String(stats?.today_orders || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>طلبات اليوم</Text>
        </View>
      </View>

      {stats && (
        <View style={styles.chipsRow}>
          {[
            { key: 'pending', label: 'معلق', count: stats.pending_count || 0, color: colors.warning },
            { key: 'confirmed', label: 'مؤكد', count: stats.confirmed_count || 0, color: colors.primary },
            { key: 'delivered', label: 'تم', count: stats.delivered_count || 0, color: colors.success },
            { key: 'cancelled', label: 'ملغي', count: stats.cancelled_count || 0, color: colors.danger },
          ].map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, { backgroundColor: c.color + '12', borderColor: c.color + '30' }]}
              onPress={() => navigation.navigate('OrdersTab', { screen: 'Orders', params: { status: c.key } })}
            >
              <View style={[styles.chipDot, { backgroundColor: c.color }]} />
              <Text style={[styles.chipCount, { color: c.color }]}>{c.count}</Text>
              <Text style={[styles.chipLabel, { color: c.color }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>آخر الطلبات</Text>
        <TouchableOpacity onPress={() => navigation.navigate('OrdersTab')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
        </TouchableOpacity>
      </View>

      {recentOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="receipt-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyText, { color: colors.text }]}>لا توجد طلبات بعد</Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>عند وصول طلب جديد، ستراه هنا</Text>
        </View>
      ) : (
        recentOrders.map((o: any) => {
          const sc = getStatusColor(o.status);
          return (
            <TouchableOpacity
              key={o.id}
              style={[styles.orderRow, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('OrdersTab', { screen: 'OrderDetail', params: { id: o.id } })}
              activeOpacity={0.7}
            >
              <View style={[styles.orderAvatar, { backgroundColor: sc + '15' }]}>
                <Text style={[styles.orderAvatarText, { color: sc }]}>
                  {o.customer_name?.charAt(0) || '?'}
                </Text>
              </View>
              <View style={styles.orderInfo}>
                <Text style={[styles.orderName, { color: colors.text }]} numberOfLines={1}>
                  {o.customer_name}
                </Text>
                <Text style={[styles.orderProduct, { color: colors.textSecondary }]} numberOfLines={1}>
                  {o.product_title}
                </Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={[styles.orderAmount, { color: colors.text }]}>
                  {formatCurrency(o.total_price)}
                </Text>
                <View style={[styles.orderStatusDot, { backgroundColor: sc }]} />
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsGrid: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, marginTop: -8,
  },
  statCard: {
    flex: 1, borderRadius: RADIUS.lg, padding: 16,
  },
  statIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: FONT.xxl, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: FONT.xs, fontWeight: '600', marginTop: 2 },
  chipsRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 16, marginTop: 12, marginBottom: 16,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipCount: { fontSize: FONT.sm, fontWeight: '800' },
  chipLabel: { fontSize: 10, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 8,
  },
  sectionTitle: { fontSize: FONT.lg, fontWeight: '700' },
  seeAll: { fontSize: FONT.sm, fontWeight: '600' },
  orderRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 6,
    padding: 12, borderRadius: RADIUS.lg,
  },
  orderAvatar: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  orderAvatarText: { fontSize: FONT.md, fontWeight: '800' },
  orderInfo: { flex: 1, marginRight: 8 },
  orderName: { fontSize: FONT.md, fontWeight: '700' },
  orderProduct: { fontSize: FONT.xs, marginTop: 1 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderAmount: { fontSize: FONT.md, fontWeight: '700' },
  orderStatusDot: { width: 7, height: 7, borderRadius: 3.5 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyText: { fontSize: FONT.md, fontWeight: '700' },
  emptyHint: { fontSize: FONT.sm, marginTop: 2 },
});
