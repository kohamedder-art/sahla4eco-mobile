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
import type * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useAudioPlayer } from 'expo-audio';
import { useAuth } from '../contexts/AuthContext';
import { registerPushToken, unregisterPushToken, fetchNotifications, markNotificationsRead } from '../api/auth';
import { getJwt } from '../api/client';
type EventSubscription = { remove(): void };
import type { AppNotification } from '../types';

const NOTIFIED_IDS_KEY = 'notified_notification_ids';
const CASH_SOUND_KEY = 'cash_sound_enabled';

/**
 * Native push (FCM token + system popups) only exists in development /
 * production builds. In Expo Go (SDK 53+) those APIs throw, so the whole
 * native layer is switched off there. The server notification LIST keeps
 * working everywhere — only the OS-level popup is Go-skipped.
 */
const PUSH_NATIVE =
  Device.isDevice && Constants.appOwnership !== 'expo';

/**
 * Lazy runtime binding for expo-notifications.
 * The package runs an auto-registration side effect ON IMPORT that throws
 * on Android Expo Go (SDK 53+). So: type-only import above (erased at runtime),
 * real module loaded here — and only in production/development builds.
 */
let nativeMod: typeof ExpoNotifications | null = null;
async function native(): Promise<typeof ExpoNotifications | null> {
  if (!PUSH_NATIVE) return null;
  if (!nativeMod) nativeMod = await import('expo-notifications');
  return nativeMod;
}

async function ensureHandler(): Promise<void> {
  const N = await native();
  if (!N) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

if (PUSH_NATIVE) {
  // Set once a real native module can exist. In Expo Go this whole file
  // runs without ever loading expo-notifications (see native() above).
  ensureHandler().catch(() => {});
}

interface NotifContextType {
  notifications: AppNotification[];
  unreadCount: number;
  register: () => Promise<void>;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  cashSound: boolean;
  setCashSound: (v: boolean) => Promise<void>;
  previewCashSound: () => void;
}

const NotifContext = createContext<NotifContextType | null>(null);

export function NotifProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [cashSound, setCashSoundState] = useState(true);
  const seenNotifIds = useRef<Set<number>>(new Set());
  const loadedRef = useRef(false);
  const cashSoundRef = useRef(true);

  // Cash-register cha-ching for new orders
  const cashPlayer = useAudioPlayer(require('../../assets/sounds/cash-register.ogg'));

  const playCash = useCallback(() => {
    if (!cashSoundRef.current) return;
    try {
      cashPlayer.seekTo(0);
      cashPlayer.play();
    } catch {}
  }, [cashPlayer]);

  const setCashSound = useCallback(async (v: boolean) => {
    cashSoundRef.current = v;
    setCashSoundState(v);
    try {
      await SecureStore.setItemAsync(CASH_SOUND_KEY, v ? '1' : '0');
    } catch {}
    if (v) {
      try {
        cashPlayer.seekTo(0);
        cashPlayer.play();
      } catch {}
    }
  }, [cashPlayer]);

  const previewCashSound = useCallback(() => {
    try {
      cashPlayer.seekTo(0);
      cashPlayer.play();
    } catch {}
  }, [cashPlayer]);

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
      const snd = await SecureStore.getItemAsync(CASH_SOUND_KEY);
      if (snd === '0') {
        cashSoundRef.current = false;
        setCashSoundState(false);
      }
    } catch {}
    loadedRef.current = true;
  }, []);

  const register = useCallback(async () => {
    const N = await native();
    if (!N) {
      console.log('[push] SKIPPED: native push unavailable (Expo Go or emulator)');
      return;
    }
    console.log('[push] register() called');
    await ensureHandler();

    const { status: existingStatus } = await N.getPermissionsAsync();
    console.log('[push] existing permission:', existingStatus);
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
      console.log('[push] requested permission result:', finalStatus);
    }
    if (finalStatus !== 'granted') {
      console.log('[push] SKIPPED: permission not granted');
      return;
    }

    try {
      const tokenData = await N.getDevicePushTokenAsync();
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
          if (n.type === 'new_order') playCash();
          if (PUSH_NATIVE) {
            try {
              const N = await native();
              if (N) {
                await N.scheduleNotificationAsync({
                  content: {
                    title: n.title,
                    body: n.body,
                    data: { type: n.type, order_id: n.order_id },
                    sound: true,
                  },
                  trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, channelId: 'default', seconds: 1 },
                });
              }
            } catch {}
          }
        }
      }
      if (changed) persistSeenIds(seenNotifIds.current);
      setNotifications(data);
    } catch {}
  }, [user, playCash]);

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
    if (!PUSH_NATIVE) return;
    if (Platform.OS === 'android') {
      native().then((N) => {
        if (!N) return;
        // 'default' channel (system sound) + 'orders' channel (cash register).
        // cash_register.ogg is bundled into res/raw by plugins/withNotificationSounds.
        N.setNotificationChannelAsync('default', {
          name: 'الإشعارات',
          importance: N.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563eb',
          sound: 'default',
        }).catch(() => {});
        N.setNotificationChannelAsync('orders', {
          name: 'الطلبات الجديدة',
          importance: N.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#16a34a',
          sound: 'cash_register.ogg',
        }).catch(() => {});
      }).catch(() => {});
    }
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
    if (!PUSH_NATIVE) return;
    let notifSub: { remove(): void } | undefined;
    let respSub: { remove(): void } | undefined;
    let alive = true;
    native().then((N) => {
      if (!N || !alive) return;
      notifSub = N.addNotificationReceivedListener((n) => {
        const data = n.request.content.data as any;
        // Mark FCM-shown ids as seen so the 4s poll doesn't ping them again
        // (kills the double notification: one native + one local for one order).
        const nid = Number(data?.notif_id);
        if (nid) {
          seenNotifIds.current.add(nid);
          persistSeenIds(seenNotifIds.current);
        }
        if (data?.type === 'new_order') playCash();
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

      respSub = N.addNotificationResponseReceivedListener(() => {
        // Navigation handled by the app navigator
      });
    });

    return () => {
      alive = false;
      notifSub?.remove();
      respSub?.remove();
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
    <NotifContext.Provider value={{ notifications, unreadCount, register, refresh, markAllRead, cashSound, setCashSound, previewCashSound }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotif() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotif must be inside NotifProvider');
  return ctx;
}
