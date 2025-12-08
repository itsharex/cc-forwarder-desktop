// ============================================
// 端点数据管理 Hook
// 2025-11-28
// ============================================

import { useState, useCallback, useEffect } from 'react';
import useSSE from './useSSE.js';

/**
 * 端点数据管理 Hook
 *
 * 功能:
 * - 端点数据状态管理
 * - SSE 实时更新
 * - API 交互方法 (健康检测、优先级更新、Key 切换等)
 */
const useEndpointsData = () => {
  const [data, setData] = useState({
    endpoints: [],
    total: 0,
    healthy: 0,
    unhealthy: 0,
    unchecked: 0,
    healthPercentage: 0,
    loading: false,
    error: null,
    lastUpdate: null
  });

  // Key 概览数据
  const [keysOverview, setKeysOverview] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 计算端点统计
  const calculateStats = useCallback((endpoints) => {
    if (!endpoints || endpoints.length === 0) {
      return { total: 0, healthy: 0, unhealthy: 0, unchecked: 0, healthPercentage: 0 };
    }

    const healthy = endpoints.filter(e => e.healthy && !e.never_checked).length;
    const unhealthy = endpoints.filter(e => !e.healthy && !e.never_checked).length;
    const unchecked = endpoints.filter(e => e.never_checked).length;
    const total = endpoints.length;

    return {
      total,
      healthy,
      unhealthy,
      unchecked,
      healthPercentage: total > 0 ? ((healthy / total) * 100).toFixed(1) : 0
    };
  }, []);

  // SSE 事件处理
  const handleSSEUpdate = useCallback((sseData, eventType) => {
    if (eventType !== 'endpoint') return;

    const actualData = sseData.data || sseData;

    try {
      setData(prevData => {
        const newData = { ...prevData };

        // 完整端点列表更新
        if (actualData.endpoints && Array.isArray(actualData.endpoints)) {
          newData.endpoints = actualData.endpoints;
          Object.assign(newData, calculateStats(actualData.endpoints));
        }
        // 单个端点更新
        else if (actualData.endpoint_name || actualData.name || actualData.endpoint) {
          const endpointName = actualData.endpoint_name || actualData.name || actualData.endpoint;
          newData.endpoints = newData.endpoints.map(ep =>
            ep.name === endpointName ? { ...ep, ...actualData } : ep
          );
          Object.assign(newData, calculateStats(newData.endpoints));
        }

        newData.lastUpdate = new Date().toLocaleTimeString();
        newData.error = null;
        return newData;
      });
    } catch (error) {
      console.error('❌ [端点SSE] 处理失败:', error);
    }
  }, [calculateStats]);

  // 初始化 SSE 连接
  const { connectionStatus } = useSSE(handleSSEUpdate, {
    events: 'endpoint'
  });

  // 加载端点数据
  const loadData = useCallback(async () => {
    try {
      if (!isInitialized) {
        setData(prev => ({ ...prev, loading: true, error: null }));
      }

      const response = await fetch('/api/v1/endpoints');
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const responseData = await response.json();
      const endpoints = responseData.endpoints || [];
      const stats = calculateStats(endpoints);

      setData(prevData => ({
        ...prevData,
        endpoints,
        ...stats,
        lastUpdate: new Date().toLocaleTimeString(),
        loading: false,
        error: null
      }));

      setIsInitialized(true);
    } catch (error) {
      console.error('❌ 端点数据加载失败:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || '端点数据加载失败'
      }));
    }
  }, [isInitialized, calculateStats]);

  // 加载 Key 概览数据
  const loadKeysOverview = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/keys/overview');
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const responseData = await response.json();
      setKeysOverview(responseData);
      return responseData;
    } catch (error) {
      console.error('❌ Key 概览加载失败:', error);
      return null;
    }
  }, []);

  // 更新端点优先级
  const updatePriority = useCallback(async (endpointName, newPriority) => {
    try {
      if (!endpointName) throw new Error('端点名称不能为空');
      if (newPriority < 1) throw new Error('优先级必须大于等于1');

      const response = await fetch(`/api/v1/endpoints/${encodeURIComponent(endpointName)}/priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: parseInt(newPriority) })
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(prevData => ({
          ...prevData,
          endpoints: prevData.endpoints.map(ep =>
            ep.name === endpointName ? { ...ep, priority: parseInt(newPriority) } : ep
          ),
          lastUpdate: new Date().toLocaleTimeString()
        }));

        setTimeout(() => loadData(), 500);
        return { success: true, message: `端点 ${endpointName} 优先级已更新为 ${newPriority}` };
      } else {
        throw new Error(result.error || '更新失败');
      }
    } catch (error) {
      console.error('❌ 优先级更新失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadData]);

  // 执行健康检测
  const performHealthCheck = useCallback(async (endpointName) => {
    try {
      if (!endpointName) throw new Error('端点名称不能为空');

      const response = await fetch(`/api/v1/endpoints/${encodeURIComponent(endpointName)}/health-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(prevData => ({
          ...prevData,
          endpoints: prevData.endpoints.map(ep =>
            ep.name === endpointName
              ? {
                  ...ep,
                  healthy: result.healthy,
                  never_checked: false,
                  last_check: new Date().toISOString(),
                  response_time: result.response_time || ep.response_time
                }
              : ep
          ),
          ...calculateStats(prevData.endpoints),
          lastUpdate: new Date().toLocaleTimeString()
        }));

        setTimeout(() => loadData(), 500);
        return { success: true, healthy: result.healthy, response_time: result.response_time };
      } else {
        throw new Error(result.error || '健康检测失败');
      }
    } catch (error) {
      console.error('❌ 健康检测失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadData, calculateStats]);

  // 批量健康检测
  const performBatchHealthCheckAll = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/endpoints/health-check-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        await loadData();
        return {
          success: true,
          message: result.message || '批量健康检测完成',
          total: result.total,
          healthyCount: result.healthy_count,
          unhealthyCount: result.unhealthy_count
        };
      } else {
        throw new Error(result.message || '批量健康检测失败');
      }
    } catch (error) {
      console.error('❌ 批量健康检测失败:', error);
      throw error;
    }
  }, [loadData]);

  // 激活组
  const activateEndpointGroup = useCallback(async (endpointName, groupName) => {
    if (!groupName) {
      throw new Error('端点未配置组信息');
    }

    try {
      const response = await fetch(`/api/v1/groups/${encodeURIComponent(groupName)}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success) {
        await loadData();
        return { success: true, message: result.message || `组 "${groupName}" 激活成功` };
      } else {
        throw new Error(result.message || result.error || '组激活失败');
      }
    } catch (error) {
      console.error(`❌ 激活组 "${groupName}" 失败:`, error);
      throw error;
    }
  }, [loadData]);

  // 切换 Key
  const switchKey = useCallback(async (endpointName, keyType, index) => {
    try {
      if (!endpointName) throw new Error('端点名称不能为空');
      if (keyType !== 'token' && keyType !== 'api_key') throw new Error('无效的 Key 类型');
      if (typeof index !== 'number' || index < 0) throw new Error('无效的 Key 索引');

      const apiPath = keyType === 'token'
        ? `/api/v1/endpoints/${encodeURIComponent(endpointName)}/keys/token`
        : `/api/v1/endpoints/${encodeURIComponent(endpointName)}/keys/api-key`;

      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API 请求失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        await loadKeysOverview();
        return { success: true, message: result.message || 'Key 切换成功' };
      } else {
        throw new Error(result.error || 'Key 切换失败');
      }
    } catch (error) {
      console.error('❌ Key 切换失败:', error);
      throw error;
    }
  }, [loadKeysOverview]);

  // 搜索端点
  const searchEndpoints = useCallback((query) => {
    if (!query) return data.endpoints;
    const lowerQuery = query.toLowerCase();
    return data.endpoints.filter(ep =>
      ep.name.toLowerCase().includes(lowerQuery) ||
      ep.url.toLowerCase().includes(lowerQuery) ||
      (ep.group && ep.group.toLowerCase().includes(lowerQuery))
    );
  }, [data.endpoints]);

  // 按组分组
  const getEndpointsByGroup = useCallback(() => {
    const grouped = {};
    data.endpoints.forEach(ep => {
      const group = ep.group || 'default';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(ep);
    });
    return grouped;
  }, [data.endpoints]);

  // 初始化
  useEffect(() => {
    loadData();
    loadKeysOverview();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // SSE 失败后定时刷新
  useEffect(() => {
    let interval = null;
    if (connectionStatus === 'failed' || connectionStatus === 'error') {
      interval = setInterval(loadData, 15000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionStatus, loadData]);

  return {
    // 数据状态
    data,
    endpoints: data.endpoints,
    loading: data.loading,
    error: data.error,
    isInitialized,

    // 统计
    stats: {
      total: data.total,
      healthy: data.healthy,
      unhealthy: data.unhealthy,
      unchecked: data.unchecked,
      healthPercentage: data.healthPercentage
    },

    // 核心方法
    loadData,
    refresh: loadData,
    updatePriority,
    performHealthCheck,
    performBatchHealthCheckAll,
    activateEndpointGroup,

    // Key 管理
    keysOverview,
    loadKeysOverview,
    switchKey,

    // 查询方法
    searchEndpoints,
    getEndpointsByGroup,

    // 系统状态
    sseConnectionStatus: connectionStatus,
    lastUpdate: data.lastUpdate
  };
};

export default useEndpointsData;
