import { writable, get } from 'svelte/store';
import { collection, query, orderBy, onSnapshot, addDoc, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { authStore } from './authStore';
import type { Prompt, Folder, Sequence } from '../types';

function createPromptStore() {
    const { subscribe, set, update } = writable<{
        prompts: Prompt[];
        folders: Folder[];
        sequences: Sequence[];
        loading: boolean;
    }>({
        prompts: [],
        folders: [],
        sequences: [],
        loading: false
    });

    let unsubscribePrompts: (() => void) | null = null;
    let unsubscribeFolders: (() => void) | null = null;
    let unsubscribeSequences: (() => void) | null = null;

    authStore.subscribe(async ($auth) => {
        if ($auth.user) {
            // Load from Firestore
            const uid = $auth.user.uid;

            // Prompts
            const qPrompts = query(collection(db, 'users', uid, 'prompts'), orderBy('updatedAt', 'desc'));
            unsubscribePrompts = onSnapshot(qPrompts, (snap) => {
                const prompts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt));
                update(s => ({ ...s, prompts }));
            });

            // Folders
            const qFolders = query(collection(db, 'users', uid, 'folders'), orderBy('name', 'asc'));
            unsubscribeFolders = onSnapshot(qFolders, (snap) => {
                const folders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Folder));
                update(s => ({ ...s, folders }));
            });

            // Sequences
            const qSequences = query(collection(db, 'users', uid, 'sequences'), orderBy('name', 'asc'));
            unsubscribeSequences = onSnapshot(qSequences, (snap) => {
                const sequences = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sequence));
                update(s => ({ ...s, sequences }));
            });

        } else {
            // Cleanup on logout
            if (unsubscribePrompts) unsubscribePrompts();
            if (unsubscribeFolders) unsubscribeFolders();
            if (unsubscribeSequences) unsubscribeSequences();
            set({ prompts: [], folders: [], sequences: [], loading: false });
        }
    });

    // Actions
    const addPrompt = async (prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) => {
        const $auth = get(authStore);
        if (!$auth.user) return;

        await addDoc(collection(db, 'users', $auth.user.uid, 'prompts'), {
            ...prompt,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    };

    const updatePrompt = async (id: string, data: Partial<Prompt>) => {
        const $auth = get(authStore);
        if (!$auth.user) return;

        const { id: _, ...updateData } = data; // content excluded? no, just id
        await setDoc(doc(db, 'users', $auth.user.uid, 'prompts', id), {
            ...updateData,
            updatedAt: serverTimestamp()
        }, { merge: true });
    };

    const deletePrompt = async (id: string) => {
        const $auth = get(authStore);
        if (!$auth.user) return;
        await deleteDoc(doc(db, 'users', $auth.user.uid, 'prompts', id));
    };

    const addFolder = async (name: string) => {
        const $auth = get(authStore);
        if (!$auth.user) return;
        await addDoc(collection(db, 'users', $auth.user.uid, 'folders'), { name });
    };

    const deleteFolder = async (id: string) => {
        const $auth = get(authStore);
        if (!$auth.user) return;
        await deleteDoc(doc(db, 'users', $auth.user.uid, 'folders', id));
    };

    return {
        subscribe,
        addPrompt,
        updatePrompt,
        deletePrompt,
        addFolder,
        deleteFolder
    };
}

export const promptStore = createPromptStore();
