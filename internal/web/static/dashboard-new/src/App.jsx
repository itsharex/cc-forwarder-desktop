// ============================================
// 主 App 组件 - Dashboard 入口
// 2025-11-28
// ============================================

import { useState, Suspense, lazy } from 'react';
import Header from '@components/layout/Header.jsx';
import { LoadingSpinner } from '@components/ui';
import useSSE from '@hooks/useSSE.js';

// 懒加载页面组件
const OverviewPage = lazy(() => import('@pages/overview/index.jsx'));
const EndpointsPage = lazy(() => import('@pages/endpoints/index.jsx'));
// v4.0: 组管理页面已移除，配置简化后不再需要独立的组管理功能
// const GroupsPage = lazy(() => import('@pages/groups/index.jsx'));
const RequestsPage = lazy(() => import('@pages/requests/index.jsx'));
const ConfigPage = lazy(() => import('@pages/config/index.jsx'));

// ============================================
// App 组件
// ============================================

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  // SSE 连接状态（用于全局状态指示）
  const { connectionStatus } = useSSE(() => {}, { events: 'status' });

  // 渲染当前页面
  const renderPage = () => {
    const pages = {
      overview: <OverviewPage />,
      endpoints: <EndpointsPage />,
      // v4.0: 组管理页面已移除
      // groups: <GroupsPage />,
      requests: <RequestsPage />,
      config: <ConfigPage />
    };

    return pages[activeTab] || <OverviewPage />;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-900 pb-20">
      {/* 背景纹理 */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* 顶部导航 */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connectionStatus={connectionStatus}
      />

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-6 pt-8 relative z-10">
        <Suspense fallback={<LoadingSpinner text="加载页面..." />}>
          {renderPage()}
        </Suspense>
      </main>
    </div>
  );
}

export default App;
