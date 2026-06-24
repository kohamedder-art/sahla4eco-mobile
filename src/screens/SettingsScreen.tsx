import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotif } from '../hooks/usePushNotifications';
import { RADIUS, FONT } from '../constants/theme';

export function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { colors, isDark, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotif();
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const checkForUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert('تحديث متاح', 'يوجد تحديث جديد. هل تريد تحميله الآن؟', [
          { text: 'لاحقاً', style: 'cancel' },
          {
            text: 'تحديث',
            onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch {
                Alert.alert('خطأ', 'فشل تحميل التحديث');
              }
            },
          },
        ]);
      } else {
        Alert.alert('أنت تستخدم أحدث إصدار');
      }
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'تعذر التحقق من التحديثات');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: async () => { try { await logout(); } catch {} } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>المزيد</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.name?.charAt(0) || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || 'المالك'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email || ''}</Text>
            {user?.store_name && (
              <View style={styles.storeRow}>
                <Ionicons name="storefront-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.storeName, { color: colors.textMuted }]}>{user.store_name}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate('NotificationsTab')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="notifications-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>الإشعارات</Text>
            </View>
            <View style={styles.settingRight}>
              {unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.unreadText}>{unreadCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.warningLight }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={16} color={colors.warning} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>الوضع الداكن</Text>
                <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                  {isDark ? 'مفعّل' : 'معطّل'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => setPreference(v ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isDark ? colors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={checkForUpdate}
            disabled={checkingUpdate}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="refresh-outline" size={16} color={colors.info} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>التحقق من التحديثات</Text>
            </View>
            <View style={styles.settingRight}>
              {checkingUpdate ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.successLight }]}>
                <Ionicons name="phone-portrait-outline" size={16} color={colors.success} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>الإصدار</Text>
                <Text style={[styles.settingHint, { color: colors.textMuted }]}>{appVersion}</Text>
              </View>
            </View>
            <Text style={[styles.settingValue, { color: colors.textMuted }]}>Sahla4Eco</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.danger }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={17} color="#fff" />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 10, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  headerTitle: { fontSize: FONT.lg, fontWeight: '800', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: RADIUS.lg, padding: 16, marginBottom: 14,
  },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONT.lg, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FONT.lg, fontWeight: '700' },
  profileEmail: { fontSize: FONT.sm, marginTop: 1 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  storeName: { fontSize: FONT.xs },
  section: { borderRadius: RADIUS.lg, marginBottom: 14, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: FONT.md, fontWeight: '600' },
  settingHint: { fontSize: FONT.xs, marginTop: 1 },
  settingValue: { fontSize: FONT.sm, fontWeight: '500' },
  unreadBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: RADIUS.lg, padding: 16, marginTop: 4,
  },
  logoutText: { color: '#fff', fontSize: FONT.lg, fontWeight: '700' },
});
