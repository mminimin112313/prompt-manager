const INDEXEDDB_NAME = 'PromptManagerCacheDB';
const INDEXEDDB_VERSION = 5;

// Store Names
export const CACHE_STORE_PROMPTS = 'cachedPrompts';
export const CACHE_STORE_FOLDERS = 'cachedFolders';
export const CACHE_STORE_VERSIONS = 'promptVersions';
export const CACHE_STORE_SEQUENCES = 'cachedSequences';
export const CACHE_STORE_USAGE_HISTORY = 'usageHistory';

let dbInstance: IDBDatabase | null = null;

export const openIndexedDB = (): Promise<IDBDatabase> => {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(CACHE_STORE_PROMPTS)) db.createObjectStore(CACHE_STORE_PROMPTS, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(CACHE_STORE_FOLDERS)) db.createObjectStore(CACHE_STORE_FOLDERS, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(CACHE_STORE_VERSIONS)) {
                const vs = db.createObjectStore(CACHE_STORE_VERSIONS, { keyPath: 'id', autoIncrement: true });
                vs.createIndex('promptId', 'promptId', { unique: false });
            }
            if (!db.objectStoreNames.contains(CACHE_STORE_SEQUENCES)) db.createObjectStore(CACHE_STORE_SEQUENCES, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(CACHE_STORE_USAGE_HISTORY)) {
                const hs = db.createObjectStore(CACHE_STORE_USAGE_HISTORY, { keyPath: 'id', autoIncrement: true });
                hs.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = (event.target as IDBOpenDBRequest).result;
            resolve(dbInstance);
        };

        request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
    });
};

export const getFromIndexedDB = async <T>(storeName: string, indexName: string | null = null, queryVal: IDBValidKey | IDBKeyRange | null = null): Promise<T[]> => {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        let request: IDBRequest;

        if (indexName && queryVal !== null) {
            const index = store.index(indexName);
            request = index.getAll(queryVal);
        } else if (queryVal !== null) {
            request = store.get(queryVal);
        } else {
            request = store.getAll();
        }

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
};

export const putIntoIndexedDB = async (storeName: string, data: any): Promise<IDBValidKey> => {
    const db = await openIndexedDB();
    const tx = db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
};

export const deleteFromIndexedDB = async (storeName: string, id: IDBValidKey): Promise<void> => {
    const db = await openIndexedDB();
    const tx = db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
};
