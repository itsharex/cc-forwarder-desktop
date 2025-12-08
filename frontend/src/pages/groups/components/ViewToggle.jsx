// ============================================
// ViewToggle - 视图切换组件
// 2025-12-01
// ============================================

import { LayoutGrid, List as ListIcon } from 'lucide-react';

const ViewToggle = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="bg-white p-1 rounded-lg border border-gray-200 flex items-center shadow-sm">
      <button
        onClick={() => onViewModeChange('grid')}
        className={`p-2 rounded-md transition-all ${
          viewMode === 'grid'
            ? 'bg-gray-100 text-gray-900 shadow-sm'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`}
        title="网格视图"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={`p-2 rounded-md transition-all ${
          viewMode === 'list'
            ? 'bg-gray-100 text-gray-900 shadow-sm'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`}
        title="列表视图"
      >
        <ListIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ViewToggle;
