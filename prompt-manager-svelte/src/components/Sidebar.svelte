<script lang="ts">
    import { authStore } from '../stores/authStore';
    import { promptStore } from '../stores/promptStore';
    import { uiStore } from '../stores/uiStore';
    import type { FilterState } from '../types';

    // UI helper
    function setFilter(type: FilterState['type'], id: string | null = null, name: string) {
        uiStore.update(s => ({ ...s, filter: { type, id, name } }));
        if (window.innerWidth <= 768) {
            uiStore.update(s => ({ ...s, sidebarOpen: false }));
        }
    }

    async function handleLogin() {
        await authStore.login();
    }

    async function handleLogout() {
        await authStore.logout();
    }

    // Derived state for counts and tags
    $: folderCounts = $promptStore.prompts.reduce((acc, p) => {
        if (p.folderId) {
            acc[p.folderId] = (acc[p.folderId] || 0) + 1;
        } else {
            acc['uncategorized'] = (acc['uncategorized'] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    $: tagCloud = $promptStore.prompts.reduce((acc, p) => {
        if (p.tags) {
            p.tags.forEach(tag => {
                const t = tag.trim();
                if (t) acc[t] = (acc[t] || 0) + 1;
            });
        }
        return acc;
    }, {} as Record<string, number>);

    $: sortedTags = Object.entries(tagCloud).sort((a, b) => b[1] - a[1]); // Sort by frequency

    function handleTagClick(tag: string) {
        // Search by tag
        uiStore.update(s => ({ ...s, searchQuery: tag, sidebarOpen: false, filter: { type: 'all', id: null, name: '모든 항목' }, isEditing: false }));
    }

    function handleNewPrompt() {
        uiStore.update(s => ({ ...s, isEditing: true, editingPromptId: null, sidebarOpen: window.innerWidth <= 768 ? false : s.sidebarOpen }));
    }

    async function handleNewFolder() {
        const name = prompt('새 폴더 이름을 입력하세요:');
        if (name && name.trim()) {
            try {
                await promptStore.addFolder(name.trim());
                uiStore.update(s => ({ ...s, toast: { message: '폴더가 생성되었습니다.', type: 'info' } }));
            } catch (e: any) {
                uiStore.update(s => ({ ...s, toast: { message: '폴더 생성 실패: ' + e.message, type: 'error' } }));
            }
        }
    }
</script>

<aside class="sidebar" class:open={$uiStore.sidebarOpen}>
    <div class="auth-section">
        {#if $authStore.user}
            <div class="user-profile">
                {#if $authStore.user.photoURL}
                    <img src={$authStore.user.photoURL} alt="User">
                {/if}
                <p>{$authStore.user.email}</p>
                <button on:click={handleLogout} class="logout-btn" title="Logout">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
            </div>
        {:else}
            <button on:click={handleLogin} id="login-btn">
                <i class="fa-brands fa-google"></i> Google 계정으로 로그인
            </button>
        {/if}
    </div>

    <div class="sidebar-content">
        <button class="new-prompt-btn" on:click={handleNewPrompt}>
            <i class="fa-solid fa-plus"></i> 새 항목
        </button>

        <div class="nav-section">
            <h3 class="nav-section-title">라이브러리</h3>
            <ul class="nav-list">
                <li class="nav-item" class:active={$uiStore.filter.type === 'all'}>
                    <button on:click={() => setFilter('all', null, '모든 항목')}>
                        <i class="nav-icon fa-solid fa-book-bookmark"></i> 모든 항목
                    </button>
                </li>

                <li class="nav-item" class:active={$uiStore.filter.type === 'links'}>
                    <button on:click={() => setFilter('links', null, '웹 링크 모음')}>
                        <i class="nav-icon fa-solid fa-link"></i> 웹 링크 모음
                    </button>
                </li>
                 <li class="nav-item" class:active={$uiStore.filter.type === 'templates'}>
                    <button on:click={() => setFilter('templates', null, '템플릿만')}>
                        <i class="nav-icon fa-solid fa-puzzle-piece"></i> 템플릿만
                    </button>
                </li>
                 <li class="nav-item" class:active={$uiStore.filter.type === 'statistics'}>
                    <button on:click={() => setFilter('statistics', null, '통계 대시보드')}>
                        <i class="nav-icon fa-solid fa-chart-line"></i> 통계
                    </button>
                </li>
                 <li class="nav-item" class:active={$uiStore.filter.type === 'history'}>
                    <button on:click={() => setFilter('history', null, '사용 기록')}>
                        <i class="nav-icon fa-solid fa-clock-rotate-left"></i> 사용 기록
                    </button>
                </li>
            </ul>
        </div>

        <div class="nav-section">
            <h3 class="nav-section-title">폴더</h3>
            <ul class="nav-list">
                {#each $promptStore.folders as folder}
                    <li class="nav-item" class:active={$uiStore.filter.type === 'folder' && $uiStore.filter.id === folder.id}>
                         <button on:click={() => setFilter('folder', folder.id, folder.name)}>
                            <i class="nav-icon fa-regular fa-folder"></i> 
                            <span style="flex: 1; text-align: left;">{folder.name}</span>
                            <span class="count-badge">({folderCounts[folder.id] || 0})</span>
                        </button>
                    </li>
                {/each}
                 <li class="nav-item" class:active={$uiStore.filter.type === 'uncategorized'}>
                    <button on:click={() => setFilter('uncategorized', null, '미분류')}>
                        <i class="nav-icon fa-solid fa-inbox"></i> 
                        <span style="flex: 1; text-align: left;">미분류</span>
                        <span class="count-badge">({folderCounts['uncategorized'] || 0})</span>
                    </button>
                </li>
            </ul>
            <button class="new-folder-btn" on:click={handleNewFolder}>
                <i class="fa-solid fa-folder-plus"></i> 새 폴더
            </button>
        </div>

        <div class="nav-section" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
            <h3 class="nav-section-title">태그 클라우드</h3>
            <div class="tag-cloud">
                {#each sortedTags as [tag, count]}
                    <button class="tag-chip" on:click={() => handleTagClick(tag)}>
                        #{tag} <span class="tag-count">{count}</span>
                    </button>
                {/each}
                {#if sortedTags.length === 0}
                    <p style="color: var(--text-secondary); font-size: 0.85rem; padding: 0 12px;">태그가 없습니다.</p>
                {/if}
            </div>
        </div>
    </div>
</aside>

<!-- Mobile Overlay -->
{#if $uiStore.sidebarOpen}
    <div 
        class="sidebar-overlay" 
        on:click={() => uiStore.update(s => ({ ...s, sidebarOpen: false }))}
        on:keydown={(e) => e.key === 'Escape' && uiStore.update(s => ({ ...s, sidebarOpen: false }))}
        role="button"
        tabindex="0"
    ></div>
{/if}

<style>
    /* ... (existing styles) ... */
    
    .sidebar-overlay {
        display: none; /* Hidden on desktop */
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 999; /* Below sidebar (usually 1000) */
        backdrop-filter: blur(2px);
    }

    @media (max-width: 768px) {
        .sidebar-overlay {
            display: block;
        }
    }

    .count-badge {
        font-size: 0.8rem;
        color: var(--text-secondary);
        margin-left: 8px;
    }

    .tag-cloud {
        padding: 0 12px 12px 12px; /* Bottom padding */
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        overflow-y: auto;
        /* Scrollbar styling for Webkit */
        scrollbar-width: thin;
        scrollbar-color: var(--border-color) transparent;
    }
    
    .tag-cloud::-webkit-scrollbar {
        width: 4px;
    }
    
    .tag-cloud::-webkit-scrollbar-thumb {
        background-color: var(--border-color);
        border-radius: 4px;
    }

    .tag-chip {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 4px 10px;
        font-size: 0.8rem;
        color: var(--text-primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
    }

    .tag-chip:hover {
        background: var(--bg-hover);
        border-color: var(--accent-blue);
        color: var(--accent-blue);
    }

    .tag-count {
        font-size: 0.7rem;
        background: var(--bg-tertiary);
        padding: 1px 5px;
        border-radius: 8px;
        color: var(--text-secondary);
    }
</style>
