import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useColors } from '../contexts/ThemeContext';
import { useNotif } from '../hooks/usePushNotifications';
import { RADIUS, FONT } from '../constants/theme';

interface Props {
  onSwitchToEmail: () => void;
}

export function QRLoginScreen({ onSwitchToEmail }: Props) {
  const { loginQR } = useAuth();
  const { register } = useNotif();
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const scanned = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned.current || loading) return;
    scanned.current = true;
    setLoading(true);

    try {
      // The QR code contains a raw token
      const token = data.trim();
      if (!token || token.length < 10) {
        Alert.alert('خطأ', 'رمز QR غير صالح');
        scanned.current = false;
        setLoading(false);
        return;
      }

      await loginQR(token);
      register().catch(() => {});
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل تسجيل الدخول برمز QR');
      scanned.current = false;
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.permIconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="camera-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.permTitle, { color: colors.text }]}>الوصول إلى الكاميرا مطلوب</Text>
        <Text style={[styles.permHint, { color: colors.textSecondary }]}>
          لمسح رمز QR لتسجيل الدخول
        </Text>
        <TouchableOpacity
          style={[styles.permBtn, { backgroundColor: colors.primary }]}
          onPress={requestPermission}
        >
          <Text style={styles.permBtnText}>منح صلاحية الكاميرا</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSwitchToEmail} style={styles.switchBtn}>
          <Text style={[styles.switchText, { color: colors.primary }]}>تسجيل الدخول بالبريد</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>مسح رمز QR</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          افتح رمز QR على موقع Sahla4Eco ومسحه هنا
        </Text>
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={loading ? undefined : handleBarCodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>جاري تسجيل الدخول...</Text>
          </View>
        )}
      </View>

      <TouchableOpacity onPress={onSwitchToEmail} style={[styles.switchBtn, { borderTopColor: colors.border }]}>
        <Ionicons name="mail-outline" size={16} color={colors.primary} />
        <Text style={[styles.switchText, { color: colors.primary }]}>تسجيل الدخول بالبريد الإلكتروني</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: FONT.xl, fontWeight: '800' },
  subtitle: { fontSize: FONT.sm, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
  cameraWrap: {
    flex: 1, marginHorizontal: 16, borderRadius: RADIUS.lg, overflow: 'hidden', position: 'relative',
  },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 220, height: 220,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: RADIUS.lg,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { color: '#fff', fontSize: FONT.md, fontWeight: '600', marginTop: 12 },
  permIconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  permTitle: { fontSize: FONT.lg, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  permHint: { fontSize: FONT.sm, textAlign: 'center', marginBottom: 20 },
  permBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md,
  },
  permBtnText: { color: '#fff', fontSize: FONT.md, fontWeight: '700' },
  switchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  switchText: { fontSize: FONT.md, fontWeight: '600' },
});
