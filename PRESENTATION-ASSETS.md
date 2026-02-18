# 演示资产总览

本项目包含多个专业级演示文稿素材，适用于不同场景。

## 📁 可用资产

### 1. 技术架构图 (SVG)

**文件**: `architecture-dual-mode.svg`  
**预览**: `architecture-preview.html`  
**格式**: SVG (矢量图, 11 KB)  
**尺寸**: 1920×1080 (16:9)  

**适用场景**:
- 技术文档配图
- 开发团队内部培训
- 架构评审演示
- GitHub README 嵌入

**特点**:
- PPT 风格设计
- 双模式流程清晰展示
- Material Design 配色
- 可缩放无损

---

### 2. 产品介绍图 (SVG)

**文件**: `product-overview.svg`  
**预览**: `product-overview-preview.html`  
**格式**: SVG (矢量图, 8.2 KB)  
**尺寸**: 1920×1080 (16:9)  

**适用场景**:
- 产品介绍演示
- 投资人汇报
- 营销宣传材料
- 社交媒体配图

**特点**:
- 商业汇报风格
- 三大核心功能卡片
- 紫色渐变专业配色
- 数据亮点展示 (节省 2 小时 · 95%+ 准确率)

---

### 3. README PPT 幻灯片 - 标准版 (PNG)

**文件**: `readme-ppt-slide.png`  
**预览**: `readme-ppt-preview.html`  
**格式**: PNG (位图, 563 KB)  
**尺寸**: 1920×1080 (Full HD)  
**生成器**: Gemini 2.5 Flash Image (AI 生成)

**适用场景**:
- 技术分享演示
- 内部培训材料
- 详细功能介绍
- 开发团队汇报

**特点**:
- AI 生成，内容全面
- 三列布局 (核心功能 | AI 评分 | 技术特性)
- 明亮紫色渐变背景
- 包含 README 所有核心信息
- 直接可用于 PPT，无需编辑

---

### 4. README PPT 幻灯片 - 高级版 (PNG) ⭐

**文件**: `readme-ppt-premium.png`  
**预览**: `readme-ppt-comparison.html`  
**格式**: PNG (位图, 606 KB)  
**尺寸**: 1920×1080 (Full HD)  
**生成器**: Gemini 2.5 Flash Image (AI 生成)

**适用场景**:
- 投资人演示汇报
- 高层管理层汇报
- 产品发布会
- 社交媒体宣传
- 营销推广材料

