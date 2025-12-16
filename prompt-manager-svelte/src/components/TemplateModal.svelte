<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { promptStore } from '../stores/promptStore';
    import { historyStore } from '../stores/historyStore';
    import { showToast } from '../stores/uiStore';
    
    export let promptId: string;
    export let initialValues: Record<string, string> = {};

    const dispatch = createEventDispatcher();
    let prompt: any = null;
    let placeholders: string[] = [];
    let values: Record<string, string> = {};
    let preview = '';

    $: if (promptId) {
        prompt = $promptStore.prompts.find(p => p.id === promptId);
        if (prompt) {
            const content = prompt.content;
            placeholders = [...new Set([...content.matchAll(/{{([^\n}]+?)}}/g)].map(m => m[1].trim()))];
            
            // Reconcile initialValues
            if (initialValues && Object.keys(initialValues).length > 0) {
                 let mismatch = false;
                 // Keep compatible values
                 Object.keys(initialValues).forEach(k => {
                     if (placeholders.includes(k)) {
                         values[k] = initialValues[k];
                     } else {
                         mismatch = true;
                     }
                 });
                 if (mismatch) {
                     showToast('Warning: Some previous variables do not match current template.', 'warning');
                 }
            }
            
            updatePreview();
        }
    }

    function updatePreview() {
        if (!prompt) return;
        let p = prompt.content;
        placeholders.forEach(ph => {
            p = p.replaceAll(`{{${ph}}}`, values[ph] || `{{${ph}}}`);
        });
        preview = p;
    }

    function handleInput(ph: string, e: Event) {
        values[ph] = (e.target as HTMLTextAreaElement).value;
        updatePreview();
    }

    async function handleGenerate() {
        if (!prompt) return;
        await navigator.clipboard.writeText(preview);
        showToast('Generated and copied to clipboard!');
        
        // Update usage count
        await promptStore.updatePrompt(prompt.id, { usageCount: (prompt.usageCount || 0) + 1 });

        // Log Usage with variables
        historyStore.logUsage({
            type: 'template_generate',
            itemId: prompt.id,
            itemName: prompt.title,
            content: preview, // The result
            variablesUsed: { ...values } // The inputs
        });
        
        // User requested to NOT close modal on generate
        // dispatch('close');
    }

    // File handling for specific placeholder
    let currentUploadTarget: string | null = null;
    let fileInput: HTMLInputElement;

    function triggerUpload(ph: string) {
        currentUploadTarget = ph;
        fileInput.click();
    }

    async function handleFile(e: Event) {
        if (!currentUploadTarget) return;
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            const text = await file.text();
            values[currentUploadTarget] = text;
            updatePreview();
            showToast('File loaded into ' + currentUploadTarget);
        }
        fileInput.value = '';
        currentUploadTarget = null;
    }
</script>

<div class="modal-overlay show" on:click={(e) => { if(e.target === e.currentTarget) dispatch('close'); }}>
    <div class="modal">
        <div class="modal-header">
            <h3 class="modal-title">{prompt ? prompt.title : 'Template'}</h3>
            <span class="close-modal-btn" on:click={() => dispatch('close')}>&times;</span>
        </div>

        <div class="modal-body">
            {#if placeholders.length > 0}
                {#each placeholders as ph}
                    <div class="form-group">
                        <label>{ph}</label>
                        <div style="display: flex; gap: 8px;">
                            <textarea 
                                rows="2" 
                                on:input={(e) => handleInput(ph, e)}
                                value={values[ph] || ''}
                                style="height: auto;"
                            ></textarea>
                            <button class="button-like" on:click={() => triggerUpload(ph)} title="Upload File" style="padding: 0 10px;">
                                <i class="fa-solid fa-file-arrow-up"></i>
                            </button>
                        </div>
                    </div>
                {/each}
            {:else}
                <p style="color: var(--text-secondary); margin-bottom: 20px;">No variables found in this template.</p>
            {/if}

            <div class="form-group" style="margin-top: 20px;">
                <label>Preview</label>
                <div style="padding: 12px; background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; font-family: monospace; font-size: 0.9rem; white-space: pre-wrap; height: 150px; overflow-y: auto;">
                    {preview}
                </div>
            </div>
        </div>

        <div class="modal-footer">
            <button class="button-like" on:click={() => dispatch('close')}>Cancel</button>
            <button class="button-like" style="background-color: var(--accent-blue); color: var(--bg-primary); border: none;" on:click={handleGenerate}>
                <i class="fa-solid fa-wand-magic-sparkles"></i> Generate & Copy
            </button>
        </div>
    </div>
    
    <input type="file" bind:this={fileInput} on:change={handleFile} class="hidden" />
</div>

<style>
    /* Scoped styles if needed, but mostly relying on app.css */
</style>
