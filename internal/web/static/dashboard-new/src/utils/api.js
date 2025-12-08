// ============================================
// API 服务层
// 2025-11-28
// ============================================

import { API_ENDPOINTS, ERROR_MESSAGES } from './constants.js';

// 请求超时配置
const DEFAULT_TIMEOUT = 30000;

// 带超时的 fetch 包装器
const fetchWithTimeout = async (url, options = {}, timeout = DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = ERROR_MESSAGES.SERVER_ERROR;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(ERROR_MESSAGES.REQUEST_TIMEOUT);
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
    throw error;
  }
};

// ============================================
// 系统状态 API
// ============================================

export const fetchStatus = async () => {
  return await fetchWithTimeout(API_ENDPOINTS.STATUS);
};

export const fetchConnections = async () => {
  return await fetchWithTimeout(API_ENDPOINTS.CONNECTIONS);
};

// ============================================
// 端点管理 API
// ============================================

export const fetchEndpoints = async () => {
  const data = await fetchWithTimeout(API_ENDPOINTS.ENDPOINTS);
  // 返回完整结构，包含 total, healthy 等统计信息
  // API 返回格式: { endpoints: [...], total: N, healthy: N }
  if (data.endpoints) {
    return {
      endpoints: data.endpoints,
      total: data.total ?? data.endpoints.length,
      healthy: data.healthy ?? data.endpoints.filter(e => e.status === 'healthy').length
    };
  }
  // 如果 API 直接返回数组
  const endpoints = Array.isArray(data) ? data : [];
  return {
    endpoints,
    total: endpoints.length,
    healthy: endpoints.filter(e => e.status === 'healthy').length
  };
};

export const checkEndpointHealth = async (endpointName) => {
  return await fetchWithTimeout(`${API_ENDPOINTS.ENDPOINT_HEALTH}/${endpointName}`, {
    method: 'POST'
  });
};

export const checkAllEndpointsHealth = async () => {
  return await fetchWithTimeout(API_ENDPOINTS.ENDPOINT_HEALTH, {
    method: 'POST'
  });
};

/**
 * 获取 Keys 概览数据
 * 返回每个端点的 tokens 列表，用于级联选择器
 */
export const fetchKeysOverview = async () => {
  const data = await fetchWithTimeout(API_ENDPOINTS.KEYS_OVERVIEW);
  // API 返回格式: { endpoints: [{ endpoint: "name", tokens: [...] }, ...] }
  return data;
};

/**
 * 切换端点的 Token
 * @param {string} endpointName - 端点名称
 * @param {string} keyType - 'token' 或 'api_key'
 * @param {number} index - Token 索引
 */
export const switchKey = async (endpointName, keyType, index) => {
  if (!endpointName) throw new Error('端点名称不能为空');
  if (keyType !== 'token' && keyType !== 'api_key') throw new Error('无效的 Key 类型');
  if (typeof index !== 'number' || index < 0) throw new Error('无效的 Key 索引');

  const apiPath = keyType === 'token'
    ? `/api/v1/endpoints/${encodeURIComponent(endpointName)}/keys/token`
    : `/api/v1/endpoints/${encodeURIComponent(endpointName)}/keys/api-key`;

  const data = await fetchWithTimeout(apiPath, {
    method: 'POST',
    body: JSON.stringify({ index })
  });

  if (!data.success) {
    throw new Error(data.error || 'Key 切换失败');
  }

  return data;
};

// ============================================
// 组管理 API
// ============================================

export const fetchGroups = async () => {
  const data = await fetchWithTimeout(API_ENDPOINTS.GROUPS);
  // 返回完整结构，包含 groups 数组和 active_group 信息
  // API 返回格式: { groups: [...], active_group: "xxx" } 或直接数组
  const groups = data.groups || (Array.isArray(data) ? data : []);
  const activeGroup = groups.find(g => g.is_active);
  return {
    groups,
    active_group: activeGroup?.name || data.active_group || null,
    total_suspended_requests: data.total_suspended_requests || 0
  };
};

export const activateGroup = async (groupName) => {
  const url = API_ENDPOINTS.GROUP_ACTIVATE.replace('{name}', groupName);
  return await fetchWithTimeout(url, { method: 'POST' });
};

