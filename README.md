# HTML to MD Effectiveness

[English](#english) | [中文](#中文)

## English

Convert HTML files to clean Markdown in Obsidian — the reverse of MD to HTML Effectiveness.

### Features

- **Convert a single file** — run the command and pick any `.html` or `.htm` file in the vault, or convert the active HTML file directly.
- **Right-click conversion** — right-click an HTML file in the file explorer and choose **Convert HTML to Markdown**.
- **Multi-select conversion** — select several HTML files, right-click, and convert them together.
- **Batch convert folder** — convert all HTML files in the current folder.
- **Conversion support** — headings, bold, italic, strikethrough, inline code and code blocks, links, images, ordered and unordered lists, tables, blockquotes, and horizontal rules.
- **YAML frontmatter** — optional `title` and `source` metadata.
- **Overwrite protection** — existing `.md` files are skipped unless overwrite is enabled.
- **`.html` and `.htm`** are both supported.
- **Best with static HTML** — the plugin does not execute JavaScript; content generated dynamically by scripts may be missing. See [Limitations](#limitations).

### Limitations

Static HTML converts well; JavaScript-heavy pages are more challenging. The main limitations are:

- **No JavaScript execution** — conversion reads the HTML source only. Content inserted after page load by JavaScript (dynamic tables, lists, cards, counters, etc.) may be missing or incomplete.
- **Charts are not captured as images** — CSS/Canvas/WebGL/SVG charts are not rasterized. Inline SVG is removed during cleanup, and chart data rendered only by scripts is not available. To keep a chart, render the page in a browser, take a screenshot or export an image, then reference that image from the Markdown.
- **No network access** — remote images, fonts, scripts, and iframes are not downloaded. Image and link URLs are preserved as references.
- **Interactive layouts are flattened** — tabs, filters, accordions, and other UI state are not reproduced; only the HTML content available at conversion time is converted.
- **Pre-rendered HTML works best** — for JavaScript-heavy pages, open the page in Chrome/Edge, wait until it finishes rendering, save the rendered HTML, then convert that file. For simple cases, headless Chrome's `--dump-dom` output can be used.

### Requirements

- Obsidian 1.6.0 or later.

### Installation

#### From Obsidian Community Plugins

Settings → Community Plugins → Browse → Search "HTML to MD Effectiveness".

#### Manual / BRAT

1. Install [BRAT](https://obsidian.md/plugins?id=obsidian42-brat).
2. Add the repository: `yanqingwang/obsidian-html-to-md-effect`.

### Usage

1. Right-click an HTML file in the file explorer and choose **Convert HTML to Markdown**.
2. Or open the command palette and run **Convert HTML file to Markdown...**, then pick a file.
3. To convert several files, select them in the file explorer, right-click, and choose **Convert N HTML files to Markdown**.
4. To convert every HTML file in the current folder, open the command palette and run **Convert all HTML in folder to Markdown**.

The converted file is written next to the source file with the same base name and a `.md` extension.

### Settings

- **Overwrite existing .md files** — replace an existing Markdown file instead of skipping it.
- **Add YAML frontmatter** — add `title` and `source` fields to the converted file.

### Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
node test-convert.js
```

### Feedback

- GitHub Issues: https://github.com/yanqingwang/obsidian-html-to-md-effect/issues
- Email: 289631530@qq.com

Please include your Obsidian version, plugin version, a description or screenshot, and the expected result.

### License

MIT

Copyright (c) 2026 rosswang (Heart and Road Ltd)

## 中文

在 Obsidian 中将 HTML 文件转换为干净的 Markdown —— 与 MD to HTML Effectiveness 功能相反。

### 功能

- **单文件转换** —— 运行命令后选择库内任意 `.html` 或 `.htm` 文件，也可以直接转换当前打开的 HTML 文件。
- **右键转换** —— 在文件列表中右键点击 HTML 文件，选择 **Convert HTML to Markdown**。
- **多选转换** —— 选中多个 HTML 文件后右键，一次转换全部选中文件。
- **批量转换文件夹** —— 转换当前文件夹内的所有 HTML 文件。
- **转换支持** —— 标题、粗体、斜体、删除线、行内代码与代码块、链接、图片、有序/无序列表、表格、引用块和水平分割线。
- **YAML frontmatter** —— 可选添加 `title` 和 `source` 元数据。
- **覆盖保护** —— 默认跳过已存在的 `.md` 文件，可在设置中开启覆盖。
- **同时支持 `.html` 和 `.htm`**。
- **静态 HTML 效果最佳** —— 插件不执行 JavaScript，依赖脚本动态生成的内容可能缺失，详见[限制条件](#限制条件)。

### 限制条件

静态 HTML 转换效果较好；JavaScript 较重的页面存在一些挑战。主要限制如下：

- **不执行 JavaScript** —— 转换只读取 HTML 源码，不会运行页面脚本。由 JavaScript 在页面加载后动态生成的表格、列表、卡片、计数等内容可能缺失或不完整。
- **图表不会自动保存为图片** —— CSS/Canvas/WebGL/SVG 图表不会被截图或栅格化；内联 SVG 会在清理阶段被移除，仅由脚本生成的图表数据也无法读取。如需保留图表，请先在浏览器中渲染并截图（或导出图片），再在 Markdown 中引用。
- **不访问网络** —— 远程图片、字体、脚本和 iframe 不会被下载；图片和链接地址会作为引用保留。
- **交互式布局会被扁平化** —— 标签页、筛选器、折叠面板等交互状态不会还原，只转换转换时 HTML 中实际存在的内容。
- **预渲染后的 HTML 效果最佳** —— 对 JavaScript 较重的页面，建议先用 Chrome/Edge 打开，等待渲染完成，另存为渲染后的 HTML，再转换该文件；简单场景也可以使用无头 Chrome 的 `--dump-dom` 输出。

### 系统要求

- Obsidian 1.6.0 或更高版本。

### 安装

#### 从 Obsidian 社区插件安装

设置 → 社区插件 → 浏览 → 搜索 "HTML to MD Effectiveness"。

#### 手动安装 / BRAT

1. 安装 [BRAT](https://obsidian.md/plugins?id=obsidian42-brat)。
2. 添加仓库：`yanqingwang/obsidian-html-to-md-effect`。

### 使用

1. 在文件列表中右键点击 HTML 文件，选择 **Convert HTML to Markdown**。
2. 或打开命令面板，运行 **Convert HTML file to Markdown...**，然后选择文件。
3. 如需转换多个文件，在文件列表中多选后右键，选择 **Convert N HTML files to Markdown**。
4. 如需转换当前文件夹内的全部 HTML 文件，运行 **Convert all HTML in folder to Markdown**。

转换后的文件会写在源文件旁边，文件名相同，扩展名为 `.md`。

### 设置

- **Overwrite existing .md files** —— 覆盖已存在的 Markdown 文件，而不是跳过。
- **Add YAML frontmatter** —— 为转换结果添加 `title` 和 `source` 字段。

### 开发

```bash
npm install
npm run dev    # 监听模式
npm run build  # 生产构建
node test-convert.js
```

### 问题反馈

- GitHub Issues：https://github.com/yanqingwang/obsidian-html-to-md-effect/issues
- 邮箱：289631530@qq.com

请尽量提供 Obsidian 版本、插件版本、问题描述或截图，以及预期结果。

### 许可证

MIT

Copyright (c) 2026 rosswang (Heart and Road Ltd)
