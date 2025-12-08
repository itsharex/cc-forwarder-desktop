// ============================================
// Token 分布图组件
// 2025-11-28
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, PieChart as PieChartIcon } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { fetchTokenUsageData } from '@utils/api.js';

// Token 类型配置
const TOKEN_CONFIG = [
  { key: 'input', name: '输入 Token', color: '#6366f1' },
  { key: 'output', name: '输出 Token', color: '#10b981' },
  { key: 'cacheCreation', name: '缓存创建', color: '#f59e0b' },
  { key: 'cacheRead', name: '缓存读取', color: '#8b5cf6' }
];

// 格式化 Token 数量
const formatTokens = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

// 自定义 Tooltip
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="font-medium text-slate-900">{data.name}</span>
      </div>
      <div className="text-slate-600">
        <span className="font-mono">{formatTokens(data.value)}</span>
        <span className="text-slate-400 ml-2">({data.percent.toFixed(1)}%)</span>
      </div>
    </div>
  );
};

const TokenDistributionChart = () => {
  const [tokenData, setTokenData] = useState({ input: 0, output: 0, cacheCreation: 0, cacheRead: 0 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef(null);

  // 加载数据
  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    }
    try {
      const data = await fetchTokenUsageData();
      setTokenData(data);
    } catch (error) {
      console.error('加载 Token 分布数据失败:', error);
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
      if (chart_type === 'token_distribution' || chart_type === 'tokenDistribution' || chart_type === 'token_usage') {
        if (data) {
          setTokenData({
            input: data.input || data.input_tokens || 0,
            output: data.output || data.output_tokens || 0,
            cacheCreation: data.cacheCreation || data.cache_creation_tokens || 0,
            cacheRead: data.cacheRead || data.cache_read_tokens || 0
          });
          console.log('📊 [SSE] Token 分布图已更新');
        }
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

  // 计算总量和百分比
  const total = tokenData.input + tokenData.output + tokenData.cacheCreation + tokenData.cacheRead;

  // 转换为图表数据
  const chartData = TOKEN_CONFIG.map(config => ({
    ...config,
    value: tokenData[config.key] || 0,
    percent: total > 0 ? ((tokenData[config.key] || 0) / total) * 100 : 0
  })).filter(item => item.value > 0); // 过滤掉零值

  // 如果没有数据，显示占位
  const hasData = total > 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-md">
            <PieChartIcon size={16} />
          </div>
          <h3 className="font-semibold text-slate-900">Token 使用分布</h3>
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
      <p className="text-xs text-slate-500 mb-4">各类 Token 消耗占比</p>

      <div className="flex-1 min-h-[180px] flex items-center justify-center relative overflow-visible">
        {loading ? (
          <div className="flex items-center text-slate-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            加载中...
          </div>
        ) : !hasData ? (
          <div className="text-slate-400 text-sm">暂无数据</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={500}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="none"
                      className="transition-opacity hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-700">{formatTokens(total)}</span>
              <span className="text-xs text-slate-400">总计</span>
            </div>
          </>
        )}
      </div>

      {/* 图例 */}
      {!loading && hasData && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-3 border-t border-slate-100">
          {TOKEN_CONFIG.map((config) => {
            const value = tokenData[config.key] || 0;
            const percent = total > 0 ? (value / total) * 100 : 0;
            return (
              <div key={config.key} className="flex items-center justify-between text-xs">
                <div className="flex items-center text-slate-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="truncate">{config.name}</span>
                </div>
                <span className="font-mono text-slate-500 ml-2">
                  {percent > 0 ? `${percent.toFixed(0)}%` : '-'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TokenDistributionChart;
