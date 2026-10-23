import { describe, expect, it, vi } from 'vitest';
import type * as AlambreModule from 'alambre';
import { createConfig, createStorage } from 'alambre';
import { DEFAULT_LAN_RELAY, DEFAULT_PUBLIC_RELAY } from '../src/constants/network';

type JsonRecord = Record<string, unknown>;

const storageMap = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storageMap.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storageMap.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storageMap.delete(key);
    }),
    clear: vi.fn(async () => {
      storageMap.clear();
    }),
  },
}));

import * as React from 'react';

const clientInternals = (React as unknown as {
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: {
    H: Record<string, unknown> | null;
  };
}).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

if (clientInternals) {
  clientInternals.H = {
    useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
  };
}

let capturedLangs: Record<'es' | 'en', JsonRecord> | null = null;
let capturedInitialConfig: JsonRecord | null = null;

vi.mock('alambre', async (importOriginal) => {
  const actual = await importOriginal<typeof AlambreModule>();
  return {
    ...actual,
    createLang: <T extends Record<string, unknown>>(langs: T, storage: unknown) => {
      capturedLangs = langs as unknown as Record<'es' | 'en', JsonRecord>;
      return actual.createLang(langs as never, storage as never);
    },
    createConfig: <T extends Record<string, unknown>>(baseConfig: T, storage: unknown) => {
      capturedInitialConfig = baseConfig as JsonRecord;
      return actual.createConfig(baseConfig as never, storage as never);
    },
  };
});

function getLeafPaths(obj: JsonRecord, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, val] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const childPaths = getLeafPaths(val as JsonRecord, fullPath);
      for (const [childPath, childVal] of childPaths.entries()) {
        result.set(childPath, childVal);
      }
    } else if (typeof val === 'string') {
      result.set(fullPath, val);
    }
  }
  return result;
}

