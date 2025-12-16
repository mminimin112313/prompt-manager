import { writable } from 'svelte/store';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
}

const createAuthStore = () => {
    const { subscribe, set, update } = writable<AuthState>({
        user: null,
        loading: true,
        error: null
    });

    return {
        subscribe,
        init: () => {
            onAuthStateChanged(auth, (user) => {
                update(s => ({ ...s, user, loading: false }));
            });
        },
        login: async () => {
            try {
                await signInWithPopup(auth, googleProvider);
            } catch (error: any) {
                update(s => ({ ...s, error: error.message }));
            }
        },
        logout: async () => {
            try {
                await signOut(auth);
            } catch (error: any) {
                update(s => ({ ...s, error: error.message }));
            }
        }
    };
};

export const authStore = createAuthStore();
