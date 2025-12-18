import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { exportKey, importKey, generateKey, encryptData, decryptData } from '../utils/crypto';

interface Settings {
    theme: 'dark' | 'light';
    quickLinkUrl: string; // URL to open on copy
    hasApiKey: boolean; // Flag to show if key exists
    encryptedApiKey: { encrypted: number[], iv: number[] } | null;
    encryptionKey: JsonWebKey | null; // The Master Key (stored locally for now)
}

const defaultSettings: Settings = {
    theme: 'dark',
    quickLinkUrl: '',
    hasApiKey: false,
    encryptedApiKey: null,
    encryptionKey: null
};

function createSettingsStore() {
    const { subscribe, set, update } = writable<Settings>(defaultSettings);

    return {
        subscribe,
        init: async () => {
            if (!browser) return;

            const stored = localStorage.getItem('pm_settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Migrate legacy key if exists
                const legacyKey = localStorage.getItem('gemini_api_key');
                if (legacyKey) {
                    await settingsStore.setApiKey(legacyKey);
                    localStorage.removeItem('gemini_api_key'); // Remove insecure key
                } else {
                    set(parsed);
                }
            } else {
                // First run: generate a master key
                const key = await generateKey();
                const exported = await exportKey(key);
                update(s => ({ ...s, encryptionKey: exported }));
                saveToLocalStorage(get(settingsStore));
            }
            applyTheme();
        },
        toggleTheme: () => {
            update(s => {
                const newTheme = s.theme === 'dark' ? 'light' : 'dark';
                const next = { ...s, theme: newTheme };
                saveToLocalStorage(next);
                applyTheme(newTheme);
                return next;
            });
        },
        setQuickLink: (url: string) => {
            update(s => {
                const next = { ...s, quickLinkUrl: url };
                saveToLocalStorage(next);
                return next;
            });
        },
        setApiKey: async (rawKey: string) => {
            // Get or Create Master Key
            let current = get(settingsStore);
            let cryptoKey: CryptoKey;

            if (!current.encryptionKey) {
                cryptoKey = await generateKey();
                const exported = await exportKey(cryptoKey);
                update(s => ({ ...s, encryptionKey: exported }));
                // update current reference
                current = get(settingsStore);
            } else {
                cryptoKey = await importKey(current.encryptionKey);
            }

            const enc = await encryptData(rawKey, cryptoKey);
            update(s => {
                const next = { ...s, encryptedApiKey: enc, hasApiKey: true };
                saveToLocalStorage(next);
                return next;
            });
        },
        getApiKey: async (): Promise<string | null> => {
            const current = get(settingsStore);
            if (!current.encryptedApiKey || !current.encryptionKey) return null;

            try {
                const cryptoKey = await importKey(current.encryptionKey);
                return await decryptData(current.encryptedApiKey.encrypted, current.encryptedApiKey.iv, cryptoKey);
            } catch (e) {
                console.error("Decryption failed", e);
                return null;
            }
        },
        clearApiKey: () => {
            update(s => {
                const next = { ...s, encryptedApiKey: null, hasApiKey: false };
                saveToLocalStorage(next);
                return next;
            });
        }
    };
}

// Helper to access value synchronously for saving
import { get } from 'svelte/store';

function saveToLocalStorage(settings: Settings) {
    if (browser) {
        localStorage.setItem('pm_settings', JSON.stringify(settings));
    }
}

function applyTheme(t?: 'dark' | 'light') {
    if (!browser) return;
    const theme = t || get(settingsStore).theme;
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

export const settingsStore = createSettingsStore();
