import React, { useState, useCallback, useEffect } from 'react';
import { ScrollView, Keyboard } from 'react-native';
import { Stack, useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '@brewlog/ui';
import { AuthSheetContent } from '../../src/features/auth/AuthSheetContent';

export default function AuthSheetScreen() {
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [grabberVisible, setGrabberVisible] = useState(false);

  useEffect(() => {
    Keyboard.dismiss();
    // react-native-screens applies sheetGrabberVisible in finalizeUpdates before presentViewController,
    // which iOS 26+ UISheetPresentationController can defer until interaction; enable once transition starts.
    const activateGrabber = () => setGrabberVisible(true);
    const unsubscribeStart = (navigation as any).addListener?.('transitionStart', (e: any) => {
      if (!e?.data?.closing) {
        activateGrabber();
      }
    });
    const unsubscribeEnd = (navigation as any).addListener?.('transitionEnd', (e: any) => {
      if (!e?.data?.closing) {
        activateGrabber();
      }
    });
    const fallbackTimer = setTimeout(activateGrabber, 150);
    return () => {
      if (typeof unsubscribeStart === 'function') unsubscribeStart();
      if (typeof unsubscribeEnd === 'function') unsubscribeEnd();
      clearTimeout(fallbackTimer);
    };
  }, [navigation]);

  const handleDismiss = useCallback(() => {
    if (submitting) return;
    Keyboard.dismiss();
    if (router.canDismiss()) {
      router.dismiss();
    } else if (router.canGoBack()) {
      router.back();
    }
  }, [submitting, router]);

  const handleOpenSettings = useCallback(() => {
    if (submitting) return;
    Keyboard.dismiss();
    router.replace('/settings/modal');
  }, [submitting, router]);

  return (
    <>
      <Stack.Screen
        options={{
          gestureEnabled: !submitting,
          sheetGrabberVisible: grabberVisible,
        }}
      />
      <ScrollView
        testID="auth-sheet"
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(28, insets.bottom + 12) },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <AuthSheetContent
          isActive={true}
          onDismiss={handleDismiss}
          onOpenSettings={handleOpenSettings}
          onSubmittingChange={setSubmitting}
        />
      </ScrollView>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flexGrow: 0,
    backgroundColor: colors.panel,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
}));
