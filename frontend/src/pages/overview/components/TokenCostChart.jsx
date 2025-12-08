// ============================================
// Token 成本图组件
// 2025-11-28
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, DollarSign } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { fetchEndpointCostsData } from '@utils/api.js';

// 格式化 Token 数量
const formatTokens = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

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
            {entry.dataKey === 'tokens' ? formatTokens(entry.value) : `$${entry.value.toFixed(2)}`}
          </span>
        </div>
      ))}
    </div>
  );
};

const TokenCostChart = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef(null);

  // 加载数据
  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    }
    try {
      const data = await fetchEndpointCostsData();
      setChartData(data);
    } catch (error) {
      console.error('加载端点成本数据失败:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 定时刷新（每 60 秒）
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      loadData(false);
    }, 60000);

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
      if (chart_type === 'endpoint_costs' || chart_type === 'endpointCosts') {
        if (Array.isArray(data)) {
          setChartData(data);
        } else if (data?.labels && data?.datasets) {
          // 如果是 Chart.js 格式，转换为 Recharts 格式
          const tokensData = data.datasets.find(d => d.label?.includes('Token'))?.data || [];
          const costData = data.datasets.find(d => d.label?.includes('成本') || d.label?.includes('Cost'))?.data || [];
          const converted = data.labels.map((name, i) => ({
            name,
            tokens: tokensData[i] || 0,
            cost: costData[i] || 0
          }));
          setChartData(converted);
        }
        console.log('📊 [SSE] 端点成本图已更新');
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

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-rose-50 text-rose-500 rounded-md">
            <DollarSign size={16} />
          </div>
          <h3 className="font-semibold text-slate-900">当日端点 Token 成本</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
          title="刷新数据"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">Token 使用量与预估成本对照</p>

      <div className="h-[280px] w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            加载中...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 50, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                interval={0}
              />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={formatTokens}
                width={50}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#f43f5e', fontSize: 11 }}
                tickFormatter={(v) => `$${v.toFixed(2)}`}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar
                yAxisId="left"
                dataKey="tokens"
                fill="#818cf8"
                barSize={32}
                radius={[4, 4, 0, 0]}
                name="Token 量"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cost"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                name="成本 (USD)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 图例 */}
      {!loading && chartData.length > 0 && (
        <div className="flex justify-center space-x-6 mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center text-xs text-slate-500">
            <span className="w-3 h-3 rounded bg-indigo-400 mr-2"></span>
            Token 使用量
          </div>
          <div className="flex items-center text-xs text-slate-500">
            <span className="w-3 h-3 rounded-full bg-rose-500 mr-2"></span>
            成本 (USD)
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenCostChart;
