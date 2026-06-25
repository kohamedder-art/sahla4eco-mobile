/**
 * AGENT INSTRUCTIONS — ORDER DETAIL SCREEN
 * ----------------------------------------------------------------------------
 * Single purpose: let the store owner CONFIRM / CANCEL / CALL the customer
 * for one specific order. Do not add cross-sell, upsell, marketing prompts,
 * or product editing — that belongs to the platform.
 *
 * Uses the custom ScreenHeader with a back arrow. The header is fixed at the
 * top while order content scrolls below it.
 * ----------------------------------------------------------------------------
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../contexts/AuthContext';
import { useColors } from '../contexts/ThemeContext';
import { RADIUS, FONT } from '../constants/theme';
import { formatCurrency, formatDate, getStatusLabel } from '../utils/format';
import { API_BASE_URL } from '../constants/api';
import type { OrderDetail } from '../types';

export function OrderDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { getAccessToken } = useAuth();
  const colors = useColors();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const baseUrl = API_BASE_URL;

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      fetch(`${baseUrl}/api/mobile/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then(setOrder)
        .catch(() => {})
        .finally(() => setLoading(false));
    })();
  }, [id, baseUrl, getAccessToken]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`${baseUrl}/api/mobile/orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const refreshed = await fetch(`${baseUrl}/api/mobile/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json());
        setOrder(refreshed);
      } else {
        const err = await res.json().catch(() => ({ error: 'فشل التحديث' }));
        Alert.alert('خطأ', err.error || 'فشل تحديث حالة الطلب');
      }
    } catch {
      Alert.alert('خطأ', 'تعذر الاتصال بالخادم');
    } finally {
      setUpdating(false);
    }
  };

  const callCustomer = () => {
    if (order?.customer_phone) Linking.openURL(`tel:${order.customer_phone}`);
  };

  const whatsappCustomer = () => {
    if (order?.customer_phone) {
      Linking.openURL(`https://wa.me/${order.customer_phone.replace(/^0/, '213')}`);
    }
  };

  const statusColor = !order
    ? colors.primary
    : order.status === 'delivered' || order.status === 'confirmed' ? colors.success :
      order.status === 'cancelled' || order.status === 'returned' || order.status === 'fake' ? colors.danger :
      order.status === 'pending' ? colors.warning : colors.primary;

  const statusActions: { label: string; status: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [];
  if (order?.status === 'pending') {
    statusActions.push({ label: 'تأكيد', status: 'confirmed', color: colors.success, icon: 'checkmark-circle-outline' });
    statusActions.push({ label: 'إلغاء', status: 'cancelled', color: colors.danger, icon: 'close-circle-outline' });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="تفاصيل الطلب"
        onBackPress={() => { if (navigation.canGoBack()) navigation.goBack(); else navigation.navigate('Orders'); }}
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !order ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: FONT.lg, color: colors.textSecondary }}>الطلب غير موجود</Text>
        </View>
      ) : (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
        <Ionicons
          name={order.status === 'delivered' ? 'checkmark-circle' : order.status === 'cancelled' ? 'close-circle' : 'time'}
          size={18} color="#fff"
        />
        <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
      </View>

      {/* Customer Card */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.cardTitle, { color: colors.textMuted }]}>العميل</Text>
        </View>
        <Text style={[styles.customerName, { color: colors.text }]}>{order.customer_name}</Text>
        <TouchableOpacity style={styles.phoneRow} onPress={callCustomer}>
          <View style={[styles.iconSm, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="call-outline" size={13} color={colors.primary} />
          </View>
          <Text style={[styles.phone, { color: colors.primary }]}>{order.customer_phone}</Text>
        </TouchableOpacity>
        {order.address && (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.address, { color: colors.textSecondary }]}>{order.address}</Text>
          </View>
        )}
      </View>

      {/* Product Card */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="bag-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.cardTitle, { color: colors.textMuted }]}>المنتج</Text>
        </View>
        <Text style={[styles.productName, { color: colors.text }]}>{order.product_title}</Text>
        {order.variant_name && (
          <View style={styles.addressRow}>
            <Ionicons name="pricetag-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.variant, { color: colors.textSecondary }]}>{order.variant_name}</Text>
          </View>
        )}
        <Text style={[styles.quantity, { color: colors.textSecondary }]}>الكمية: {order.quantity}</Text>
        <View style={[styles.priceRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>المجموع</Text>
          <Text style={[styles.price, { color: colors.text }]}>{formatCurrency(order.total_price, order.currency)}</Text>
        </View>
      </View>

      {/* Source Card */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.cardTitle, { color: colors.textMuted }]}>مصدر الطلب</Text>
        </View>
        {order.order_source_label && (
          <View style={styles.infoItem}>
            <View style={[styles.iconSm, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={order.order_source === 'ai_customer' ? 'hardware-chip-outline' : 'create-outline'} size={13} color={colors.primary} />
            </View>
            <Text style={[styles.infoText, { color: colors.text }]}>{order.order_source_label}</Text>
          </View>
        )}
        {order.source_platform_label && (
          <View style={styles.infoItem}>
            <View style={[styles.iconSm, { backgroundColor: colors.infoLight }]}>
              <Ionicons
                name={order.source_platform === 'telegram' ? 'paper-plane-outline' : order.source_platform === 'messenger' ? 'chatbubble-outline' : 'globe-outline'}
                size={13} color={colors.info}
              />
            </View>
            <Text style={[styles.infoText, { color: colors.text }]}>{order.source_platform_label}</Text>
          </View>
        )}
        {order.delivery_type && (
          <View style={styles.infoItem}>
            <View style={[styles.iconSm, { backgroundColor: colors.warningLight }]}>
              <Ionicons name={order.delivery_type === 'desk' ? 'business-outline' : 'home-outline'} size={13} color={colors.warning} />
            </View>
            <Text style={[styles.infoText, { color: colors.text }]}>
              {order.delivery_type === 'desk' ? 'توصيل إلى المكتب' : 'توصيل إلى المنزل'}
            </Text>
          </View>
        )}
        {order.tracking_number && (
          <View style={styles.infoItem}>
            <View style={[styles.iconSm, { backgroundColor: colors.successLight }]}>
              <Ionicons name="cube-outline" size={13} color={colors.success} />
            </View>
            <Text style={[styles.infoText, { color: colors.text }]}>رقم التتبع: {order.tracking_number}</Text>
          </View>
        )}
      </View>

      {/* Timeline */}
      {order.timeline && order.timeline.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.cardTitle, { color: colors.textMuted }]}>آخر التحديثات</Text>
          </View>
          {order.timeline.map((t: any, i: number) => (
            <View key={i} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: t.active ? statusColor : colors.border }]} />
                {i < order.timeline.length - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, { color: t.active ? colors.text : colors.textSecondary }, t.active && { fontWeight: '700' }]}>
                  {t.label}
                </Text>
                <Text style={[styles.timelineTime, { color: colors.textMuted }]}>{formatDate(t.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      {statusActions.length > 0 && (
        <View style={styles.actions}>
          {statusActions.map((a) => (
            <TouchableOpacity
              key={a.status}
              style={[styles.actionBtn, { backgroundColor: a.color }]}
              onPress={() => updateStatus(a.status)}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={a.icon} size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>{a.label}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Customer Contact */}
      <View style={styles.contactRow}>
        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.success }]} onPress={whatsappCustomer}>
          <Ionicons name="logo-whatsapp" size={16} color="#fff" />
          <Text style={styles.contactLabel}>واتساب</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.primary }]} onPress={callCustomer}>
          <Ionicons name="call" size={16} color="#fff" />
          <Text style={styles.contactLabel}>اتصال</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, borderRadius: RADIUS.lg, marginBottom: 12, gap: 8,
  },
  statusText: { fontSize: FONT.md, fontWeight: '700', color: '#fff' },
  card: {
    borderRadius: RADIUS.lg, padding: 16, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle: { fontSize: FONT.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  customerName: { fontSize: FONT.lg, fontWeight: '700', marginBottom: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  phone: { fontSize: FONT.md, fontWeight: '600' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  address: { fontSize: FONT.sm },
  iconSm: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: FONT.lg, fontWeight: '700', marginBottom: 4 },
  variant: { fontSize: FONT.sm },
  quantity: { fontSize: FONT.sm, marginTop: 4, marginBottom: 8 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { fontSize: FONT.sm, flex: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  priceLabel: { fontSize: FONT.sm, fontWeight: '600' },
  price: { fontSize: FONT.xl, fontWeight: '800' },
  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', width: 20, marginRight: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, marginTop: 4, marginBottom: 4 },
  timelineContent: { flex: 1, paddingBottom: 12 },
  timelineLabel: { fontSize: FONT.sm },
  timelineTime: { fontSize: FONT.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 10 },
  actionBtn: {
    flex: 1, padding: 12, borderRadius: RADIUS.lg, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  actionBtnText: { color: '#fff', fontSize: FONT.md, fontWeight: '700' },
  contactRow: { flexDirection: 'row', gap: 8 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: RADIUS.lg,
  },
  contactLabel: { color: '#fff', fontSize: FONT.md, fontWeight: '700' },
});
