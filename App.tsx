import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotifProvider } from './src/hooks/usePushNotifications';
import { ThemeContext, useTheme, LIGHT_COLORS, DARK_COLORS } from './src/contexts/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import type { ThemePreference } from './src/contexts/ThemeContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAppUpdate } from './src/hooks/useAppUpdate';
import { FONT } from './src/constants/theme';
import type { User } from './src/types';

const THEME_KEY = 'sahla_theme_pref';

function RootNavigator() {
  const { isAuthenticated, isLoading, loginOAuthToken } = useAuth();
  const { colors } = useTheme();
  const { updateAvailable, latestBuild, latestUrl, CURRENT_BUILD } = useAppUpdate();

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = new URL(event.url);
      if (url.protocol === 'sahla4eco:' && url.hostname === 'auth') {
        const token = url.searchParams.get('token');
        const userStr = url.searchParams.get('user');
        if (token && userStr) {
          try {
            const userData = JSON.parse(decodeURIComponent(userStr)) as User;
            loginOAuthToken(token, userData);
          } catch {}
        }
      }
    };
    Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });
  }, []);

  useEffect(() => {
    if (updateAvailable && latestUrl) {
      const timer = setTimeout(() => {
        Alert.alert(
          'تحديث متاح',
          `إصدار جديد (Build ${latestBuild}) متاح للتحميل. الإصدار الحالي: Build ${CURRENT_BUILD}.`,
          [
            { text: 'لاحقاً', style: 'cancel' },
            { text: 'تحميل', onPress: () => Linking.openURL(latestUrl) },
          ]
        );
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [updateAvailable]);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashIconWrap}>
          <Ionicons name="storefront" size={36} color="#fff" />
        </View>
        <Text style={styles.splashTitle}>Sahla4Eco</Text>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <LoginScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <AppNavigator />
    </SafeAreaView>
  );
}

export default function App() {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPreference(v);
      setLoaded(true);
    });
  }, []);

  const setPref = (p: ThemePreference) => {
    setPreference(p);
    SecureStore.setItemAsync(THEME_KEY, p);
  };

  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={{ isDark, colors, preference, setPreference: setPref }}>
        <ErrorBoundary>
          <AuthProvider>
            <NotifProvider>
              <NavigationContainer>
                <RootNavigator />
                <StatusBar style={isDark ? 'light' : 'dark'} />
              </NavigationContainer>
            </NotifProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  splashIconWrap: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  splashTitle: { fontSize: FONT.xl, fontWeight: '800', color: '#fff' },
});