describe('Internationalization dictionary parity (src/providers/lang.tsx)', () => {
  it('loads language tree and captures es and en dictionaries', async () => {
    const langMod = await import('../src/providers/lang');
    expect(langMod).toBeDefined();
    expect(capturedLangs).not.toBeNull();
    expect(capturedLangs).toHaveProperty('es');
    expect(capturedLangs).toHaveProperty('en');
  });

  it('guarantees identical key parity recursively between es and en', () => {
    expect(capturedLangs).not.toBeNull();
    const es = capturedLangs!.es;
    const en = capturedLangs!.en;

    const esPaths = getLeafPaths(es);
    const enPaths = getLeafPaths(en);

    const esKeys = Array.from(esPaths.keys()).sort();
    const enKeys = Array.from(enPaths.keys()).sort();

    const missingInEn = esKeys.filter((k) => !enPaths.has(k));
    const missingInEs = enKeys.filter((k) => !esPaths.has(k));

    expect(missingInEn).toEqual([]);
    expect(missingInEs).toEqual([]);
    expect(esKeys).toEqual(enKeys);

    // Verify all leaves are non-empty strings
    for (const [path, value] of esPaths.entries()) {
      expect(typeof value).toBe('string');
      expect(value.trim().length, `es key ${path} is empty`).toBeGreaterThan(0);
    }
    for (const [path, value] of enPaths.entries()) {
      expect(typeof value).toBe('string');
      expect(value.trim().length, `en key ${path} is empty`).toBeGreaterThan(0);
    }
  });

  it('includes startup keys in both es and en', () => {
    const esStartup = capturedLangs!.es.startup as Record<string, string>;
    const enStartup = capturedLangs!.en.startup as Record<string, string>;

    expect(esStartup).toBeDefined();
    expect(enStartup).toBeDefined();

    expect(esStartup.title).toBe('Abarajame');
    expect(enStartup.title).toBe('Abarajame');

    expect(esStartup.tagline).toBe('Baraja española & mesas multijugador');
    expect(enStartup.tagline).toBe('Spanish card deck & multiplayer tables');

    expect(esStartup.tapToSkip).toBe('Tocá para continuar');
    expect(enStartup.tapToSkip).toBe('Tap to continue');
  });

  it('includes nicknameModal keys in both es and en', () => {
    const esModal = capturedLangs!.es.nicknameModal as Record<string, string>;
    const enModal = capturedLangs!.en.nicknameModal as Record<string, string>;

    expect(esModal).toBeDefined();
    expect(enModal).toBeDefined();

    const expectedKeys = [
      'title',
      'subtitle',
      'inputLabel',
      'inputPlaceholder',
      'confirmAction',
      'errorMinLength',
    ];

    for (const key of expectedKeys) {
      expect(esModal[key]).toBeDefined();
      expect(enModal[key]).toBeDefined();
      expect(esModal[key].length).toBeGreaterThan(0);
      expect(enModal[key].length).toBeGreaterThan(0);
    }

    expect(esModal.title).toBe('¡Bienvenido a Abarajame!');
    expect(enModal.title).toBe('Welcome to Abarajame!');
    expect(esModal.errorMinLength).toBe('Ingresá al menos 2 caracteres.');
    expect(enModal.errorMinLength).toBe('Please enter at least 2 characters.');
  });

  it('includes settings.profile* keys in both es and en', () => {
    const esSettings = capturedLangs!.es.settings as Record<string, string>;
    const enSettings = capturedLangs!.en.settings as Record<string, string>;

    expect(esSettings).toBeDefined();
    expect(enSettings).toBeDefined();

    const profileKeys = [
      'profileTitle',
      'profileSubtitle',
      'profileNameLabel',
      'profileNamePlaceholder',
      'profileNameHelper',
    ];

    for (const key of profileKeys) {
      expect(esSettings[key]).toBeDefined();
      expect(enSettings[key]).toBeDefined();
      expect(esSettings[key].length).toBeGreaterThan(0);
      expect(enSettings[key].length).toBeGreaterThan(0);
    }

    expect(esSettings.profileTitle).toBe('Perfil de Jugador');
    expect(enSettings.profileTitle).toBe('Player Profile');
    expect(esSettings.profileNameLabel).toBe('Apodo');
    expect(enSettings.profileNameLabel).toBe('Nickname');
    expect(esSettings.profileNamePlaceholder).toBe('Ingresá tu apodo');
    expect(enSettings.profileNamePlaceholder).toBe('Enter your nickname');
  });

  it('includes settings.botSpeed* keys in both es and en', () => {
    const esSettings = capturedLangs!.es.settings as Record<string, string>;
    const enSettings = capturedLangs!.en.settings as Record<string, string>;

    expect(esSettings).toBeDefined();
    expect(enSettings).toBeDefined();

    const botSpeedKeys = [
      'botSpeedTitle',
      'botSpeedSubtitle',
      'botSpeedVerySlow',
      'botSpeedSlow',
      'botSpeedNormal',
      'botSpeedFast',
    ];

    for (const key of botSpeedKeys) {
      expect(esSettings[key]).toBeDefined();
      expect(enSettings[key]).toBeDefined();
      expect(esSettings[key].length).toBeGreaterThan(0);
      expect(enSettings[key].length).toBeGreaterThan(0);
    }

    expect(esSettings.botSpeedTitle).toBe('Velocidad de Juego & Bots');
    expect(enSettings.botSpeedTitle).toBe('Game & Bot Speed');
    expect(esSettings.botSpeedVerySlow).toBe('Muy lento');
    expect(enSettings.botSpeedVerySlow).toBe('Very Slow');
    expect(esSettings.botSpeedSlow).toBe('Lento (Por defecto)');
    expect(enSettings.botSpeedSlow).toBe('Slow (Default)');
    expect(esSettings.botSpeedNormal).toBe('Normal');
    expect(enSettings.botSpeedNormal).toBe('Normal');
    expect(esSettings.botSpeedFast).toBe('Rápido');
    expect(enSettings.botSpeedFast).toBe('Fast');
  });

  it('includes local game titles and badge keys in both es and en', () => {
    const esLobby = capturedLangs!.es.lobby as Record<string, string>;
    const enLobby = capturedLangs!.en.lobby as Record<string, string>;
    const esTable = capturedLangs!.es.table as Record<string, string>;
    const enTable = capturedLangs!.en.table as Record<string, string>;

    expect(esLobby.localGameTitle).toBe('Partida Local — Chin Chón');
    expect(enLobby.localGameTitle).toBe('Local Match — Chin Chón');
    expect(esLobby.localGameSubtitle).toBe('Mesa en este dispositivo con bots locales');
    expect(enLobby.localGameSubtitle).toBe('Match on this device with local bots');
    expect(esTable.localBadge).toBe('Local');
    expect(enTable.localBadge).toBe('Local');
  });

  it('switches languages dynamically via changeLang action', async () => {
    const { useLang, changeLang } = await import('../src/providers/lang');

    await changeLang('en');
    const enState = useLang();
    expect(enState.currentLang).toBe('en');
    expect(enState.lang.settings.profileNameLabel).toBe('Nickname');

    await changeLang('es');
    const esState = useLang();
    expect(esState.currentLang).toBe('es');
    expect(esState.lang.settings.profileNameLabel).toBe('Apodo');
  });
});

