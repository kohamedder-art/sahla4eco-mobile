import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLang } from '../contexts/LanguageContext';
import { LOCALES } from '../i18n/strings';
import { useNotif } from '../hooks/usePushNotifications';
import { useAppUpdate } from '../hooks/useAppUpdate';
import Constants from 'expo-constants';
import { RADIUS, FONT } from '../constants/theme';

export function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { colors, isDark, setPreference } = useTheme();
  const { t, locale, setLocale } = useLang();
  const { unreadCount, cashSound, setCashSound, previewCashSound } = useNotif();
  const { updateAvailable, latestBuild, latestUrl, check, checking, CURRENT_BUILD } = useAppUpdate();
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const checkForUpdate = async () => {
    setCheckingUpdate(true);
    const result = await check();
    if (result.updateAvailable && result.latestUrl) {
      Alert.alert(t('settings.updateAvailable'), t('settings.updateMsg'), [
        { text: t('settings.later'), style: 'cancel' },
        { text: t('settings.download'), onPress: () => Linking.openURL('https://www.sahla4eco.com/api/mobile/download/latest') },
      ]);
    } else {
      Alert.alert(t('settings.upToDate'), `${t('settings.currentVersion')}: Build ${CURRENT_BUILD}`);
    }
    setCheckingUpdate(false);
  };

  const handleLogout = () => {
    Alert.alert(t('settings.logoutTitle'), t('settings.logoutConfirm'), [
      { text: t('settings.cancel'), style: 'cancel' },
      { text: t('settings.logoutYes'), style: 'destructive', onPress: async () => { try { await logout(); } catch {} } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t('settings.title')} rightAction={
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
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.name?.charAt(0) || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || t('settings.owner')}</Text>
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
              <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="notifications-outline" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.notifications')}</Text>
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

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <TouchableOpacity onPress={() => previewCashSound()} activeOpacity={0.7}>
                <View style={[styles.iconBox, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="cash-outline" size={17} color={colors.success} />
                </View>
              </TouchableOpacity>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.cashSound')}</Text>
                <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                  {cashSound ? t('settings.cashSoundOn') : t('settings.cashSoundOff')}
                </Text>
              </View>
            </View>
            <Switch
              value={cashSound}
              onValueChange={(v) => setCashSound(v)}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={cashSound ? colors.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.warningLight }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={17} color={colors.warning} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.darkMode')}</Text>
                <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                  {isDark ? t('settings.on') : t('settings.off')}
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
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="language-outline" size={17} color={colors.info} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.language')}</Text>
            </View>
          </View>
          <View style={styles.langRow}>
            {LOCALES.map((l) => {
              const active = locale === l.id;
              return (
                <TouchableOpacity
                  key={l.id}
                  style={[
                    styles.langBtn,
                    { backgroundColor: colors.borderLight },
                    active && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setLocale(l.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.langText, { color: colors.textSecondary }, active && { color: '#fff' }]}>
                    {l.native}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={checkForUpdate}
            disabled={checkingUpdate}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="refresh-outline" size={17} color={colors.info} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.checkUpdates')}</Text>
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
                <Ionicons name="phone-portrait-outline" size={17} color={colors.success} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.version')}</Text>
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
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONT.xl, fontWeight: '800' },
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
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: FONT.md, fontWeight: '600' },
  settingHint: { fontSize: FONT.xs, marginTop: 1 },
  settingValue: { fontSize: FONT.sm, fontWeight: '500' },
  unreadBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  langRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  langBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center' },
  langText: { fontSize: FONT.sm, fontWeight: '700' },
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
