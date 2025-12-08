// ============================================
// StatsOverview - 统计概览组件
// 2025-12-01 11:11:13
// ============================================

import {
  Zap,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  XCircle
} from 'lucide-react';

/**
 * 格式化Token数量（转换为M单位）
 */
const formatTokens = (tokens) => {
  const numericTokens = Number(tokens) || 0;
  if (numericTokens === 0) return '0.00M';
  const inMillions = numericTokens / 1000000;
  return `${inMillions.toFixed(2)}M`;
};

/**
 * 格式化成本
 */
const formatCost = (cost) => {
  const num = parseFloat(cost);
  if (!cost || isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
};

/**
 * 格式化持续时间
 */
const formatDuration = (duration) => {
  if (!duration || duration === 0) return '-';
  const ms = parseFloat(duration);
  if (isNaN(ms)) return '-';
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    return `${Math.round(ms)}ms`;
  }
};

/**
 * StatsOverview - 统计概览组件
 * @param {Object} props
 * @param {Object} props.stats - 统计数据
 * @param {number} props.total - 总记录数（来自分页）
 */
const StatsOverview = ({ stats, total = 0, isBlurred = false }) => {
  if (!stats) return null;

  // 格式化后端返回的原始数据
  const totalRequests = stats.total_requests || total || 0;
  const successRate = stats.success_rate ? `${stats.success_rate.toFixed(1)}%` : '-%';
  const avgDuration = formatDuration(stats.avg_duration_ms);  // 注意：字段是 avg_duration_ms
  const totalCost = formatCost(stats.total_cost_usd);
  const totalTokens = formatTokens(stats.total_tokens);
  const failedRequests = stats.failed_requests || 0;

  const kpis = [
    { label: '总请求数', value: totalRequests, unit: '', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: '成功率', value: successRate, unit: '', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: '平均耗时', value: avgDuration, unit: '', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: '总成本', value: totalCost, unit: '', icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: '总Token数 (M)', value: totalTokens, unit: '', icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: '失败请求', value: failedRequests, unit: '', icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' }
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 transition-all duration-300 ${isBlurred ? 'opacity-40 pointer-events-none blur-[1px]' : ''}`}>
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-white p-4 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100/50 hover:border-indigo-100 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500">{kpi.label}</span>
            <div className={`p-1.5 rounded-md ${kpi.bg} bg-opacity-50`}>
              <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900 tracking-tight">{kpi.value}</span>
            {kpi.unit && <span className="text-xs text-gray-400 font-medium">{kpi.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsOverview;
