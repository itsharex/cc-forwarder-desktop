#!/bin/bash
# 打包 Windows 发布版本（包含所有必需文件）

VERSION="5.0.1"
DIST_DIR="build/dist/CC-Forwarder-Windows-v${VERSION}"

echo "📦 打包 Windows 发布版本..."

# 1. 创建发布目录
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 2. 复制可执行文件
cp build/bin/CC-Forwarder.exe "$DIST_DIR/"
echo "  ✅ 复制可执行文件"

# 3. 创建配置目录和示例配置
mkdir -p "$DIST_DIR/config"
cp config/example.yaml "$DIST_DIR/config/config.yaml"
echo "  ✅ 复制配置文件"

# 4. 创建数据目录（用于数据库）
mkdir -p "$DIST_DIR/data"
echo "  ✅ 创建数据目录"

# 5. 创建日志目录
mkdir -p "$DIST_DIR/logs"
echo "  ✅ 创建日志目录"

# 6. 创建 README
cat > "$DIST_DIR/README.txt" << 'EOT'
CC-Forwarder v5.0.1 - Windows 版本
====================================

## 快速开始

1. 双击 CC-Forwarder.exe 启动应用
2. 首次启动会自动创建数据库和日志文件
3. 打开设置页面配置端点信息

## 配置文件

配置文件位于: config/config.yaml
请根据需要修改端点配置

## 数据文件

- 数据库: data/usage.db (自动创建)
- 日志文件: logs/app.log (自动创建)

## 系统要求

- Windows 10/11 (64位)
- WebView2 运行时 (Windows 11自带)
  如果提示缺少 WebView2，请访问:
  https://developer.microsoft.com/microsoft-edge/webview2/

## 故障排查

如果双击没反应:
1. 右键 CC-Forwarder.exe → 属性 → 解除锁定
2. 在 cmd 中运行查看错误信息:
   .\CC-Forwarder.exe

## 支持

GitHub: https://github.com/your-repo/cc-forwarder
EOT
echo "  ✅ 创建 README"

# 7. 压缩为 ZIP
cd build/dist
zip -r "CC-Forwarder-Windows-v${VERSION}.zip" "CC-Forwarder-Windows-v${VERSION}"
cd ../..

echo ""
echo "✅ Windows 发布包创建完成！"
echo "📍 位置: $DIST_DIR"
echo "📦 压缩包: build/dist/CC-Forwarder-Windows-v${VERSION}.zip"
echo ""
ls -lh "$DIST_DIR"
echo ""
ls -lh "build/dist/CC-Forwarder-Windows-v${VERSION}.zip"
