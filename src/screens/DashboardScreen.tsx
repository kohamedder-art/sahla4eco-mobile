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
import { useLang } from '../contexts/LanguageContext';
import { RADIUS, FONT, TYPE, SHADOW } from '../constants/theme';
import { formatCurrency, formatTimeAgo, getStatusLabel } from '../utils/format';
import { API_BASE_URL } from '../constants/api';

export function DashboardScreen({ navigation }: any) {
  const { user, getAccessToken } = useAuth();
  const colors = useColors();
  const { t, locale } = useLang();
  const dateTag = locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-DZ' : 'en';

  const greeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return t('dash.morning');
    if (h >= 12 && h < 17) return t('dash.midday');
    if (h >= 17 && h < 22) return t('dash.evening');
    return t('dash.night');
  };

  const dayLabel = (dateStr: string): string => {
    const d = new Date(dateStr);
    const now = new Date();
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, now)) return t('dash.today');
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (sameDay(d, yesterday)) return t('dash.yesterday');
    return d.toLocaleDateString(dateTag, { weekday: 'long', day: 'numeric', month: 'short' });
  };
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
        <ScreenHeader title={`${greeting()} 👋`} subtitle={t('dash.loadingStore')} />
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
        title={`${greeting()}، ${user?.name?.split(' ')[0] || t('settings.owner')}`}
        subtitle={new Date().toLocaleDateString(dateTag, { weekday: 'long', day: 'numeric', month: 'long' })}
        onNotificationPress={() => navigation.navigate('NotificationsTab')}
      />

      <View style={styles.content}>
        {/* TODAY hero */}
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <View style={styles.heroCol}>
            <Text style={[styles.heroValue, TYPE.tabularNumbers]}>{formatCurrency(stats?.today_revenue || 0)}</Text>
            <Text style={styles.heroLabel}>{t('dash.todayRevenue')}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroCol}>
            <Text style={[styles.heroValue, TYPE.tabularNumbers]}>{String(stats?.today_orders || 0)}</Text>
            <Text style={styles.heroLabel}>{t('dash.todayOrders')}</Text>
          </View>
          <View style={styles.heroDivider} />
          <TouchableOpacity
            style={[styles.heroCol, styles.heroPending]}
            onPress={() => navigation.navigate('OrdersTab', { screen: 'Orders', params: { status: 'pending' } })}
            activeOpacity={0.7}
          >
            <Text style={[styles.heroValue, TYPE.tabularNumbers, { color: '#fde68a' }]}>{String(pendingCount || 0)}</Text>
            <Text style={styles.heroLabel}>{t('dash.waiting')}</Text>
          </TouchableOpacity>
        </View>

        {/* Status counters — full-bleed snap carousel */}
        {stats && (
          <View style={styles.countersBleed}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.counters}
            snapToInterval={148}
            decelerationRate="fast"
          >
            {[
              { key: 'pending', label: t('dash.pending'), count: stats.pending_count || 0, bg: colors.warningLight, fg: colors.warning, icon: 'time-outline' },
              { key: 'confirmed', label: t('dash.confirmed'), count: stats.confirmed_count || 0, bg: colors.primaryLight, fg: colors.primary, icon: 'checkmark-circle-outline' },
              { key: 'delivered', label: t('dash.delivered'), count: stats.delivered_count || 0, bg: colors.successLight, fg: colors.success, icon: 'bag-check-outline' },
              { key: 'cancelled', label: t('dash.cancelled'), count: stats.cancelled_count || 0, bg: colors.dangerLight, fg: colors.danger, icon: 'close-circle-outline' },
            ].map((c) => (
              <TouchableOpacity
                key={c.key}
                style={[styles.counter, { backgroundColor: c.bg }]}
                onPress={() => navigation.navigate('OrdersTab', { screen: 'Orders', params: { status: c.key } })}
                activeOpacity={0.75}
              >
                <View style={styles.counterTop}>
                  <Ionicons name={c.icon as any} size={18} color={c.fg} />
                  <Text style={[styles.counterCount, TYPE.tabularNumbers, { color: c.fg }]}>{c.count}</Text>
                </View>
                <Text style={[styles.counterLabel, { color: c.fg }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          </View>
        )}

        {/* Action queue */}
        {pendingOrders.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              يحتاج تأكيدك ({pendingOrders.length})
            </Text>
            {pendingOrders.slice(0, 3).map((o: any) => (
              <View key={o.id} style={[styles.actionRow, { backgroundColor: colors.warningLight, borderColor: colors.warning + '60' }]}>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionName, { color: colors.text }]} numberOfLines={1}>
                    {o.customer_name}
                  </Text>
                  <Text style={[styles.actionMeta, TYPE.tabularNumbers, { color: colors.textSecondary }]} numberOfLines={1}>
                    #{o.id} · {formatCurrency(o.total_price)} · {formatTimeAgo(o.created_at)}
                  </Text>
                </View>
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

        {/* Low stock heads-up (data already in stats) */}
        {(stats?.low_stock || 0) > 0 && (
          <View style={[styles.stockAlert, { backgroundColor: colors.dangerFaint, borderColor: colors.danger + '40' }]}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={[styles.stockAlertText, { color: colors.text }]}>
              {stats.low_stock === 1 ? t('dash.lowStockOne') : `${stats.low_stock} ${t('dash.lowStockMany')}${t('dash.lowStockHint')}`}
            </Text>
          </View>
        )}

        {/* Recent, grouped by day */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dash.latestOrders')}</Text>
          {recentOrders.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="bag-outline" size={26} color={colors.primary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>{t('dash.emptyTitle')}</Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>{t('dash.emptyHint')}</Text>
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
                      <View style={[styles.rail, { backgroundColor: sc }]} />
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
          <Text style={[styles.allBtnText, { color: colors.primary }]}>{t('dash.viewAllOrders')}</Text>
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
    borderRadius: RADIUS.lg, paddingVertical: 18,
    ...SHADOW.card,
  },
  heroCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroPending: { backgroundColor: 'rgba(0,0,0,0.14)', borderRadius: RADIUS.lg, marginVertical: -6, paddingVertical: 6 },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 2 },
  heroValue: { fontSize: 21, fontWeight: '800', color: '#fff' },
  heroLabel: { fontSize: FONT.sm, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  counters: { gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  countersBleed: { marginHorizontal: -16 },
  counterIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  counter: {
    width: 138, alignItems: 'center', paddingVertical: 14, gap: 7,
    borderRadius: RADIUS.lg,
  },
  counterTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  counterCount: { fontSize: FONT.xl, fontWeight: '800' },
  counterLabel: { fontSize: FONT.xs, fontWeight: '700' },
  section: { marginTop: 20 },
  stockAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: RADIUS.lg, padding: 13, marginTop: 12,
    borderWidth: 1,
  },
  stockAlertText: { flex: 1, fontSize: FONT.sm, fontWeight: '700', lineHeight: 20 },
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
  confirmBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: RADIUS.md, minWidth: 92, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: FONT.sm, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, padding: 12, paddingLeft: 8,
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  rail: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 10 },
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
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: FONT.md, fontWeight: '800', marginTop: 12 },
  emptyHint: { fontSize: FONT.sm, marginTop: 4 },
  skel: {},
});
