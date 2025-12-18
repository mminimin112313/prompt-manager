<script lang="ts">
    import { onMount } from 'svelte';
    import { authStore } from '../stores/authStore';
    import { promptStore } from '../stores/promptStore';
    import { uiStore, showToast } from '../stores/uiStore';
    
    import Sidebar from '../components/Sidebar.svelte';
    import PromptList from '../components/PromptList.svelte';
    import PromptEditor from '../components/PromptEditor.svelte';
    import TemplateModal from '../components/TemplateModal.svelte';
    import Toast from '../components/Toast.svelte';
    import Statistics from '../components/Statistics.svelte';
    import UsageHistory from '../components/UsageHistory.svelte';
    import SettingsModal from '../components/SettingsModal.svelte';
    import { historyStore } from '../stores/historyStore';
    import { settingsStore } from '../stores/settingsStore';

    onMount(() => {
        authStore.init();
        settingsStore.init();
    });

    let showSettings = false;
    let templateModalId: string | null = null;
    let templateInitialValues: Record<string, string> = {};

    function handleSelectPrompt(e: CustomEvent<string>) {
        uiStore.update(s => ({ ...s, editingPromptId: e.detail, isEditing: true }));
    }

    function handleCreatePrompt() {
        uiStore.update(s => ({ ...s, editingPromptId: null, isEditing: true }));
    }

    function handleCloseEditor() {
         uiStore.update(s => ({ ...s, editingPromptId: null, isEditing: false }));
    }

    function handleUseTemplate(e: CustomEvent<string>) {
        templateModalId = e.detail;
        templateInitialValues = {};
    }

    function handleReuseHistory(e: CustomEvent<any>) {
        const record = e.detail;
        if (record.type === 'prompt_copy') {
            navigator.clipboard.writeText(record.content);
            showToast('내용이 복사되었습니다.');
        } else if (record.type === 'template_generate') {
            templateModalId = record.itemId;
            templateInitialValues = record.variablesUsed || {};
        } else if (record.type === 'link_visit') {
            window.open(record.content, '_blank');
        }
    }

</script>

<Sidebar />

<main class="main-content">
    <header class="main-header">
        <button class="mobile-menu-btn md:hidden" style="margin-right: 16px; font-size: 1.2rem;" on:click={() => uiStore.update(s => ({ ...s, sidebarOpen: !s.sidebarOpen }))}>
            <i class="fa-solid fa-bars"></i>
        </button>
        
        <h1>{$uiStore.filter.name}</h1>
        
            <div class="header-controls">
                <button class="button-like" on:click={() => showSettings = true} style="padding: 8px 12px; height: 100%;" title="환경 설정">
                    <i class="fa-solid fa-gear"></i>
                </button>
                <div class="search-wrapper">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input 
                    type="text" 
                    class="search-input" 
                    placeholder="검색..." 
                    bind:value={$uiStore.searchQuery}
                />
            </div>
            
            <div class="sort-wrapper">
                <select class="button-like" style="padding: 8px 12px; height: 100%;" bind:value={$uiStore.sortOrder}>
                    <option value="updatedAt_desc">최근 사용순</option>
                    <option value="usageCount_desc">사용 횟수순</option>
                    <option value="createdAt_desc">최신 등록순</option>
                    <option value="createdAt_asc">오래된 등록순</option>
                    <option value="title_asc">이름순</option>
                </select>
            </div>

            <button class="new-prompt-btn-mobile" on:click={handleCreatePrompt} style="background: var(--accent-blue); color: var(--bg-primary); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid fa-plus"></i>
            </button>
        </div>
    </header>

    <div class="content-view">
        {#if $uiStore.filter.type === 'statistics'}
            <Statistics />
        {:else if $uiStore.filter.type === 'history'}
            <UsageHistory on:reuse={handleReuseHistory} />
        {:else if $uiStore.isEditing}
            <PromptEditor promptId={$uiStore.editingPromptId} on:close={handleCloseEditor} />
        {:else}
            <PromptList on:select={handleSelectPrompt} on:useTemplate={handleUseTemplate} />
        {/if}
    </div>
</main>

{#if templateModalId}
    <TemplateModal 
        promptId={templateModalId} 
        initialValues={templateInitialValues}
        on:close={() => { templateModalId = null; templateInitialValues = {}; }} 
    />
{/if}

{#if showSettings}
    <SettingsModal on:close={() => showSettings = false} />
{/if}

<Toast />

<style>
    /* Global layout overrides if needed */
</style>
