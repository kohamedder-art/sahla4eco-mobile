/**
 * AGENT INSTRUCTIONS — PUSH NOTIFICATIONS
 * ----------------------------------------------------------------------------
 * NOTIFICATIONS IS THE HERO FEATURE of this app. The whole app was built
 * around it. Do not remove or simplify this without strong reason.
 *
 * This hook must work on ALL Android systems, not just Google Play Services
 * devices. The strategy is layered:
 *   1. Try to obtain an FCM/Expo push token (works on Google Play + iOS).
 *      On success, register it with the server so the platform can also
 *      send native push when the app is killed.
 *   2. ALWAYS poll the in-app notifications API every 4s while the user is
 *      signed in — this covers microG, /e/OS, LineageOS, and any device
 *      where FCM does not register. For any unseen unread item, fire a
 *      local system notification via `scheduleNotificationAsync`. Also
 *      refresh immediately when the app comes to the foreground so the
 *      user does not wait for the next poll.
 *
 * Local notifications MUST:
 *   - Use channelId: 'default' (channel name: "الإشعارات", HIGH importance)
 *   - Persist seen IDs in SecureStore under NOTIFIED_IDS_KEY so app
 *     restarts do not re-notify already-seen items.
 *   - Skip items where `read === true` (already marked read on server).
 * ----------------------------------------------------------------------------
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../contexts/AuthContext';
import { registerPushToken, unregisterPushToken, fetchNotifications, markNotificationsRead } from '../api/auth';
import { getJwt } from '../api/client';
import type { EventSubscription } from 'expo-modules-core';
import type { AppNotification } from '../types';

const NOTIFIED_IDS_KEY = 'notified_notification_ids';
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

// Background task handles data-only notifications when app is killed
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }: any) => {
  if (error) return;
  const { title, body, ...rest } = data || {};
  if (title || body) {
    Notifications.scheduleNotificationAsync({
      content: { title, body, data: rest, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
    }).catch(() => {});
  }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotifContextType {
  notifications: AppNotification[];
  unreadCount: number;
  register: () => Promise<void>;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotifContext = createContext<NotifContextType | null>(null);

export function NotifProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const seenNotifIds = useRef<Set<number>>(new Set());
  const loadedRef = useRef(false);

  const persistSeenIds = useCallback(async (ids: Set<number>) => {
    try {
      await SecureStore.setItemAsync(NOTIFIED_IDS_KEY, JSON.stringify([...ids]));
    } catch {}
  }, []);

  const loadSeenIds = useCallback(async () => {
    try {
      const raw = await SecureStore.getItemAsync(NOTIFIED_IDS_KEY);
      if (raw) {
        const arr: number[] = JSON.parse(raw);
        seenNotifIds.current = new Set(arr);
      }
    } catch {}
    loadedRef.current = true;
  }, []);

  const register = useCallback(async () => {
    console.log('[push] register() called, isDevice:', Device.isDevice);
    if (!Device.isDevice) {
      console.log('[push] SKIPPED: not a physical device');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[push] existing permission:', existingStatus);
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[push] requested permission result:', finalStatus);
    }
    if (finalStatus !== 'granted') {
      console.log('[push] SKIPPED: permission not granted');
      return;
    }

    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      console.log('[push] got FCM token:', tokenData.data);
      setExpoPushToken(tokenData.data);
      if (tokenData.data) {
        try {
          const jwt = await getJwt();
          if (jwt) {
            await registerPushToken(jwt, tokenData.data, 'android');
            console.log('[push] FCM token registered with server');
          }
        } catch (e: any) {
          console.error('[push] registerPushToken FAILED:', e.message);
        }
      }
    } catch (e: any) {
      console.error('[push] getDevicePushTokenAsync FAILED:', e.message);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const jwt = await getJwt();
      if (!jwt) return;
      const data = await fetchNotifications(jwt);
      let changed = false;
      for (const n of data) {
        if (n.read) continue;
        if (n.id && !seenNotifIds.current.has(n.id)) {
          seenNotifIds.current.add(n.id);
          changed = true;
          Notifications.scheduleNotificationAsync({
            content: {
              title: n.title,
              body: n.body,
              data: { type: n.type, order_id: n.order_id },
              sound: true,
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, channelId: 'default', seconds: 1 },
          }).catch(() => {});
        }
      }
      if (changed) persistSeenIds(seenNotifIds.current);
      setNotifications(data);
    } catch {}
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    try {
      const jwt = await getJwt();
      if (!jwt) return;
      await markNotificationsRead(jwt);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }, [user]);

  // Create Android notification channel unconditionally on mount
  // (must exist BEFORE any push arrives, or Android 8+ silently drops it)
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'الإشعارات',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
        sound: 'default',
      }).catch(() => {});
    }
  }, []);

  // Register background notification task for notifications when app is killed
  useEffect(() => {
    Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(() => {});
  }, []);

  // Auto-register push on cold start when already logged in
  useEffect(() => {
    if (user && !expoPushToken) {
      console.log('[push] cold start: user exists but no token, calling register()');
      register().catch((e: any) => {
        console.error('[push] cold start register() FAILED:', e.message);
      });
    }
  }, [user]);

  // Send push token to server when both user and token are ready
  useEffect(() => {
    if (user && expoPushToken) {
      (async () => {
        console.log('[push] sending token to server, user:', user.id, 'token:', expoPushToken);
        const jwt = await getJwt();
        if (!jwt) {
          console.log('[push] SKIPPED: no JWT available');
          return;
        }
        try {
          await registerPushToken(jwt, expoPushToken, Platform.OS);
          console.log('[push] token registered successfully');
        } catch (e: any) {
          console.error('[push] registerPushToken FAILED:', e.message);
        }
      })();
    }
  }, [user, expoPushToken]);

  // Listen for incoming notifications
  useEffect(() => {
    const notifSub = Notifications.addNotificationReceivedListener((n) => {
      const data = n.request.content.data as any;
      if (data?.type) {
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: data.type,
            title: n.request.content.title || '',
            body: n.request.content.body || '',
            order_id: data.order_id,
            read: false,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    });

    const respSub = Notifications.addNotificationResponseReceivedListener((r) => {
      // Navigation handled by the app navigator
    });

    return () => {
      notifSub.remove();
      respSub.remove();
    };
  }, []);

  // Refresh notifications periodically + immediately on app foreground
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await loadSeenIds();
      if (cancelled) return;
      refresh();
    })();
    const interval = setInterval(refresh, 4000);
    // Refresh immediately when the app comes to the foreground so the user
    // does not have to wait up to the poll interval to see new activity.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [user, refresh, loadSeenIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, register, refresh, markAllRead }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotif() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotif must be inside NotifProvider');
  return ctx;
}
