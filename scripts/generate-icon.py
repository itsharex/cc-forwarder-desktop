#!/usr/bin/env python3
# 生成符合 macOS 风格的应用图标（缩小版本，留边距）

from PIL import Image, ImageDraw
import math

def create_macos_icon():
    # 图标尺寸
    size = 1024
    # 内容区域缩放（留 8% 边距）
    scale = 0.84
    padding = int(size * (1 - scale) / 2)

    # 创建透明画布
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # macOS Big Sur 圆角半径 (22.37%)
    radius = int(size * 0.2237)

    # 1. 绘制渐变背景（紫色到蓝色）
    for y in range(size):
        ratio = y / size
        r = int(118 + (102 - 118) * ratio)
        g = int(75 + (126 - 75) * ratio)
        b = int(162 + (234 - 162) * ratio)

        for x in range(size):
            # 圆角矩形遮罩
            in_rect = True

            # 检查四个圆角
            if x < radius and y < radius:  # 左上角
                dx, dy = x - radius, y - radius
                if dx * dx + dy * dy > radius * radius:
                    in_rect = False
            elif x >= size - radius and y < radius:  # 右上角
                dx, dy = x - (size - radius), y - radius
                if dx * dx + dy * dy > radius * radius:
                    in_rect = False
            elif x < radius and y >= size - radius:  # 左下角
                dx, dy = x - radius, y - (size - radius)
                if dx * dx + dy * dy > radius * radius:
                    in_rect = False
            elif x >= size - radius and y >= size - radius:  # 右下角
                dx, dy = x - (size - radius), y - (size - radius)
                if dx * dx + dy * dy > radius * radius:
                    in_rect = False

            if in_rect:
                img.putpixel((x, y), (r, g, b, 255))

    # 2. 绘制顶部高光
    overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw_overlay = ImageDraw.Draw(overlay)
    draw_overlay.ellipse([112, 0, 912, 400], fill=(255, 255, 255, 25))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    # 3. 缩放后的绘制（留边距）
    center = size // 2

    # 左侧输入节点（缩小）
    node_offset_x = int(280 * scale)
    draw.ellipse([center - node_offset_x - 45, center - 45,
                  center - node_offset_x + 45, center + 45],
                 fill=(255, 255, 255, 100))
    draw.ellipse([center - node_offset_x - 30, center - 30,
                  center - node_offset_x + 30, center + 30],
                 fill=(255, 255, 255, 180))

    # 中心路由器方框（缩小）
    box_size = int(80 * scale)
    draw.rounded_rectangle([center - box_size, center - box_size,
                           center + box_size, center + box_size],
                          radius=int(30 * scale), fill=(255, 255, 255, 50))
    inner_box = int(60 * scale)
    draw.rounded_rectangle([center - inner_box, center - inner_box,
                           center + inner_box, center + inner_box],
                          radius=int(20 * scale), fill=(255, 255, 255, 240))

    # 转发箭头（缩小）
    arrow_scale = scale * 0.8
    arrow_points = [
        (center - int(30 * arrow_scale), center - int(10 * arrow_scale)),
        (center + int(10 * arrow_scale), center - int(10 * arrow_scale)),
        (center + int(10 * arrow_scale), center - int(30 * arrow_scale)),
        (center + int(50 * arrow_scale), center),
        (center + int(10 * arrow_scale), center + int(30 * arrow_scale)),
        (center + int(10 * arrow_scale), center + int(10 * arrow_scale)),
        (center - int(30 * arrow_scale), center + int(10 * arrow_scale)),
    ]
    draw.polygon(arrow_points, fill=(102, 126, 234, 255))

    # 右侧输出节点（3个，缩小）
    right_offset = int(280 * scale)
    node_radius = int(35 * scale)
    for offset in [int(-80 * scale), 0, int(80 * scale)]:
        draw.ellipse([center + right_offset - node_radius, center + offset - node_radius,
                     center + right_offset + node_radius, center + offset + node_radius],
                    fill=(255, 255, 255, 130))

    # 连接线（缩小）
    line_width = int(8 * scale)
    left_x = center - node_offset_x + 30
    right_x = center + right_offset - node_radius
    box_right = center + inner_box
    box_left = center - inner_box

    draw.line([(left_x, center), (box_left, center)],
             fill=(255, 255, 255, 150), width=line_width)
    draw.line([(box_right, center - int(40 * scale)), (right_x, center - int(80 * scale))],
             fill=(255, 255, 255, 150), width=line_width)
    draw.line([(box_right, center), (right_x, center)],
             fill=(255, 255, 255, 150), width=line_width)
    draw.line([(box_right, center + int(40 * scale)), (right_x, center + int(80 * scale))],
             fill=(255, 255, 255, 150), width=line_width)

    # 保存
    img.save('build/appicon.png', 'PNG')
    print(f"✅ macOS 风格图标生成完成: build/appicon.png ({size}x{size})")
    print(f"   缩放比例: {scale} (留 {int((1-scale)*100)}% 边距)")

if __name__ == '__main__':
    create_macos_icon()
