import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, TFolder, FuzzySuggestModal } from 'obsidian';

const HTML_EXTENSIONS = new Set(['html', 'htm']);

function isHtmlFile(file: unknown): file is TFile {
	return file instanceof TFile && HTML_EXTENSIONS.has(file.extension.toLowerCase());
}

function getHtmlFiles(app: App): TFile[] {
	return app.vault.getFiles()
		.filter(isHtmlFile)
		.sort((a, b) => a.path.localeCompare(b.path));
}

// ── HTML Entity Decoding ──
const ENTITY_MAP: Record<string, string> = {
	'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
	'&#39;': "'", '&#x60;': '`', '&nbsp;': ' ', '&mdash;': '—',
	'&ndash;': '–', '&hellip;': '…', '&copy;': '©', '&reg;': '®',
	'&trade;': '™', '&bull;': '•', '&deg;': '°', '&plusmn;': '±',
	'&sect;': '§', '&laquo;': '«', '&raquo;': '»', '&middot;': '·',
	'&times;': '×', '&divide;': '÷', '&pound;': '£', '&euro;': '€',
	'&yen;': '¥', '&cent;': '¢', '&para;': '¶', '&brvbar;': '¦',
	'&acute;': '´', '&cedil;': '¸', '&macr;': '¯', '&uml;': '¨',
};

