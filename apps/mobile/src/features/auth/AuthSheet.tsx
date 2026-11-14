import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  Animated,
  Keyboard,
  Easing,
  BackHandler,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { makeStyles } from "@brewlog/ui";
import { AuthSheetContent } from "./AuthSheetContent";

export interface AuthSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const AuthSheet: React.FC<AuthSheetProps> = ({ visible, onClose }) => {
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const keyboardPadding = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(visible ? 0 : 300)).current;
  const backdropOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === "ios" ? (e.duration || 250) : 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: 0,
        duration: Platform.OS === "ios" ? (e?.duration || 200) : 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, keyboardPadding]);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(translateY, {
          toValue: 300,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start(() => {
        setRendered(false);
      });
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    if (submitting) return;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(translateY, {
        toValue: 300,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setRendered(false);
      onClose();
    });
  }, [submitting, onClose, backdropOpacity, translateY]);

  const handleOpenPreferences = useCallback(() => {
    if (submitting) return;
    handleDismiss();
    router.push("/settings/modal");
  }, [submitting, handleDismiss, router]);

  const submittingRef = useRef(submitting);
  submittingRef.current = submitting;
  const handleDismissRef = useRef(handleDismiss);
  handleDismissRef.current = handleDismiss;

  const resetDragPosition = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !submittingRef.current,
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        !submittingRef.current &&
        Math.abs(gestureState.dy) > 4 &&
        Math.abs(gestureState.dy) >= Math.abs(gestureState.dx),
      onPanResponderMove: (_evt, gestureState) => {
        if (submittingRef.current) return;
        const dragY = Math.max(0, gestureState.dy);
        translateY.setValue(dragY);
        backdropOpacity.setValue(Math.max(0, 1 - dragY / 300));
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const shouldDismiss =
          !submittingRef.current &&
          (gestureState.dy > 100 || (gestureState.vy > 0.6 && gestureState.dy > 20));
        if (shouldDismiss) {
          handleDismissRef.current();
          return;
        }
        resetDragPosition();
      },
      onPanResponderTerminate: () => {
        resetDragPosition();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
      keyboardPadding.setValue(0);
    }
  }, [visible, keyboardPadding]);

  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      if (submitting) return true;
      handleDismiss();
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [visible, submitting, handleDismiss]);

  if (!rendered && !visible) {
    return null;
  }

  return (
    <View
      testID="auth-sheet"
      style={styles.modalOverlay}
      accessibilityViewIsModal={true}
      aria-modal={true}
      onAccessibilityEscape={submitting ? undefined : handleDismiss}
    >
      <Animated.View
        style={[styles.keyboardAvoidContainer, { paddingBottom: keyboardPadding }]}
      >
        <TouchableWithoutFeedback
          onPress={submitting ? undefined : handleDismiss}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          accessibilityState={{ disabled: submitting }}
        >
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.sheetContainer,
                  {
                    paddingBottom: Math.max(28, insets.bottom + 12),
                    transform: [{ translateY }],
                  },
                ]}
              >
                {/* Grabber Handle */}
                <View
                  testID="auth-sheet-grabber"
                  style={styles.grabberArea}
                  {...panResponder.panHandlers}
                >
                  <View style={styles.grabber} />
                </View>

                <ScrollView
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                >
                  <AuthSheetContent
                    isActive={visible}
                    onDismiss={handleDismiss}
                    onOpenSettings={handleOpenPreferences}
                    onSubmittingChange={setSubmitting}
                  />
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "90%",
    paddingBottom: 28,
  },
  grabberArea: {
    width: "100%",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
}));
