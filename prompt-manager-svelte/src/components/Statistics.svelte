<script lang="ts">
    import { onMount } from "svelte";
    import Chart from "chart.js/auto";
    import { historyStore } from "../stores/historyStore";
    import { promptStore } from "../stores/promptStore";

    let usageChartCanvas: HTMLCanvasElement;
    let uChart: Chart | null = null;

    $: totalPrompts = $promptStore.prompts.length;
    $: totalUsage = $promptStore.prompts.reduce(
        (acc, p) => acc + (p.usageCount || 0),
        0,
    );
    $: totalFolders = $promptStore.folders.length;
    $: templateCount = $promptStore.prompts.filter((p) => p.isTemplate).length;

    // Computed for Tags
    $: tagCounts = $promptStore.prompts.reduce(
        (acc, p) => {
            if (p.tags) {
                p.tags.forEach((tag) => {
                    const t = tag.trim();
                    if (t) acc[t] = (acc[t] || 0) + 1;
                });
            }
            return acc;
        },
        {} as Record<string, number>,
    );

    $: sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

    onMount(async () => {
        await historyStore.init();
        renderCharts();
    });

    function renderCharts() {
        if (uChart) uChart.destroy();

        const ctx = usageChartCanvas.getContext("2d");
        if (!ctx) return;

        // Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, "rgba(138, 180, 248, 0.5)"); // Accent Blue
        gradient.addColorStop(1, "rgba(138, 180, 248, 0.0)");

        // Last 14 days
        const labels = [...Array(14)]
            .map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split("T")[0];
            })
            .reverse();

        const data = labels.map((date) => {
            return $historyStore.filter(
                (r) =>
                    new Date(r.timestamp).toISOString().split("T")[0] === date,
            ).length;
        });

        uChart = new Chart(usageChartCanvas, {
            type: "line",
            data: {
                labels: labels.map((d) => d.slice(5)), // MM-DD
                datasets: [
                    {
                        label: "사용 활동",
                        data: data,
                        borderColor: "#8ab4f8",
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: "#1e1f20",
                        pointBorderColor: "#8ab4f8",
                        pointBorderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: "index",
                        intersect: false,
                        backgroundColor: "rgba(32, 33, 36, 0.9)",
                        titleColor: "#e8eaed",
                        bodyColor: "#bdc1c6",
                        borderColor: "#5f6368",
                        borderWidth: 1,
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "rgba(255,255,255,0.05)" },
                        ticks: { color: "#bdc1c6", stepSize: 1 },
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: "#bdc1c6" },
                    },
                },
                interaction: {
                    mode: "nearest",
                    axis: "x",
                    intersect: false,
                },
            },
        });
    }
</script>

