import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  type StyleProp, type ViewStyle, type TextStyle, type DimensionValue,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS, RADIUS, SHADOW } from '../constants/theme';

/** Glass shine laid over any rounded surface. */
export function Gloss({ radius = 12, height = '55%' }: { radius?: number; height?: DimensionValue }) {
  return (
    <LinearGradient
      colors={[...GRADIENTS.gloss]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height, borderRadius: radius }}
      pointerEvents="none"
    />
  );
}

/** Gradient icon tile with glass shine. */
export function Tile({
  colors = [...GRADIENTS.primary] as unknown as [string, string],
  size = 40,
  radius = 13,
  children,
  style,
}: {
  colors?: readonly [string, string] | [string, string];
  size?: number;
  radius?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={colors as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}
    >
      <Gloss radius={radius} />
      {children}
    </LinearGradient>
  );
}

/** Fat glossy gradient button. */
export function GlossButton({
  colors = [...GRADIENTS.primary] as unknown as [string, string],
  onPress,
  disabled,
  label,
  labelStyle,
  style,
  icon,
}: {
  colors?: readonly [string, string] | [string, string];
  onPress?: () => void;
  disabled?: boolean;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[{ borderRadius: RADIUS.lg, overflow: 'hidden', opacity: disabled ? 0.6 : 1 }, SHADOW.button, style]}
    >
      <LinearGradient
        colors={colors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.btnGrad}
      >
        <Gloss radius={RADIUS.lg} height="50%" />
        <View style={styles.btnInner}>
          {icon}
          <Text style={[styles.btnLabel, labelStyle]}>{label}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btnGrad: { paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnLabel: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
