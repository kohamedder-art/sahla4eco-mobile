/**
 * AGENT INSTRUCTIONS — TRACKING SCREEN
 * ----------------------------------------------------------------------------
 * Valid basic feature — lets the store owner search tracking numbers and
 * copy them for courier hand-off. Keep it simple, do not turn it into an
 * analytics page or add map widgets.
 * ----------------------------------------------------------------------------
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  ActivityIndicator, TextInput, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useColors } from '../contexts/ThemeContext';
import { useLang } from '../contexts/LanguageContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { RADIUS, FONT, SHADOW, STATUS_COLORS, TYPE } from '../constants/theme';
import { formatCurrency, getStatusLabel } from '../utils/format';
import { API_BASE_URL } from '../constants/api';
import type { MobileOrder } from '../types';

const TRACKING_STEPS = [
  { key: 'confirmed', labelKey: 'tracking.stepConfirmed' as const },
  { key: 'processing', labelKey: 'tracking.stepProcessing' as const },
  { key: 'shipped', labelKey: 'tracking.stepShipped' as const },
  { key: 'out_for_delivery', labelKey: 'tracking.stepOut' as const },
  { key: 'delivered', labelKey: 'tracking.stepDelivered' as const },
];

const STATUS_TO_STEP: Record<string, number> = {
  pending: -0.5,
  confirmed: 0,
  processing: 1,
  shipped: 2,
  in_transit: 2,
  at_delivery: 3,
  in_delivery: 3,
  out_for_delivery: 3,
  out_delivery: 3,
  delivered: 4,
  completed: 4,
  cancelled: -1,
  returned: -1,
  failed: -1,
};

function getStepIndex(status: string): number {
  return STATUS_TO_STEP[status] ?? -0.5;
}

function getStepColor(status: string, colors: Record<string, string>): string {
  if (['cancelled', 'returned', 'failed', 'fake', 'duplicate'].includes(status)) return colors.danger;
  if (['delivered', 'completed'].includes(status)) return colors.success;
  return colors.primary;
}

function TrackingProgress({ status, colors }: { status: string; colors: Record<string, string> }) {
  const { t } = useLang();
  const step = getStepIndex(status);
  const isBad = step < 0 && step !== -0.5;
  const currentStep = isBad ? 0 : Math.max(0, step);
  const barColor = getStepColor(status, colors);
  const pct = currentStep > 0 ? ((currentStep) / (TRACKING_STEPS.length - 1)) * 100 : 0;

  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.stepsRow}>
        {TRACKING_STEPS.map((s, i) => {
          const done = i <= currentStep;
          const active = i === currentStep && !isBad;
          const dotColor = isBad ? colors.danger : done ? barColor : colors.border;
          return (
            <View key={s.key} style={[styles.stepDot, { backgroundColor: dotColor }, active && { transform: [{ scale: 1.3 }] }]}>
              {done && i === currentStep && <Ionicons name="checkmark" size={6} color="#fff" />}
            </View>
          );
        })}
      </View>
      <View style={styles.stepLabels}>
        {TRACKING_STEPS.map((s, i) => {
          const done = i <= currentStep;
          return (
            <Text
              key={s.key}
              style={[styles.stepLabel, { color: done ? barColor : colors.textMuted }, i === currentStep && !isBad && { fontWeight: '700' }]}
              numberOfLines={1}
            >
              {t(s.labelKey)}
            </Text>
          );
        })}
      </View>
      {isBad && (
        <View style={[styles.badBanner, { backgroundColor: colors.dangerLight }]}>
          <Ionicons name="alert-circle" size={12} color={colors.danger} />
          <Text style={[styles.badBannerText, { color: colors.danger }]}>
            {status === 'cancelled' ? t('tracking.cancelled') : status === 'returned' ? t('tracking.returned') : status === 'failed' ? t('tracking.failed') : status}
          </Text>
        </View>
      )}
    </View>
  );
}

export function TrackingScreen({ navigation }: any) {
  const { getAccessToken } = useAuth();
  const colors = useColors();
  const { t } = useLang();
  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const authFetch = useCallback(async (url: string, options?: RequestInit) => {
    const token = await getAccessToken();
    if (!token) throw new Error('No auth token');
    return fetch(url, {
      ...options,
      headers: { ...options?.headers, Authorization: `Bearer ${token}` },
    });
  }, [getAccessToken]);

  const fetchTrackingOrders = useCallback(async () => {
    try {
      const baseUrl = API_BASE_URL;
      const res = await authFetch(`${baseUrl}/api/mobile/orders`);
      if (res.ok) {
        const all: MobileOrder[] = await res.json();
        setOrders(all.filter(o => o.tracking_number));
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch]);

  useFocusEffect(useCallback(() => { fetchTrackingOrders(); }, [fetchTrackingOrders]));

  const stats = useMemo(() => {
    const inTransit = orders.filter(o =>
      ['shipped', 'in_transit', 'at_delivery', 'in_delivery', 'out_for_delivery', 'out_delivery', 'processing', 'confirmed'].includes(o.status)
    ).length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const problems = orders.filter(o =>
      ['cancelled', 'returned', 'failed'].includes(o.status)
    ).length;
    return { inTransit, delivered, problems, total: orders.length };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.trim().toLowerCase();
    return orders.filter(o =>
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.product_title || '').toLowerCase().includes(q) ||
      String(o.id).includes(q) ||
      (o.tracking_number || '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const handleCopy = async (tracking: string, id: number) => {
    try {
      await Clipboard.setStringAsync(tracking);
    } catch {}
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={t('tracking.title')}
        onBackPress={() => navigation.goBack()}
      />
      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="car-outline" size={16} color={colors.primary} />
          <Text style={[styles.statNum, { color: colors.primary }]}>{stats.inTransit}</Text>
          <Text style={[styles.statLabel, { color: colors.primary }]}>{t('tracking.inTransit')}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.successLight }]}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
          <Text style={[styles.statNum, { color: colors.success }]}>{stats.delivered}</Text>
          <Text style={[styles.statLabel, { color: colors.success }]}>{t('tracking.delivered')}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.dangerLight }]}>
          <Ionicons name="warning-outline" size={16} color={colors.danger} />
          <Text style={[styles.statNum, { color: colors.danger }]}>{stats.problems}</Text>
          <Text style={[styles.statLabel, { color: colors.danger }]}>{t('tracking.problems')}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder={t('tracking.searchHint')}
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTrackingOrders(); }} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const sc = getStepColor(item.status, colors);
          const step = getStepIndex(item.status);
          const isBad = step === -1;
          return (
            <TouchableOpacity
              style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
              activeOpacity={0.7}
            >
              <View style={[styles.rail, { backgroundColor: sc }]} />
              <View style={styles.cardBody}>
              {/* Top row: customer + price */}
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <View style={[styles.avatar, { backgroundColor: sc + '14' }]}>
                    <Text style={[styles.avatarText, { color: sc }]}>
                      {item.customer_name?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
                      {item.customer_name}
                    </Text>
                    <Text style={[styles.productName, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.product_title}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.price, { color: colors.text }]}>{formatCurrency(item.total_price)}</Text>
              </View>

              {/* Tracking number */}
              {item.tracking_number && (
                <TouchableOpacity
                  style={[styles.trackingRow, { backgroundColor: colors.primaryLight }]}
                  onPress={() => handleCopy(item.tracking_number!, item.id)}
                  activeOpacity={0.6}
                >
                  <Ionicons name="copy-outline" size={13} color={colors.primary} />
                  <Text style={[styles.trackingText, { color: colors.primary }]} numberOfLines={1}>
                    {item.tracking_number}
                  </Text>
                  <Text style={[styles.copyHint, { color: colors.primary }]}>
                    {copiedId === item.id ? t('tracking.copied') : t('tracking.copy')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Progress bar */}
              {!isBad && <TrackingProgress status={item.status} colors={colors} />}

              {/* Status badge */}
              <View style={styles.bottomRow}>
                <View style={[styles.statusBadge, { backgroundColor: isBad ? colors.dangerLight : sc + '12' }]}>
                  <View style={[styles.statusDot, { backgroundColor: sc }]} />
                  <Text style={[styles.statusText, { color: sc }]}>{getStatusLabel(item.status)}</Text>
                </View>
                <Text style={[styles.orderId, TYPE.tabularNumbers, { color: colors.textMuted }]}>#{item.id}</Text>
              </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={search ? 'search-outline' : 'car-outline'} size={26} color={colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {search ? t('tracking.emptySearchTitle') : t('tracking.emptyTitle')}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              {search ? t('tracking.emptySearchHint') : t('tracking.emptyHint')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inlineHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4,
  },
  inlineTitle: { fontSize: FONT.lg, fontWeight: '800' },
  backBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statsRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  statBox: {
    flex: 1, alignItems: 'center', gap: 2, padding: 10, borderRadius: RADIUS.md,
  },
  statNum: { fontSize: FONT.xl, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 8,
    paddingHorizontal: 12, height: 40, borderRadius: RADIUS.md, borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: FONT.sm },
  orderCard: {
    flexDirection: 'row',
    marginHorizontal: 16, marginBottom: 10, borderRadius: RADIUS.lg,
    padding: 13, paddingLeft: 9, gap: 0,
    borderWidth: StyleSheet.hairlineWidth,
    ...SHADOW.card,
  },
  rail: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 10 },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONT.md, fontWeight: '800' },
  cardInfo: { flex: 1 },
  customerName: { fontSize: FONT.md, fontWeight: '700' },
  productName: { fontSize: FONT.xs, marginTop: 1 },
  price: { fontSize: FONT.sm, fontWeight: '700' },
  trackingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8,
    paddingVertical: 6, borderRadius: RADIUS.sm, marginBottom: 8,
  },
  trackingText: { fontSize: 10, fontWeight: '600', flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyHint: { fontSize: 9, fontWeight: '700' },
  progressWrap: { marginBottom: 8 },
  progressTrack: { height: 3, borderRadius: 2, marginBottom: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepsRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: 2,
  },
  stepDot: {
    width: 10, height: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center',
  },
  stepLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
  },
  stepLabel: { fontSize: 7, fontWeight: '500', textAlign: 'center' },
  badBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4,
    paddingHorizontal: 8, borderRadius: RADIUS.sm, marginTop: 4,
  },
  badBannerText: { fontSize: 10, fontWeight: '700' },
  bottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },
  statusText: { fontSize: 9, fontWeight: '600' },
  orderId: { fontSize: 10, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 4 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: FONT.lg, fontWeight: '800', marginTop: 12 },
  emptyHint: { fontSize: FONT.sm, marginTop: 4 },
});
