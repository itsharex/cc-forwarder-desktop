// ============================================
// Requests 页面 - 请求追踪（重构版）
// 2025-12-02 17:30:52
// 更新：级联选择器支持 Token 切换
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { ErrorMessage } from '@components/ui';
import { fetchRequests, fetchModels, fetchUsageStats, fetchEndpoints, fetchGroups, fetchKeysOverview, activateGroup, switchKey } from '@utils/api.js';
import { useFilters } from './hooks/useFilters.js';
import { useColumnConfig } from './hooks/useColumnConfig.js';
import { useTimeRange } from './hooks/useTimeRange.js';
import { useAutoRefresh } from './hooks/useAutoRefresh.js';
import { FiltersPanel, StatsOverview, RequestsTable, Toolbar, RequestDetailModal } from './components';
import { PAGINATION_CONFIG } from './utils/constants.js';

// ============================================
// 工具函数
// ============================================

/**
 * 根据 Token 名称推断类型
 * @param {string} name - Token 名称
 * @returns {string} - 'Pro' | 'Ent' | 'Free' | 'Std'
 */
const inferTokenType = (name) => {
  if (!name) return 'Std';
  const lowerName = name.toLowerCase();
  if (lowerName.includes('pro') || lowerName.includes('特价')) return 'Pro';
  if (lowerName.includes('ent') || lowerName.includes('主号')) return 'Ent';
  if (lowerName.includes('free') || lowerName.includes('测试')) return 'Free';
  return 'Std';
};

// ============================================
// Requests 页面
// ============================================

