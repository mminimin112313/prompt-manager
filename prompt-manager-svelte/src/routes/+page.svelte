<script lang="ts">
    import { onMount } from "svelte";
    import { authStore } from "../stores/authStore";
    import { promptStore } from "../stores/promptStore";
    import { uiStore, showToast } from "../stores/uiStore";

    import Sidebar from "../components/Sidebar.svelte";
    import PromptList from "../components/PromptList.svelte";
    import PromptEditor from "../components/PromptEditor.svelte";
    import TemplateModal from "../components/TemplateModal.svelte";
    import Toast from "../components/Toast.svelte";
    import Statistics from "../components/Statistics.svelte";
    import UsageHistory from "../components/UsageHistory.svelte";
    import SettingsModal from "../components/SettingsModal.svelte";
    import { historyStore } from "../stores/historyStore";
    import { settingsStore } from "../stores/settingsStore";

    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { browser } from "$app/environment";

    // ... (existing imports)

    onMount(() => {
        authStore.init();
        settingsStore.init();

        // Initial URL Sync on Load
        syncStoreFromUrl($page.url);
    });

    let showSettings = false;
    let templateModalId: string | null = null;
    let templateInitialValues: Record<string, string> = {};

    function handleSelectPrompt(e: CustomEvent<string>) {
        uiStore.update((s) => ({
            ...s,
            editingPromptId: e.detail,
            isEditing: true,
        }));
    }

    function handleCreatePrompt() {
        uiStore.update((s) => ({
            ...s,
            editingPromptId: null,
            isEditing: true,
        }));
    }

    function handleCloseEditor() {
        uiStore.update((s) => ({
            ...s,
            editingPromptId: null,
            isEditing: false,
        }));
    }

    function handleUseTemplate(e: CustomEvent<string>) {
        templateModalId = e.detail;
        templateInitialValues = {};
    }

    function handleReuseHistory(e: CustomEvent<any>) {
        const record = e.detail;
        if (record.type === "prompt_copy") {
            navigator.clipboard.writeText(record.content);
            showToast("내용이 복사되었습니다.");
        } else if (record.type === "template_generate") {
            templateModalId = record.itemId;
            templateInitialValues = record.variablesUsed || {};
        } else if (record.type === "link_visit") {
            window.open(record.content, "_blank");
        }
    }

    // ----------------------------------------------------------------
    // URL Routing Logic
    // ----------------------------------------------------------------

    // 1. URL -> Store Sync (Listens to Back/Forward or initial load)
    $: if (browser && $page.url) {
        // Only sync if this navigation did NOT come from our app's internal logic
        if (!$page.state.fromApp) {
            syncStoreFromUrl($page.url);
        }
    }

    function syncStoreFromUrl(url: URL) {
        const params = url.searchParams;
        const view = params.get("view") || "all";
        const folderId = params.get("folderId");
        const mode = params.get("mode");
        const promptId = params.get("promptId");
        // Search & Sort not fully synced yet to avoid complexity, but could be.
        const q = params.get("q");

        // Update filter
        let name = "모든 항목";
        if (view === "folder") {
            const f = $promptStore.folders.find(
                (folder) => folder.id === folderId,
            );
            name = f ? f.name : "폴더";
        } else if (view === "links") name = "웹 링크 모음";
        else if (view === "history") name = "사용 기록";
        else if (view === "statistics") name = "통계";
        else if (view === "uncategorized") name = "미분류";
        else if (view === "templates") name = "템플릿만";

        uiStore.update((s) => {
            const newState = { ...s };
            // Avoid redundant updates
            if (s.filter.type !== view || s.filter.id !== folderId) {
                newState.filter = { type: view as any, id: folderId, name };
            }

            if (mode === "edit") {
                newState.isEditing = true;
                newState.editingPromptId = promptId;
            } else if (mode === "new") {
                newState.isEditing = true;
                newState.editingPromptId = null;
                // If promptId is present but we want new? No, 'new' means null id.
            } else {
                newState.isEditing = false;
                newState.editingPromptId = null;
            }

            if (q !== null && s.searchQuery !== q) {
                newState.searchQuery = q;
            }

            return newState;
        });
    }

    // 2. Store -> URL Sync (Listens to User Actions)
    // We use a debounce or check to ensure we don't spam history.
    $: if (browser && $uiStore) {
        syncUrlFromStore($uiStore);
    }

    function syncUrlFromStore(s: typeof $uiStore) {
        // Construct target URL
        const url = new URL($page.url);
        let changed = false;

        // View / Filter
        const type = s.filter.type;
        const fid = s.filter.id;

        if (url.searchParams.get("view") !== type) {
            url.searchParams.set("view", type);
            changed = true;
        }

        // Folder ID
        const currentFid = url.searchParams.get("folderId");
        if (fid) {
            if (currentFid !== fid) {
                url.searchParams.set("folderId", fid);
                changed = true;
            }
        } else {
            if (currentFid) {
                url.searchParams.delete("folderId");
                changed = true;
            }
        }

        // Edit Mode
        if (s.isEditing) {
            const pid = s.editingPromptId;
            const targetMode = pid ? "edit" : "new";
            if (url.searchParams.get("mode") !== targetMode) {
                url.searchParams.set("mode", targetMode);
                changed = true;
            }
            if (pid) {
                if (url.searchParams.get("promptId") !== pid) {
                    url.searchParams.set("promptId", pid);
                    changed = true;
                }
            } else {
                if (url.searchParams.has("promptId")) {
                    url.searchParams.delete("promptId");
                    changed = true;
                }
            }
        } else {
            if (url.searchParams.has("mode")) {
                url.searchParams.delete("mode");
                changed = true;
            }
            if (url.searchParams.has("promptId")) {
                url.searchParams.delete("promptId");
                changed = true;
            }
        }

        // Search (Sync only if not empty or if was present)
        // We avoid strict sync for search as user types to avoid history spam,
        // but 'replaceState' is fine.
        const currentQ = url.searchParams.get("q") || "";
        if (s.searchQuery !== currentQ) {
            if (s.searchQuery) url.searchParams.set("q", s.searchQuery);
            else url.searchParams.delete("q");
            changed = true;
        }

        if (changed) {
            // Apply!
            // Use 'pushState' for major navigation (View changes, entering Edit mode)
            // Use 'replaceState' for minor tweaks (Search query, maybe switching prompts quickly?)
            // For now, let's default to pushState for View/Mode, replaceState for Search.

            const isSearchOnly =
                !url.searchParams.get("mode") &&
                url.searchParams.get("view") ===
                    $page.url.searchParams.get("view");

            goto(url.toString(), {
                keepFocus: true,
                noScroll: true,
                replaceState: false, // Always push state to support back button properly
                state: { fromApp: true },
            });
        }
    }
    // ----------------------------------------------------------------
