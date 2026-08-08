# HTML to MD Effectiveness

Convert HTML files to clean Markdown in Obsidian — the reverse of MD to HTML Effectiveness.

在 Obsidian 中将 HTML 文件转换为干净的 Markdown —— 与 MD to HTML Effectiveness 功能相反。

## Features / 功能

- **Convert HTML file to Markdown** — Open any `.html` file and run the command / 将 HTML 文件转换为 Markdown —— 打开任意 `.html` 文件并运行命令
- **Batch convert folder** — Convert all `.html` files in the current folder at once / 批量转换文件夹 —— 一次转换当前文件夹内所有 `.html` 文件
- **Full conversion support / 完整转换支持**:
  - Headings (h1-h6) / 标题（h1-h6）
  - Bold, italic, strikethrough / 粗体、斜体、删除线
  - Inline code and code blocks (with language preservation) / 行内代码和代码块（保留语言）
  - Links and images / 链接和图片
  - Ordered and unordered lists (including nested) / 有序和无序列表（含嵌套）
  - Tables (pipe table format) / 表格（管道表格格式）
  - Blockquotes / 引用块
  - Horizontal rules / 水平分割线
- **YAML frontmatter** — Optional title/source metadata / 可选的标题/来源元数据
- **Overwrite protection** — Skip existing `.md` files (configurable) / 覆盖保护 —— 跳过已存在的 `.md` 文件（可配置）

## Commands / 命令

| Command / 命令 | Description / 说明 |
|---------|-------------|
| Convert HTML file to Markdown | Convert active `.html` file to `.md` / 将当前 `.html` 文件转换为 `.md` |
| Convert all HTML in folder to Markdown | Batch convert all `.html` in current folder / 批量转换当前文件夹内所有 `.html` |

## Installation / 安装

### From Obsidian Community Plugins / 从 Obsidian 社区插件安装

Settings → Community Plugins → Browse → Search "HTML to MD Effectiveness"

设置 → 社区插件 → 浏览 → 搜索 "HTML to MD Effectiveness"

### Manual / BRAT / 手动安装 / BRAT

1. Install [BRAT](https://obsidian.md/plugins?id=obsidian42-brat) / 安装 BRAT
2. Add repository: `yanqingwang/obsidian-html-to-md-effect` / 添加仓库：`yanqingwang/obsidian-html-to-md-effect`

## Development / 开发

```bash
cd html-to-md-effect-plugin
npm install
npm run dev    # watch mode / 监听模式
npm run build  # production build / 生产构建
```

## Testing / 测试

```bash
node test-convert.js
```

## License / 许可证

MIT

Copyright (c) 2026 rosswang (Heart and Road Ltd)
