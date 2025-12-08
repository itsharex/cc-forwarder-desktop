// ============================================
// Endpoints 页面 - 端点管理
// 2025-11-28
// ============================================

import React, { useState } from 'react';
import {
  Activity,
  Globe,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import {
  StatusBadge,
  LatencyIndicator,
  Button,
  LoadingSpinner,
  ErrorMessage
} from '@components/ui';
import useEndpointsData from '@hooks/useEndpointsData.js';
import { KeySelector, ToggleSwitch } from './components';

// ============================================
// 端点表格行组件
// ============================================

const EndpointRow = ({
  endpoint,
  keysInfo,
  onActivateGroup,
  onSwitchKey
}) => {
  if (!endpoint) return null;

  // 格式化组信息
  const formatGroupInfo = () => {
    const group = endpoint.group || 'default';
    const groupPriority = endpoint.group_priority || 0;
    return (
      <div className="flex flex-col">
        <span className="text-slate-700 font-medium">{group}</span>
        <span className="text-[10px] text-slate-400">优先级 {groupPriority}</span>
      </div>
    );
  };

  // 格式化最后检查时间
  const formatLastCheck = (lastCheck) => {
    if (!lastCheck || lastCheck === '-') return '-';
    try {
      const date = new Date(lastCheck);
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return lastCheck;
    }
  };

  // 从 keysInfo 获取 tokens 列表
  const tokens = keysInfo?.tokens || [];

  // 判断组是否可以激活
  const hasValidGroup = endpoint.group && endpoint.group !== 'default';
  const groupIsActive = endpoint.group_is_active;

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      {/* 状态 */}
      <td className="px-5 py-3.5">
        <StatusBadge
          status={endpoint.healthy ? 'healthy' : (endpoint.never_checked ? 'unknown' : 'unhealthy')}
        />
      </td>

      {/* 名称 */}
      <td className="px-5 py-3.5">
        <span className="font-semibold text-slate-900">{endpoint.name}</span>
      </td>

      {/* Token */}
      <td className="px-5 py-3.5">
        {tokens.length > 1 && onSwitchKey ? (
          <KeySelector
            endpointName={endpoint.name}
            keyType="token"
            keys={tokens}
            onSwitch={onSwitchKey}
          />
        ) : tokens.length === 1 ? (
          <KeySelector
            endpointName={endpoint.name}
            keyType="token"
            keys={tokens}
          />
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-500 w-[140px]">
            🔑 <span className="truncate">default</span>
          </span>
        )}
      </td>

      {/* URL */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2 group/url">
          <div className="flex items-center text-slate-500 min-w-0 flex-1" title={endpoint.url}>
            <Globe size={14} className="mr-1.5 text-slate-300 flex-shrink-0" />
            <span className="truncate text-sm max-w-[180px]">{endpoint.url}</span>
          </div>
          <a
            href={endpoint.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors opacity-0 group-hover/url:opacity-100"
            title="在新标签页打开"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </td>

      {/* 组 */}
      <td className="px-5 py-3.5">
        {formatGroupInfo()}
      </td>

      {/* 响应时间 */}
      <td className="px-5 py-3.5">
        <LatencyIndicator ms={endpoint.response_time || 0} />
      </td>

      {/* 最后检查 */}
      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
        {formatLastCheck(endpoint.last_check)}
      </td>

      {/* 启用组 Toggle */}
      <td className="px-5 py-3.5 text-center">
        <ToggleSwitch
          enabled={groupIsActive}
          disabled={!hasValidGroup}
          onChange={() => hasValidGroup && onActivateGroup?.(endpoint.name, endpoint.group)}
          title={
            !hasValidGroup ? '端点未配置组信息' :
            groupIsActive ? `组 "${endpoint.group}" 已启用` :
            `点击启用组: ${endpoint.group}`
          }
        />
      </td>
    </tr>
  );
};

// ============================================
// Endpoints 页面
// ============================================

const EndpointsPage = () => {
  // 使用端点数据 Hook
  const {
    endpoints,
    loading,
    error,
    stats,
    keysOverview,
    refresh,
    performBatchHealthCheckAll,
    activateEndpointGroup,
    switchKey,
    sseConnectionStatus,
    lastUpdate
  } = useEndpointsData();

  // 批量检测状态
  const [batchCheckLoading, setBatchCheckLoading] = useState(false);

  // 批量健康检测处理
  const handleBatchHealthCheck = async () => {
    setBatchCheckLoading(true);
    try {
      await performBatchHealthCheckAll();
    } catch (err) {
      console.error('批量健康检测失败:', err);
      alert(`批量健康检测失败: ${err.message}`);
    } finally {
      setBatchCheckLoading(false);
    }
  };

  // 从 keysOverview 中查找指定端点的 Key 信息
  const getKeysInfo = (endpointName) => {
    if (!keysOverview?.endpoints) return null;
    return keysOverview.endpoints.find(k => k.endpoint === endpointName);
  };

  // 错误状态
  if (error) {
    return (
      <ErrorMessage
        title="端点数据加载失败"
        message={error}
        onRetry={refresh}
      />
    );
  }

  // 加载状态
  if (loading && endpoints.length === 0) {
    return <LoadingSpinner text="加载端点数据..." />;
  }

  return (
    <div className="animate-fade-in">
      {/* 页面标题 */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Endpoints Status</h1>
          <p className="text-slate-500 text-sm mt-1">
            管理所有上游 API 端点与健康检测
            {lastUpdate && (
              <span className="ml-2 text-slate-400">· 更新于 {lastUpdate}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* SSE 状态指示器 */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${
              sseConnectionStatus === 'connected' ? 'bg-emerald-400' :
              sseConnectionStatus === 'connecting' ? 'bg-amber-400 animate-pulse' :
              'bg-slate-300'
            }`} />
            {sseConnectionStatus === 'connected' ? '实时' : '离线'}
          </div>

          {/* 刷新按钮 */}
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={refresh}
            loading={loading}
          >
            刷新
          </Button>

          {/* 批量检测按钮 */}
          <Button
            icon={Activity}
            loading={batchCheckLoading}
            onClick={handleBatchHealthCheck}
          >
            检测全部
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-sm text-slate-500">总端点数</div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200/60 p-4 shadow-sm">
          <div className="text-2xl font-bold text-emerald-600">{stats.healthy}</div>
          <div className="text-sm text-slate-500">健康端点</div>
        </div>
        <div className="bg-white rounded-xl border border-rose-200/60 p-4 shadow-sm">
          <div className="text-2xl font-bold text-rose-600">{stats.unhealthy}</div>
          <div className="text-sm text-slate-500">不健康端点</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-400">{stats.unchecked}</div>
          <div className="text-sm text-slate-500">未检测端点</div>
        </div>
      </div>

      {/* 端点表格 */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-4 w-24">状态</th>
                <th className="px-5 py-4">名称</th>
                <th className="px-5 py-4">Token</th>
                <th className="px-5 py-4">URL</th>
                <th className="px-5 py-4">组</th>
                <th className="px-5 py-4">响应时间</th>
                <th className="px-5 py-4">最后检查</th>
                <th className="px-5 py-4 text-center">启用组</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {endpoints.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-slate-500">
                    暂无端点数据
                  </td>
                </tr>
              ) : (
                endpoints.map((endpoint, index) => (
                  <EndpointRow
                    key={endpoint.name || index}
                    endpoint={endpoint}
                    keysInfo={getKeysInfo(endpoint.name)}
                    onActivateGroup={activateEndpointGroup}
                    onSwitchKey={switchKey}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="px-5 py-4 border-t border-slate-100 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            显示 {endpoints.length} 条记录
            {stats.healthPercentage > 0 && (
              <span className="ml-2 text-emerald-600">
                · {stats.healthPercentage}% 健康率
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 border border-slate-200 rounded text-slate-400 disabled:opacity-50"
              disabled
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-slate-500">1 / 1</span>
            <button
              className="p-1.5 border border-slate-200 rounded text-slate-400 disabled:opacity-50"
              disabled
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndpointsPage;
