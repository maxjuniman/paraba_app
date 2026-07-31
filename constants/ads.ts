import Constants from 'expo-constants';
import { Platform, TurboModuleRegistry } from 'react-native';

type AdsExtra = {
  admobBannerAndroid?: string;
  admobBannerIos?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as AdsExtra;

const TEST_ADAPTIVE_BANNER =
  Platform.OS === 'ios'
    ? 'ca-app-pub-3940256099942544/2435281174'
    : 'ca-app-pub-3940256099942544/9214589741';

const productionBannerId =
  Platform.OS === 'ios' ? extra.admobBannerIos?.trim() : extra.admobBannerAndroid?.trim();

export const bannerAdUnitId =
  __DEV__ || !productionBannerId ? TEST_ADAPTIVE_BANNER : productionBannerId;

/** True apenas quando o modulo nativo do AdMob esta no binario (nao Expo Go / build antigo). */
export function isAdsNativeAvailable(): boolean {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;

  try {
    return TurboModuleRegistry.get('RNGoogleMobileAdsModule') != null;
  } catch {
    return false;
  }
}
