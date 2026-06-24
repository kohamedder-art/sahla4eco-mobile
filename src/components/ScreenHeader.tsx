import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../contexts/ThemeContext';
import { useNotif } from '../hooks/usePushNotifications';
import { RADIUS, FONT } from '../constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  onNotificationPress?: () => void;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, onNotificationPress, rightAction }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotif();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: colors.primaryDark }]}>
      <View style={[styles.bgGradient, { backgroundColor: colors.primary }]}>
        <View style={[styles.gradientOverlay, { backgroundColor: colors.gradientEnd + '25' }]} />
      </View>
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="storefront" size={18} color="#fff" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>
        </View>
        {rightAction ? rightAction : onNotificationPress && (
          <TouchableOpacity style={[styles.notifBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={20} color="#fff" />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  bgGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: FONT.lg,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: FONT.xs,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },
  notifBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
});
