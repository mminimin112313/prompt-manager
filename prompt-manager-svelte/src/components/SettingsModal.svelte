<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { settingsStore } from "../stores/settingsStore";
    import { showToast } from "../stores/uiStore";

    const dispatch = createEventDispatcher();

    let activeTab = "appearance";
    let apiKeyInput = "";
    let quickLinkInput = $settingsStore.quickLinkUrl;

    // Subscribe to store updates
    $: quickLinkInput = $settingsStore.quickLinkUrl;

    async function saveApiKey() {
        if (!apiKeyInput.trim()) {
            showToast("API Key를 입력해주세요.", "error");
            return;
        }
        await settingsStore.setApiKey(apiKeyInput);
        apiKeyInput = "";
        showToast("API Key가 안전하게 암호화되어 저장되었습니다.");
    }

    function clearApiKey() {
        if (confirm("저장된 API Key를 삭제하시겠습니까?")) {
            settingsStore.clearApiKey();
            showToast("API Key가 삭제되었습니다.");
        }
    }

    function saveQuickLink() {
        settingsStore.setQuickLink(quickLinkInput);
        showToast("바로가기 설정이 저장되었습니다.");
    }

    function toggleTheme() {
        settingsStore.toggleTheme();
    }
</script>

<div
    class="modal-overlay show"
    on:click={(e) => {
        if (e.target === e.currentTarget) dispatch("close");
    }}
>
    <div class="modal">
        <div class="modal-header">
            <h3 class="modal-title">환경 설정</h3>
            <span class="close-modal-btn" on:click={() => dispatch("close")}
                >&times;</span
            >
        </div>

        <div class="modal-body">
            <div class="tabs">
                <button
                    class:active={activeTab === "appearance"}
                    on:click={() => (activeTab = "appearance")}>모양</button
                >
                <button
                    class:active={activeTab === "automation"}
                    on:click={() => (activeTab = "automation")}>자동화</button
                >
                <button
                    class:active={activeTab === "security"}
                    on:click={() => (activeTab = "security")}>보안 & AI</button
                >
            </div>

            <div class="tab-content" style="min-height: 250px;">
                {#if activeTab === "appearance"}
                    <div class="setting-item">
                        <label>테마 모드</label>
                        <div class="toggle-wrapper">
                            <span
                                >{$settingsStore.theme === "light"
                                    ? "라이트 모드"
                                    : "다크 모드"}</span
                            >
                            <button class="button-like" on:click={toggleTheme}>
                                {$settingsStore.theme === "light"
                                    ? "🌙 다크 모드로 전환"
                                    : "☀️ 라이트 모드로 전환"}
                            </button>
                        </div>
                    </div>
                {:else if activeTab === "automation"}
                    <div class="setting-item">
                        <label>복사 시 자동 이동 (Quick Link)</label>
                        <p class="description">
                            프롬프트 '복사' 버튼을 클릭했을 때, 텍스트가
                            복사됨과 동시에 아래 사이트를 새 탭으로 엽니다.
                        </p>
                        <div style="display:flex; gap: 8px;">
                            <input
                                type="url"
                                bind:value={quickLinkInput}
                                placeholder="예: https://chatgpt.com"
                            />
                            <button class="button-like" on:click={saveQuickLink}
                                >저장</button
                            >
                        </div>
                    </div>
                {:else if activeTab === "security"}
                    <div class="setting-item">
                        <label>Google Gemini API Key</label>
                        <div class="security-badge">
                            <i class="fa-solid fa-shield-halved"></i>
                            <span>암호화 저장됨 (AES-GCM)</span>
                        </div>
                        <p class="description">
                            API Key는 브라우저 내부에 암호화되어 저장됩니다.
                            서버로 전송되지 않습니다.
                        </p>

                        {#if $settingsStore.hasApiKey}
                            <div class="status-box valid">
                                <i class="fa-solid fa-check-circle"></i> 키가 등록되어
                                있습니다.
                            </div>
                            <button
                                class="button-like delete-btn"
                                on:click={clearApiKey}
                                style="margin-top: 8px;">키 삭제</button
                            >
                        {:else}
                            <div class="status-box warning">
                                <i class="fa-solid fa-exclamation-triangle"></i>
                                등록된 키가 없습니다.
                            </div>
                        {/if}

                        <div style="margin-top: 16px;">
                            <label>새 키 등록 / 변경</label>
                            <div style="display:flex; gap: 8px;">
                                <input
                                    type="password"
                                    bind:value={apiKeyInput}
                                    placeholder="sk-..."
                                />
                                <button
                                    class="button-like"
                                    on:click={saveApiKey}>암호화 저장</button
                                >
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    .tabs {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0;
    }

    .tabs button {
        padding: 8px 12px;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--text-secondary);
        font-weight: 500;
        cursor: pointer;
    }

    .tabs button.active {
        color: var(--accent-blue);
        border-bottom-color: var(--accent-blue);
    }

    .setting-item {
        margin-bottom: 24px;
    }

    .setting-item label {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--text-primary);
    }

    .description {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-bottom: 12px;
        line-height: 1.4;
    }

    .toggle-wrapper {
        display: flex;
        align-items: center;
        gap: 16px;
        background: var(--bg-primary);
        padding: 16px;
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }

    .security-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background-color: rgba(74, 222, 128, 0.1);
        color: var(--accent-success);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
        margin-bottom: 8px;
    }

    .status-box {
        padding: 12px;
        border-radius: 8px;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .status-box.valid {
        background-color: rgba(96, 165, 250, 0.1);
        color: var(--accent-blue);
    }
    .status-box.warning {
        background-color: rgba(248, 113, 113, 0.1);
        color: var(--accent-pink);
    }

    /* Mobile responsive styles */
    @media (max-width: 480px) {
        .modal {
            width: 95vw;
            max-width: 95vw;
            max-height: 90vh;
        }

        .tabs {
            gap: 8px;
            overflow-x: auto;
            flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch;
        }

        .tabs button {
            padding: 8px 8px;
            font-size: 0.85rem;
            white-space: nowrap;
        }

        .toggle-wrapper {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
        }

        .setting-item input[type="url"],
        .setting-item input[type="password"] {
            min-width: 0;
            flex: 1;
        }
    }
</style>
