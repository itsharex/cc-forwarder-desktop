import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],

  // 开发服务器配置
  server: {
    port: 5174,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      // 代理 API 请求到 Go 后端
      '/api': {
        target: 'http://localhost:8011',
        changeOrigin: true,
      }
    }
  },

  // 构建配置
  build: {
    // 输出到 static/dist 目录（用于生产部署）
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,

    // Rollup 配置
    rollupOptions: {
      output: {
        // 手动分包
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'charts': ['recharts'],
          'icons': ['lucide-react']
        }
      }
    },

    // 优化配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    target: 'es2015',
    chunkSizeWarningLimit: 1000
  },

  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils')
    }
  },

  // CSS 配置
  css: {
    devSourcemap: true
  }
})
