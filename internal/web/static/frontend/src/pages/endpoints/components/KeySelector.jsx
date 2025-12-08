/**
 * Key 选择器组件
 * 用于显示和切换端点的 Token/API Key
 *
 * 创建日期: 2025-11-26
 * 更新日期: 2025-11-26 (优化样式以匹配项目整体风格)
 * @author Claude Code Assistant
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Key 选择器组件
 * @param {Object} props 组件属性
 * @param {string} props.endpointName 端点名称
 * @param {string} props.keyType 'token' | 'api_key'
 * @param {Array} props.keys Key 列表 [{index, name, masked, is_active}]
 * @param {Function} props.onSwitch 切换回调 (endpointName, keyType, index) => Promise
 * @param {boolean} props.disabled 是否禁用
 */
const KeySelector = ({
    endpointName,
    keyType = 'token',
    keys = [],
    onSwitch,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [switching, setSwitching] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, dropUp: false });
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    // 找到当前激活的 Key
    const activeKey = keys.find(k => k.is_active) || keys[0];

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleScroll = () => {
            if (isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    // 计算菜单位置
    const calculateMenuPosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const menuHeight = Math.min(keys.length * 52 + 40, 250);
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropUp = spaceBelow < menuHeight;

            setMenuPosition({
                top: dropUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
                left: rect.left,
                dropUp
            });
        }
    };

    // 如果只有一个 Key 或没有 Key，只显示标签
    if (keys.length <= 1) {
        if (!activeKey) return null;
        return (
            <span
                className="key-badge key-single"
                title={activeKey.masked}
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
                🔑 {activeKey.name || '主 Key'}
            </span>
        );
    }

    const handleSwitch = async (index) => {
        if (switching || index === activeKey?.index) {
            setIsOpen(false);
            return;
        }

        setSwitching(true);
        try {
            await onSwitch(endpointName, keyType, index);
            setIsOpen(false);
        } catch (error) {
            console.error('Key 切换失败:', error);
            alert('Key 切换失败: ' + (error.message || '未知错误'));
        } finally {
            setSwitching(false);
        }
    };

    const displayName = activeKey?.name || `Key ${(activeKey?.index || 0) + 1}`;

    return (
        <div
            ref={dropdownRef}
            style={{ position: 'relative', display: 'inline-block' }}
        >
            {/* 触发按钮 - 匹配 .chart-controls button 样式 */}
            <button
                ref={buttonRef}
                onClick={() => {
                    if (!disabled && !switching) {
                        if (!isOpen) {
                            calculateMenuPosition();
                        }
                        setIsOpen(!isOpen);
                    }
                }}
                disabled={disabled || switching}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px 6px 10px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: switching ? 'var(--bg-color, #f8fafc)' : 'var(--card-bg, #ffffff)',
                    border: `1px solid ${isOpen ? 'var(--primary-color, #2563eb)' : 'var(--border-color, #e2e8f0)'}`,
                    borderRadius: '6px',
                    cursor: disabled || switching ? 'not-allowed' : 'pointer',
                    color: isOpen ? 'var(--primary-color, #2563eb)' : 'var(--text-color, #1e293b)',
                    transition: 'all 0.2s ease',
                    opacity: disabled || switching ? 0.5 : 1,
                    width: '120px',
                    boxSizing: 'border-box'
                }}
                title={`${displayName} - ${activeKey?.masked || ''}`}
                onMouseEnter={(e) => {
                    if (!disabled && !switching && !isOpen) {
                        e.currentTarget.style.borderColor = 'var(--primary-color, #2563eb)';
                        e.currentTarget.style.color = 'var(--primary-color, #2563eb)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isOpen) {
                        e.currentTarget.style.borderColor = 'var(--border-color, #e2e8f0)';
                        e.currentTarget.style.color = 'var(--text-color, #1e293b)';
                    }
                }}
            >
                <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    overflow: 'hidden',
                    minWidth: 0
                }}>
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>🔑</span>
                    <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0
                    }}>{switching ? '切换中...' : displayName}</span>
                </span>
                <span style={{
                    fontSize: '10px',
                    flexShrink: 0,
                    transition: 'transform 0.2s ease',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>▼</span>
            </button>

            {/* 下拉菜单 - 使用 fixed 定位避免被父容器裁剪 */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                        minWidth: '220px',
                        maxHeight: '250px',
                        overflowY: 'auto',
                        backgroundColor: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        borderRadius: '8px',
                        boxShadow: menuPosition.dropUp
                            ? '0 -4px 12px rgba(0, 0, 0, 0.15)'
                            : '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 9999
                    }}
                >
                    {/* 下拉菜单头部 */}
                    <div style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--border-color, #e2e8f0)',
                        backgroundColor: 'var(--bg-color, #f8fafc)',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: 'var(--text-muted, #64748b)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        选择 Token
                    </div>

                    {keys.map((key, idx) => (
                        <div
                            key={key.index}
                            onClick={() => handleSwitch(key.index)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                cursor: key.is_active ? 'default' : 'pointer',
                                backgroundColor: key.is_active ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                                borderBottom: idx < keys.length - 1 ? '1px solid var(--border-color, #e2e8f0)' : 'none',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (!key.is_active) {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-color, #f8fafc)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = key.is_active ? 'rgba(37, 99, 235, 0.08)' : 'transparent';
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontWeight: key.is_active ? '600' : '500',
                                    color: key.is_active ? 'var(--primary-color, #2563eb)' : 'var(--text-color, #1e293b)',
                                    fontSize: '13px',
                                    marginBottom: '2px'
                                }}>
                                    {key.name || `Key ${key.index + 1}`}
                                </div>
                                <div style={{
                                    fontFamily: 'Monaco, Consolas, monospace',
                                    fontSize: '11px',
                                    color: 'var(--text-muted, #64748b)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {key.masked}
                                </div>
                            </div>
                            {key.is_active && (
                                <span style={{
                                    backgroundColor: 'var(--success-color, #10b981)',
                                    color: 'white',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px',
                                    marginLeft: '8px',
                                    flexShrink: 0
                                }}>
                                    当前
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KeySelector;
