#!/bin/bash
# 刷新 macOS 应用图标缓存

echo "🔄 刷新 macOS 图标缓存..."

# 1. 清理 Wails 构建缓存
rm -rf build/darwin
echo "  ✅ 清理 Wails 构建缓存"

# 2. 清理 macOS 图标缓存
rm -rf ~/Library/Caches/com.apple.iconservices.store
killall Dock 2>/dev/null
killall Finder 2>/dev/null
echo "  ✅ 清理 macOS 图标缓存并重启 Dock"

# 3. 触摸图标文件更新时间戳
touch build/appicon.png
echo "  ✅ 更新图标时间戳"

echo ""
echo "✅ 图标缓存刷新完成！"
echo "💡 请重新运行: wails dev"
