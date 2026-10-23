import { Vibration } from 'react-native';
import { createSensoryCues } from 'alambre';
import { storage } from '../storage';

export type TableSensoryCue =
  | 'card_select'
  | 'card_draw'
  | 'card_discard'
  | 'card_reorder'
  | 'round_close'
  | 'match_win';

export const {
  useSensoryCues,
  actions: sensoryActions,
} = createSensoryCues<TableSensoryCue>({
  storage,
  storagePrefix: 'abarajame.sensory',
  minIntervalMs: 40,
  onHaptic: (cue) => {
    try {
      if (cue === 'round_close' || cue === 'match_win') {
        Vibration.vibrate(35);
      } else if (cue === 'card_discard' || cue === 'card_draw') {
        Vibration.vibrate(15);
      }
    } catch {
      // Ignore on platforms where Vibration is unavailable
    }
  },
});
