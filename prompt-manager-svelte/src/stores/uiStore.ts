import { writable } from 'svelte/store';
import type { FilterState } from '../types';

export const uiStore = writable({
    sidebarOpen: true,
    filter: { type: 'all', id: null, name: '모든 항목' } as FilterState,
    searchQuery: '',
    sortOrder: 'updatedAt_desc',
    activeModal: null as 'template' | 'sequence' | null,
    modalData: null as any,
    toast: null as { message: string, type?: 'info' | 'error' } | null
});

export const showToast = (message: string, type: 'info' | 'error' = 'info') => {
    uiStore.update(s => ({ ...s, toast: { message, type } }));
    setTimeout(() => {
        uiStore.update(s => ({ ...s, toast: null }));
    }, 3000);
};
