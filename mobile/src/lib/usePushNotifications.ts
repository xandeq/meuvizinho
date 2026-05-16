import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiClient } from './api';
import { useAuthStore } from './auth-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPushToken(): Promise<void> {
  // Physical devices only — simulators can't receive push
  if (!Constants.isDevice && Platform.OS !== 'web') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

  await apiClient.put('/api/v1/push-token', { token: tokenData.data });
}

export function usePushNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    registerPushToken().catch(() => {
      // Silent — push is best-effort, not critical
    });
  }, [isAuthenticated]);
}