<div class="content-view">
    <div class="dashboard-header">
        <h2><i class="fa-solid fa-chart-pie"></i> 통계 대시보드</h2>
        <p>생산성 지표 및 활동 내역을 확인하세요.</p>
    </div>

    <!-- Summary Cards -->
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-icon blue">
                <i class="fa-solid fa-layer-group"></i>
            </div>
            <div class="metric-info">
                <span class="metric-value">{totalPrompts}</span>
                <span class="metric-label">총 프롬프트</span>
            </div>
        </div>
        <div class="metric-card">
            <div class="metric-icon purple">
                <i class="fa-solid fa-rocket"></i>
            </div>
            <div class="metric-info">
                <span class="metric-value">{totalUsage}</span>
                <span class="metric-label">총 실행 횟수</span>
            </div>
        </div>
        <div class="metric-card">
            <div class="metric-icon yellow">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <div class="metric-info">
                <span class="metric-value">{templateCount}</span>
                <span class="metric-label">템플릿 수</span>
            </div>
        </div>
        <div class="metric-card">
            <div class="metric-icon green">
                <i class="fa-regular fa-folder-open"></i>
            </div>
            <div class="metric-info">
                <span class="metric-value">{totalFolders}</span>
                <span class="metric-label">폴더 수</span>
            </div>
        </div>
    </div>

    <div class="dashboard-main-grid">
        <!-- Main Chart -->
        <div class="card chart-card">
            <div class="card-header">
                <h3>주간 활동 추이</h3>
            </div>
            <div class="chart-wrapper">
                <canvas bind:this={usageChartCanvas}></canvas>
            </div>
        </div>

        <!-- Tag Cloud -->
        <div class="card tags-card">
            <div class="card-header">
                <h3>인기 태그</h3>
            </div>
            <div class="tags-container">
                {#each sortedTags as [tag, count]}
                    <span
                        class="tag-pill"
                        style="font-size: {Math.min(
                            1.5,
                            0.8 + count * 0.1,
                        )}rem; opacity: {0.5 + Math.min(count, 10) * 0.05}"
                    >
                        #{tag}
                    </span>
                {/each}
                {#if sortedTags.length === 0}
                    <p class="empty-state">태그 데이터가 없습니다.</p>
                {/if}
            </div>
        </div>

        <!-- Recent Prompts -->
        <div class="card history-card">
            <div class="card-header">
                <h3>최근 활동 기록</h3>
            </div>
            <ul class="activity-list">
                {#each $historyStore.slice(0, 8) as activity}
                    <li class="activity-item">
                        <div
                            class="activity-icon {activity.type ===
                            'prompt_copy'
                                ? 'blue'
                                : 'yellow'}"
                        >
                            <i
                                class={activity.type === "prompt_copy"
                                    ? "fa-solid fa-copy"
                                    : "fa-solid fa-wand-magic-sparkles"}
                            ></i>
                        </div>
                        <div class="activity-details">
                            <span class="activity-title"
                                >{activity.promptTitle ||
                                    "알 수 없는 항목"}</span
                            >
                            <span class="activity-time"
                                >{new Date(
                                    activity.timestamp,
                                ).toLocaleString()}</span
                            >
                        </div>
                    </li>
                {/each}
                {#if $historyStore.length === 0}
                    <p class="empty-state">최근 활동 내역이 없습니다.</p>
                {/if}
            </ul>
        </div>
    </div>
</div>

<style>
    .content-view {
        padding: 32px;
        max-width: 1200px;
        margin: 0 auto;
    }

    .dashboard-header {
        margin-bottom: 32px;
    }
    .dashboard-header h2 {
        font-size: 1.8rem;
        font-weight: 700;
        margin-bottom: 8px;
        color: var(--text-primary);
    }
    .dashboard-header p {
        color: var(--text-secondary);
    }

    /* Metrics Grid */
    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
    }

    .metric-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        transition: transform 0.2s;
    }
    .metric-card:hover {
        transform: translateY(-2px);
    }

    .metric-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
    }
    .metric-icon.blue {
        background: rgba(138, 180, 248, 0.1);
        color: #8ab4f8;
    }
    .metric-icon.purple {
        background: rgba(197, 138, 249, 0.1);
        color: #c58af9;
    }
    .metric-icon.yellow {
        background: rgba(253, 214, 99, 0.1);
        color: #fdd663;
    }
    .metric-icon.green {
        background: rgba(129, 201, 149, 0.1);
        color: #81c995;
    }

    .metric-info {
        display: flex;
        flex-direction: column;
    }
    .metric-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
    }
    .metric-label {
        font-size: 0.85rem;
        color: var(--text-secondary);
    }

    /* Main Grid */
    .dashboard-main-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        grid-template-rows: auto auto;
        gap: 20px;
    }

    .card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 24px;
        display: flex;
        flex-direction: column;
    }

    .card-header {
        margin-bottom: 20px;
    }
    .card-header h3 {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    .chart-card {
        grid-column: 1;
        grid-row: 1;
        min-height: 350px;
    }
    .chart-wrapper {
        flex: 1;
        position: relative;
    }

    .tags-card {
        grid-column: 2;
        grid-row: 1;
    }
    .tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-content: flex-start;
    }
    .tag-pill {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        padding: 6px 12px;
        border-radius: 20px;
        color: var(--accent-blue);
        font-weight: 500;
    }

    .history-card {
        grid-column: 1 / -1;
        grid-row: 2;
    }
    .activity-list {
        list-style: none;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 12px;
    }
    .activity-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--bg-primary);
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }

    .activity-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
    }
    .activity-icon.blue {
        background: rgba(138, 180, 248, 0.1);
        color: #8ab4f8;
    }
    .activity-icon.yellow {
        background: rgba(253, 214, 99, 0.1);
        color: #fdd663;
    }

    .activity-details {
        display: flex;
        flex-direction: column;
    }
    .activity-title {
        font-weight: 500;
        color: var(--text-primary);
        font-size: 0.95rem;
    }
    .activity-time {
        font-size: 0.8rem;
        color: var(--text-secondary);
    }

    .empty-state {
        color: var(--text-secondary);
        font-size: 0.9rem;
        font-style: italic;
    }

    @media (max-width: 768px) {
        .content-view {
            padding: 16px;
        }

        .dashboard-header h2 {
            font-size: 1.4rem;
        }

        .metric-card {
            padding: 14px;
        }

        .metric-icon {
            width: 40px;
            height: 40px;
            font-size: 1rem;
        }

        .metric-value {
            font-size: 1.2rem;
        }

        .dashboard-main-grid {
            grid-template-columns: 1fr;
        }
        .chart-card,
        .tags-card,
        .history-card {
            grid-column: 1;
        }

        .activity-list {
            grid-template-columns: 1fr;
        }
    }
</style>
