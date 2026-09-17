import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotif } from '../hooks/usePushNotifications';
import { useAppUpdate } from '../hooks/useAppUpdate';
import Constants from 'expo-constants';
import { RADIUS, FONT, SHADOW, GRADIENTS } from '../constants/theme';
import { Tile } from '../components/Gloss';

export function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { colors, isDark, setPreference } = useTheme();
  const { unreadCount } = useNotif();
  const { updateAvailable, latestBuild, latestUrl, check, checking, CURRENT_BUILD } = useAppUpdate();
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const checkForUpdate = async () => {
    setCheckingUpdate(true);
    const result = await check();
    if (result.updateAvailable && result.latestUrl) {
      Alert.alert('تحديث متاح', `الإصدار Build ${result.latestBuild} متاح للتحميل. الإصدار الحالي: Build ${CURRENT_BUILD}.`, [
        { text: 'لاحقاً', style: 'cancel' },
        { text: 'تحميل', onPress: () => Linking.openURL('https://www.sahla4eco.com/api/mobile/download/latest') },
      ]);
    } else {
      Alert.alert('أنت تستخدم أحدث إصدار', `الإصدار الحالي: Build ${CURRENT_BUILD}`);
    }
    setCheckingUpdate(false);
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: async () => { try { await logout(); } catch {} } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="المزيد" rightAction={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {updateAvailable && (
            <TouchableOpacity style={[styles.updateBadge, { backgroundColor: colors.borderLight }]} onPress={checkForUpdate}>
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.updateBadgeDot}>1</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.notifBtn, { backgroundColor: colors.borderLight }]} onPress={() => navigation.navigate('NotificationsTab')}>
            <Ionicons name="notifications-outline" size={19} color={colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      } />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Tile colors={[...GRADIENTS.primary]} size={50} radius={16}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0) || '?'}
            </Text>
          </Tile>
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

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate('NotificationsTab')}
          >
            <View style={styles.settingLeft}>
              <Tile colors={[...GRADIENTS.primary]} size={34} radius={11}>
                <Ionicons name="notifications-outline" size={17} color="#fff" />
              </Tile>
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
              <Tile colors={[...GRADIENTS.warning]} size={34} radius={11}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={17} color="#fff" />
              </Tile>
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

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={checkForUpdate}
            disabled={checkingUpdate}
          >
            <View style={styles.settingLeft}>
              <Tile colors={[...GRADIENTS.info]} size={34} radius={11}>
                <Ionicons name="refresh-outline" size={17} color="#fff" />
              </Tile>
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
              <Tile colors={[...GRADIENTS.success]} size={34} radius={11}>
                <Ionicons name="phone-portrait-outline" size={17} color="#fff" />
              </Tile>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>الإصدار</Text>
                <Text style={[styles.settingHint, { color: colors.textMuted }]}>Build {CURRENT_BUILD}</Text>
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
  content: { padding: 16, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: RADIUS.lg, padding: 16, marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth, ...SHADOW.card,
  },
  avatarText: { fontSize: FONT.xl, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FONT.lg, fontWeight: '700' },
  profileEmail: { fontSize: FONT.sm, marginTop: 1 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  storeName: { fontSize: FONT.xs },
  section: { borderRadius: RADIUS.lg, marginBottom: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
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
  updateBadge: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  updateBadgeDot: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 14, height: 14, borderRadius: 7,
    textAlign: 'center', fontSize: 7, fontWeight: '800', color: '#fff',
    backgroundColor: '#ef4444', overflow: 'hidden', lineHeight: 14, paddingHorizontal: 2,
  },
  notifBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#fff', fontSize: 7, fontWeight: '800' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: RADIUS.lg, padding: 16, marginTop: 4,
  },
  logoutText: { color: '#fff', fontSize: FONT.lg, fontWeight: '700' },
});
