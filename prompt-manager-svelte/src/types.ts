import type { Timestamp } from 'firebase/firestore';

export interface Prompt {
    id: string;
    title: string;
    content: string;
    folderId: string | null;
    tags: string[];
    isFavorite: boolean;
    isTemplate: boolean;
    link: string;
    usageCount: number;
    createdAt?: Date | Timestamp;
    updatedAt?: Date | Timestamp;
}

export interface Folder {
    id: string;
    name: string;
}

export interface Sequence {
    id: string;
    name: string;
    description: string;
    promptIds: string[];
}

export interface FilterState {
    type: 'all' | 'favorites' | 'templates' | 'prompts' | 'folder' | 'uncategorized' | 'sequence';
    id: string | null; // folderId or sequenceId
    name: string;
}