</script>

<Sidebar />

<main class="main-content">
    <header class="main-header">
        <button
            class="mobile-menu-btn md:hidden"
            style="margin-right: 16px; font-size: 1.2rem;"
            on:click={() =>
                uiStore.update((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }))}
        >
            <i class="fa-solid fa-bars"></i>
        </button>

        <h1>{$uiStore.filter.name}</h1>

        <div class="header-controls">
            <button
                class="button-like"
                on:click={() => (showSettings = true)}
                style="padding: 8px 12px; height: 100%;"
                title="환경 설정"
            >
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
                <select
                    class="button-like"
                    style="padding: 8px 12px; height: 100%;"
                    bind:value={$uiStore.sortOrder}
                >
                    <option value="updatedAt_desc">최근 사용순</option>
                    <option value="usageCount_desc">사용 횟수순</option>
                    <option value="createdAt_desc">최신 등록순</option>
                    <option value="createdAt_asc">오래된 등록순</option>
                    <option value="title_asc">이름순</option>
                </select>
            </div>

            <button
                class="new-prompt-btn-mobile"
                on:click={handleCreatePrompt}
                style="background: var(--accent-blue); color: var(--bg-primary); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"
            >
                <i class="fa-solid fa-plus"></i>
            </button>
        </div>
    </header>

    <div class="content-view">
        {#if $uiStore.filter.type === "statistics"}
            <Statistics />
        {:else if $uiStore.filter.type === "history"}
            <UsageHistory on:reuse={handleReuseHistory} />
        {:else if $uiStore.isEditing}
            <PromptEditor
                promptId={$uiStore.editingPromptId}
                on:close={handleCloseEditor}
            />
        {:else}
            <PromptList
                on:select={handleSelectPrompt}
                on:useTemplate={handleUseTemplate}
            />
        {/if}
    </div>
</main>

{#if templateModalId}
    <TemplateModal
        promptId={templateModalId}
        initialValues={templateInitialValues}
        on:close={() => {
            templateModalId = null;
            templateInitialValues = {};
        }}
    />
{/if}

{#if showSettings}
    <SettingsModal on:close={() => (showSettings = false)} />
{/if}

<Toast />

<style>
    /* Global layout overrides if needed */
</style>
