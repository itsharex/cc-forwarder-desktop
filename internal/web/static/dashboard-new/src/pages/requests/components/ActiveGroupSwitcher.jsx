// ============================================
// ActiveGroupSwitcher - 级联上下文切换器（组 + Token）
// 2025-12-02 17:25:54
// 参考 test.jsx CascadingContextSwitcher 实现
// ============================================

import { useState, useEffect, useRef } from 'react';
import { ArrowLeftRight, Layers, Check, ChevronRight, AlertCircle } from 'lucide-react';

/**
 * ActiveGroupSwitcher - 级联选择器（组 > Token）
 * @param {Object} props
 * @param {Array} props.groups - 所有组列表，每个组可包含 tokens 数组
 * @param {string} props.activeGroup - 当前活跃组名称
 * @param {string} props.activeToken - 当前活跃 Token 名称
 * @param {Function} props.onSwitch - 切换回调 (groupName, tokenName) => Promise<void>
 * @param {boolean} props.loading - 是否正在切换中
 */
const ActiveGroupSwitcher = ({
  groups = [],
  activeGroup = '',
  activeToken = '',
  onSwitch,
  loading = false
}) => {
  // 查找活跃组对象
  const findActiveGroupObj = () => {
    return groups.find(g => g.name === activeGroup) || groups[0] || null;
  };

  // 获取活跃组的当前激活 token 名称
  const getActiveTokenName = () => {
    const groupObj = findActiveGroupObj();
    if (!groupObj?.tokens?.length) return '';
    // 找到 is_active 为 true 的 token，或者返回第一个
    const activeOne = groupObj.tokens.find(t => t.is_active);
    return activeOne?.name || groupObj.tokens[0]?.name || '';
  };

  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [selectedToken, setSelectedToken] = useState(activeToken || getActiveTokenName());
  const containerRef = useRef(null);

  // 同步 selectedToken 当 props 变化时
  useEffect(() => {
    if (activeToken) {
      setSelectedToken(activeToken);
    } else {
      setSelectedToken(getActiveTokenName());
    }
  }, [activeToken, activeGroup, groups]);

  // 同步 hoveredGroup 到当前活跃组
  useEffect(() => {
    if (isOpen) {
      const activeGroupObj = findActiveGroupObj();
      setHoveredGroup(activeGroupObj);
    }
  }, [isOpen, activeGroup, groups]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 获取组的 tokens 列表
  const getGroupTokens = (group) => {
    if (group?.tokens && Array.isArray(group.tokens) && group.tokens.length > 0) {
      return group.tokens;
    }
    return [];
  };

  // 处理 Token 选择
  const handleTokenSelect = async (group, token) => {
    if (switching) return;

    const isSameSelection = group.name === activeGroup && token.name === selectedToken;
    if (isSameSelection) {
      setIsOpen(false);
      return;
    }

    setSwitching(true);
    try {
      // ✅ 传递完整的 token 对象（包含 endpoint 和 index）
      await onSwitch?.(group.name, token);
      setSelectedToken(token.name);
      setIsOpen(false);
    } catch (error) {
      console.error('切换失败:', error);
      alert(`切换失败: ${error.message || '未知错误'}`);
    } finally {
      setSwitching(false);
    }
  };

  // Token 类型对应的样式
  const getTokenTypeStyle = (type) => {
    switch (type) {
      case 'Global':
        return 'bg-gray-100 text-gray-500';
      case 'Pro':
        return 'bg-purple-100 text-purple-600';
      case 'Ent':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-green-100 text-green-600';
    }
  };

  // 无组数据时的占位显示
  if (!groups.length) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 bg-gray-50 border border-gray-200">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>无可用组</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* 触发按钮 - 单行紧凑设计 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching || loading}
        className={`group flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-sm font-medium transition-all shadow-sm ${
          isOpen
            ? 'border-emerald-300 ring-2 ring-emerald-100 text-emerald-700'
            : 'border-gray-200 text-gray-700 hover:border-emerald-300 hover:text-emerald-600'
        } ${(switching || loading) ? 'opacity-60 cursor-wait' : ''}`}
      >
        {/* 活跃状态指示器 */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>

        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs text-gray-500">Active:</span>
          <span className="font-bold">{activeGroup || '未选择'}</span>
          <span className="text-gray-300">/</span>
          <span className="font-normal text-gray-600 group-hover:text-emerald-600 transition-colors">
            {selectedToken}
          </span>
        </div>

        <ArrowLeftRight className={`w-3.5 h-3.5 ml-1 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 级联下拉面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 sm:left-auto sm:right-auto mt-2 w-[320px] sm:w-[480px] bg-white rounded-xl shadow-xl border border-gray-100 ring-1 ring-black/5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col sm:flex-row">

          {/* 左栏：组列表 */}
          <div className="w-full sm:w-1/2 border-r border-gray-100 bg-gray-50/50 p-2 flex flex-col gap-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              选择分组
            </div>
            {groups.map((group) => {
              const isHovered = hoveredGroup?.name === group.name;
              // 计算健康状态：全部健康=绿色，部分健康=黄色，全部不健康=红色
              const healthyCount = group.healthy_endpoints ?? 0;
              const unhealthyCount = group.unhealthy_endpoints ?? 0;
              const totalCount = group.total_endpoints ?? (healthyCount + unhealthyCount);
              const isAllHealthy = totalCount > 0 && healthyCount === totalCount;
              const isAllUnhealthy = totalCount > 0 && unhealthyCount === totalCount;
              const isPartialHealthy = totalCount > 0 && healthyCount > 0 && unhealthyCount > 0;

              // 图标颜色：健康=绿色，部分=黄色，不健康=红色，未知=灰色
              const getIconColor = () => {
                if (isHovered) {
                  if (isAllHealthy) return 'text-emerald-500';
                  if (isAllUnhealthy) return 'text-rose-500';
                  if (isPartialHealthy) return 'text-amber-500';
                  return 'text-emerald-500';
                }
                if (isAllHealthy) return 'text-emerald-400';
                if (isAllUnhealthy) return 'text-rose-400';
                if (isPartialHealthy) return 'text-amber-400';
                return 'text-gray-400';
              };

              return (
                <button
                  key={group.name}
                  onMouseEnter={() => setHoveredGroup(group)}
                  onClick={() => setHoveredGroup(group)} // 移动端触摸支持
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    isHovered
                      ? 'bg-white shadow-sm text-emerald-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className={`w-4 h-4 ${getIconColor()}`} />
                    <span>{group.name}</span>
                    {/* 健康状态小圆点 */}
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isAllHealthy ? 'bg-emerald-400' :
                      isAllUnhealthy ? 'bg-rose-400' :
                      isPartialHealthy ? 'bg-amber-400' :
                      'bg-gray-300'
                    }`} title={`${healthyCount}/${totalCount} 健康`} />
                  </div>
                  {isHovered && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              );
            })}
          </div>

          {/* 右栏：Token 列表（级联显示） */}
          <div className="w-full sm:w-1/2 p-2 flex flex-col gap-1 bg-white border-t sm:border-t-0 border-gray-100">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span className="text-emerald-600 font-bold">{hoveredGroup?.name || '-'}</span> 的 Tokens
            </div>

            {hoveredGroup && getGroupTokens(hoveredGroup).map((token) => {
              const isActive = activeGroup === hoveredGroup.name && selectedToken === token.name;
              return (
                <button
                  key={`${token.endpoint}-${token.index}`}
                  onClick={() => handleTokenSelect(hoveredGroup, token)}
                  disabled={switching}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors group ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  } ${switching ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    {/* Token 名称 */}
                    <span className={`font-medium truncate ${isActive ? 'text-emerald-700' : 'text-gray-700'}`}>
                      {token.name}
                    </span>
                    {/* 端点名称 + Key 预览 */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-indigo-500 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                        {token.endpoint}
                      </span>
                      {token.key && token.key !== '*' && (
                        <span className="text-[10px] text-gray-400 font-mono truncate">
                          {token.key}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 类型标签 + 选中状态 */}
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${getTokenTypeStyle(token.type)}`}>
                      {token.type || 'Default'}
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                </button>
              );
            })}

            {/* 如果没有 hoveredGroup */}
            {!hoveredGroup && (
              <div className="px-3 py-8 text-center text-gray-400 text-sm">
                请先选择一个分组
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveGroupSwitcher;