const RequestsPage = () => {
  // ==================== 状态管理 ====================

  // 数据状态
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [models, setModels] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState('');
  const [activeToken, setActiveToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 面板状态
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isViewConfigOpen, setIsViewConfigOpen] = useState(false);

  // 详情模态框状态
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 筛选器 Hook
  const {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    buildQueryParams
  } = useFilters();

  // 列配置 Hook
  const {
    visibleColumns,
    toggleColumn,
    resetColumns,
    allColumns: columnConfigs
  } = useColumnConfig();

  // 时间范围 Hook
  const { activeRange, selectRange } = useTimeRange((timeRange) => {
    updateFilters(timeRange);
    setPagination(prev => ({ ...prev, page: 1 }));
  });

  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1
  });

  // ==================== 数据加载 ====================

  const loadData = useCallback(async (silent = false) => {
    try {
      // 静默刷新时不改变 loading 状态，避免闪屏
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const queryParams = buildQueryParams();

      // 计算offset: 后端API使用offset而非page
      const offset = (pagination.page - 1) * pagination.pageSize;

      // 为stats API添加默认时间范围（30天），避免无数据问题
      const statsParams = {
        ...queryParams,
        period: '30d'  // 默认查询30天数据
      };

      const [requestsData, statsData, modelsData, endpointsData, groupsData, keysData] = await Promise.all([
        fetchRequests({
          ...queryParams,
          offset,
          limit: pagination.pageSize
        }),
        fetchUsageStats(statsParams),
        fetchModels(),
        fetchEndpoints(),
        fetchGroups(),
        fetchKeysOverview().catch(() => null) // 容错：即使获取失败也不影响主流程
      ]);

      setRequests(requestsData.requests);
      setPagination(prev => ({
        ...prev,
        total: requestsData.total,
        totalPages: requestsData.totalPages
      }));

      // 解包stats数据：后端返回 {success: true, data: {...}}
      const statsDataUnpacked = statsData?.data || statsData;
      setStats(statsDataUnpacked);

      setModels(Array.isArray(modelsData) ? modelsData : []);

      const endpointsList = endpointsData.endpoints || endpointsData || [];
      setEndpoints(Array.isArray(endpointsList) ? endpointsList : []);

      // 处理组数据并整合 tokens
      const groupsList = groupsData.groups || groupsData || [];

      // 建立 endpoint name -> group name 的映射
      // keysOverview API 没有返回 group 信息，需要从 endpoints API 关联
      const endpointToGroupMap = new Map();
      (Array.isArray(endpointsList) ? endpointsList : []).forEach(ep => {
        if (ep.name && ep.group) {
          endpointToGroupMap.set(ep.name, ep.group);
        }
      });

      // 从 keysData 中按组聚合 tokens
      // keysData 格式: { endpoints: [{ endpoint: "name", tokens: [...] }, ...] }
      const groupTokensMap = new Map();
      if (keysData?.endpoints) {
        keysData.endpoints.forEach(ep => {
          // 通过 endpoint name 查找对应的 group
          const groupName = endpointToGroupMap.get(ep.endpoint) || 'default';
          if (!groupTokensMap.has(groupName)) {
            groupTokensMap.set(groupName, []);
          }
          // 将该端点的 tokens 添加到组中（去重）
          if (ep.tokens && Array.isArray(ep.tokens)) {
            ep.tokens.forEach(token => {
              const existingTokens = groupTokensMap.get(groupName);
              // 避免重复添加（根据 name 或 masked 判断）
              // 不去重，因为不同端点可能有相同名称的 Token，但它们是不同的
              // 改为保留端点信息，确保每个 Token 都能正确关联到对应端点
              existingTokens.push({
                name: token.name || `Token ${token.index + 1}`,
                key: token.masked || `sk-...${token.index}`,
                type: inferTokenType(token.name),
                index: token.index,
                is_active: token.is_active,
                endpoint: ep.endpoint  // ✅ 保留端点名称，用于后续切换
              });
            });
          }
        });
      }

      // 将 tokens 整合到 groups 中
      const groupsWithTokens = (Array.isArray(groupsList) ? groupsList : []).map(group => {
        const tokens = groupTokensMap.get(group.name) || [];
        return { ...group, tokens };
      });

      setGroups(groupsWithTokens);

      // 更新活跃组
      const activeGroupName = groupsData.active_group ||
        groupsList.find(g => g.is_active)?.name || '';
      setActiveGroup(activeGroupName);
    } catch (err) {
      setError(err.message);
    } finally {
      // 只有手动刷新才会改变 loading 状态
      if (!silent) {
        setLoading(false);
      }
    }
  }, [buildQueryParams, pagination.page, pagination.pageSize]);

  // 自动刷新 Hook (必须在 loadData 定义之后)
  const autoRefresh = useAutoRefresh(loadData);

  // ==================== 事件处理 ====================

  // 筛选面板切换
  const handleFilterToggle = () => {
    setIsFilterOpen(!isFilterOpen);
    setIsViewConfigOpen(false); // 关闭列配置
  };

  // 列配置面板切换
  const handleViewConfigToggle = () => {
    setIsViewConfigOpen(!isViewConfigOpen);
    setIsFilterOpen(false); // 关闭筛选面板
  };

  // 应用筛选
  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadData();
  };

  // 重置筛选
  const handleResetFilters = () => {
    resetFilters();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 页码变更
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // 每页条数变更
  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({
      ...prev,
      pageSize: newPageSize,
      page: 1 // 重置到第一页
    }));
  };

  // 快捷时间选择（筛选面板内）
  const handleQuickTimeSelect = (range) => {
    // 这里可以实现快捷时间选择的逻辑
    // 简化实现：直接更新到"今天"
    const todayRange = {
      startDate: filters.startDate,
      endDate: filters.endDate
    };
    updateFilters(todayRange);
  };

  // 双击行打开详情
  const handleRowDoubleClick = (request) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  // 关闭详情模态框
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRequest(null);
  };

  // 组/Token 切换（级联选择器回调）
  const handleGroupSwitch = async (groupName, tokenObj) => {
    try {
      // 如果用户选择了具体的 Token，先切换该端点的 Token
      if (tokenObj && tokenObj.endpoint && tokenObj.index !== undefined) {
        console.log('🔄 切换端点 Token:', {
          endpoint: tokenObj.endpoint,
          tokenName: tokenObj.name,
          index: tokenObj.index
        });
        await switchKey(tokenObj.endpoint, 'token', tokenObj.index);
        setActiveToken(tokenObj.name);
      }

      // 只有组变化时才调用 API 激活
      if (groupName !== activeGroup) {
        console.log('🔄 激活组:', groupName);
        await activateGroup(groupName);
        setActiveGroup(groupName);
      }

      // 切换后刷新数据
      await loadData(true);
    } catch (err) {
      console.error('❌ 切换失败:', err);
      throw err; // 让 ActiveGroupSwitcher 组件知道切换失败
    }
  };

  // ==================== 生命周期 ====================

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== 渲染 ====================

  if (error) {
    return (
      <ErrorMessage
        title="请求数据加载失败"
        message={error}
        onRetry={loadData}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
      {/* 页面标题 & 工具栏 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-30">
        {/* 页面标题 */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200/50">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">请求追踪</h1>
            <p className="text-sm text-gray-500">实时监控所有转发请求的状态与详情</p>
          </div>
        </div>

        {/* 工具栏 */}
        <Toolbar
          activeTimeRange={activeRange}
          onTimeRangeChange={selectRange}
          isFilterOpen={isFilterOpen}
          onFilterToggle={handleFilterToggle}
          isViewConfigOpen={isViewConfigOpen}
          onViewConfigToggle={handleViewConfigToggle}
          onRefresh={loadData}
          columns={columnConfigs}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
          onResetColumns={resetColumns}
          autoRefresh={autoRefresh}
          groups={groups}
          activeGroup={activeGroup}
          activeToken={activeToken}
          onGroupSwitch={handleGroupSwitch}
        />

        {/* 筛选面板（弹出式） */}
        <div className="absolute top-full left-0 right-0 z-10">
          <FiltersPanel
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            filters={filters}
            updateFilter={updateFilter}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
            models={models}
            endpoints={endpoints}
            groups={groups}
            onQuickTimeSelect={handleQuickTimeSelect}
          />
        </div>
      </div>

      {/* 统计概览 - 面板打开时blur */}
      <StatsOverview
        stats={stats}
        total={pagination.total}
        isBlurred={isFilterOpen || isViewConfigOpen}
      />

      {/* 请求列表表格 - 面板打开时blur */}
      <div className={`transition-all duration-300 ${isFilterOpen || isViewConfigOpen ? 'opacity-40 pointer-events-none blur-[1px]' : ''}`}>
        <RequestsTable
          requests={requests}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          visibleColumns={visibleColumns}
          columnConfigs={columnConfigs}
          onRowDoubleClick={handleRowDoubleClick}
        />
      </div>

      {/* 请求详情模态框 */}
      <RequestDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        request={selectedRequest}
      />
    </div>
  );
};

export default RequestsPage;
