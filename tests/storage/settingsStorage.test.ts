import {
  createMemorySettingsStorage,
  SETTINGS_KEYS,
} from '../../src/services/storage/settingsStorage';

describe('settingsStorage (memory implementation)', () => {
  it('returns the fallback when nothing is stored', async () => {
    const storage = createMemorySettingsStorage();
    await expect(storage.get(SETTINGS_KEYS.language, 'bg')).resolves.toBe('bg');
  });

  it('round-trips a value', async () => {
    const storage = createMemorySettingsStorage();
    await storage.set(SETTINGS_KEYS.language, 'en');
    await expect(storage.get(SETTINGS_KEYS.language, 'bg')).resolves.toBe('en');
  });

  it('keeps keys independent', async () => {
    const storage = createMemorySettingsStorage();
    await storage.set(SETTINGS_KEYS.language, 'en');
    await storage.set(SETTINGS_KEYS.onboardingCompleted, 'true');
    await expect(storage.get(SETTINGS_KEYS.onboardingCompleted, 'false')).resolves.toBe(
      'true',
    );
    await expect(storage.get(SETTINGS_KEYS.language, 'bg')).resolves.toBe('en');
  });

  it('can be seeded for tests', async () => {
    const storage = createMemorySettingsStorage({
      [SETTINGS_KEYS.onboardingCompleted]: 'true',
    });
    await expect(storage.get(SETTINGS_KEYS.onboardingCompleted, 'false')).resolves.toBe(
      'true',
    );
  });

  it('exposes stable storage keys', () => {
    expect(SETTINGS_KEYS.language).toBe('settings.language');
    expect(SETTINGS_KEYS.onboardingCompleted).toBe('settings.onboardingCompleted');
  });
});
