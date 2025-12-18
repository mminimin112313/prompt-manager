<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { promptStore } from '../stores/promptStore';
    import { showToast } from '../stores/uiStore';
    import type { Prompt } from '../types';
    import { GoogleGenerativeAI } from '@google/generative-ai';
    import { settingsStore } from '../stores/settingsStore';

    export let promptId: string | null = null;

    const dispatch = createEventDispatcher();

    let title = '';
    let content = '';
    let link = '';
    let folderId: string | null = null;
    let tags = '';
    let isTemplate = false;
    let isFavorite = false;

    let showHistory = false;
    let versions: any[] = [];

    // Load data if editing
    $: if (promptId) {
        const p = $promptStore.prompts.find(p => p.id === promptId);
        if (p) {
            // ... (existing loading logic, plus versions)
            title = p.title;
            content = p.content;
            link = p.link || '';
            folderId = p.folderId;
            tags = (p.tags || []).join(', ');
            isTemplate = p.isTemplate;
            isFavorite = p.isFavorite;
            versions = p.versions || [];
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
        versions = [];
    }

    async function handleSave() {
        if (!title.trim()) {
            showToast('제목을 입력해주세요.', 'error');
            return;
        }

        const promptData: any = {
            title,
            content,
            link,
            folderId,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            isTemplate,
            isFavorite,
            versions // Pass existing versions
        };

        try {
            if (promptId) {
                // Update Logic with Versioning
                const currentPrompt = $promptStore.prompts.find(p => p.id === promptId);
                if (currentPrompt) {
                     // Only create version if content changed
                    if (currentPrompt.content !== content) {
                         const newVersion = {
                            id: crypto.randomUUID(),
                            content: currentPrompt.content,
                            title: currentPrompt.title,
                            timestamp: new Date()
                        };
                        // Add to beginning (newest first) or end? Let's do newest first for UI.
                        // Actually, array push (end) is standard for chronological, unshift for display.
                        // Let's store chronological (push) and reverse for display.
                        const updatedVersions = [...(currentPrompt.versions || []), newVersion];
                        // Keep last 10
                         if (updatedVersions.length > 10) {
                            updatedVersions.shift(); 
                        }
                        promptData.versions = updatedVersions;
                    } else {
                         promptData.versions = currentPrompt.versions || [];
                    }
                }

                const { usageCount, ...rest } = promptData; 
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

    function restoreVersion(v: any) {
        if (!confirm('이 버전으로 되돌리시겠습니까? 현재 내용은 사라집니다.')) return;
        title = v.title;
        content = v.content;
        showHistory = false;
        showToast('이전 버전이 불러와졌습니다. 저장을 눌러 확정하세요.');
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

    // File handling

    // ...

    // Gemini AI Analysis
    let isAnalyzing = false;
    let aiSuggestion: { title: string, tags: string[] } | null = null;

    async function handleAnalyze() {
        if (!content.trim()) {
            showToast('분석할 내용이 없습니다.', 'error');
            return;
        }

        let apiKey = await settingsStore.getApiKey();
        if (!apiKey) {
            showToast('설정(톱니바퀴) > 보안 탭에서 API Key를 등록해주세요.', 'error');
            return;
        }

        isAnalyzing = true;
        aiSuggestion = null; // Reset previous suggestion
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const modelName = "gemma-3-27b-it"; 
            const model = genAI.getGenerativeModel({ model: modelName });

            const promptText = `
            Analyze the following text content (up to 1500 chars provided):
            "${content.slice(0, 1500)}"
            
            Current Title: "${title}"
            
            Task:
            1. Suggest a better, concise Title (Korean).
            2. Suggest 3-5 relevant Tags (Korean, comma separated).
            
            IMPORTANT: Output ONLY valid JSON. No Markdown. No Explanations.
            Format:
            { "title": "...", "tags": "..." }
            `;

            const result = await model.generateContent(promptText);
            const response = result.response;
            const text = response.text();
            
            console.log("AI Raw Response:", text);

            let jsonStr = "";
            
            // 1. Try to extract from Markdown code block
            const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
            const match = text.match(codeBlockRegex);
            
            if (match) {
                jsonStr = match[1];
            } else {
                // 2. Fallback: Find the *last* occurrence of a valid JSON-like object content
                // (Since explanations often quote the format earlier in the text)
                const start = text.indexOf('{');
                const end = text.lastIndexOf('}');
                
                if (start !== -1 && end !== -1) {
                    // Try to parse the whole substring first
                    // If that fails (e.g. text between braces), we might need a smarter approach.
                    // Let's try to find the substring that actually parses.
                    const candidate = text.substring(start, end + 1);
                    // Simple check: does it look like our JSON?
                    if (candidate.includes('"title"') && candidate.includes('"tags"')) {
                         jsonStr = candidate;
                    }
                }
            }
            
            if (!jsonStr) {
                 // Final attempt: maybe the whole text is JSON?
                 jsonStr = text;
            }

            let data;
            try {
                // Sanitize: remove any leading/trailing non-JSON characters if we just grabbed the substring
                // Actually, let's just try to parse what we found.
                data = JSON.parse(jsonStr);
            } catch (parseError) {
                // If simple parse fails, try to find the specific JSON object structure with regex
                // This handles cases where we grabbed too much text like "{ example } ... { actual }"
                try {
                     const jsonRegex = /\{\s*"title"\s*:\s*"[^"]*"\s*,\s*"tags"\s*:\s*(?:"[^"]*"|\[[^\]]*\])\s*\}/;
                     const robustMatch = text.match(jsonRegex);
                     if (robustMatch) {
                         data = JSON.parse(robustMatch[0]);
                     } else {
                         throw parseError; // Rethrow original if fails
                     }
                } catch (e) {
                    console.error("JSON Parse Error:", parseError);
                    throw new Error("AI 응답에서 유효한 JSON을 추출할 수 없습니다.");
                }
            }

            // Parse tags to array if string
            let parsedTags: string[] = [];
            if (typeof data.tags === 'string') {
                parsedTags = data.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
            } else if (Array.isArray(data.tags)) {
                parsedTags = data.tags;
            }

            // Set suggestion state
            aiSuggestion = {
                title: data.title,
                tags: parsedTags
            };
            
            showToast('AI 분석이 완료되었습니다. 결과를 확인하세요.');

        } catch (e: any) {
            console.error("AI Error:", e.message); 
            let msg = 'AI 분석 실패: ' + e.message;
            if (e.message.includes('404') || e.message.includes('not found')) {
                msg = `모델 '${"gemma-3-27b-it"}'을 찾을 수 없습니다.`;
            } else if (e.message.includes('403') || e.message.includes('API key')) {
                msg = 'API Key 권한 오류입니다.';
            }
            showToast(msg, 'error');
            if (confirm(msg + '\n\nAPI Key를 재설정하시겠습니까?')) {
                localStorage.removeItem('gemini_api_key');
            }
        } finally {
            isAnalyzing = false;
        }
    }

    function applySuggestion() {
        if (!aiSuggestion) return;
        title = aiSuggestion.title;
        // Join tags back to string for input field
        tags = aiSuggestion.tags.join(', ');
        aiSuggestion = null;
        showToast('AI 추천이 적용되었습니다.');
    }

    function discardSuggestion() {
        aiSuggestion = null;
    }
</script>

<div class="content-view">
    <div class="editor-header" style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
        <h2 style="font-size: 1.5rem; font-weight: 600;">{promptId ? '항목 편집' : '새 항목 생성'}</h2>
        <div class="editor-actions" style="display: flex; gap: 12px;">
             {#if promptId}
                <button class="button-like" on:click={() => showHistory = !showHistory} style="color: var(--text-secondary);">
                    <i class="fa-solid fa-clock-rotate-left"></i> 기록
                </button>
             {/if}
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

    {#if aiSuggestion}
        <div class="ai-suggestion-box" style="background: var(--bg-tertiary); border: 1px solid var(--accent-blue); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <h3 style="margin: 0; color: var(--accent-blue); display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> AI 추천 결과
                </h3>
                <div style="display: flex; gap: 8px;">
                     <button class="button-like" on:click={applySuggestion} style="background: var(--accent-blue); color: white; border: none; font-size: 0.85rem; padding: 6px 12px;">
                        적용하기
                    </button>
                    <button class="button-like" on:click={discardSuggestion} style="font-size: 0.85rem; padding: 6px 12px;">
                        닫기
                    </button>
                </div>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="font-weight: 600; font-size: 0.9rem; color: var(--text-secondary); width: 60px; display: inline-block;">제목:</span>
                <span style="color: var(--text-primary); font-weight: 500;">{aiSuggestion.title}</span>
            </div>
            <div>
                <span style="font-weight: 600; font-size: 0.9rem; color: var(--text-secondary); width: 60px; display: inline-block;">태그:</span>
                <div style="display: inline-flex; gap: 4px; flex-wrap: wrap; vertical-align: top;">
                    {#each aiSuggestion.tags as tag}
                        <span style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">#{tag}</span>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

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

{#if showHistory}
    <div class="history-panel">
        <div class="history-header">
            <h3>버전 기록</h3>
            <button on:click={() => showHistory = false} style="background:none; border:none; color:inherit; cursor:pointer;"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="history-list">
            {#if versions.length === 0}
                <p style="color: var(--text-secondary); padding: 12px;">저장된 기록이 없습니다.</p>
            {:else}
                {#each [...versions].reverse() as v}
                    <div class="history-item">
                        <div class="history-meta" style="margin-bottom: 4px;">
                            <span class="history-time">
                                {v.timestamp?.toDate ? v.timestamp.toDate().toLocaleString() : new Date(v.timestamp).toLocaleString()}
                            </span>
                        </div>
                        <div class="history-preview">{v.content.slice(0, 60)}...</div>
                        <button class="restore-btn" on:click={() => restoreVersion(v)}>
                            <i class="fa-solid fa-rotate-left"></i> 복구
                        </button>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
{/if}

<style>
    /* Add basic styles for history panel */
    .history-panel {
        position: absolute;
        top: 0;
        right: 0;
        width: 320px;
        height: 100%;
        background: var(--bg-secondary);
        border-left: 1px solid var(--border-color);
        box-shadow: -4px 0 12px rgba(0,0,0,0.3);
        z-index: 100;
        display: flex;
        flex-direction: column;
    }
    .history-header {
        padding: 16px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: var(--text-primary);
    }
    .history-list {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
    }
    .history-item {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
    }
    .history-time {
        font-size: 0.8rem;
        color: var(--text-secondary);
    }
    .history-preview {
        font-size: 0.85rem;
        color: var(--text-primary);
        margin: 8px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        opacity: 0.8;
    }
    .restore-btn {
        width: 100%;
        padding: 8px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        color: var(--accent-blue);
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s;
    }
    .restore-btn:hover {
        background: var(--bg-hover);
        border-color: var(--accent-blue);
    }
</style>
