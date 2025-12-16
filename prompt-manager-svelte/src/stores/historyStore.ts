import { writable } from 'svelte/store';
import { CACHE_STORE_USAGE_HISTORY, getFromIndexedDB, putIntoIndexedDB } from '../services/indexedDB';

export interface UsageRecord {
    id?: number;
    type: 'prompt_copy' | 'template_generate' | 'sequence_run' | 'other';
    itemId: string;
    itemName: string;
    content?: string;
    timestamp: Date;
    variablesUsed?: Record<string, string>;
}

function createHistoryStore() {
    const { subscribe, set, update } = writable<UsageRecord[]>([]);

    return {
        subscribe,
        init: async () => {
            const records = await getFromIndexedDB<UsageRecord>(CACHE_STORE_USAGE_HISTORY);
            // Sort by timestamp desc
            records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            set(records);
        },
        logUsage: async (record: Omit<UsageRecord, 'timestamp'>) => {
            const newRecord = { ...record, timestamp: new Date() };
            // Save to DB
            const id = await putIntoIndexedDB(CACHE_STORE_USAGE_HISTORY, newRecord);
            // Update store
            update(history => [{ ...newRecord, id: id as number }, ...history]);
        },
        clearHistory: async () => {
            // Need a clear function in indexedDB or loop delete? 
            // For now, let's just not implement clear or do it later.
            // Or technically, deleting the DB handles it, but that's overkill.
            // Let's stick to log/view for now.
        }
    };
}

export const historyStore = createHistoryStore();
