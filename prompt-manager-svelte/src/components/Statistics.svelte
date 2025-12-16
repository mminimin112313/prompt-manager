<script lang="ts">
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';
    import { historyStore } from '../stores/historyStore';
    import { promptStore } from '../stores/promptStore';

    let usageChartCanvas: HTMLCanvasElement;
    let typeChartCanvas: HTMLCanvasElement;
    let uChart: Chart | null = null;
    let tChart: Chart | null = null;

    onMount(async () => {
        await historyStore.init();
        renderCharts();
    });

    function renderCharts() {
        if (uChart) uChart.destroy();
        if (tChart) tChart.destroy();

        // 1. Line Chart: Usage over last 7 days
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toLocaleDateString();
        }).reverse();

        const usageData = last7Days.map(date => {
            return $historyStore.filter(r => new Date(r.timestamp).toLocaleDateString() === date).length;
        });

        uChart = new Chart(usageChartCanvas, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: '일일 사용량',
                    data: usageData,
                    borderColor: '#8ab4f8',
                    backgroundColor: 'rgba(138, 180, 248, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#3c4043' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // 2. Pie Chart: Prompt vs Template Usage
        const typeCounts = {
            'Copy': $historyStore.filter(r => r.type === 'prompt_copy').length,
            'Template': $historyStore.filter(r => r.type === 'template_generate').length,
            'Sequence': $historyStore.filter(r => r.type === 'sequence_run').length
        };

        tChart = new Chart(typeChartCanvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    data: Object.values(typeCounts),
                    backgroundColor: ['#8ab4f8', '#fdd663', '#f28b82'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'right', labels: { color: '#bdc1c6' } }
                }
            }
        });
    }
</script>

<div class="content-view">
    <h2 style="font-size: 1.2rem; margin-bottom: 16px; font-weight: 500;">통계 대시보드</h2>

    <div class="dashboard-grid">
        <div class="stat-card">
            <h3 class="stat-header">최근 7일 사용량</h3>
            <div class="chart-container">
                <canvas bind:this={usageChartCanvas}></canvas>
            </div>
        </div>

        <div class="stat-card">
            <h3 class="stat-header">사용 유형</h3>
            <div class="chart-container" style="display: flex; justify-content: center;">
                <canvas bind:this={typeChartCanvas}></canvas>
            </div>
        </div>

        <div class="stat-card" style="grid-column: 1 / -1;">
            <h3 class="stat-header">최다 사용 프롬프트 Top 5</h3>
            <ul style="list-style: none;">
                {#each $promptStore.prompts.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 5) as prompt, i}
                    <li style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="width: 24px; height: 24px; background-color: var(--bg-tertiary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: bold;">{i+1}</span>
                            <span style="font-weight: 500;">{prompt.title}</span>
                        </div>
                        <span style="background-color: rgba(138, 180, 248, 0.1); color: var(--accent-blue); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">{prompt.usageCount || 0}회</span>
                    </li>
                {/each}
            </ul>
        </div>
    </div>
</div>

<style>
    .bg-secondary { background-color: var(--bg-secondary); }
    .bg-tertiary { background-color: var(--bg-tertiary); }
</style>
