<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { promptStore } from '../stores/promptStore';
    import { showToast } from '../stores/uiStore';
    import type { Prompt } from '../types';
    import { GoogleGenerativeAI } from '@google/generative-ai';

    export let promptId: string | null = null;

    const dispatch = createEventDispatcher();

    let title = '';
    let content = '';
    let link = '';
    let folderId: string | null = null;
    let tags = '';
    let isTemplate = false;
    let isFavorite = false;

    // Load data if editing
    $: if (promptId) {
        const p = $promptStore.prompts.find(p => p.id === promptId);
        if (p) {
            title = p.title;
            content = p.content;
            link = p.link || '';
            folderId = p.folderId;
            tags = (p.tags || []).join(', ');
            isTemplate = p.isTemplate;
            isFavorite = p.isFavorite;
        }
    } else {
        resetForm();
    }

    function resetForm() {
        title = '';
        content = '';
        link = '';
        folderId = null;
        tags = '';
        isTemplate = false;
        isFavorite = false;
    }

    async function handleSave() {
        if (!title.trim()) {
            showToast('제목을 입력해주세요.', 'error');
            return;
        }

        const promptData = {
            title,
            content,
            link,
            folderId,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            isTemplate,
            isFavorite,
            usageCount: 0 // Reset or keep? If editing, store handles partial update.
        };

        try {
            if (promptId) {
                // Update
                const { usageCount, ...rest } = promptData; // Don't reset usage count on edit
                await promptStore.updatePrompt(promptId, rest);
                showToast('저장되었습니다.');
            } else {
                // Create
                await promptStore.addPrompt(promptData);
                showToast('항목이 생성되었습니다.');
            }
            dispatch('close');
        } catch (error: any) {
            showToast('Error saving prompt: ' + error.message, 'error');
        }
    }

    async function handleDelete() {
        if (!promptId || !confirm('정말로 삭제하시겠습니까?')) return;
        try {
            await promptStore.deletePrompt(promptId);
            showToast('삭제되었습니다.');
            dispatch('close');
        } catch (e: any) {
             showToast('Error deleting: ' + e.message, 'error');
        }
    }

    // File handling
    let fileInput: HTMLInputElement;
    async function handleFile(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const text = await file.text();
        content = text;
        showToast('파일 내용을 불러왔습니다.');
    }

    // Gemini AI Analysis
    let isAnalyzing = false;
    async function handleAnalyze() {
        if (!content.trim()) {
            showToast('분석할 내용이 없습니다.', 'error');
            return;
        }

        let apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            apiKey = prompt('Google Gemini API Key를 입력해주세요 (로컬에 저장됩니다):');
            if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
            else return;
        }

        isAnalyzing = true;
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            // User requested strict usage of gemma-3-27b-it
            const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });

            const promptText = `
            Analyze the following text content (up to 1500 chars provided):
            "${content.slice(0, 1500)}"
            
            Current Title: "${title}"
            
            Task:
            1. Suggest a better, concise Title (Korean).
            2. Suggest 3-5 relevant Tags (Korean, comma separated).
            
            Output format JSON:
            { "title": "...", "tags": "..." }
            `;

            const result = await model.generateContent(promptText);
            const response = result.response;
            const text = response.text();
            
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            if (confirm(`추천 결과:\n제목: ${data.title}\n태그: ${data.tags}\n\n적용하시겠습니까?`)) {
                title = data.title;
                tags = data.tags;
                showToast('AI 추천이 적용되었습니다.');
            }
        } catch (e: any) {
            console.error(e);
            showToast('AI 분석 실패: ' + e.message, 'error');
            if (confirm('API Key가 올바르지 않거나 오류가 발생했습니다. 키를 재설정하시겠습니까?')) {
                localStorage.removeItem('gemini_api_key');
            }
        } finally {
            isAnalyzing = false;
        }
    }
</script>

<div class="content-view">
    <div class="editor-header" style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
        <h2 style="font-size: 1.5rem; font-weight: 600;">{promptId ? '항목 편집' : '새 항목 생성'}</h2>
        <div class="editor-actions" style="display: flex; gap: 12px;">
             <button class="button-like" on:click={handleAnalyze} disabled={isAnalyzing} style="color: var(--accent-blue); border-color: var(--accent-blue);">
                {#if isAnalyzing}
                    <i class="fa-solid fa-spinner fa-spin"></i> 분석 중...
                {:else}
                    <i class="fa-solid fa-wand-magic-sparkles"></i> AI 자동 완성
                {/if}
            </button>
            <div style="width: 1px; background: var(--border-color); margin: 0 4px;"></div>
            {#if promptId}
                <button class="button-like" on:click={handleDelete} style="color: var(--accent-pink); border-color: var(--accent-pink);">
                    <i class="fa-regular fa-trash-can"></i> 삭제
                </button>
            {/if}
            <button class="button-like" on:click={() => dispatch('close')}>취소</button>
            <button class="button-like" on:click={handleSave} style="background-color: var(--text-primary); color: var(--bg-primary); border: none;">
                <i class="fa-regular fa-save"></i> 저장
            </button>
        </div>
    </div>

    <div class="form-group" style="margin-bottom: 24px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">제목</label>
        <input bind:value={title} placeholder="제목을 입력하세요..." style="width: 100%; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 1rem;" />
    </div>

    <div class="form-group" style="margin-bottom: 24px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">내용 {isTemplate ? '(플레이스홀더에 {{변수}} 사용)' : ''}</label>
        <textarea bind:value={content} style="width: 100%; height: 300px; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-family: var(--font-mono); font-size: 0.95rem; resize: vertical;"></textarea>
        <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
             <button class="button-like" on:click={() => fileInput.click()} style="font-size: 0.85rem; padding: 6px 12px;">
                <i class="fa-solid fa-file-arrow-up"></i> 파일에서 텍스트 불러오기
             </button>
             <input type="file" bind:this={fileInput} on:change={handleFile} style="display:none;" />
        </div>
    </div>

    <div style="display:flex; gap: 24px; flex-wrap: wrap; margin-bottom: 24px;">
        <div class="form-group" style="flex:1;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">폴더</label>
            <select bind:value={folderId} style="width: 100%; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);">
                <option value={null}>미분류</option>
                {#each $promptStore.folders as folder}
                    <option value={folder.id}>{folder.name}</option>
                {/each}
            </select>
        </div>
        <div class="form-group" style="flex:1;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">태그 (쉼표로 구분)</label>
            <input bind:value={tags} placeholder="예: 코딩, 글짓기" style="width: 100%; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);" />
        </div>
    </div>

    <div class="form-group" style="margin-bottom: 24px;">
         <label style="display: block; margin-bottom: 8px; font-weight: 500;">관련 링크 (URL)</label>
         <input bind:value={link} type="url" placeholder="https://example.com" style="width: 100%; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);" />
    </div>

    <div class="is-template-toggle" style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; display: flex; align-items: center; gap: 12px;">
        <input type="checkbox" id="isTemplate" bind:checked={isTemplate} style="width: 18px; height: 18px;" />
        <label for="isTemplate" style="cursor: pointer; font-weight: 500;">✨ 재사용 가능한 템플릿으로 만들기</label>
    </div>
</div>
