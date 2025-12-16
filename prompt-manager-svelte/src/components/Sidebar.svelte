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
        <button class="new-prompt-btn" on:click={() => { /* Emit */ }}>
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
                <li class="nav-item" class:active={$uiStore.filter.type === 'favorites'}>
                    <button on:click={() => setFilter('favorites', null, '즐겨찾기')}>
                        <i class="nav-icon fa-solid fa-star"></i> 즐겨찾기
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
                            <i class="nav-icon fa-regular fa-folder"></i> {folder.name}
                        </button>
                    </li>
                {/each}
                 <li class="nav-item" class:active={$uiStore.filter.type === 'uncategorized'}>
                    <button on:click={() => setFilter('uncategorized', null, '미분류')}>
                        <i class="nav-icon fa-solid fa-inbox"></i> 미분류
                    </button>
                </li>
            </ul>
            <button class="new-folder-btn">
                <i class="fa-solid fa-folder-plus"></i> 새 폴더
            </button>
        </div>
    </div>
</aside>

<div 
    class="sidebar-overlay" 
    class:show={$uiStore.sidebarOpen} 
    on:click={() => uiStore.update(s => ({ ...s, sidebarOpen: false }))}
></div>

<style>
/* Styles are global in app.css now to match original */
</style>
