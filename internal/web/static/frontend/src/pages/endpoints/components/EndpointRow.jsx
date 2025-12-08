/**
 * 端点行组件 (单行数据)
 *
 * 负责：
 * - 渲染单个端点的数据行
 * - 显示端点的基本信息(名称、URL、状态等)
 * - 集成状态指示器、优先级编辑器和操作按钮
 * - 独立 Token 列显示 Key 选择器（多 API Key 切换功能）
 * - 处理行级别的交互事件
 * - 与原版本endpointsManager.js完全一致的HTML表格结构
 * - 激活端点所在组功能
 *
 * 创建日期: 2025-09-15 23:47:50
 * 完整实现日期: 2025-09-16
 * 更新日期: 2025-11-27 (添加激活组功能)
 * @author Claude Code Assistant
 */

import { useRef } from 'react';
import StatusIndicator from './StatusIndicator.jsx';
import PriorityEditor from './PriorityEditor.jsx';
import ActionButtons from './ActionButtons.jsx';
import KeySelector from './KeySelector.jsx';

/**
 * 端点行组件
 * @param {Object} props 组件属性
 * @param {Object} props.endpoint 端点数据对象，包含所有端点信息
 * @param {Object} props.keysInfo 端点的 Key 信息（可选）
 * @param {Function} props.onUpdatePriority 优先级更新回调函数 (endpointName, newPriority) => Promise
 * @param {Function} props.onHealthCheck 手动健康检测回调函数 (endpointName) => Promise
 * @param {Function} props.onActivateGroup 激活组回调函数 (endpointName, groupName) => Promise
 * @param {Function} props.onSwitchKey Key 切换回调函数 (endpointName, keyType, index) => Promise
 * @returns {JSX.Element} 端点表格行JSX元素
 */
const EndpointRow = ({
    endpoint,
    keysInfo,
    onUpdatePriority,
    onHealthCheck,
    onActivateGroup,
    onSwitchKey
}) => {
    // 创建ref用于PriorityEditor和ActionButtons之间的通信
    const priorityEditorRef = useRef(null);

    // 数据验证
    if (!endpoint) {
        console.warn('EndpointRow: endpoint 数据为空');
        return null;
    }

    // 格式化组信息显示
    const formatGroupInfo = (endpoint) => {
        const group = endpoint.group || 'default';
        const groupPriority = endpoint.group_priority || 0;
        return `${group} (${groupPriority})`;
    };

    // 安全地获取端点数据，提供默认值
    const safeEndpoint = {
        name: endpoint.name || 'unknown',
        url: endpoint.url || '-',
        priority: endpoint.priority || 1,
        group: endpoint.group || 'default',
        group_priority: endpoint.group_priority || 0,
        response_time: endpoint.response_time || '-',
        last_check: endpoint.last_check || '-',
        healthy: endpoint.healthy || false,
        never_checked: endpoint.never_checked || false,
        ...endpoint
    };

    return (
        <tr>
            {/* 第1列：状态指示器 */}
            <td>
                <StatusIndicator endpoint={safeEndpoint} />
            </td>

            {/* 第2列：端点名称 */}
            <td>{safeEndpoint.name}</td>

            {/* 第3列：Token/Key 切换 */}
            <td>
                {keysInfo && keysInfo.tokens && keysInfo.tokens.length > 1 && onSwitchKey ? (
                    <KeySelector
                        endpointName={safeEndpoint.name}
                        keyType="token"
                        keys={keysInfo.tokens}
                        onSwitch={onSwitchKey}
                    />
                ) : (
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            backgroundColor: 'var(--bg-color, #f8fafc)',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            borderRadius: '6px',
                            color: 'var(--text-muted, #64748b)',
                            fontWeight: '500',
                            width: '120px',
                            boxSizing: 'border-box'
                        }}
                    >
                        🔑 主 Key
                    </span>
                )}
            </td>

            {/* 第4列：端点URL */}
            <td>{safeEndpoint.url}</td>

            {/* 第5列：优先级编辑器 */}
            <td>
                <PriorityEditor
                    ref={priorityEditorRef}
                    priority={safeEndpoint.priority}
                    endpointName={safeEndpoint.name}
                    onUpdate={onUpdatePriority}
                />
            </td>

            {/* 第6列：组信息 (组名 + 组优先级) */}
            <td>{formatGroupInfo(safeEndpoint)}</td>

            {/* 第7列：响应时间 */}
            <td>{safeEndpoint.response_time}</td>

            {/* 第8列：最后检查时间 */}
            <td>{safeEndpoint.last_check}</td>

            {/* 第9列：操作按钮 */}
            <td>
                <ActionButtons
                    endpoint={safeEndpoint}
                    onHealthCheck={onHealthCheck}
                    onActivateGroup={onActivateGroup}
                    priorityEditorRef={priorityEditorRef}
                />
            </td>
        </tr>
    );
};

export default EndpointRow;