**特点**:
- 奢华商务风格设计
- 深色紫蓝渐变背景 (#5B4FFF → #0F0F1E)
- 玻璃态 (Glass-morphism) 卡片效果
- 金色装饰元素
- 全中文内容展示
- Fortune 500 级别演示质量
- 精炼核心卖点，信息层次清晰

---

## 🎯 快速选择指南

| 使用场景 | 推荐资产 | 理由 |
|---------|---------|------|
| **GitHub README** | `architecture-dual-mode.svg` 或 `product-overview.svg` | SVG 矢量图，自适应宽度 |
| **投资人演示** | `product-overview.svg` + `readme-ppt-slide.png` | 商业风格 + 详细内容 |
| **技术分享** | `architecture-dual-mode.svg` + `readme-ppt-slide.png` | 架构清晰 + 功能全面 |
| **社交媒体** | `product-overview.svg` | 视觉吸引力强，信息密度适中 |
| **打印材料** | `readme-ppt-slide.png` | 高分辨率位图 |
| **在线文档** | 所有 SVG 文件 | 加载快，缩放无损 |

---

## 🚀 使用方式

### 在 README 中嵌入

```markdown
# 产品介绍图
![X AI Topic Selector](product-overview.svg)

# 技术架构图
![Dual-Mode Architecture](architecture-dual-mode.svg)

# 详细功能展示（需要先提交 PNG）
![README PPT](readme-ppt-slide.png)
```

### 导入到 PowerPoint/Keynote

**方法 1: 直接插入 PNG**
- PowerPoint: `插入 → 图片 → 此设备` → 选择 `readme-ppt-slide.png`
- Keynote: 直接拖拽 PNG 到幻灯片
- Google Slides: `插入 → 图片 → 上传`

**方法 2: 插入 SVG（支持缩放）**
- 将 SVG 拖入幻灯片
- 调整大小不会失真
- 推荐用于需要自定义尺寸的场景

### 导出 SVG 为 PNG（如果需要）

```bash
# 使用 rsvg-convert (需安装 librsvg)
rsvg-convert -w 1920 -h 1080 product-overview.svg -o product-overview.png

# 使用 macOS Preview
open -a Preview product-overview.svg
# → 文件 → 导出 → PNG (设置 DPI 为 192)

# 使用 ImageMagick
convert -density 192 product-overview.svg product-overview.png
```

---

## 🔄 修改已生成的图片

### 修改 AI 生成的 PNG

如果需要调整 `readme-ppt-slide.png` 的内容：

```typescript
// 在 Claude 中执行
nano-banana_continue_editing("修改请求，例如：
- 将背景改为蓝色渐变
- 调整标题字号更大
- 添加公司 Logo
")
```

### 修改 SVG 文件

SVG 是文本文件，可以直接编辑：

```bash
# 在代码编辑器中打开
code product-overview.svg

# 或使用专业工具
# - Adobe Illustrator
# - Figma (导入 SVG)
# - Inkscape (开源)
```

---

## 📊 文件对比

| 特性 | SVG | PNG |
|------|-----|-----|
| **文件大小** | 8-11 KB | 563 KB |
| **缩放性** | ✅ 无损缩放 | ❌ 缩放会模糊 |
| **编辑性** | ✅ 文本可编辑 | ❌ 需图像编辑器 |
| **兼容性** | ⚠️ 部分老工具不支持 | ✅ 全平台支持 |
| **加载速度** | ✅ 快 | ⚠️ 较慢 |
| **打印质量** | ✅ 完美 | ✅ 好 (高分辨率) |
| **动画支持** | ✅ 支持 | ❌ 不支持 |

**推荐策略**:
- **在线展示**: 优先使用 SVG
- **PPT 演示**: PNG 更稳定
- **打印材料**: PNG (确保分辨率 ≥ 300 DPI)
- **GitHub README**: SVG (自适应宽度)

---

## 🎨 定制建议

### 配色方案调整

当前使用紫色主题，如需更换：

**企业蓝** (科技公司):
```css
/* 替换 SVG 中的渐变 */
#667eea → #2196f3  /* 紫色 → 蓝色 */
#764ba2 → #1565c0  /* 深紫 → 深蓝 */
```

**商务绿** (环保/健康):
```css
#667eea → #4caf50
#764ba2 → #2e7d32
```

**活力橙** (创意/热情):
```css
#667eea → #ff9800
#764ba2 → #ef6c00
```

### 字体调整

SVG 使用 `Segoe UI` 字体，如需更换：
- 在 SVG 中全局替换 `font-family="Segoe UI"`
- 常用替代: `Arial`, `Helvetica`, `Roboto`, `Source Sans Pro`

---

## 📝 版本历史

### v1.2.0 (2025-02-18)

- ✅ 创建技术架构图 (SVG)
- ✅ 创建产品介绍图 (SVG)
- ✅ AI 生成 README PPT 幻灯片 (PNG)
- ✅ 创建预览页面 (HTML × 3)
- ✅ 创建本总览文档

**生成工具**:
- SVG: 手工编码 (professional design)
- PNG: Gemini 2.5 Flash Image (AI-powered)

---

## 📞 技术支持

如需调整或生成新的演示资产，请在 Claude 中使用以下命令：

```bash
# 查看 AI 图片生成配置
nano-banana_get_configuration_status

# 生成新图片
nano-banana_generate_image("详细描述...")

# 修改现有图片
nano-banana_continue_editing("修改要求...")

# 查看最后生成的图片
nano-banana_get_last_image_info
```

---

**All assets are ready for professional use! 🚀**
