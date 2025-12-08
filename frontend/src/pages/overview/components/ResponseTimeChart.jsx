// ============================================
// 响应时间图表组件
// 2025-11-28
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { fetchResponseTimeData } from '@utils/api.js';
import { CustomSelect } from '@components/ui';

// 时间范围选项
const TIME_RANGE_OPTIONS = [
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' }
];

// 自定义 Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100 text-sm">
      <p className="font-medium text-slate-900 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-mono font-medium" style={{ color: entry.color }}>
            {entry.value}ms
          </span>
        </div>
      ))}
    </div>
  );
};

const ResponseTimeChart = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState(30);
  const refreshIntervalRef = useRef(null);

  // 加载数据
  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    }
    try {
      const data = await fetchResponseTimeData(timeRange);
      setChartData(data);
    } catch (error) {
      console.error('加载响应时间数据失败:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [timeRange]);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // 定时刷新（每 30 秒）
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      loadData(false);
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [loadData]);

  // 监听 SSE 图表更新事件
  useEffect(() => {
    const handleChartUpdate = (event) => {
      const { chart_type, data } = event.detail || {};
      if (chart_type === 'response_times' || chart_type === 'responseTimes') {
        if (Array.isArray(data)) {
          setChartData(data);
        } else if (data?.labels && data?.datasets) {
          // Chart.js 格式转换
          const avgData = data.datasets[0]?.data || [];
          const minData = data.datasets[1]?.data || [];
          const maxData = data.datasets[2]?.data || [];
          const converted = data.labels.map((time, i) => ({
            time,
            avg: avgData[i] || 0,
            min: minData[i] || 0,
            max: maxData[i] || 0
          }));
          setChartData(converted);
        }
        console.log('📊 [SSE] 响应时间图已更新');
      }
    };

    document.addEventListener('chartUpdate', handleChartUpdate);
    return () => {
      document.removeEventListener('chartUpdate', handleChartUpdate);
    };
  }, []);

  // 手动刷新
  const handleRefresh = () => {
    loadData(true);
  };

  // 计算平均响应时间
  const avgResponseTime = chartData.length > 0
    ? Math.round(chartData.reduce((sum, d) => sum + (d.avg || 0), 0) / chartData.length)
    : 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-cyan-50 text-cyan-500 rounded-md">
            <Clock size={16} />
          </div>
          <h3 className="font-semibold text-slate-900">响应时间</h3>
        </div>
        <div className="flex items-center space-x-2">
          <CustomSelect
            options={TIME_RANGE_OPTIONS}
            value={timeRange}
            onChange={setTimeRange}
            size="xs"
          />
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
            title="刷新数据"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        平均响应: <span className="font-mono font-medium text-cyan-600">{avgResponseTime}ms</span>
      </p>

      <div className="flex-1 min-h-[200px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            ��载中...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(v) => `${v}ms`}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="max"
                stroke="#f43f5e"
                strokeWidth={1}
                fill="none"
                strokeDasharray="3 3"
                name="最大"
              />
              <Area
                type="monotone"
                dataKey="avg"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#colorAvg)"
                name="平均"
              />
              <Area
                type="monotone"
                dataKey="min"
                stroke="#10b981"
                strokeWidth={1}
                fill="none"
                strokeDasharray="3 3"
                name="最小"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 图例 */}
      {!loading && chartData.length > 0 && (
        <div className="flex justify-center space-x-6 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center text-xs text-slate-500">
            <span className="w-3 h-0.5 bg-rose-500 mr-2" style={{ borderStyle: 'dashed' }} />
            最大
          </div>
          <div className="flex items-center text-xs text-slate-500">
            <span className="w-3 h-0.5 bg-cyan-500 mr-2" />
            平均
          </div>
          <div className="flex items-center text-xs text-slate-500">
            <span className="w-3 h-0.5 bg-emerald-500 mr-2" style={{ borderStyle: 'dashed' }} />
            最小
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseTimeChart;