describe('Configuration behavior (src/providers/config.ts)', () => {
  it('starts initialConfig with empty nickname (playerName: "")', async () => {
    await import('../src/providers/config');
    expect(capturedInitialConfig).not.toBeNull();
    expect(capturedInitialConfig!.playerName).toBe('');
    expect(capturedInitialConfig!.fontFamily).toBe('Inter');
    expect(capturedInitialConfig!.transportMode).toBe('websocket');
    expect(capturedInitialConfig!.wsServerUrl).toBe(DEFAULT_PUBLIC_RELAY);
    expect(capturedInitialConfig!.botSpeed).toBe('slow');
  });

  it('updates and persists botSpeed properly', async () => {
    const { useConfig, saveField } = await import('../src/providers/config');

    expect(useConfig().config.botSpeed).toBe('slow');

    await saveField('botSpeed', 'very_slow');
    expect(useConfig().config.botSpeed).toBe('very_slow');
    expect(storageMap.get('botSpeed')).toBe('very_slow');

    await saveField('botSpeed', 'fast');
    expect(useConfig().config.botSpeed).toBe('fast');
    expect(storageMap.get('botSpeed')).toBe('fast');

    await saveField('botSpeed', 'slow');
    expect(useConfig().config.botSpeed).toBe('slow');
    expect(storageMap.get('botSpeed')).toBe('slow');
  });

  it('defines BOT_SPEED_TIMINGS presets for all 4 speeds with monotonically decreasing delays', async () => {
    const { BOT_SPEED_TIMINGS } = await import('../src/providers/config');
    const speeds = ['very_slow', 'slow', 'normal', 'fast'] as const;

    for (const speed of speeds) {
      expect(BOT_SPEED_TIMINGS[speed]).toBeDefined();
      expect(BOT_SPEED_TIMINGS[speed].botDrawDelayMs).toBeGreaterThan(0);
      expect(BOT_SPEED_TIMINGS[speed].botDiscardDelayMs).toBeGreaterThan(0);
      expect(BOT_SPEED_TIMINGS[speed].flightDurationMs).toBeGreaterThan(0);
    }

    // Monotonically decreasing in delay: very_slow > slow > normal > fast
    expect(BOT_SPEED_TIMINGS.very_slow.botDrawDelayMs).toBeGreaterThan(BOT_SPEED_TIMINGS.slow.botDrawDelayMs);
    expect(BOT_SPEED_TIMINGS.slow.botDrawDelayMs).toBeGreaterThan(BOT_SPEED_TIMINGS.normal.botDrawDelayMs);
    expect(BOT_SPEED_TIMINGS.normal.botDrawDelayMs).toBeGreaterThan(BOT_SPEED_TIMINGS.fast.botDrawDelayMs);

    expect(BOT_SPEED_TIMINGS.very_slow.botDiscardDelayMs).toBeGreaterThan(BOT_SPEED_TIMINGS.slow.botDiscardDelayMs);
    expect(BOT_SPEED_TIMINGS.slow.botDiscardDelayMs).toBeGreaterThan(BOT_SPEED_TIMINGS.normal.botDiscardDelayMs);
    expect(BOT_SPEED_TIMINGS.normal.botDiscardDelayMs).toBeGreaterThan(BOT_SPEED_TIMINGS.fast.botDiscardDelayMs);

    expect(BOT_SPEED_TIMINGS.very_slow.flightDurationMs).toBeGreaterThan(BOT_SPEED_TIMINGS.slow.flightDurationMs);
    expect(BOT_SPEED_TIMINGS.slow.flightDurationMs).toBeGreaterThan(BOT_SPEED_TIMINGS.normal.flightDurationMs);
    expect(BOT_SPEED_TIMINGS.normal.flightDurationMs).toBeGreaterThan(BOT_SPEED_TIMINGS.fast.flightDurationMs);
  });

  it('updates and persists playerName properly', async () => {
    const { useConfig, saveField } = await import('../src/providers/config');

    expect(useConfig().config.playerName).toBe('');

    await saveField('playerName', 'El Mago');
    expect(useConfig().config.playerName).toBe('El Mago');
    expect(storageMap.get('playerName')).toBe('El Mago');

    await saveField('playerName', 'La Reina');
    expect(useConfig().config.playerName).toBe('La Reina');
    expect(storageMap.get('playerName')).toBe('La Reina');

    // Updating back to empty string
    await saveField('playerName', '');
    expect(useConfig().config.playerName).toBe('');
    expect(storageMap.get('playerName')).toBe('');
  });

  it('applies fallback logic for wsServerUrl when empty or invalid', async () => {
    const { useConfig, saveField } = await import('../src/providers/config');

    // Empty URL fallback
    await saveField('wsServerUrl', '');
    expect(useConfig().config.wsServerUrl).toBe(DEFAULT_LAN_RELAY);

    // Stale domain containing 'relay.alambre.party' fallback
    await saveField('wsServerUrl', 'wss://relay.alambre.party/room');
    expect(useConfig().config.wsServerUrl).toBe(DEFAULT_LAN_RELAY);

    // Stale IP containing '192.168.1.102' fallback
    await saveField('wsServerUrl', 'ws://192.168.1.102:8787');
    expect(useConfig().config.wsServerUrl).toBe(DEFAULT_LAN_RELAY);

    // Valid custom WebSocket URL should be preserved without falling back
    const validCustomRelay = 'ws://192.168.1.50:8787';
    await saveField('wsServerUrl', validCustomRelay);
    expect(useConfig().config.wsServerUrl).toBe(validCustomRelay);

    const validProductionRelay = 'wss://relay.custom-production.com/ws';
    await saveField('wsServerUrl', validProductionRelay);
    expect(useConfig().config.wsServerUrl).toBe(validProductionRelay);

    // Reset back to DEFAULT_LAN_RELAY
    await saveField('wsServerUrl', DEFAULT_LAN_RELAY);
    expect(useConfig().config.wsServerUrl).toBe(DEFAULT_LAN_RELAY);
  });

  it('verifies in-memory Map storage adapter persistence and rehydration lifecycle', async () => {
    const memoryMap = new Map<string, string>();
    const isolatedStorage = createStorage({
      getItem: async (key) => memoryMap.get(key) ?? null,
      setItem: async (key, value) => {
        memoryMap.set(key, value);
      },
      removeItem: async (key) => {
        memoryMap.delete(key);
      },
    });

    const baseConfig = {
      playerName: '',
      fontFamily: 'Inter',
      wsServerUrl: DEFAULT_LAN_RELAY,
    };

    const configStore1 = createConfig(baseConfig, isolatedStorage);
    expect(configStore1.store.getState().config.playerName).toBe('');

    await configStore1.actions.saveField('playerName', 'Don Gaucho');
    expect(configStore1.store.getState().config.playerName).toBe('Don Gaucho');
    expect(memoryMap.get('playerName')).toBe('Don Gaucho');

    // Simulate app reboot / rehydration with fresh config store reading existing storage
    const configStore2 = createConfig(baseConfig, isolatedStorage);
    // Allow hydration promise tick
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(configStore2.store.getState().config.playerName).toBe('Don Gaucho');
  });
});
