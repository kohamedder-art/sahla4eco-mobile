import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../contexts/AuthContext';
import { useColors } from '../contexts/ThemeContext';
import { RADIUS, FONT, TYPE } from '../constants/theme';
import { formatCurrency, formatTimeAgo, getStatusLabel } from '../utils/format';
import { API_BASE_URL } from '../constants/api';

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'صباح الخير';
  if (h >= 12 && h < 17) return 'نهارك سعيد';
  if (h >= 17 && h < 22) return 'مساء الخير';
  return 'مساء النور';
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return 'اليوم';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'أمس';
  return d.toLocaleDateString('ar-DZ', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function DashboardScreen({ navigation }: any) {
  const { user, getAccessToken } = useAuth();
  const colors = useColors();
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const baseUrl = API_BASE_URL;
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`${baseUrl}/api/mobile/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/api/mobile/orders?limit=12`, { headers: { Authorization: `Bearer ${token}` } }),
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

  const quickConfirm = async (id: number) => {
    setConfirmingId(id);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/mobile/orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        fetchData();
      }
    } catch {} finally {
      setConfirmingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'delivered' || status === 'confirmed') return colors.success;
    if (status === 'cancelled' || status === 'returned' || status === 'fake') return colors.danger;
    if (status === 'pending') return colors.warning;
    return colors.primary;
  };

  const pendingOrders = recentOrders.filter((o) => o && o.status === 'pending');
  const pendingCount = stats?.pending_count ?? pendingOrders.length;

  // Group recent orders by day for section headers
  const groups: { label: string; items: any[] }[] = [];
  for (const o of recentOrders.slice(0, 8)) {
    if (!o) continue;
    const label = dayLabel(o.created_at);
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(o);
    else groups.push({ label, items: [o] });
  }

  const goDetail = (id: number) =>
    navigation.navigate('OrdersTab', { screen: 'OrderDetail', params: { id } });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title={`${greeting()} 👋`} subtitle="جاري تحميل متجرك…" />
        <View style={styles.content}>
          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.heroCol}>
                <View style={[styles.skel, { backgroundColor: colors.border, width: '70%', height: 22, borderRadius: 6 }]} />
                <View style={[styles.skel, { backgroundColor: colors.border, width: '50%', height: 11, borderRadius: 4, marginTop: 8 }]} />
              </View>
            ))}
          </View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.skel, { backgroundColor: colors.border, width: 44, height: 44, borderRadius: 22 }]} />
              <View style={{ flex: 1 }}>
                <View style={[styles.skel, { backgroundColor: colors.border, width: '55%', height: 13, borderRadius: 4 }]} />
                <View style={[styles.skel, { backgroundColor: colors.border, width: '75%', height: 11, borderRadius: 4, marginTop: 6 }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <ScreenHeader
        title={`${greeting()}، ${user?.name?.split(' ')[0] || 'المالك'}`}
        subtitle={new Date().toLocaleDateString('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long' })}
        onNotificationPress={() => navigation.navigate('NotificationsTab')}
      />

      <View style={styles.content}>
        {/* TODAY hero: one card, three columns */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.heroCol]}>
            <Text style={[styles.heroValue, TYPE.tabularNumbers, { color: colors.success }]}>
              {formatCurrency(stats?.today_revenue || 0)}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>إيرادات اليوم</Text>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
          <View style={styles.heroCol}>
            <Text style={[styles.heroValue, TYPE.tabularNumbers, { color: colors.primary }]}>
              {String(stats?.today_orders || 0)}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>طلبات اليوم</Text>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.heroCol}
            onPress={() => navigation.navigate('OrdersTab', { screen: 'Orders', params: { status: 'pending' } })}
            activeOpacity={0.7}
          >
            <Text style={[styles.heroValue, TYPE.tabularNumbers, { color: pendingCount > 0 ? colors.warning : colors.text }]}>
              {String(pendingCount || 0)}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>بانتظارك</Text>
          </TouchableOpacity>
        </View>

        {/* Action queue */}
        {pendingOrders.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              يحتاج تأكيدك ({pendingOrders.length})
            </Text>
            {pendingOrders.slice(0, 3).map((o: any) => (
              <View key={o.id} style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity style={styles.actionInfo} onPress={() => goDetail(o.id)} activeOpacity={0.7}>
                  <Text style={[styles.actionName, { color: colors.text }]} numberOfLines={1}>
                    {o.customer_name}
                  </Text>
                  <Text style={[styles.actionMeta, TYPE.tabularNumbers, { color: colors.textSecondary }]} numberOfLines={1}>
                    {formatCurrency(o.total_price)} · {formatTimeAgo(o.created_at)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.success }]}
                  onPress={() => quickConfirm(o.id)}
                  disabled={confirmingId === o.id}
                  activeOpacity={0.85}
                >
                  {confirmingId === o.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmText}>تأكيد</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Recent, grouped by day */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>أحدث الطلبات</Text>
          {recentOrders.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="bag-outline" size={30} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.text }]}>لا توجد طلبات بعد</Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>أول طلب يوصلك راح يظهر هنا مباشرة</Text>
            </View>
          ) : (
            groups.map((g) => (
              <View key={g.label}>
                <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{g.label}</Text>
                {g.items.map((o: any) => {
                  const sc = getStatusColor(o.status);
                  return (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => goDetail(o.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.avatar, { backgroundColor: colors.borderLight }]}>
                        <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                          {o.customer_name?.charAt(0) || '?'}
                        </Text>
                      </View>
                      <View style={styles.rowInfo}>
                        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                          {o.customer_name}
                        </Text>
                        <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                          {o.product_title}
                        </Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={[styles.rowAmount, TYPE.tabularNumbers, { color: colors.text }]}>
                          {formatCurrency(o.total_price)}
                        </Text>
                        <Text style={[styles.rowStatus, { color: sc }]}>{getStatusLabel(o.status)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={[styles.allBtn, { backgroundColor: colors.borderLight }]}
          onPress={() => navigation.navigate('OrdersTab')}
          activeOpacity={0.7}
        >
          <Text style={[styles.allBtnText, { color: colors.text }]}>عرض كل الطلبات</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  content: { paddingHorizontal: 16, paddingTop: 6 },
  hero: {
    flexDirection: 'row', alignItems: 'stretch',
    borderRadius: RADIUS.lg, paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroDivider: { width: StyleSheet.hairlineWidth, marginVertical: 2 },
  heroValue: { fontSize: 20, fontWeight: '700' },
  heroLabel: { fontSize: FONT.sm, fontWeight: '400', marginTop: 4 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: FONT.lg, fontWeight: '700', marginBottom: 10 },
  dayLabel: { fontSize: FONT.xs, fontWeight: '600', marginTop: 6, marginBottom: 6 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 13, borderRadius: RADIUS.lg, marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionInfo: { flex: 1 },
  actionName: { fontSize: FONT.md, fontWeight: '600' },
  actionMeta: { fontSize: FONT.xs, marginTop: 2 },
  confirmBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: RADIUS.md },
  confirmText: { color: '#fff', fontSize: FONT.sm, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, padding: 12,
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 11,
  },
  avatarText: { fontSize: FONT.lg, fontWeight: '700' },
  rowInfo: { flex: 1, marginRight: 8 },
  rowName: { fontSize: FONT.md, fontWeight: '600' },
  rowSub: { fontSize: FONT.xs, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 3 },
  rowAmount: { fontSize: FONT.md, fontWeight: '700' },
  rowStatus: { fontSize: FONT.xs, fontWeight: '600' },
  allBtn: { borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', marginTop: 6 },
  allBtnText: { fontSize: FONT.md, fontWeight: '700' },
  emptyState: {
    alignItems: 'center', paddingVertical: 40,
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
  },
  emptyText: { fontSize: FONT.md, fontWeight: '700', marginTop: 10 },
  emptyHint: { fontSize: FONT.sm, marginTop: 4 },
  skel: {},
});
