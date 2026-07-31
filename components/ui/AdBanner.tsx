import { useEffect, useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { bannerAdUnitId, isAdsNativeAvailable } from '@/constants/ads';

type BannerAdProps = {
  unitId: string;
  size: string;
  requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
  onAdFailedToLoad?: () => void;
};

type AdBannerProps = {
  reserveHeight?: number;
};

export function AdBanner({ reserveHeight = 60 }: AdBannerProps) {
  const [BannerAd, setBannerAd] = useState<ComponentType<BannerAdProps> | null>(null);
  const [bannerSize, setBannerSize] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isAdsNativeAvailable()) return;

    let active = true;
    void (async () => {
      try {
        const ads = await import('react-native-google-mobile-ads');
        if (!active) return;
        setBannerAd(() => ads.BannerAd as ComponentType<BannerAdProps>);
        setBannerSize(ads.BannerAdSize.ANCHORED_ADAPTIVE_BANNER);
      } catch {
        if (active) setVisible(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (!visible || !BannerAd || !bannerSize) {
    return null;
  }

  return (
    <View style={[styles.wrap, { minHeight: reserveHeight }]}>
      <BannerAd
        unitId={bannerAdUnitId}
        size={bannerSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={() => {
          setVisible(false);
        }}
      />
    </View>
  );
}

export function useInitializeAds() {
  useEffect(() => {
    if (!isAdsNativeAvailable()) return;

    void (async () => {
      try {
        const mobileAds = (await import('react-native-google-mobile-ads')).default;
        await mobileAds().initialize();
      } catch {
        // Ads nao devem derrubar o app.
      }
    })();
  }, []);
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
});
