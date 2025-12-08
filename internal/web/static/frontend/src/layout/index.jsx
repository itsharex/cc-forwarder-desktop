// React布局系统入口文件 - 组件导出
// 创建日期: 2025-11-27
//
// 此文件只导出 React 组件，符合 react-refresh/only-export-components 最佳实践
// Hooks 和工具函数请从 ./utils.js 导入

import App from './App.jsx';
import Header from './components/Header.jsx';
import Navigation from './components/Navigation.jsx';
import MainContent from './components/MainContent.jsx';
import ConnectionIndicator from './components/ConnectionIndicator.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AppStateProvider } from './hooks/useAppState.jsx';

// 导出主应用组件
export default App;

// 导出所有布局组件（仅组件，不包含 hooks）
export {
    App,
    Header,
    Navigation,
    MainContent,
    ConnectionIndicator,
    ErrorBoundary,
    AppStateProvider, // Provider 是组件，可以导出
};