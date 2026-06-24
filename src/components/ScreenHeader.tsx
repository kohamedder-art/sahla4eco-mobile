import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../contexts/ThemeContext';
import { useNotif } from '../hooks/usePushNotifications';
import { FONT } from '../constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  onNotificationPress?: () => void;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, onBackPress, onNotificationPress, rightAction }: Props) {
  const colors = useColors();
  const { unreadCount } = useNotif();

  return (
    <View style={[styles.bar, { backgroundColor: colors.primary }]}>
      <View style={styles.row}>
        {onBackPress && (
          <TouchableOpacity onPress={onBackPress} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        <View style={{ flex: 1 }} />
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
  bar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT.lg,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: FONT.xs,
    color: 'rgba(255,255,255,0.65)',
    marginLeft: 8,
  },
  backBtn: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  notifBtn: {
    width: 32, height: 32, borderRadius: 10,
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
