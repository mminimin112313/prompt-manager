<script lang="ts">
    import { uiStore } from '../stores/uiStore';
    import { fade, fly } from 'svelte/transition';
</script>

{#if $uiStore.toast}
    <div 
        class="toast" 
        class:show={!!$uiStore.toast}
        transition:fly={{ y: 20, duration: 300 }}
    >
        {$uiStore.toast.message}
    </div>
{/if}

<style>
    .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #27272a; /* Fallback or specific solid color */
        background-color: var(--bg-secondary);
        color: var(--text-primary);
        padding: 12px 20px;
        border-radius: 8px;
        border-left: 4px solid var(--accent-blue);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); /* Strong shadow */
        z-index: 2000;
        min-width: 250px;
        opacity: 1; /* Ensure solid */
        font-weight: 500;
    }
</style>