export const pauseGroup = async (groupName) => {
  const url = API_ENDPOINTS.GROUP_PAUSE.replace('{name}', groupName);
  return await fetchWithTimeout(url, { method: 'POST' });
};

// ============================================
// 使用统计 API
// ============================================

export const fetchUsageStats = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryParams.append(key, value.toString());
    }
  });

  const url = queryParams.toString()
    ? `${API_ENDPOINTS.USAGE_STATS}?${queryParams.toString()}`
    : API_ENDPOINTS.USAGE_STATS;

  return await fetchWithTimeout(url);
};

export const fetchRequests = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryParams.append(key, value.toString());
    }
  });

  // 确保固定排序参数
  if (!queryParams.has('sort_by')) {
    queryParams.set('sort_by', 'start_time');
  }
  if (!queryParams.has('sort_order')) {
    queryParams.set('sort_order', 'desc');
  }

  const url = queryParams.toString()
    ? `${API_ENDPOINTS.USAGE_REQUESTS}?${queryParams.toString()}`
    : API_ENDPOINTS.USAGE_REQUESTS;

  const data = await fetchWithTimeout(url);

  // 标准化请求数据
  const normalizeRequest = (request) => ({
    ...request,
    requestId: request.request_id || request.requestId || request.id,
    id: request.request_id || request.requestId || request.id,
    timestamp: request.start_time || request.timestamp,
    model: request.model_name || request.model || 'unknown',
    endpoint: request.endpoint_name || request.endpoint || 'unknown',
    group: request.group_name || request.group || 'default',
    duration: request.duration_ms || request.duration || 0,
    inputTokens: request.input_tokens || request.inputTokens || 0,
    outputTokens: request.output_tokens || request.outputTokens || 0,
    cacheCreationTokens: request.cache_creation_tokens || request.cacheCreationTokens || 0,
    cacheReadTokens: request.cache_read_tokens || request.cacheReadTokens || 0,
    cost: request.total_cost_usd || request.cost || 0,
    isStreaming: request.is_streaming || request.isStreaming || false,
    statusCode: request.status_code || request.statusCode
  });

  const requests = data.requests || data.data || data || [];
  const normalizedRequests = Array.isArray(requests) ? requests.map(normalizeRequest) : [];

  return {
    requests: normalizedRequests,
    total: data.total || normalizedRequests.length,
    page: data.page || 1,
    pageSize: data.pageSize || data.limit || 50,
    totalPages: data.totalPages || Math.ceil((data.total || 0) / (data.pageSize || data.limit || 50))
  };
};

export const fetchModels = async () => {
  const data = await fetchWithTimeout(API_ENDPOINTS.USAGE_MODELS);
  if (data.success && data.data) return data.data;
  if (data.models) return data.models;
  if (Array.isArray(data)) return data;
  return [];
};

// ============================================
// 配置 API
// ============================================

export const fetchConfig = async () => {
  return await fetchWithTimeout(API_ENDPOINTS.CONFIG);
};

// ============================================
// 图表数据 API
// ============================================

/**
 * 将 Chart.js 格式转换为 Recharts 格式
 * Chart.js: { labels: [...], datasets: [{data: [...]}, ...] }
 * Recharts: [{ time: '...', total: N, success: N, fail: N }, ...]
 */
const transformChartJsToRecharts = (chartJsData, keyMapping) => {
  if (!chartJsData?.labels || !chartJsData?.datasets) {
    return [];
  }

  const { labels, datasets } = chartJsData;
  return labels.map((label, index) => {
    const point = { time: label };
    datasets.forEach((dataset, datasetIndex) => {
      const key = keyMapping[datasetIndex] || `value${datasetIndex}`;
      point[key] = dataset.data?.[index] ?? 0;
    });
    return point;
  });
};

/**
 * 获取请求趋势数据
 * @param {number} minutes - 时间范围（分钟），默认 30
 */
export const fetchRequestTrendData = async (minutes = 30) => {
  try {
    const data = await fetchWithTimeout(`/api/v1/chart/request-trends?minutes=${minutes}`);
    // 转换为 Recharts 格式: total, success, fail
    return transformChartJsToRecharts(data, ['total', 'success', 'fail']);
  } catch (error) {
    console.error('获取请求趋势数据失败:', error);
    return [];
  }
};

