import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotif();

  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top + 2 }]}>
      <View style={styles.row}>
        {onBackPress && (
          <TouchableOpacity onPress={onBackPress} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-forward" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titles}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {rightAction ? rightAction : onNotificationPress && (
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={onNotificationPress}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="notifications-outline" size={23} color={colors.text} />
            {unreadCount > 0 && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  titles: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FONT.xs,
    fontWeight: '500',
    marginTop: 1,
  },
  backBtn: {
    paddingRight: 10,
    paddingVertical: 6,
  },
  notifBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  dot: {
    position: 'absolute', top: 8, right: 9,
    width: 9, height: 9, borderRadius: 4.5,
    backgroundColor: '#e11d48',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
