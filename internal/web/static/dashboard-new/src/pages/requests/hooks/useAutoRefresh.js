// ============================================
// useAutoRefresh Hook - 自动刷新状态管理
// 2025-12-01 13:08:37
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useAutoRefresh Hook - 管理自动刷新逻辑（简化版）
 *
 * 设计理念 (by Dan Abramov):
 * 1. 正确的副作用清理 - 避免内存泄漏
 * 2. 使用 useRef 存储定时器引用,避免闭包陷阱
 * 3. 使用 useRef 存储回调函数,避免依赖项变化导致定时器重建
 * 4. 通过设置 interval=0 来停止自动刷新
 *
 * @param {Function} onRefresh - 刷新回调函数
 * @returns {Object}
 */
export const useAutoRefresh = (onRefresh) => {
  // 自动刷新间隔状态 (0 = 关闭) - 重命名避免与全局 setInterval 冲突
  const [refreshInterval, setRefreshInterval] = useState(0);

  // 使用 useRef 存储定时器,避免闭包问题
  const timerRef = useRef(null);

  // 使用 useRef 存储最新的 onRefresh 回调,避免依赖项变化
  const onRefreshRef = useRef(onRefresh);

  // 每次渲染时更新 ref 中的回调
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // 清理定时器的辅助函数
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 更改刷新间隔
  const changeInterval = useCallback((newInterval) => {
    setRefreshInterval(newInterval);
  }, []);

  // 当间隔变化时,重新设置定时器
  useEffect(() => {
    clearTimer();

    if (refreshInterval > 0) {
      // 启动自动刷新
      timerRef.current = window.setInterval(() => {
        // 调用 ref 中存储的最新回调，传入 silent=true 参数实现静默刷新
        onRefreshRef.current?.(true);
      }, refreshInterval * 1000);
    }

    // 清理函数
    return () => {
      clearTimer();
    };
  }, [refreshInterval, clearTimer]);

  return {
    isEnabled: refreshInterval > 0,
    interval: refreshInterval,
    changeInterval
  };
};

export default useAutoRefresh;
