import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPlayer = {
  play: vi.fn(),
  seekTo: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  remove: vi.fn(),
};

const mockCreateAudioPlayer = vi.fn().mockReturnValue(mockPlayer);
const mockSetAudioModeAsync = vi.fn().mockResolvedValue(undefined);

// Tell Node how to handle .wav binary files in test environment
(require as any).extensions['.wav'] = (module: any) => {
  module.exports = 1;
};

vi.mock('expo-audio', () => ({
  createAudioPlayer: (...args: any[]) => mockCreateAudioPlayer(...args),
  setAudioModeAsync: (...args: any[]) => mockSetAudioModeAsync(...args),
}));

vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn().mockResolvedValue(undefined),
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  selectionAsync: vi.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

import * as Haptics from 'expo-haptics';
import { mobileFeedback } from './mobileFeedback';

describe('mobileFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('playChime', () => {
    it('does nothing and returns early when isMuted is true', async () => {
      await mobileFeedback.playChime(true);

      expect(mockSetAudioModeAsync).not.toHaveBeenCalled();
      expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
      expect(mockPlayer.play).not.toHaveBeenCalled();
    });

    it('configures audio mode and plays chime sound when isMuted is false', async () => {
      await mobileFeedback.playChime(false);

      expect(mockSetAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: true });
      expect(mockCreateAudioPlayer).toHaveBeenCalled();
      expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
      expect(mockPlayer.play).toHaveBeenCalled();
    });

    it('reuses existing audio player on subsequent chime calls', async () => {
      mockCreateAudioPlayer.mockClear();

      await mobileFeedback.playChime(false);
      expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
      expect(mockPlayer.play).toHaveBeenCalled();
    });

    it('degrades gracefully without throwing if audio playback fails', async () => {
      mockPlayer.play.mockImplementationOnce(() => {
        throw new Error('Audio hardware unavailable');
      });

      await expect(mobileFeedback.playChime(false)).resolves.not.toThrow();
    });
  });

  describe('haptics', () => {
    it('triggers light impact for countdown', async () => {
      await mobileFeedback.triggerHapticCountdown();
      expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    });

    it('triggers success notification for stage transition', async () => {
      await mobileFeedback.triggerHapticStageTransition();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    });

    it('triggers success notification for brew complete', async () => {
      await mobileFeedback.triggerHapticBrewComplete();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    });

    it('triggers selection feedback for button taps', async () => {
      await mobileFeedback.triggerHapticTap();
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    it('degrades gracefully if haptics fail', async () => {
      vi.mocked(Haptics.impactAsync).mockRejectedValueOnce(new Error('No actuator'));
      await expect(mobileFeedback.triggerHapticCountdown()).resolves.not.toThrow();
    });
  });
});