function decodeEntities(s: string): string {
	let r = s;
	for (const [ent, ch] of Object.entries(ENTITY_MAP)) {
		r = r.replace(new RegExp(ent.replace('&', '&'), 'g'), ch);
	}
	r = r.replace(/&#(\d+);/g, (_m: string, n: string): string => String.fromCharCode(parseInt(n)));
	r = r.replace(/&#x([0-9a-fA-F]+);/g, (_m: string, h: string): string => String.fromCharCode(parseInt(h, 16)));
	return r;
}

// ── Inline Conversion ──
function convertInline(html: string): string {
	let s = html;
	// Images first (before links, since ![] is a subset of [])
	s = s.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
	s = s.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)');
	s = s.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
	// Links
	s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
	// Bold/strong
	s = s.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
	s = s.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
	// Italic/emphasis
	s = s.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
	s = s.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');
	// Strikethrough
	s = s.replace(/<del>([\s\S]*?)<\/del>/gi, '~~$1~~');
	s = s.replace(/<s>([\s\S]*?)<\/s>/gi, '~~$1~~');
	// Inline code
	s = s.replace(/<code>([\s\S]*?)<\/code>/gi, (_m: string, c: string): string => '`' + c.replace(/`/g, '\\`') + '`');
	// Line breaks
	s = s.replace(/<br\s*\/?>/gi, '\n');
	return s;
}

// ── Extract Body ──
function extractBody(html: string): string {
	let s = html;
	// Remove DOCTYPE
	s = s.replace(/<!DOCTYPE[^>]*>/i, '');
	// Remove XML declarations
	s = s.replace(/<\?xml[^>]*\?>/gi, '');
	// Remove <!-- comments -->
	s = s.replace(/<!--[\s\S]*?-->/g, '');
	// Remove <html> and </html>
	s = s.replace(/<\/?html[^>]*>/gi, '');
	// Remove <head>...</head>, including a head tag with attributes
	s = s.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');
	// Remove scripts, styles, and noscript blocks so their code/text never reaches Markdown
	s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
	s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
	s = s.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
	// Remove inline SVG; without a rasterizer its markup is not useful Markdown
	s = s.replace(/<svg\b[\s\S]*?<\/svg>/gi, '');
	// Extract body content
	const bodyMatch = s.match(/<body[^>]*>([\s\S]*)<\/body>/i);
	if (bodyMatch) return bodyMatch[1];
	return s;
}

// ── Table Conversion ──
function tableToMd(tableHtml: string): string {
	const lines: string[] = [];
	let firstRow = true;

	// Parse all <tr> rows (handle both wrapped in thead/tbody and bare)
	const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
	let rowMatch: RegExpExecArray | null;
	while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
		const cells = extractTableCells(rowMatch[1]);
		if (cells.length === 0) continue;

		if (firstRow) {
			lines.push('| ' + cells.join(' | ') + ' |');
			lines.push('| ' + cells.map(() => '---').join(' | ') + ' |');
			firstRow = false;
		} else {
			lines.push('| ' + cells.join(' | ') + ' |');
		}
	}

	return lines.join('\n');
}

function extractTableCells(rowHtml: string): string[] {
	const cells: string[] = [];
	const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
	let match: RegExpExecArray | null;
	while ((match = cellRegex.exec(rowHtml)) !== null) {
		cells.push(convertInline(decodeEntities(match[1].trim())));
	}
	return cells;
}

// ── List Conversion ──
function listToMd(listHtml: string, indent: string = ''): string {
	const lines: string[] = [];
	const isOrdered = /<ol[^>]*>/i.test(listHtml);
	let counter = 1;
	// Match <li> accounting for nested list tags (track depth)
	const itemRegex = /<li[^>]*>/gi;
	let liMatch: RegExpExecArray | null;
	itemRegex.lastIndex = 0;
	while ((liMatch = itemRegex.exec(listHtml)) !== null) {
		let depth = 1;
		let idx = liMatch.index + liMatch[0].length;
		// Find matching </li> accounting for nested <li> tags
		while (depth > 0 && idx < listHtml.length) {
			const nextLi = listHtml.indexOf('<li', idx);
			const nextEnd = listHtml.indexOf('</li>', idx);
			if (nextEnd === -1) break;
			if (nextLi !== -1 && nextLi < nextEnd) {
				depth++;
				idx = nextLi + 3;
			} else {
				depth--;
				idx = nextEnd + 5;
			}
		}
		let content = listHtml.slice(liMatch.index + liMatch[0].length, idx - 5).trim();
		const prefix = isOrdered ? `${counter}.` : '-';
		// Check for nested lists (handle all occurrences)
		let nested = '';
		let prevContent = '';
		while (prevContent !== content) {
			prevContent = content;
			const nestedUl = content.match(/<ul[\s\S]*?<\/ul>/i);
			const nestedOl = content.match(/<ol[\s\S]*?<\/ol>/i);
			if (!nestedUl && !nestedOl) break;
			const nm = nestedUl || nestedOl;
			if (nm) {
				nested += '\n' + listToMd(nm[0], indent + '  ');
				content = content.replace(nm[0], '');
			}
		}
		const text = convertInline(decodeEntities(content.trim()));
		lines.push(indent + prefix + ' ' + text + nested);
		counter++;
	}
	return lines.join('\n');
}

// ── Blockquote Conversion ──
function blockquoteToMd(html: string): string {
	return html
		.replace(/<\/?blockquote[^>]*>/gi, '')
		.split('\n')
		.map(l => l.trim() ? '> ' + l : '>')
		.join('\n');
}

// ── Main HTML → MD Conversion ──
function htmlToMd(html: string): string {
	let s = extractBody(html);
	s = s.trim();
	if (!s) return '';

	// Handle code blocks first (they contain other HTML-like content)
	s = s.replace(/<pre><code(?:\s+class="[^"]*language-([^"]+)[^"]*")?\s*>([\s\S]*?)<\/code><\/pre>/gi, (_m: string, lang: string | undefined, code: string): string => {
		const fence = '```' + (lang || '') + '\n' + decodeEntities(code.replace(/<[^>]*>/g, '')) + '\n```';
		return '\n\n' + fence + '\n\n';
	});

	// Code blocks without pre wrapper (just <code> in <pre>)
	s = s.replace(/<pre>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi, (_m: string, code: string): string => {
		return '\n\n```\n' + decodeEntities(code.replace(/<[^>]*>/g, '')) + '\n```\n\n';
	});

	// Tables
	s = s.replace(/<table[\s\S]*?<\/table>/gi, (m) => {
		return '\n\n' + tableToMd(m) + '\n\n';
	});

	// Blockquotes
	s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m: string, content: string): string => {
		return '\n\n' + blockquoteToMd(content) + '\n\n';
	});

	// Lists (handle nested from inside out)
	s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (m) => '\n\n' + listToMd(m) + '\n\n');
	s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (m) => '\n\n' + listToMd(m) + '\n\n');

	// Headings
	s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m: string, c: string): string => '# ' + convertInline(decodeEntities(c.trim())));
	s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m: string, c: string): string => '## ' + convertInline(decodeEntities(c.trim())));
	s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m: string, c: string): string => '### ' + convertInline(decodeEntities(c.trim())));
	s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_m: string, c: string): string => '#### ' + convertInline(decodeEntities(c.trim())));
	s = s.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_m: string, c: string): string => '##### ' + convertInline(decodeEntities(c.trim())));
	s = s.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_m: string, c: string): string => '###### ' + convertInline(decodeEntities(c.trim())));

	// Horizontal rules
	s = s.replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n');

	// Paragraphs (only if they contain text, not just whitespace)
	s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m: string, c: string): string => {
		const text = convertInline(decodeEntities(c.trim()));
		return text ? '\n\n' + text + '\n\n' : '';
	});

	// Divs and spans (convert inline content, remove tags)
	s = s.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1');
	s = s.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');

	// Strip remaining HTML tags
	s = s.replace(/<[^>]*>/g, '');

	// Decode any remaining entities
	s = decodeEntities(s);

	// Normalize multiple blank lines
	s = s.replace(/\n{3,}/g, '\n\n');

	// Trim leading/trailing whitespace
	s = s.trim();

	return s + '\n';
}

// ── Frontmatter helper ──
function buildFrontmatter(title?: string, source?: string): string {
	if (!title) return '';
	return `---\ntitle: "${title.replace(/"/g, '\\"')}"\nsource: "${(source || 'html').replace(/"/g, '\\"')}"\n---\n\n`;
}

// ── Plugin ──
interface HTML2MDSettings {
	overwrite: boolean;
	addFrontmatter: boolean;
}
const DEFAULT_SETTINGS: HTML2MDSettings = { overwrite: false, addFrontmatter: false };
type ConversionResult = 'converted' | 'skipped' | 'failed';

export default class HTML2MDPlugin extends Plugin {
	settings: HTML2MDSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addCommand({
			id: 'convert-html-to-md',
			name: 'Convert HTML file to Markdown...',
			callback: () => {
				const active = this.app.workspace.getActiveFile();
				if (isHtmlFile(active)) {
					void this.convertFile(active);
					return;
				}
				const files = getHtmlFiles(this.app);
				if (files.length === 0) {
					new Notice('No HTML files found in vault');
					return;
				}
				new HTMLFileSuggestModal(this.app, this, files).open();
			}
		});

		this.addCommand({
			id: 'convert-batch-html-to-md',
			name: 'Convert all HTML in folder to Markdown',
			callback: () => void this.convertBatch()
		});

		this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
			if (!isHtmlFile(file)) return;
			menu.addItem(item => item
				.setTitle('Convert HTML to Markdown')
				.setIcon('file-text')
				.onClick(() => void this.convertFile(file)));
		}));

		this.registerEvent(this.app.workspace.on('files-menu', (menu, files) => {
			const htmlFiles = files.filter(isHtmlFile);
			if (htmlFiles.length < 2) return;
			menu.addItem(item => item
				.setTitle(`Convert ${htmlFiles.length} HTML files to Markdown`)
				.setIcon('file-text')
				.onClick(() => void this.convertFiles(htmlFiles)));
		}));

		this.addSettingTab(new HTML2MDSettingTab(this.app, this));
	}

	async convertFile(file: TFile, silent = false): Promise<ConversionResult> {
		try {
			const content = await this.app.vault.read(file);
			const md = htmlToMd(content);
			const outPath = (file.parent ? file.parent.path + '/' : '') + file.basename + '.md';

			const existing = this.app.vault.getFileByPath(outPath);
			if (existing && !this.settings.overwrite) {
				if (!silent) {
					new Notice('Skipped: ' + outPath + ' (file exists, enable overwrite in settings)');
				}
				return 'skipped';
			}

			let finalMd = md;
			if (this.settings.addFrontmatter) {
				finalMd = buildFrontmatter(file.basename, file.path) + md;
			}

			if (existing) {
				await this.app.vault.modify(existing, finalMd);
			} else {
				await this.app.vault.create(outPath, finalMd);
			}
			if (!silent) {
				new Notice('Converted: ' + outPath);
			}
			return 'converted';
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			console.error('Failed to convert', file.path, e);
			if (!silent) {
				new Notice(`Failed to convert ${file.path}: ${message}`);
			}
			return 'failed';
		}
	}

	async convertFiles(files: TFile[]): Promise<void> {
		const htmlFiles = files.filter(isHtmlFile);
		if (htmlFiles.length === 0) return;

		let converted = 0;
		let skipped = 0;
		let failed = 0;
		for (const file of htmlFiles) {
			const result = await this.convertFile(file, true);
			if (result === 'converted') converted++;
			else if (result === 'skipped') skipped++;
			else failed++;
		}

		const parts = [`Converted ${converted}/${htmlFiles.length}`];
		if (skipped > 0) parts.push(`${skipped} skipped`);
		if (failed > 0) parts.push(`${failed} failed`);
		new Notice(parts.join('; '));
	}

	async convertBatch(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const folder = this.app.vault.getAbstractFileByPath(active?.parent?.path || '/');
		if (!(folder instanceof TFolder)) {
			new Notice('Could not resolve the current folder');
			return;
		}

		const htmlFiles = folder.children.filter(isHtmlFile);
		if (htmlFiles.length === 0) {
			new Notice('No HTML files found in current folder');
			return;
		}

		await this.convertFiles(htmlFiles);
	}

	async loadSettings(): Promise<void> {
		const data: Record<string, unknown> | null = await this.loadData() as Record<string, unknown> | null;
		if (data) {
			Object.assign(this.settings, data);
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

class HTMLFileSuggestModal extends FuzzySuggestModal<TFile> {
	constructor(app: App, private plugin: HTML2MDPlugin, private files: TFile[]) {
		super(app);
		this.setPlaceholder('Select an HTML file to convert');
	}

	getItems(): TFile[] {
		return this.files;
	}

	getItemText(item: TFile): string {
		return item.path;
	}

	onChooseItem(item: TFile): void {
		void this.plugin.convertFile(item);
	}
}

class HTML2MDSettingTab extends PluginSettingTab {
	plugin: HTML2MDPlugin;
	constructor(app: App, plugin: HTML2MDPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl).setName('Conversion').setHeading();

		new Setting(containerEl)
			.setName('Overwrite existing .md files')
			.setDesc('If enabled, will overwrite existing Markdown files with converted content')
			.addToggle(t => t.setValue(this.plugin.settings.overwrite)
				.onChange(async v => { this.plugin.settings.overwrite = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName('Add YAML frontmatter')
			.setDesc('Add title and source metadata to converted files')
			.addToggle(t => t.setValue(this.plugin.settings.addFrontmatter)
				.onChange(async v => { this.plugin.settings.addFrontmatter = v; await this.plugin.saveSettings(); }));
	}
}

// ── Export for testing ──
export { htmlToMd, convertInline, decodeEntities, extractBody, tableToMd, listToMd };
