import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { parabaService } from '@/services/parabaService';
import { secureGetItem, secureSetItem } from '@/utils/secureStorage';

const PUSH_PROMPT_KEY = 'PARABA_PUSH_PROMPT_SEEN';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getExpoProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus | null> {
  if (!Device.isDevice) return null;
  const current = await Notifications.getPermissionsAsync();
  return current.status;
}

export async function hasSeenNotificationPrompt(): Promise<boolean> {
  return (await secureGetItem(PUSH_PROMPT_KEY)) === '1';
}

export async function markNotificationPromptSeen(): Promise<void> {
  await secureSetItem(PUSH_PROMPT_KEY, '1');
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('paraba-default', {
    name: 'Paraba',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function syncTokenWithBackend(): Promise<string | null> {
  await ensureAndroidChannel();

  const projectId = getExpoProjectId();
  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  const token = tokenResponse.data;
  if (!token) return null;

  await parabaService.salvarPushToken(token);
  return token;
}

/** Sincroniza o token apenas se a permissão ja foi concedida. */
export async function syncPushTokenIfGranted(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return null;

  return syncTokenWithBackend();
}

/** Solicita a permissao do sistema e, se concedida, sincroniza o token. */
export async function requestNotificationPermissionAndSync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  await markNotificationPromptSeen();

  if (status !== 'granted') {
    return null;
  }

  return syncTokenWithBackend();
}

/** @deprecated Use syncPushTokenIfGranted ou requestNotificationPermissionAndSync. */
export async function registerAndSyncPushToken(): Promise<string | null> {
  return syncPushTokenIfGranted();
}
