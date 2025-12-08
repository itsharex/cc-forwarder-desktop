// 实际图表组件 - 使用Chart.js渲染图表
import React, { useEffect, useRef, useState } from 'react';
import { fetchChartData } from '../utils/chartDataService.jsx';

// 导入 Chart.js 及必要组件
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    // 控制器
    LineController,
    BarController,
    DoughnutController,
    PieController
} from 'chart.js';

// 注册 Chart.js 组件
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    // 注册控制器
    LineController,
    BarController,
    DoughnutController,
    PieController
);

// 将 Chart 挂载到全局（为了兼容现有代码）
if (typeof window !== 'undefined') {
    window.Chart = ChartJS;
}

const ActualChart = ({ chartType, chartConfig, data, onChartReady }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // 用于跟踪当前异步操作是否已取消
    const cancelledRef = useRef(false);

    useEffect(() => {
        if (!canvasRef.current || !chartConfig) return;

        // 重置取消标志
        cancelledRef.current = false;
        let fetchedData = null;

        const initChart = async () => {
            try {
                setLoading(true);
                setError(null);

                // 如果已存在图表实例，先销毁
                if (chartRef.current) {
                    chartRef.current.destroy();
                    chartRef.current = null;
                }

                // 获取数据
                let chartData = data;
                if (!chartData) {
                    chartData = await fetchChartData(chartType);
                }

                fetchedData = chartData;

                // 检查是否已被取消
                if (cancelledRef.current || !canvasRef.current) {
                    return;
                }

                // 再次确保销毁可能存在的图表实例
                if (chartRef.current) {
                    chartRef.current.destroy();
                    chartRef.current = null;
                }

                // 创建Chart.js实例
                const ctx = canvasRef.current.getContext('2d');
                chartRef.current = new ChartJS(ctx, {
                    type: chartConfig.type,
                    data: chartData,
                    options: chartConfig.options
                });

                // 通知父组件图表已准备就绪
                if (onChartReady) {
                    onChartReady(chartRef.current, chartType);
                }

                // 注册到全局chartManager（兼容现有系统）
                if (window.chartManager && window.chartManager.charts) {
                    window.chartManager.charts.set(chartType, chartRef.current);
                }

                setLoading(false);
                console.log(`✅ 图表渲染成功: ${chartType}`);

            } catch (err) {
                if (cancelledRef.current) return;
                console.error(`❌ 图表渲染失败 (${chartType}):`, err);
                console.error(`❌ 详细错误信息:`, err.stack);
                console.error(`❌ 图表配置:`, chartConfig);
                console.error(`❌ 图表数据:`, fetchedData);
                setError(`${err.message}`);
                setLoading(false);
            }
        };

        initChart();

        // 清理函数
        return () => {
            cancelledRef.current = true;
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [chartType, chartConfig, data]); // 不包含 onChartReady，避免无限循环

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, []);

    if (error) {
        return (
            <div className="chart-loading" style={{ display: 'block', color: '#ef4444' }}>
                图表加载失败: {error}
            </div>
        );
    }

    return (
        <>
            <canvas ref={canvasRef} id={`${chartType}Chart`}></canvas>
            {loading && (
                <div className="chart-loading" style={{ display: 'block' }}>
                    加载中...
                </div>
            )}
        </>
    );
};

export default ActualChart;