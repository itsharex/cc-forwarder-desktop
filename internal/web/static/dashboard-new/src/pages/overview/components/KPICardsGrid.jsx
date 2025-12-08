// ============================================
// KPI 卡片网格组件
// 2025-11-28
// ============================================

import {
  Zap,
  Clock,
  Server,
  Network,
  Layers
} from 'lucide-react';
import { KPICard } from '@components/ui';
import { formatNumber } from '@utils/api.js';

const KPICardsGrid = ({ data }) => {
  const { status, endpoints, connections, groups } = data;

  const activeGroup = groups.groups?.find(g => g.is_active);
  const activeGroupText = activeGroup
    ? `${activeGroup.name} (${activeGroup.healthy_endpoints || 0}/${activeGroup.total_endpoints || 0} 健康)`
    : '无活跃组';

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <KPICard
        title="服务状态"
        value={status.status === 'running' ? '运行中' : '已停止'}
        icon={Zap}
        statusColor={status.status === 'running' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}
      />
      <KPICard
        title="运行时间"
        value={status.uptime || '加载中...'}
        icon={Clock}
        statusColor="bg-blue-50 text-blue-600"
      />
      <KPICard
        title="端点数量"
        value={endpoints.total || 0}
        icon={Server}
        statusColor="bg-indigo-50 text-indigo-600"
      />
      <KPICard
        title="总请求数"
        value={formatNumber(connections.total_requests || 0)}
        icon={Network}
        statusColor="bg-purple-50 text-purple-600"
      />
      <KPICard
        title="当前活动组"
        value={activeGroupText}
        icon={Layers}
        statusColor="bg-orange-50 text-orange-600"
      />
    </div>
  );
};

export default KPICardsGrid;
