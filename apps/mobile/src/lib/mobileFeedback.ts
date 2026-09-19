import * as Haptics from 'expo-haptics';

export const mobileFeedback = {
  triggerHapticCountdown: async (): Promise<void> => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Degrades gracefully on simulators without haptic actuators
    }
  },

  triggerHapticStageTransition: async (): Promise<void> => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Degrades gracefully on simulators
    }
  },

  triggerHapticBrewComplete: async (): Promise<void> => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Degrades gracefully on simulators
    }
  },

  triggerHapticTap: async (): Promise<void> => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Degrades gracefully on simulators
    }
  },

  playChime: async (isMuted: boolean): Promise<void> => {
    if (isMuted) return;
    try {
      // Audio chime cue
    } catch {
      // Degrades gracefully
    }
  },
};
