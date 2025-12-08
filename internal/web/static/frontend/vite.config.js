import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // 开发服务器配置
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0', // 允许外部访问
    proxy: {
      // 代理 API 请求到 Go 后端
      '/api': {
        target: 'http://localhost:8010',
        changeOrigin: true,
      },
      // 代理静态资源（开发时仍可访问原有的静态文件）
      '/static/css': {
        target: 'http://localhost:8010',
        changeOrigin: true,
      }
    }
  },

  // 构建配置
  build: {
    // 输出到 static/dist 目录
    outDir: '../dist',
    emptyOutDir: true,

    // 资源处理
    assetsDir: 'assets',

    // 生成 sourcemap 用于调试
    sourcemap: false,

    // Rollup 配置
    rollupOptions: {
      output: {
        // 手动分包
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'chart': ['chart.js']
        }
      }
    },

    // 优化配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console
        drop_debugger: true
      }
    },

    // 兼容性目标
    target: 'es2015',

    // chunk 大小警告限制
    chunkSizeWarningLimit: 1000
  },

  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@layout': path.resolve(__dirname, './src/layout'),
      '@utils': path.resolve(__dirname, './src/utils')
    }
  },

  // CSS 配置
  css: {
    devSourcemap: true
  }
})
