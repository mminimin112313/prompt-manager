<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { promptStore } from '../stores/promptStore';
    import { uiStore, showToast } from '../stores/uiStore';
    import { historyStore } from '../stores/historyStore';
    import { settingsStore } from '../stores/settingsStore'; // Import Settings
    import Fuse from 'fuse.js';

    const dispatch = createEventDispatcher();

    // Derived state for filtering
    $: filteredPrompts = filterPrompts($promptStore.prompts, $uiStore.filter, $uiStore.searchQuery, $uiStore.sortOrder);

    function filterPrompts(prompts: any[], filter: any, query: string, sortOrder: string) {
        let result = prompts.slice(); // Create a copy

        // 1. Category Filter
        if (filter.type === 'folder') {
            result = result.filter(p => p.folderId === filter.id);
        } else if (filter.type === 'uncategorized') {
            result = result.filter(p => !p.folderId);
        } else if (filter.type === 'favorites') {
            result = result.filter(p => p.isFavorite);
        } else if (filter.type === 'templates') {
            result = result.filter(p => p.isTemplate);
        } else if (filter.type === 'links') {
            result = result.filter(p => p.link && p.link.trim() !== '');
        }

        // 2. Search
        if (query.trim()) {
            const fuse = new Fuse(result, {
                keys: ['title', 'content', 'tags'],
                threshold: 0.4
            });
            // Fuse returns { item, score }, we map back to item
            // IMPORTANT: Fuse usually sorts by relevance. User wants to maintain sort order if possible?
            // Actually, usually search results SHOULD be by relevance.
            // But user said "검색하면 정렬이 흐트러짐" (Sorting gets messed up when searching).
            // This might mean they prefer the explicit sort order even when searching, OR 
            // the current random order of Fuse results is confusing.
            // Let's first filter by Fuse, then re-apply the user's selected sort.
            result = fuse.search(query).map(r => r.item);
        }

        // 3. Sorting
        result.sort((a, b) => {
            switch (sortOrder) {
                case 'updatedAt_desc':
                    return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
                case 'usageCount_desc':
                    return (b.usageCount || 0) - (a.usageCount || 0);
                case 'createdAt_desc':
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                case 'createdAt_asc':
                    return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                case 'title_asc':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        return result;
    }



    let copiedId: string | null = null;
    let copyTimeout: any;

    function handleCopy(e: Event, prompt: any) {
        e.stopPropagation();
        navigator.clipboard.writeText(prompt.content);
        
        // Immediate visual feedback
        copiedId = prompt.id;
        if (copyTimeout) clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
            copiedId = null;
        }, 1500);

        showToast('내용이 복사되었습니다.');
        
        // Log Usage
        historyStore.logUsage({
            type: 'prompt_copy',
            itemId: prompt.id,
            itemName: prompt.title,
            content: prompt.content
        });
        promptStore.updatePrompt(prompt.id, { usageCount: (prompt.usageCount || 0) + 1 });
    }


    function handleVisit(e: Event, prompt: any) {
        e.stopPropagation();
        // Log Usage
        historyStore.logUsage({
            type: 'link_visit', // Add this type to UsageRecord if strictly typed, or just use 'other'/'prompt_copy' for now or cast?
                                // Let's use 'prompt_copy' effectively or just 'other' with note, 
                                // Actually let's assume 'other' is fine or I should update the type definition.
                                // Quick fix: treat as 'prompt_copy' for "Usage" semantics or just cast string.
            itemId: prompt.id,
            itemName: prompt.title,
            content: prompt.link
        } as any);
        promptStore.updatePrompt(prompt.id, { usageCount: (prompt.usageCount || 0) + 1 });
        
        window.open(prompt.link, '_blank');
    }
</script>

<div>
    {#if filteredPrompts.length === 0}
        <div class="content-placeholder">항목을 찾을 수 없습니다.</div>
    {:else}
        {#each filteredPrompts as prompt (prompt.id)}
            <div 
                class="prompt-list-item"
                on:click={() => dispatch('select', prompt.id)}
                on:keypress={(e) => e.key === 'Enter' && dispatch('select', prompt.id)}
            >
                <!-- Icon Logic: Template > Link > File -->
                {#if prompt.isTemplate}
                    <i class="prompt-list-icon fa-solid fa-wand-magic-sparkles" style="color: var(--accent-blue)"></i>
                {:else if prompt.link}
                    <i class="prompt-list-icon fa-solid fa-link" style="color: var(--accent-success)"></i>
                {:else}
                    <i class="prompt-list-icon fa-regular fa-file-lines" style="color: var(--text-secondary)"></i>
                {/if}
                
                <div class="prompt-info">
                    <div class="prompt-title">{prompt.title}</div>
                    <div class="prompt-subtitle">업데이트: {prompt.updatedAt?.toDate().toLocaleString() ?? 'N/A'}</div>
                    {#if prompt.tags && prompt.tags.length > 0}
                        <div class="prompt-tags">
                            {#each prompt.tags as tag}
                                <span class="prompt-tag">#{tag}</span>
                            {/each}
                        </div>
                    {/if}
                </div>
                
                <div class="prompt-actions" on:click|stopPropagation>
                    <!-- Mutually Exclusive Action Buttons -->
                    {#if prompt.isTemplate}
                         <button class="use-btn" on:click={() => dispatch('useTemplate', prompt.id)}>
                            <i class="fa-solid fa-wand-magic-sparkles"></i> 사용
                        </button>
                    {:else if prompt.link}
                         <button class="visit-link-btn" on:click={(e) => handleVisit(e, prompt)}>
                            <i class="fa-solid fa-external-link-alt"></i> 방문
                        </button>
                    {:else}
                        <button 
                            class="copy-btn" 
                            class:copied={copiedId === prompt.id}
                            on:click={(e) => handleCopy(e, prompt)}
                        >
                            {#if copiedId === prompt.id}
                                <i class="fa-solid fa-check" style="color: var(--accent-success);"></i> <span style="color: var(--accent-success);">완료</span>
                            {:else}
                                <i class="fa-regular fa-copy"></i> 복사
                            {/if}
                        </button>
                    {/if}
                    
                    <!-- Always allow Edit -->
                    <button class="edit-btn" on:click={() => dispatch('select', prompt.id)}>
                        <i class="fa-regular fa-edit"></i> 편집
                    </button>
                </div>
            </div>
        {/each}
    {/if}
</div>