/**
 * 获取响应时间数据
 * @param {number} minutes - 时间范围（分钟），默认 30
 */
export const fetchResponseTimeData = async (minutes = 30) => {
  try {
    const data = await fetchWithTimeout(`/api/v1/chart/response-times?minutes=${minutes}`);
    // 转换为 Recharts 格式: avg, min, max
    return transformChartJsToRecharts(data, ['avg', 'min', 'max']);
  } catch (error) {
    console.error('获取响应时间数据失败:', error);
    return [];
  }
};

/**
 * 获取 Token 使用数据
 */
export const fetchTokenUsageData = async () => {
  try {
    const data = await fetchWithTimeout('/api/v1/tokens/usage');
    const current = data.current || data;
    return {
      input: current.input_tokens || 0,
      output: current.output_tokens || 0,
      cacheCreation: current.cache_creation_tokens || 0,
      cacheRead: current.cache_read_tokens || 0
    };
  } catch (error) {
    console.error('获取 Token 使用数据失败:', error);
    return { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
  }
};

/**
 * 获取端点健康状态数据
 */
export const fetchEndpointHealthData = async () => {
  try {
    const data = await fetchWithTimeout('/api/v1/chart/endpoint-health');
    // 返回 { healthy: N, unhealthy: N } 或原始 Chart.js 格式
    if (data.labels && data.datasets) {
      const [healthy, unhealthy] = data.datasets[0]?.data || [0, 0];
      return { healthy, unhealthy };
    }
    return data;
  } catch (error) {
    console.error('获取端点健康状态数据失败:', error);
    return { healthy: 0, unhealthy: 0 };
  }
};

/**
 * 获取端点成本数据
 */
export const fetchEndpointCostsData = async () => {
  try {
    const data = await fetchWithTimeout('/api/v1/chart/endpoint-costs');
    // 转换为 Recharts 格式: { name, tokens, cost }
    if (data.labels && data.datasets) {
      // 查找 Token 数据集（label 包含 "Token" 或 "token"）
      const tokensDataset = data.datasets.find(d =>
        d.label?.toLowerCase().includes('token')
      );
      // 查找成本数据集（label 包含 "成本" 或 "Cost" 或 "USD"）
      const costDataset = data.datasets.find(d =>
        d.label?.includes('成本') || d.label?.toLowerCase().includes('cost') || d.label?.includes('USD')
      );

      const tokensData = tokensDataset?.data || [];
      const costData = costDataset?.data || [];

      return data.labels.map((name, i) => ({
        name,
        tokens: tokensData[i] || 0,
        cost: costData[i] || 0
      }));
    }
    return [];
  } catch (error) {
    console.error('获取端点成本数据失败:', error);
    return [];
  }
};

/**
 * 获取连接活动数据
 * @param {number} minutes - 时间范围（分钟），默认 60
 */
export const fetchConnectionActivityData = async (minutes = 60) => {
  try {
    const data = await fetchWithTimeout(`/api/v1/chart/connection-activity?minutes=${minutes}`);
    return transformChartJsToRecharts(data, ['connections']);
  } catch (error) {
    console.error('获取连接活动数据失败:', error);
    return [];
  }
};

// ============================================
// 导出工具函数
// ============================================

export const formatUptime = (seconds) => {
  if (typeof seconds !== 'number' || seconds <= 0) return seconds;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  if (secs > 0 || result === '') result += `${secs}s`;

  return result.trim();
};

export const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export const formatCost = (cost) => {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(4)}`;
};

export const formatDuration = (ms) => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms}ms`;
};

// 格式化时间戳
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';

  // 后端返回RFC3339格式：2025-09-25T10:07:54.994712+08:00
  // 直接使用浏览器的Date解析，它会正确处理时区信息
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid Date';

  // 显示本地时间格式：2025/9/25 10:07:54
  // 使用toLocaleString确保显示用户本地时区的时间
  const year = date.getFullYear();
  const month = date.getMonth() + 1;  // 不补零，按原版格式
  const day = date.getDate();         // 不补零，按原版格式
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
};
