/**
 * 操作按钮组件 (操作按钮)
 *
 * 负责：
 * - 提供端点相关的操作按钮(激活组、更新优先级、手动健康检测等)
 * - 处理操作按钮的点击事件和状态管理
 * - 与原版本endpointsManager.js完全兼容的交互逻辑
 * - 防止重复点击和错误处理
 * - 为未来更多操作按钮预留扩展空间
 *
 * 创建日期: 2025-09-15 23:47:50
 * 修改日期: 2025-11-27 (添加激活组按钮、移除单个检测按钮)
 */

import React, { useState } from 'react';

const ActionButtons = ({
    endpoint,
    onHealthCheck,
    onActivateGroup,
    priorityEditorRef,
    disabled = false
}) => {
    // 按钮状态管理
    const [healthCheckLoading, setHealthCheckLoading] = useState(false);
    const [activateLoading, setActivateLoading] = useState(false);

    // 显示错误消息
    const showError = (message) => {
        // 使用全局Utils显示错误消息，与原版本保持一致
        if (window.Utils && window.Utils.showError) {
            window.Utils.showError(message);
        } else {
            console.error('ActionButtons错误:', message);
            alert(message);
        }
    };

    // 显示成功消息
    const showSuccess = (message) => {
        // 使用全局Utils显示成功消息，与原版本保持一致
        if (window.Utils && window.Utils.showSuccess) {
            window.Utils.showSuccess(message);
        } else {
            console.log('ActionButtons成功:', message);
        }
    };

    // 激活组处理函数
    const handleActivateGroup = async () => {
        const groupName = endpoint.group;

        // 验证端点是否配置组
        if (!groupName || groupName === 'default') {
            showError('该端点未配置组信息，无法启用');
            return;
        }

        if (!onActivateGroup) {
            showError('启用组功能不可用');
            return;
        }

        setActivateLoading(true);
        try {
            console.log(`⚡ 正在启用组: ${groupName}`);
            const result = await onActivateGroup(endpoint.name, groupName);

            if (result && result.success) {
                showSuccess(`组 "${groupName}" 启用成功`);
            }
        } catch (error) {
            console.error(`❌ 启用组 "${groupName}" 失败:`, error);
            showError(`启用组失败: ${error.message}`);
        } finally {
            setActivateLoading(false);
        }
    };

    // 更新优先级处理函数 - 通过ref调用PriorityEditor的方法
    const handleUpdatePriority = async () => {
        if (!priorityEditorRef || !priorityEditorRef.current) {
            showError('无法访问优先级编辑器');
            return;
        }

        try {
            // 调用PriorityEditor的executeUpdate方法
            await priorityEditorRef.current.executeUpdate();
        } catch (error) {
            console.error('更新优先级失败:', error);
            showError('更新优先级失败');
        }
    };

    const handleHealthCheck = async () => {
        if (!endpoint || !endpoint.name) {
            showError('端点信息无效');
            return;
        }

        if (!onHealthCheck) {
            showError('健康检测功能不可用');
            return;
        }

        try {
            setHealthCheckLoading(true);

            // 调用健康检测回调函数，传入端点名称
            const result = await onHealthCheck(endpoint.name);

            if (result && result.success === false) {
                // 检测失败，显示错误消息
                showError(result.error || '手动检测失败');
            } else if (result && typeof result.healthy === 'boolean') {
                // 检测成功，显示结果
                const healthText = result.healthy ? '健康' : '不健康';
                showSuccess(`手动检测完成 - ${endpoint.name}: ${healthText}`);
            } else {
                // 默认成功处理
                showSuccess(`手动检测完成 - ${endpoint.name}`);
            }

        } catch (error) {
            console.error('手动检测失败:', error);
            showError('手动检测失败');
        } finally {
            setHealthCheckLoading(false);
        }
    };

    // 判断是否有有效的组配置
    const hasValidGroup = endpoint.group && endpoint.group !== 'default';
    // 判断组是否已经激活
    const groupIsActive = endpoint.group_is_active;
    // 按钮是否可用：有效组 且 组未激活
    const canActivate = hasValidGroup && !groupIsActive;

    return (
        <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
            {/* 激活组按钮 */}
            <button
                className="btn btn-sm activate-group"
                data-endpoint={endpoint.name}
                onClick={handleActivateGroup}
                disabled={disabled || activateLoading || !canActivate}
                title={
                    !hasValidGroup ? '端点未配置组信息' :
                    groupIsActive ? `组 "${endpoint.group}" 已启用` :
                    `启用组: ${endpoint.group}`
                }
                style={{
                    backgroundColor: canActivate ? '#22c55e' : undefined,
                    borderColor: canActivate ? '#22c55e' : undefined,
                    color: canActivate ? '#fff' : undefined
                }}
            >
                {activateLoading ? '启用中...' : groupIsActive ? '活跃' : '启用'}
            </button>

            {/* 更新优先级按钮 */}
            <button
                className="btn btn-sm update-priority"
                data-endpoint={endpoint.name}
                onClick={handleUpdatePriority}
                disabled={disabled || healthCheckLoading || activateLoading || (priorityEditorRef?.current?.isUpdating)}
                title="更新优先级"
            >
                {(priorityEditorRef?.current?.isUpdating) ? '更新中...' : '更新'}
            </button>

            {/*
             * 注意：单个端点的健康检测按钮已移除
             * 改为使用表格顶部的"检测全部"按钮进行批量检测
             * 保留 handleHealthCheck 函数以备将来可能的需求
             */}
        </div>
    );
};

export default ActionButtons;