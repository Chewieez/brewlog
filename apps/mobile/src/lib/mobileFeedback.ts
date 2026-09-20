import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

let chimePlayer: AudioPlayer | null = null;
let isAudioConfigured = false;

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
      if (!isAudioConfigured) {
        await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
        isAudioConfigured = true;
      }
      if (!chimePlayer) {
        chimePlayer = createAudioPlayer(require('../../assets/sounds/chime.wav'));
      }
      await chimePlayer.seekTo(0).catch(() => {});
      chimePlayer.play();
    } catch {
      // Degrades gracefully on simulators or environments without audio capabilities
    }
  },
};
