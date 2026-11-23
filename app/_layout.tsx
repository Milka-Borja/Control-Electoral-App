import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { container, netInfoSyncManager } from '../src/infrastructure/di/container';
import { initSentryMonitoring } from '../src/infrastructure/monitoring/sentryAdapter';
import { ConfirmSheet } from '../src/presentation/components/ConfirmSheet';
import { FeedbackOverlay } from '../src/presentation/components/FeedbackOverlay';
import { useAuthStore } from '../src/presentation/store/authStore';
import { useSyncStore } from '../src/presentation/store/syncStore';

initSentryMonitoring();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
  },
});

function RootNavigatorGuard() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  const { user, isHydrated, isRecoveryFlow, setUser, setHydrated, setRecoveryFlow } =
    useAuthStore();
  const { setOnline, setSyncing, setPendingCount, markSyncedNow } = useSyncStore();

  // Breadcrumb automático de pantalla para Sentry (ADR-05, RF-17)
  useEffect(() => {
    if (pathname) {
      container.crashMonitor.addBreadcrumb('navigation', `Pantalla: ${pathname}`);
    }
  }, [pathname]);

  // 1. Hidratar sesión inicial + Deep Links (ADR-01, ADR-02)
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const linkType = await container.authRepository.handleDeepLinkUrl(initialUrl);
          if (linkType === 'RECOVERY' && mounted) {
            setRecoveryFlow(true);
          }
        }

        const currentUser = await container.authRepository.getCurrentSessionUser();
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            container.crashMonitor.setSafeUserContext(currentUser.id, currentUser.rol);
          }
        }
      } catch (err) {
        container.crashMonitor.captureNonFatal(err, {
          screen: 'RootLayout',
          action: 'bootstrapSession',
        });
      } finally {
        if (mounted) setHydrated(true);
      }
    };

    void bootstrap();

    const linkSub = Linking.addEventListener('url', async ({ url }) => {
      const linkType = await container.authRepository.handleDeepLinkUrl(url);
      if (linkType === 'RECOVERY') {
        setRecoveryFlow(true);
        router.replace('/(auth)/nueva-clave');
      } else if (linkType === 'VERIFIED') {
        const refreshed = await container.authRepository.getCurrentSessionUser();
        setUser(refreshed);
      }
    });

    return () => {
      mounted = false;
      linkSub.remove();
    };
  }, [router, setHydrated, setRecoveryFlow, setUser]);

  // 2. Motor NetInfo + Mutex para sincronización automática (ADR-10, RF-16)
  useEffect(() => {
    const runAutoSync = async () => {
      const countBefore = await container.syncRepository.getPendingCount();
      setPendingCount(countBefore);
      if (countBefore === 0) return;

      await netInfoSyncManager.runExclusive(async () => {
        setSyncing(true);
        try {
          const summary = await container.processSyncQueueUseCase.execute();
          const remaining = await container.syncRepository.getPendingCount();
          setPendingCount(remaining);
          if (summary.enviados > 0 || summary.conflictos > 0) {
            markSyncedNow();
            await queryClient.invalidateQueries();
          }
        } finally {
          setSyncing(false);
        }
      });
    };

    void container.networkMonitor.isOnline().then((online) => {
      setOnline(online);
      if (online && user) void runAutoSync();
    });

    const unsubscribe = container.networkMonitor.subscribe((online) => {
      setOnline(online);
      if (online && user) {
        void runAutoSync();
      }
    });

    return unsubscribe;
  }, [user, setOnline, setSyncing, setPendingCount, markSyncedNow]);

  // 3. Guard de redirección por 3 variables: sesión, mustChangePassword y rol (ADR-06)
  useEffect(() => {
    if (!isHydrated) return;

    const rootGroup = segments[0];

    if (isRecoveryFlow) {
      if (pathname !== '/nueva-clave') {
        router.replace('/(auth)/nueva-clave');
      }
      return;
    }

    if (!user) {
      if (rootGroup !== '(auth)') {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (user.mustChangePassword) {
      if (pathname !== '/primer-ingreso') {
        router.replace('/(auth)/primer-ingreso');
      }
      return;
    }

    if (user.rol === 'PROVINCIAL' && rootGroup !== '(provincial)') {
      router.replace('/(provincial)');
    } else if (user.rol === 'RECINTO' && rootGroup !== '(recinto)') {
      router.replace('/(recinto)');
    } else if (user.rol === 'VEEDOR' && rootGroup !== '(veedor)') {
      router.replace('/(veedor)');
    }
  }, [isHydrated, user, isRecoveryFlow, segments, pathname, router]);

  return (
    <>
      <Slot />
      <FeedbackOverlay />
      <ConfirmSheet />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootNavigatorGuard />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}