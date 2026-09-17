import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../contexts/AuthContext';
import { useColors } from '../contexts/ThemeContext';
import { RADIUS, FONT, TYPE, SHADOW } from '../constants/theme';
import { formatCurrency, formatTimeAgo, getStatusLabel } from '../utils/format';
import { API_BASE_URL } from '../constants/api';
import type { MobileOrder, StoreRef } from '../types';

const FILTERS = ['all', 'pending', 'confirmed', 'delivered', 'cancelled'];

const FILTER_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  all: 'grid-outline',
  pending: 'time-outline',
  confirmed: 'checkmark-circle-outline',
  delivered: 'bag-check-outline',
  cancelled: 'close-circle-outline',
};

export function OrdersScreen({ navigation, route }: any) {
  const { getAccessToken } = useAuth();
  const colors = useColors();
  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(route?.params?.status || 'all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [stores, setStores] = useState<StoreRef[]>([]);
  const [activeStore, setActiveStore] = useState<number | 'all'>('all');

  const authFetch = useCallback(async (url: string, options?: RequestInit) => {
    const token = await getAccessToken();
    if (!token) throw new Error('No auth token');
    return fetch(url, {
      ...options,
      headers: { ...options?.headers, Authorization: `Bearer ${token}` },
    });
  }, [getAccessToken]);

  const fetchOrders = useCallback(async (status?: string) => {
    try {
      const baseUrl = API_BASE_URL;
      const query = status && status !== 'all' ? `?status=${status}` : '';
      const token = await getAccessToken();
      const [ordersRes, storesRes] = await Promise.all([
        authFetch(`${baseUrl}/api/mobile/orders${query}`),
        token ? fetch(`${baseUrl}/api/mobile/stores`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null) : null,
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (storesRes && storesRes.ok) {
        const list = await storesRes.json();
        if (Array.isArray(list)) setStores(list);
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch, getAccessToken]);

  useFocusEffect(useCallback(() => {
    if (route?.params?.status) {
      setActiveFilter(route.params.status);
    }
    fetchOrders(activeFilter);
  }, [activeFilter, fetchOrders]));

  const handleFilter = (f: string) => {
    setActiveFilter(f);
    setLoading(true);
    fetchOrders(f);
  };

  const quickConfirm = async (order: MobileOrder) => {
    setUpdatingId(order.id);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const baseUrl = API_BASE_URL;
      const token = await getAccessToken();
      const res = await fetch(`${baseUrl}/api/mobile/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'فشل التحديث' }));
        Alert.alert('خطأ', err.error || 'فشل تحديث حالة الطلب');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        fetchOrders(activeFilter);
      }
    } catch {
      Alert.alert('خطأ', 'تعذر الاتصال بالخادم');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (activeStore !== 'all') {
      list = list.filter(o => o.store_id === activeStore);
    }
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(o =>
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.product_title || '').toLowerCase().includes(q) ||
      String(o.id).includes(q) ||
      (o.customer_phone || '').includes(q)
    );
  }, [orders, search, activeStore]);

  const getStatusColor = (status: string) => {
    if (status === 'delivered' || status === 'confirmed') return colors.success;
    if (status === 'cancelled' || status === 'returned' || status === 'fake') return colors.danger;
    if (status === 'pending') return colors.warning;
    return colors.primary;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="الطلبات" />
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.skeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.skel, { backgroundColor: colors.border, width: 44, height: 44, borderRadius: 22 }]} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={[styles.skel, { backgroundColor: colors.border, width: '50%', height: 13, borderRadius: 4 }]} />
                  <View style={[styles.skel, { backgroundColor: colors.border, width: '70%', height: 11, borderRadius: 4 }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="الطلبات"
        subtitle={orders.length > 0 ? `${orders.length} طلب` : undefined}
        rightAction={
          <TouchableOpacity
            style={[styles.trackingBtn, { backgroundColor: colors.borderLight }]}
            onPress={() => navigation.navigate('Tracking')}
            activeOpacity={0.7}
          >
            <Ionicons name="car-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="دوّر بالاسم، الهاتف، أو رقم الطلب…"
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View>
        {stores.length > 1 && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'all' as const, name: 'كل المتاجر' }, ...stores]}
            keyExtractor={(s) => String(s.id)}
            contentContainerStyle={[styles.filterList, { paddingBottom: 8 }]}
            renderItem={({ item: s }) => {
              const active = activeStore === s.id;
              return (
                <TouchableOpacity
                  style={[styles.storeChip, { backgroundColor: colors.card, borderColor: colors.border }, active && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                  onPress={() => setActiveStore(s.id)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={14}
                    color={active ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f}
          contentContainerStyle={styles.filterList}
            renderItem={({ item: f }) => {
              const count = f === 'all' ? orders.length : orders.filter(o => o.status === f).length;
              const active = activeFilter === f;
              const fg = f === 'all' ? colors.primary : getStatusColor(f);
              return (
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, active && { backgroundColor: fg + '14', borderColor: fg + '50' }]}
                onPress={() => handleFilter(f)}
                activeOpacity={0.8}
              >
                <Ionicons name={FILTER_ICONS[f] || 'ellipse-outline'} size={14} color={active ? fg : colors.textSecondary} />
                <Text style={[styles.chipText, { color: active ? fg : colors.textSecondary }]}>
                  {getStatusLabel(f === 'all' ? 'الكل' : f)}
                </Text>
                {count > 0 && (
                  <Text style={[styles.chipCountText, TYPE.tabularNumbers, { color: active ? fg : colors.textMuted }]}>{count}</Text>
                )}
              </TouchableOpacity>
              );
            }}
        />
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(activeFilter); }} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const sc = getStatusColor(item.status);
          return (
            <TouchableOpacity
              style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
              activeOpacity={0.7}
            >
              <View style={[styles.rail, { backgroundColor: sc }]} />
              <View style={[styles.avatar, { backgroundColor: sc + '14' }]}>
                <Text style={[styles.avatarText, { color: sc }]}>
                  {item.customer_name?.charAt(0) || '?'}
                </Text>
              </View>
              <View style={styles.orderInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
                    {item.customer_name}
                  </Text>
                  {item.store_name ? (
                    <View style={[styles.storeBadge, { backgroundColor: colors.primaryFaint }]}>
                      <Text style={[styles.storeBadgeText, { color: colors.primary }]} numberOfLines={1}>
                        {item.store_name}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.productName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.product_title}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, TYPE.tabularNumbers, { color: colors.textMuted }]}>
                    #{item.id} · {formatTimeAgo(item.created_at)}
                  </Text>
                  {item.order_source_label && (
                    <>
                      <Text style={[styles.metaSep, { color: colors.border }]}>·</Text>
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {item.order_source_label}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <View style={styles.orderRight}>
                <Text style={[styles.price, TYPE.tabularNumbers, { color: colors.text }]}>
                  {formatCurrency(item.total_price)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: sc + '16' }]}>
                  <View style={[styles.dot, { backgroundColor: sc }]} />
                  <Text style={[styles.statusText, { color: sc }]}>{getStatusLabel(item.status)}</Text>
                </View>
              </View>
              {item.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.success }]}
                  onPress={() => quickConfirm(item)}
                  disabled={updatingId === item.id}
                  activeOpacity={0.8}
                >
                  {updatingId === item.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={search ? 'search-outline' : 'receipt-outline'} size={26} color={colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {search ? 'لا توجد نتائج بحث' : 'لا توجد طلبات'}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              {search ? 'جرّب كلمة بحث مختلفة' : 'اسحب لأسفل للتحديث'}
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
  trackingBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 15, height: 48, borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth,
    ...SHADOW.card,
  },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: FONT.md, fontWeight: '500' },
  filterList: { paddingHorizontal: 16, gap: 8, paddingTop: 8 },
  storeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, maxWidth: 170,
    borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: FONT.xs, fontWeight: '700' },
  chipCountText: { fontSize: 10, fontWeight: '800' },
  orderCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 9,
    padding: 13, paddingLeft: 9, borderRadius: RADIUS.lg, gap: 11,
    borderWidth: StyleSheet.hairlineWidth,
    ...SHADOW.card,
  },
  rail: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  avatar: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONT.lg, fontWeight: '800' },
  orderInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { fontSize: FONT.md, fontWeight: '700', flexShrink: 1 },
  storeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full, maxWidth: 110 },
  storeBadgeText: { fontSize: 9, fontWeight: '800' },
  productName: { fontSize: FONT.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 10, fontWeight: '500' },
  metaSep: { fontSize: 10 },
  orderRight: { alignItems: 'flex-end', gap: 5 },
  price: { fontSize: FONT.md, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  confirmBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW.button,
  },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 4 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: FONT.lg, fontWeight: '800', marginTop: 12 },
  emptyHint: { fontSize: FONT.sm, marginTop: 4 },
  skeleton: { marginHorizontal: 16, marginBottom: 8, borderRadius: RADIUS.lg, padding: 14 },
  skel: {},
});
