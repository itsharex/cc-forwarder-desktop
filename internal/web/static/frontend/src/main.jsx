/**
 * Vite 前端项目主入口
 * Claude Request Forwarder - Web 界面
 *
 * 创建日期: 2025-11-27
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './layout/App.jsx'

// 导入 CSS - 顺序很重要！
// 1. 首先是全局样式重置
import './index.css'
// 2. 然后是项目核心样式
import './css/style.css'
import './css/layout.css'
import './css/requests-react.css'

// 挂载 React 应用
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
