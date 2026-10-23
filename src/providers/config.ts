import { createConfig } from 'alambre';
import { storage } from '../storage';
import { DEFAULT_PUBLIC_RELAY, DEFAULT_LAN_RELAY, type TransportPreference } from '../constants/network';

export * from '../constants/network';

export type BotSpeed = 'very_slow' | 'slow' | 'normal' | 'fast';

export interface BotSpeedTiming {
  botDrawDelayMs: number;
  botDiscardDelayMs: number;
  postTurnDelayMs: number;
  flightDurationMs: number;
}

export const BOT_SPEED_TIMINGS: Record<BotSpeed, BotSpeedTiming> = {
  very_slow: {
    botDrawDelayMs: 1400,
    botDiscardDelayMs: 1400,
    postTurnDelayMs: 700,
    flightDurationMs: 550,
  },
  slow: {
    botDrawDelayMs: 950,
    botDiscardDelayMs: 950,
    postTurnDelayMs: 450,
    flightDurationMs: 420,
  },
  normal: {
    botDrawDelayMs: 550,
    botDiscardDelayMs: 550,
    postTurnDelayMs: 250,
    flightDurationMs: 280,
  },
  fast: {
    botDrawDelayMs: 250,
    botDiscardDelayMs: 250,
    postTurnDelayMs: 120,
    flightDurationMs: 180,
  },
};

const initialConfig = {
  playerName: '',
  fontFamily: 'Inter',
  transportMode: 'websocket' as TransportPreference,
  wsServerUrl: DEFAULT_PUBLIC_RELAY,
  botSpeed: 'slow' as BotSpeed,
};

const rawConfig = createConfig(initialConfig, storage);

export const useConfig = () => {
  const result = rawConfig.useConfig();
  const currentUrl = result.config.wsServerUrl;
  const isInvalidUrl =
    !currentUrl ||
    currentUrl.includes('relay.alambre.party') ||
    currentUrl.includes('192.168.1.102');

  if (isInvalidUrl) {
    return {
      ...result,
      config: {
        ...result.config,
        wsServerUrl: DEFAULT_LAN_RELAY,
      },
    };
  }

  return result;
};

export const { saveField } = rawConfig.actions;
