# HTML to MD Effectiveness

Convert HTML files to clean Markdown in Obsidian — the reverse of MD to HTML Effectiveness.

## Features

- **Convert HTML file to Markdown** — Open any `.html` file and run the command
- **Batch convert folder** — Convert all `.html` files in the current folder at once
- **Full conversion support**:
  - Headings (h1-h6)
  - Bold, italic, strikethrough
  - Inline code and code blocks (with language preservation)
  - Links and images
  - Ordered and unordered lists (including nested)
  - Tables (pipe table format)
  - Blockquotes
  - Horizontal rules
- **YAML frontmatter** — Optional title/source metadata
- **Overwrite protection** — Skip existing `.md` files (configurable)

## Commands

| Command | Description |
|---------|-------------|
| Convert HTML file to Markdown | Convert active `.html` file to `.md` |
| Convert all HTML in folder to Markdown | Batch convert all `.html` in current folder |

## Installation

### From Obsidian Community Plugins

Settings → Community Plugins → Browse → Search "HTML to MD Effectiveness"

### Manual / BRAT

1. Install [BRAT](https://obsidian.md/plugins?id=obsidian42-brat)
2. Add repository: `yanqingwang/obsidian-html-to-md-effect`

## Development

```bash
cd html-to-md-effect-plugin
npm install
npm run dev    # watch mode
npm run build  # production build
```

## Testing

```bash
node test-convert.js
```

## License

MIT

Copyright (c) 2026 rosswang (Heart and Road Ltd)
