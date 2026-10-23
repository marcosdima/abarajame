---
name: alambre-state-storage
description: Headless state management, persistence, capabilities, and network API hooks from alambre. Use when creating reactive stores (createStore, useExternalStore), persisted collections (createCollection), app settings (createConfig), i18n (createLang), themes (createLightDark), haptics/sound (createSensoryCues), undo/redo (useHistoryState), timers (useStopwatch), or typed REST endpoints (createApi).
---

# `alambre` State, Persistence & Capabilities

Keep domain state and persistence out of view components. Place state modules in `src/providers/` or `src/stores/` and wire persistence through the shared `storage` adapter (`src/storage/index.ts`).

---

## 1. Storage Adapter (`createStorage`)

`src/storage/index.ts` exports the shared `storage` instance backed by AsyncStorage:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStorage, getJson, setJson, removeJson } from 'alambre';

export const storage = createStorage(AsyncStorage);

// Direct typed JSON helpers when needed:
await setJson(storage, 'user.profile', { name: 'Ana' });
const profile = await getJson<{ name: string }>(storage, 'user.profile');
await removeJson(storage, 'user.profile');
```

---

## 2. Reactive Stores (`createStore` & `useExternalStore`)

Use `createStore` for lightweight, headless reactive domain state without React Context boilerplate:

```ts
import { createStore, useExternalStore } from 'alambre';

type CounterState = { count: number };

export const counterStore = createStore<CounterState>({ count: 0 });

export const increment = () => {
  counterStore.setState((prev) => ({ count: prev.count + 1 }));
};

export const useCount = () => useExternalStore(counterStore, (s) => s.count);
```

Store API:
- `store.getState(): TState`
- `store.setState(nextStateOrUpdater)`
- `store.subscribe(listener): () => void`
- `store.dispose(): void`

---

## 3. Persisted Entity Collections (`createCollection`)

Use `createCollection<T>` for persisted lists of records where each item has an `id: string`:

```ts
import { createCollection } from 'alambre';
import { storage } from '../storage';

export type TaskItem = {
  id: string;
  title: string;
  done: boolean;
};

export const {
  useCollection: useTasks,
  actions: taskActions,
  store: tasksStore,
} = createCollection<TaskItem>({
  storage,
  storageKey: 'app.tasks',
  initialValue: [],
});
```

Inside a component:
```tsx
const { records, loading, add, update, remove, reorder, move } = useTasks();

await add({ id: '1', title: 'Write tests', done: false });
await update('1', { done: true });
await move(0, 2); // reorder by index
await remove('1');
```

---

## 4. App Capabilities (`createConfig`, `createLang`, `createLightDark`, `createSensoryCues`)

### Key-Value Settings (`createConfig`)
```ts
import { createConfig } from 'alambre';
import { storage } from '../storage';

export const {
  useConfig,
  actions: { saveField },
} = createConfig(
  {
    fontFamily: 'Inter',
    notificationsEnabled: true,
  },
  storage,
);

// Usage in component:
const { config, saveField } = useConfig();
await saveField('fontFamily', 'SpaceMono');
```

### Internationalization (`createLang`)
```ts
import { createLang } from 'alambre';
import { storage } from '../storage';

const langs = {
  es: { home: { title: 'Inicio' } },
  en: { home: { title: 'Home' } },
};

export const {
  useLang,
  actions: { changeLang },
} = createLang(langs, 'es', storage);

// Usage in component:
const { lang, currentLang, changeLang } = useLang();
```

### Theme Switching (`createLightDark`)
```ts
import { createLightDark } from 'alambre';
import { storage } from '../storage';

export const {
  useLightDark,
  actions: { toggleTheme, setThemeName },
} = createLightDark(lightTokens, darkTokens, storage);
```

### Haptics & Audio Throttling (`createSensoryCues`)
Coordinates haptic and audio feedback with persisted user mute toggles and per-cue cooldowns:
```ts
import { createSensoryCues } from 'alambre';
import { storage } from '../storage';

export type AppCue = 'tap' | 'success' | 'error';

export const { useSensoryCues, actions: sensoryActions } = createSensoryCues<AppCue>({
  storage,
  minIntervalMs: 35,
  onHaptic: (cue, payload) => { /* trigger native haptics */ },
  onSound: (cue, payload) => { /* trigger audio player */ },
});

// Usage:
const { hapticsEnabled, soundEnabled, trigger, toggleHaptics, toggleSound } = useSensoryCues();
trigger('tap', { intensity: 'light' });
```

---

## 5. Undo/Redo & Timers (`useHistoryState`, `useStopwatch`)

### Undo/Redo State (`useHistoryState`)
```tsx
import { useHistoryState } from 'alambre';

const { state, set, undo, redo, canUndo, canRedo, clear } = useHistoryState(initialBoard, {
  maxHistory: 50,
});
```

### Stopwatch / Timer (`useStopwatch`)
```tsx
import { useStopwatch, formatStopwatchTime } from 'alambre';

const { elapsedMs, running, start, pause, reset } = useStopwatch({ intervalMs: 100 });
const formatted = formatStopwatchTime(elapsedMs); // "00:12.4"
```

---

## 6. Typed Network API (`createApi`)

Wraps `@tanstack/react-query` with typed route catalogs and automatic cache invalidation:

```ts
import { createApi } from 'alambre';

export const api = createApi({
  baseUrl: 'https://api.example.com',
  getHeaders: async () => ({ Authorization: `Bearer ${token}` }),
});

const getItemsRoute = api.createRoute<Item[], { category?: string }>({
  key: (vars) => ['items', vars?.category],
  method: 'GET',
  path: '/items',
  query: (vars) => ({ category: vars?.category }),
});

const createItemRoute = api.createRoute<Item, { title: string }>({
  key: ['items', 'create'],
  method: 'POST',
  path: '/items',
  body: (vars) => vars,
});

export const useItemsQuery = api.createQueryHookFromRoute(getItemsRoute);
export const useCreateItemMutation = api.createMutationHookFromRoute(createItemRoute, {
  invalidateKeys: [['items']],
});
```
*(Remember to wrap the app in `<api.ApiProvider>` when using query/mutation hooks).*

---

## 7. Unit Testing State & Storage in Vitest

Always test stores and collections headlessly using an in-memory `Map` storage adapter (`tests/*.test.ts`):

```ts
import { describe, expect, it } from 'vitest';
import { createStorage, createCollection } from 'alambre';

const createMemoryStorage = () => {
  const map = new Map<string, string>();
  return createStorage({
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => { map.set(k, v); },
    removeItem: async (k) => { map.delete(k); },
  });
};

describe('tasks collection', () => {
  it('adds and persists records', async () => {
    const storage = createMemoryStorage();
    const { actions, store } = createCollection<{ id: string; title: string }>({
      storage,
      storageKey: 'test.tasks',
      initialValue: [],
    });

    await actions.add({ id: '1', title: 'Test' });
    expect(store.getState().records).toEqual([{ id: '1', title: 'Test' }]);
  });
});
```
