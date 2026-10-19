import { describe, expect, it } from 'vitest';
import { createStorage, getJson, setJson } from 'alambre';

describe('base-template storage wiring', () => {
  it('boots a Storage from AsyncStorage-shaped bindings', async () => {
    const map = new Map<string, string>();
    const storage = createStorage({
      getItem: async (key) => map.get(key) ?? null,
      setItem: async (key, value) => { map.set(key, value); },
      removeItem: async (key) => { map.delete(key); },
    });

    await setJson(storage, 'todo', { ok: true });
    await expect(getJson(storage, 'todo')).resolves.toEqual({ ok: true });
    await expect(getJson(storage, 'missing')).resolves.toBeNull();
  });
});
