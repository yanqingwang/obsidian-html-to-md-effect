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
