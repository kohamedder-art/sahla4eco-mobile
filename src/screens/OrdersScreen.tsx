import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useColors } from '../contexts/ThemeContext';
import { RADIUS, FONT } from '../constants/theme';
import { formatCurrency, formatTimeAgo, getStatusLabel } from '../utils/format';
import { API_BASE_URL } from '../constants/api';
import type { MobileOrder } from '../types';

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
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(route?.params?.status || 'all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

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
      const res = await authFetch(`${baseUrl}/api/mobile/orders${query}`);
      if (res.ok) setOrders(await res.json());
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch]);

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
        fetchOrders(activeFilter);
      }
    } catch {
      Alert.alert('خطأ', 'تعذر الاتصال بالخادم');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.trim().toLowerCase();
    return orders.filter(o =>
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.product_title || '').toLowerCase().includes(q) ||
      String(o.id).includes(q) ||
      (o.customer_phone || '').includes(q)
    );
  }, [orders, search]);

  const getStatusColor = (status: string) => {
    if (status === 'delivered' || status === 'confirmed') return colors.success;
    if (status === 'cancelled' || status === 'returned' || status === 'fake') return colors.danger;
    if (status === 'pending') return colors.warning;
    return colors.primary;
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={{ gap: 8, paddingHorizontal: 16, width: '100%' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.skeleton, { backgroundColor: colors.card }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.skelAvatar, { backgroundColor: colors.border }]} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={[styles.skelLine, { backgroundColor: colors.border, width: '50%' }]} />
                  <View style={[styles.skelLine, { backgroundColor: colors.border, width: '70%' }]} />
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
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>الطلبات</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Tracking')}>
            <Ionicons name="car-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="بحث باسم العميل أو رقم الطلب"
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filters}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: f }) => {
            const count = f === 'all' ? orders.length : orders.filter(o => o.status === f).length;
            const active = activeFilter === f;
            return (
              <TouchableOpacity
                style={[
                  styles.chip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => handleFilter(f)}
              >
                <Ionicons
                  name={FILTER_ICONS[f] || 'ellipse-outline'}
                  size={12}
                  color={active ? '#fff' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    active && { color: '#fff' },
                  ]}
                >
                  {getStatusLabel(f === 'all' ? 'الكل' : f)}
                </Text>
                {count > 0 && (
                  <View style={[styles.chipCount, { backgroundColor: active ? 'rgba(255,255,255,0.2)' : colors.border }]}>
                    <Text style={[styles.chipCountText, { color: active ? '#fff' : colors.textMuted }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(activeFilter); }} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const sc = getStatusColor(item.status);
          return (
            <TouchableOpacity
              style={[styles.orderCard, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.orderLeft}>
                <View style={[styles.avatar, { backgroundColor: sc + '15' }]}>
                  <Text style={[styles.avatarText, { color: sc }]}>
                    {item.customer_name?.charAt(0) || '?'}
                  </Text>
                </View>
                <View style={styles.orderInfo}>
                  <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
                    {item.customer_name}
                  </Text>
                  <Text style={[styles.productName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.product_title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {formatTimeAgo(item.created_at)}
                    </Text>
                    {item.order_source_label && (
                      <>
                        <Text style={[styles.metaSep, { color: colors.border }]}>|</Text>
                        <Text style={[styles.metaText, { color: colors.textMuted }]}>
                          {item.order_source_label}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.orderRight}>
                <Text style={[styles.price, { color: colors.text }]}>
                  {formatCurrency(item.total_price)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: sc + '12' }]}>
                  <View style={[styles.dot, { backgroundColor: sc }]} />
                  <Text style={[styles.statusText, { color: sc }]}>{getStatusLabel(item.status)}</Text>
                </View>
              </View>
              {item.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.success }]}
                  onPress={() => quickConfirm(item)}
                  disabled={updatingId === item.id}
                >
                  {updatingId === item.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={search ? 'search-outline' : 'receipt-outline'} size={28} color={colors.primary} />
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  headerTitle: { fontSize: FONT.lg, fontWeight: '800', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    paddingHorizontal: 12, height: 40, borderRadius: RADIUS.md, borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: FONT.sm },
  filters: { paddingTop: 8 },
  filterList: { paddingHorizontal: 16, gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  chipText: { fontSize: 10, fontWeight: '600' },
  chipCount: { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chipCountText: { fontSize: 8, fontWeight: '700' },
  orderCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    padding: 12, borderRadius: RADIUS.lg, gap: 10,
  },
  orderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONT.md, fontWeight: '800' },
  orderInfo: { flex: 1 },
  customerName: { fontSize: FONT.md, fontWeight: '700' },
  productName: { fontSize: FONT.xs, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  metaText: { fontSize: 10 },
  metaSep: { fontSize: 10 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  price: { fontSize: FONT.md, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 9, fontWeight: '600' },
  confirmBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyText: { fontSize: FONT.md, fontWeight: '700' },
  emptyHint: { fontSize: FONT.sm, marginTop: 2 },
  skeleton: { marginHorizontal: 16, marginBottom: 8, borderRadius: RADIUS.lg, padding: 14 },
  skelAvatar: { width: 36, height: 36, borderRadius: 8 },
  skelLine: { height: 12, borderRadius: 4 },
});
