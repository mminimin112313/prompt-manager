<script lang="ts">
    import { onMount, createEventDispatcher } from 'svelte';
    import { historyStore } from '../stores/historyStore';
    
    const dispatch = createEventDispatcher();

    onMount(() => {
        historyStore.init();
    });

    function getIcon(type: string) {
        switch (type) {
            case 'prompt_copy': return 'fa-copy';
            case 'template_generate': return 'fa-wand-magic-sparkles';
            case 'sequence_run': return 'fa-play';
            default: return 'fa-clock-rotate-left';
        }
    }

    function getLabel(type: string) {
        switch (type) {
            case 'prompt_copy': return '복사됨';
            case 'template_generate': return '템플릿 생성';
            case 'sequence_run': return '시퀀스 실행';
            default: return '기타';
        }
    }

    function handleReuse(record: any) {
        dispatch('reuse', record);
    }
</script>

<div class="content-view">
    <h2 style="font-size: 1.2rem; margin-bottom: 16px; font-weight: 500;">최근 사용 기록</h2>
    
    {#if $historyStore.length === 0}
        <div class="content-placeholder">기록이 없습니다.</div>
    {:else}
        <div>
            {#each $historyStore as record}
                <div class="history-item">
                    <div class="history-info">
                        <div class="history-icon">
                            <i class="fa-solid {getIcon(record.type)}"></i>
                        </div>
                        <div class="history-text">
                            <div class="history-name">{record.itemName}</div>
                            <div class="history-meta">
                                <span>{getLabel(record.type)}</span> • <span>{new Date(record.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <button class="button-like" on:click={() => handleReuse(record)}>
                        <i class="fa-solid fa-rotate-left"></i> 다시 사용
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .bg-surface-3 { background-color: var(--bg-tertiary); } /* Fallback mapping */
    .bg-surface-2 { background-color: var(--bg-secondary); }
</style>
