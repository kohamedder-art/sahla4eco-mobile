import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ScreenHeader } from '../components/ScreenHeader';
import { Gloss, GlossButton, Tile } from '../components/Gloss';
import { useAuth } from '../contexts/AuthContext';
import { useColors } from '../contexts/ThemeContext';
import { RADIUS, FONT, TYPE, GRADIENTS, SHADOW } from '../constants/theme';
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
                <View style={[styles.skel, { backgroundColor: colors.border, width: '70%', height: 24, borderRadius: 6 }]} />
                <View style={[styles.skel, { backgroundColor: colors.border, width: '50%', height: 12, borderRadius: 4, marginTop: 8 }]} />
              </View>
            ))}
          </View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.skel, { backgroundColor: colors.border, width: 46, height: 46, borderRadius: 23 }]} />
              <View style={{ flex: 1 }}>
                <View style={[styles.skel, { backgroundColor: colors.border, width: '55%', height: 14, borderRadius: 4 }]} />
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
        {/* TODAY hero */}
        <LinearGradient
          colors={[...GRADIENTS.header]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Gloss radius={RADIUS.xl} />
          <View style={styles.heroCol}>
            <Text style={[styles.heroValue, TYPE.tabularNumbers]}>{formatCurrency(stats?.today_revenue || 0)}</Text>
            <Text style={styles.heroLabel}>إيرادات اليوم</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroCol}>
            <Text style={[styles.heroValue, TYPE.tabularNumbers]}>{String(stats?.today_orders || 0)}</Text>
            <Text style={styles.heroLabel}>طلبات اليوم</Text>
          </View>
          <View style={styles.heroDivider} />
          <TouchableOpacity
            style={styles.heroCol}
            onPress={() => navigation.navigate('OrdersTab', { screen: 'Orders', params: { status: 'pending' } })}
            activeOpacity={0.7}
          >
            <View style={styles.pendingPill}>
              <Text style={[styles.heroValue, TYPE.tabularNumbers]}>{String(pendingCount || 0)}</Text>
            </View>
            <Text style={styles.heroLabel}>بانتظارك</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Status counters */}
        {stats && (
          <View style={styles.counters}>
            {[
              { key: 'pending', label: 'معلق', count: stats.pending_count || 0, colors: [...GRADIENTS.warning] as [string, string], icon: 'time-outline' },
              { key: 'confirmed', label: 'مؤكد', count: stats.confirmed_count || 0, colors: [...GRADIENTS.primary] as [string, string], icon: 'checkmark-circle-outline' },
              { key: 'delivered', label: 'تم', count: stats.delivered_count || 0, colors: [...GRADIENTS.success] as [string, string], icon: 'bag-check-outline' },
              { key: 'cancelled', label: 'ملغي', count: stats.cancelled_count || 0, colors: [...GRADIENTS.danger] as [string, string], icon: 'close-circle-outline' },
            ].map((c) => (
              <TouchableOpacity
                key={c.key}
                style={[styles.counter, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('OrdersTab', { screen: 'Orders', params: { status: c.key } })}
                activeOpacity={0.75}
              >
                <Tile colors={c.colors} size={34} radius={11}>
                  <Ionicons name={c.icon as any} size={17} color="#fff" />
                </Tile>
                <Text style={[styles.counterCount, TYPE.tabularNumbers, { color: colors.text }]}>{c.count}</Text>
                <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action queue */}
        {pendingOrders.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              يحتاج تأكيدك ({pendingOrders.length})
            </Text>
            {pendingOrders.slice(0, 3).map((o: any) => (
              <View key={o.id} style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.warning + '55' }]}>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionName, { color: colors.text }]} numberOfLines={1}>
                    {o.customer_name}
                  </Text>
                  <Text style={[styles.actionMeta, TYPE.tabularNumbers, { color: colors.textSecondary }]} numberOfLines={1}>
                    #{o.id} · {formatCurrency(o.total_price)} · {formatTimeAgo(o.created_at)}
                  </Text>
                </View>
                <GlossButton
                  colors={[...GRADIENTS.success]}
                  label="تأكيد"
                  onPress={() => quickConfirm(o.id)}
                  disabled={confirmingId === o.id}
                  style={{ minWidth: 92 }}
                />
              </View>
            ))}
          </View>
        )}

        {/* Recent, grouped by day */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>أحدث الطلبات</Text>
          {recentOrders.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Tile colors={[...GRADIENTS.primary]} size={56} radius={18}>
                <Ionicons name="bag-outline" size={26} color="#fff" />
              </Tile>
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
                      <View style={[styles.avatar, { backgroundColor: sc + '16' }]}>
                        <Text style={[styles.avatarText, { color: sc }]}>
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
                        <View style={[styles.statusPill, { backgroundColor: sc + '16' }]}>
                          <View style={[styles.statusDot, { backgroundColor: sc }]} />
                          <Text style={[styles.rowStatus, { color: sc }]}>{getStatusLabel(o.status)}</Text>
                        </View>
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
          <Text style={[styles.allBtnText, { color: colors.primary }]}>عرض كل الطلبات</Text>
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  hero: {
    flexDirection: 'row', alignItems: 'stretch',
    borderRadius: RADIUS.xl, paddingVertical: 18,
    overflow: 'hidden',
    ...SHADOW.button,
  },
  heroCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 2 },
  heroValue: { fontSize: 21, fontWeight: '800', color: '#fff' },
  heroLabel: { fontSize: FONT.sm, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  pendingPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 2,
  },
  counters: { flexDirection: 'row', gap: 8, marginTop: 12 },
  counter: {
    flex: 1, alignItems: 'center', paddingVertical: 12, gap: 5,
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
  },
  counterCount: { fontSize: FONT.lg, fontWeight: '800' },
  counterLabel: { fontSize: FONT.xs, fontWeight: '600' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: FONT.lg, fontWeight: '800', marginBottom: 10 },
  dayLabel: { fontSize: FONT.xs, fontWeight: '700', marginTop: 4, marginBottom: 6 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 13, borderRadius: RADIUS.lg, marginBottom: 8,
    borderWidth: 1,
  },
  actionInfo: { flex: 1 },
  actionName: { fontSize: FONT.md, fontWeight: '700' },
  actionMeta: { fontSize: FONT.xs, marginTop: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, padding: 12,
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center', marginRight: 11,
  },
  avatarText: { fontSize: FONT.lg, fontWeight: '800' },
  rowInfo: { flex: 1, marginRight: 8 },
  rowName: { fontSize: FONT.md, fontWeight: '700' },
  rowSub: { fontSize: FONT.xs, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 5 },
  rowAmount: { fontSize: FONT.md, fontWeight: '800' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  rowStatus: { fontSize: 10, fontWeight: '700' },
  allBtn: { borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  allBtnText: { fontSize: FONT.md, fontWeight: '800' },
  emptyState: {
    alignItems: 'center', paddingVertical: 40,
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, gap: 4,
  },
  emptyText: { fontSize: FONT.md, fontWeight: '800', marginTop: 12 },
  emptyHint: { fontSize: FONT.sm, marginTop: 4 },
  skel: {},
});
